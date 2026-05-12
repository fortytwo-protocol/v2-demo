/**
 * Per-market reads against the FTMarketV2 contract. The lens already
 * returns market-wide aggregates; this module covers the per-OT
 * primitives the lens doesn't surface (notably per-OT market cap).
 */

import { erc20Abi, type Address, type Hex, type PublicClient } from "viem";
import { FT_MARKET_V2_ABI } from "../abi";

/**
 * Fetch `marketCap(tokenId)` for a list of OTs in a single round-trip.
 * Caps are denominated in the market's collateral. Per-OT entries are
 * `null` when the contract read fails (e.g. an outcome just added but
 * not yet recognised) — keeps the UI ergonomic.
 *
 * The same multicall also returns the collateral token's decimals so
 * the caller can format the bigint correctly without a second round-trip
 * or assuming 18-decimal stablecoin behavior.
 */
export interface OutcomeMarketCaps {
  caps: readonly (bigint | null)[];
  collateralDecimals: number;
}

export async function getOutcomeMarketCaps(opts: {
  publicClient: PublicClient;
  market: Address;
  tokenIds: readonly bigint[];
  collateral: Address;
}): Promise<OutcomeMarketCaps> {
  if (opts.tokenIds.length === 0) {
    // Still need decimals so the caller can format a "no outcomes yet"
    // state without a special branch.
    const decimals = await opts.publicClient.readContract({
      address: opts.collateral,
      abi: erc20Abi,
      functionName: "decimals",
    });
    return { caps: [], collateralDecimals: decimals };
  }
  const contracts = [
    ...opts.tokenIds.map((tokenId) => ({
      address: opts.market,
      abi: FT_MARKET_V2_ABI,
      functionName: "marketCap" as const,
      args: [tokenId] as const,
    })),
    {
      address: opts.collateral,
      abi: erc20Abi,
      functionName: "decimals" as const,
    },
  ];
  const results = await opts.publicClient.multicall({
    allowFailure: true,
    contracts,
  });
  const decimalsResult = results[results.length - 1]!;
  const decimals =
    decimalsResult.status === "success"
      ? (decimalsResult.result as number)
      : 18; // fallback; main-net stablecoins on BSC are 18
  const caps = results
    .slice(0, opts.tokenIds.length)
    .map((r) => (r.status === "success" ? (r.result as bigint) : null));
  return { caps, collateralDecimals: decimals };
}

/**
 * Aggregated on-chain state for a market. Mirrors `FTMarketV2.readState()`'s
 * tuple but hands back a named struct so callers don't have to remember
 * positional indexes.
 */
export interface MarketState {
  market: Address;
  curve: Address;
  timestampStart: bigint;
  totalMarketCap: bigint;
  treasury: Address;
  numOutcomes: bigint;
  timestampEnd: bigint;
  answer: bigint;
  isFinalised: boolean;
}

export async function readMarketState(opts: {
  publicClient: PublicClient;
  market: Address;
}): Promise<MarketState> {
  const result = await opts.publicClient.readContract({
    address: opts.market,
    abi: FT_MARKET_V2_ABI,
    functionName: "readState",
  });
  return {
    market: result.market,
    curve: result.curve,
    timestampStart: result.timestampStart,
    totalMarketCap: result.totalMarketCap,
    treasury: result.treasury,
    numOutcomes: result.numOutcomes,
    timestampEnd: result.timestampEnd,
    answer: result.answer,
    isFinalised: result.isFinalised,
  };
}

/**
 * Deterministic deploy parameters that produced this market. Mirrors
 * `FTMarketV2.readMarketDeployParams()`.
 */
export interface MarketDeployParams {
  collateral: Address;
  parentTokenId: bigint;
  questionId: Hex;
  curve: Address;
  timestampStart: bigint;
}

export async function readMarketDeployParams(opts: {
  publicClient: PublicClient;
  market: Address;
}): Promise<MarketDeployParams> {
  const result = await opts.publicClient.readContract({
    address: opts.market,
    abi: FT_MARKET_V2_ABI,
    functionName: "readMarketDeployParams",
  });
  return {
    collateral: result.collateral,
    parentTokenId: result.parentTokenId,
    questionId: result.questionId,
    curve: result.curve,
    timestampStart: result.timestampStart,
  };
}

/**
 * Total OT supply per outcome, indexed by the market's internal OT order.
 * Wraps `FTMarketV2.totalSupplies()`.
 */
export async function getTotalSupplies(opts: {
  publicClient: PublicClient;
  market: Address;
}): Promise<readonly bigint[]> {
  return opts.publicClient.readContract({
    address: opts.market,
    abi: FT_MARKET_V2_ABI,
    functionName: "totalSupplies",
  });
}

/**
 * Sum of `marketCap(tokenId)` across all OTs, denominated in collateral.
 * Wraps `FTMarketV2.totalMarketCap()`.
 */
export async function getTotalMarketCap(opts: {
  publicClient: PublicClient;
  market: Address;
}): Promise<bigint> {
  return opts.publicClient.readContract({
    address: opts.market,
    abi: FT_MARKET_V2_ABI,
    functionName: "totalMarketCap",
  });
}

/**
 * Simulate the collateral payout for a hypothetical (`answerSim`, `otUserWinning`)
 * pair without mutating state. Wraps `FTMarketV2.simPayout(answerSim, otUserWinning)`.
 */
export async function simPayout(opts: {
  publicClient: PublicClient;
  market: Address;
  answerSim: bigint;
  otUserWinning: bigint;
}): Promise<bigint> {
  return opts.publicClient.readContract({
    address: opts.market,
    abi: FT_MARKET_V2_ABI,
    functionName: "simPayout",
    args: [opts.answerSim, opts.otUserWinning],
  });
}
