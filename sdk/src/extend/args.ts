// Pure builder for FTAdaptor.modifyTimestampEnd. Used to extend (or
// shorten) a question's end timestamp on chain.

import type { Hex } from "viem";

export interface ExtendArgs {
  questionId: Hex;
  newEndTimestamp: bigint;
}

export function buildExtendArgs(input: {
  questionId: Hex;
  /** Unix-seconds; accepts number or bigint. */
  newEndTimestamp: number | bigint;
}): ExtendArgs {
  return {
    questionId: input.questionId,
    newEndTimestamp:
      typeof input.newEndTimestamp === "bigint"
        ? input.newEndTimestamp
        : BigInt(input.newEndTimestamp),
  };
}
