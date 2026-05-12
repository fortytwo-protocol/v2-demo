/**
 * Read helpers for FTDisputeRegistry — per-question dispute ancillary
 * updates posted by a given owner.
 *
 * Each helper is a thin typed wrapper over `publicClient.readContract`
 * that knows the ABI + function name. Integrators that prefer the raw
 * viem call still can; these wrappers exist so callers don't have to
 * import the ABI or remember function names.
 */

import type { Address, Hex, PublicClient } from "viem";
import { FT_DISPUTE_REGISTRY_ABI } from "../abi";

interface DisputeReadBase {
  publicClient: PublicClient;
  disputeRegistry: Address;
  questionId: Hex;
  owner: Address;
}

/**
 * Mirrors the `DisputeAncillaryDataUpdate` solidity struct on
 * FTDisputeRegistry. Returned as a named struct so callers don't have
 * to remember positional indexes.
 */
export interface DisputeAncillaryUpdate {
  timestamp: bigint;
  answerProposed: bigint;
  data: Hex;
}

export async function getLatestDisputeAncillaryUpdate(
  opts: DisputeReadBase,
): Promise<DisputeAncillaryUpdate> {
  const result = await opts.publicClient.readContract({
    address: opts.disputeRegistry,
    abi: FT_DISPUTE_REGISTRY_ABI,
    functionName: "getLatestDisputeAncillaryUpdate",
    args: [opts.questionId, opts.owner],
  });
  return {
    timestamp: result.timestamp,
    answerProposed: result.answerProposed,
    data: result.data,
  };
}

export async function getDisputeAncillaryUpdates(
  opts: DisputeReadBase,
): Promise<readonly DisputeAncillaryUpdate[]> {
  const result = await opts.publicClient.readContract({
    address: opts.disputeRegistry,
    abi: FT_DISPUTE_REGISTRY_ABI,
    functionName: "getDisputeAncillaryUpdates",
    args: [opts.questionId, opts.owner],
  });
  return result.map((u) => ({
    timestamp: u.timestamp,
    answerProposed: u.answerProposed,
    data: u.data,
  }));
}

export async function getDisputeAncillaryUpdatesPaginated(
  opts: DisputeReadBase & { offset: bigint; limit: bigint },
): Promise<readonly DisputeAncillaryUpdate[]> {
  const result = await opts.publicClient.readContract({
    address: opts.disputeRegistry,
    abi: FT_DISPUTE_REGISTRY_ABI,
    functionName: "getDisputeAncillaryUpdatesPaginated",
    args: [opts.questionId, opts.owner, opts.offset, opts.limit],
  });
  return result.map((u) => ({
    timestamp: u.timestamp,
    answerProposed: u.answerProposed,
    data: u.data,
  }));
}
