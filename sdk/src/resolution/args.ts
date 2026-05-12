// Pure builders for FTAdaptor resolution + finalisation arguments.
// All calls operate on a question (identified by bytes32 questionId);
// answer is a bitmask of selected outcome indices.

import type { Hex } from "viem";

export interface ResolveArgs {
  questionId: Hex;
  answer: bigint;
}

export interface UnresolveArgs {
  questionId: Hex;
}

export interface FinaliseArgs {
  questionId: Hex;
  answer: bigint;
}

export function buildResolveArgs(input: {
  questionId: Hex;
  answer: number | bigint;
}): ResolveArgs {
  return {
    questionId: input.questionId,
    answer: typeof input.answer === "bigint" ? input.answer : BigInt(input.answer),
  };
}

export function buildUnresolveArgs(input: { questionId: Hex }): UnresolveArgs {
  return { questionId: input.questionId };
}

export function buildFinaliseArgs(input: {
  questionId: Hex;
  answer: number | bigint;
}): FinaliseArgs {
  return {
    questionId: input.questionId,
    answer: typeof input.answer === "bigint" ? input.answer : BigInt(input.answer),
  };
}
