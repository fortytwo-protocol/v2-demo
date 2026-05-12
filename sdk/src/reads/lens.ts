/**
 * Read helpers for FTLensV2 — composed snapshots and price simulations.
 *
 * The lens contract exposes pre-built tuples designed for UI consumption:
 *   - snapshotMarket / snapshotOt / snapshotUserOt → static state
 *   - getUserState                                 → per-user holdings
 *   - simulateMint / simulateRedeem (and *s/*ForUser variants) → price preview
 *
 * Each helper here is a thin typed wrapper. Return types are inferred
 * by viem from the ABI — callers get fully-typed structs without us
 * re-declaring them.
 */

import type { Address, Hex, PublicClient } from "viem";
import { FT_LENS_V2_ABI } from "../abi";

interface LensReadBase {
  publicClient: PublicClient;
  lensV2: Address;
}

interface PerMarket extends LensReadBase {
  market: Address;
}

interface PerOt extends PerMarket {
  tokenId: bigint;
}

export async function snapshotMarket(opts: PerMarket) {
  return opts.publicClient.readContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "snapshotMarket",
    args: [opts.market],
  });
}

export async function snapshotOt(opts: PerOt) {
  return opts.publicClient.readContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "snapshotOt",
    args: [opts.market, opts.tokenId],
  });
}

export async function snapshotUserOt(opts: PerOt & { user: Address }) {
  return opts.publicClient.readContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "snapshotUserOt",
    args: [opts.market, opts.tokenId, opts.user],
  });
}

export async function getUserState(opts: PerMarket & { user: Address }) {
  return opts.publicClient.readContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "getUserState",
    args: [opts.market, opts.user],
  });
}

/**
 * Common shape for simulateMint / simulateRedeem inputs. The contract
 * accepts a (market, tokenId, amount, isExactIn, dataSwap, dataGuess,
 * integratorFeeBps) tuple. Most integrators leave dataSwap/dataGuess as
 * "0x" and integratorFeeBps as 0, so those are defaulted.
 *
 * Note: the simulate* functions are non-view on chain (they mutate
 * internal state during pricing). They're called via `simulateContract`
 * (an `eth_call` round-trip that returns the function's return value
 * without committing the state change).
 */
interface SimulateSingleArgs {
  market: Address;
  tokenId: bigint;
  amount: bigint;
  /** True = exact-in (you supply collateral), false = exact-out. */
  isExactIn: boolean;
  dataSwap?: Hex;
  dataGuess?: Hex;
  integratorFeeBps?: bigint;
}

const EMPTY_DATA: Hex = "0x";

function singleArgs(input: SimulateSingleArgs) {
  return [
    input.market,
    input.tokenId,
    input.amount,
    input.isExactIn,
    input.dataSwap ?? EMPTY_DATA,
    input.dataGuess ?? EMPTY_DATA,
    input.integratorFeeBps ?? BigInt(0),
  ] as const;
}

export async function simulateMint(opts: LensReadBase & SimulateSingleArgs) {
  const { result } = await opts.publicClient.simulateContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "simulateMint",
    args: singleArgs(opts),
  });
  return result;
}

export async function simulateMintForUser(
  opts: LensReadBase & SimulateSingleArgs & { user: Address },
) {
  // Note: contract puts `user` BEFORE amount in the ForUser variants —
  // the arg order differs from simulateMint.
  const { result } = await opts.publicClient.simulateContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "simulateMintForUser",
    args: [
      opts.market,
      opts.tokenId,
      opts.user,
      opts.amount,
      opts.isExactIn,
      opts.dataSwap ?? EMPTY_DATA,
      opts.dataGuess ?? EMPTY_DATA,
      opts.integratorFeeBps ?? BigInt(0),
    ],
  });
  return result;
}

export async function simulateRedeem(opts: LensReadBase & SimulateSingleArgs) {
  const { result } = await opts.publicClient.simulateContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "simulateRedeem",
    args: singleArgs(opts),
  });
  return result;
}

export async function simulateRedeemForUser(
  opts: LensReadBase & SimulateSingleArgs & { user: Address },
) {
  const { result } = await opts.publicClient.simulateContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "simulateRedeemForUser",
    args: [
      opts.market,
      opts.tokenId,
      opts.user,
      opts.amount,
      opts.isExactIn,
      opts.dataSwap ?? EMPTY_DATA,
      opts.dataGuess ?? EMPTY_DATA,
      opts.integratorFeeBps ?? BigInt(0),
    ],
  });
  return result;
}

/**
 * Multi-OT variants take an array of TradeInput structs (one per OT)
 * plus a single integratorFeeBps. Each trade can have its own
 * tokenId / amount / isExactIn / dataSwap / dataGuess.
 */
export interface TradeInput {
  tokenId: bigint;
  amount: bigint;
  isExactIn: boolean;
  dataSwap?: Hex;
  dataGuess?: Hex;
}

interface SimulateBatchArgs {
  market: Address;
  trades: readonly TradeInput[];
  integratorFeeBps?: bigint;
}

function normalizeTrades(trades: readonly TradeInput[]) {
  return trades.map((t) => ({
    tokenId: t.tokenId,
    amount: t.amount,
    isExactIn: t.isExactIn,
    dataSwap: t.dataSwap ?? EMPTY_DATA,
    dataGuess: t.dataGuess ?? EMPTY_DATA,
  }));
}

export async function simulateMints(opts: LensReadBase & SimulateBatchArgs) {
  const { result } = await opts.publicClient.simulateContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "simulateMints",
    args: [
      opts.market,
      normalizeTrades(opts.trades),
      opts.integratorFeeBps ?? BigInt(0),
    ],
  });
  return result;
}

export async function simulateMintsForUser(
  opts: LensReadBase & SimulateBatchArgs & { user: Address },
) {
  const { result } = await opts.publicClient.simulateContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "simulateMintsForUser",
    args: [
      opts.market,
      opts.user,
      normalizeTrades(opts.trades),
      opts.integratorFeeBps ?? BigInt(0),
    ],
  });
  return result;
}

export async function simulateRedeems(opts: LensReadBase & SimulateBatchArgs) {
  const { result } = await opts.publicClient.simulateContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "simulateRedeems",
    args: [
      opts.market,
      normalizeTrades(opts.trades),
      opts.integratorFeeBps ?? BigInt(0),
    ],
  });
  return result;
}

export async function simulateRedeemsForUser(
  opts: LensReadBase & SimulateBatchArgs & { user: Address },
) {
  const { result } = await opts.publicClient.simulateContract({
    address: opts.lensV2,
    abi: FT_LENS_V2_ABI,
    functionName: "simulateRedeemsForUser",
    args: [
      opts.market,
      opts.user,
      normalizeTrades(opts.trades),
      opts.integratorFeeBps ?? BigInt(0),
    ],
  });
  return result;
}
