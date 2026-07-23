/**
 * Read helpers for FTControllerV2 — per-question state, config, and
 * ancillary updates.
 *
 * Each helper is a thin typed wrapper over `publicClient.readContract`
 * that knows the ABI + function name. Integrators that prefer the raw
 * viem call still can; these wrappers exist so callers don't have to
 * import the ABI or remember function names.
 *
 * For batched composed reads, see ./snapshots.ts.
 */

import type { Address, Hex, PublicClient } from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";

interface ControllerReadBase {
  publicClient: PublicClient;
  controllerV2: Address;
}

interface PerQuestion extends ControllerReadBase {
  questionId: Hex;
}

export async function getNumOutcomes(opts: PerQuestion): Promise<bigint> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getNumOutcomes",
    args: [opts.questionId],
  });
}

export async function getOutcomeAnswer(opts: PerQuestion): Promise<bigint> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getOutcomeAnswer",
    args: [opts.questionId],
  });
}

export async function getOutcomeEnd(opts: PerQuestion): Promise<bigint> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getOutcomeEnd",
    args: [opts.questionId],
  });
}

export async function getOutcomeNames(
  opts: PerQuestion,
): Promise<readonly string[]> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getOutcomeNames",
    args: [opts.questionId],
  });
}

export async function isFinalised(opts: PerQuestion): Promise<boolean> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "isFinalised",
    args: [opts.questionId],
  });
}

export async function getFeeRate(
  opts: ControllerReadBase & { market: Address },
): Promise<bigint> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getFeeRate",
    args: [opts.market],
  });
}

export async function getDefaultFeeRate(
  opts: ControllerReadBase,
): Promise<bigint> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getDefaultFeeRate",
  });
}

export async function isPausedController(
  opts: ControllerReadBase,
): Promise<boolean> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "isPaused",
  });
}

export async function isMarket(
  opts: ControllerReadBase & { market: Address },
): Promise<boolean> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "isMarket",
    args: [opts.market],
  });
}

/**
 * Aggregated controller config for a market. Mirrors `getConfig(market)`'s
 * tuple but hands back a named struct so callers don't have to remember
 * positional indexes.
 */
export interface ControllerConfig {
  treasury: Address;
  feeRate: bigint;
  numOutcomes: bigint;
  timestampEnd: bigint;
  answer: bigint;
  isFinalised: boolean;
}

export async function getConfig(
  opts: ControllerReadBase & { market: Address },
): Promise<ControllerConfig> {
  const result = await opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getConfig",
    args: [opts.market],
  });
  return {
    treasury: result[0],
    feeRate: result[1],
    numOutcomes: result[2],
    timestampEnd: result[3],
    answer: result[4],
    isFinalised: result[5],
  };
}

/**
 * Predict the deterministic market address before deployMarket is sent.
 * Useful for UIs that want to show "this is what the new market will be".
 */
export async function predictMarketAddress(opts: {
  publicClient: PublicClient;
  controllerV2: Address;
  collateral: Address;
  parentTokenId: bigint;
  questionId: Hex;
  curve: Address;
  timestampStart: bigint;
}): Promise<Address> {
  return opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "predictMarketAddress",
    args: [
      opts.collateral,
      opts.parentTokenId,
      opts.questionId,
      opts.curve,
      opts.timestampStart,
    ],
  });
}

export interface AncillaryUpdate {
  timestamp: bigint;
  update: Hex;
}

export async function getLatestAncillaryUpdate(
  opts: PerQuestion & { owner: Address },
): Promise<AncillaryUpdate> {
  const result = await opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getLatestAncillaryUpdate",
    args: [opts.questionId, opts.owner],
  });
  return { timestamp: result.timestamp, update: result.update };
}

export async function getAncillaryUpdates(
  opts: PerQuestion & { owner: Address },
): Promise<readonly AncillaryUpdate[]> {
  const result = await opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getAncillaryUpdates",
    args: [opts.questionId, opts.owner],
  });
  return result.map((u) => ({ timestamp: u.timestamp, update: u.update }));
}

export async function getAncillaryUpdatesPaginated(
  opts: PerQuestion & { owner: Address; offset: bigint; limit: bigint },
): Promise<readonly AncillaryUpdate[]> {
  const result = await opts.publicClient.readContract({
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "getAncillaryUpdatesPaginated",
    args: [opts.questionId, opts.owner, opts.offset, opts.limit],
  });
  return result.map((u) => ({ timestamp: u.timestamp, update: u.update }));
}
