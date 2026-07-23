/**
 * Composed reads — batch the small per-question controller reads via
 * multicall so callers don't pay N round-trips. Requires the public
 * client's chain to have a multicall3 deployment (true on every chain
 * we target).
 */

import type { Address, Hex, PublicClient } from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";

/** Aggregate per-question state. Single round-trip via multicall. */
export interface QuestionSnapshot {
  numOutcomes: bigint;
  outcomeNames: readonly string[];
  outcomeEnd: bigint;
  outcomeAnswer: bigint;
  isFinalised: boolean;
  feeRate: bigint;
}

export async function getQuestionSnapshot(opts: {
  publicClient: PublicClient;
  controllerV2: Address;
  questionId: Hex;
  market: Address;
}): Promise<QuestionSnapshot> {
  const contract = {
    address: opts.controllerV2,
    abi: FT_CONTROLLER_V2_ABI,
  } as const;

  const [numOutcomes, outcomeNames, outcomeEnd, outcomeAnswer, finalised, fee] =
    await opts.publicClient.multicall({
      allowFailure: false,
      contracts: [
        {
          ...contract,
          functionName: "getNumOutcomes",
          args: [opts.questionId],
        },
        {
          ...contract,
          functionName: "getOutcomeNames",
          args: [opts.questionId],
        },
        { ...contract, functionName: "getOutcomeEnd", args: [opts.questionId] },
        {
          ...contract,
          functionName: "getOutcomeAnswer",
          args: [opts.questionId],
        },
        { ...contract, functionName: "isFinalised", args: [opts.questionId] },
        { ...contract, functionName: "getFeeRate", args: [opts.market] },
      ],
    });

  return {
    numOutcomes,
    outcomeNames,
    outcomeEnd,
    outcomeAnswer,
    isFinalised: finalised,
    feeRate: fee,
  };
}
