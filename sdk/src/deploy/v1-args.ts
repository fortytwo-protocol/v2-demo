// Pure constructor for V1 deploy arguments.
//
// V1 deploy is two contract calls; the second consumes the first's
// return value (the questionId), so the builder exposes them as:
//   createQuestion: ready-to-encode args
//   buildDeployMarket(questionId): produces the second-call args once
//                                  the questionId is known
//
// Callers typically simulate createQuestion first to derive the
// questionId, then encode both calls together (atomically batched, or
// sent one after the other depending on the chain integration).

import { parseUnits, type Address, type Hex } from "viem";
import { asUnixTimestamp, validationError } from "./validation";

/** V1 fee rate is basis points × 10^14 on chain. */
export const V1_FEE_RATE_SCALE = BigInt(10) ** BigInt(14);

export interface V1QuestionMeta {
  title: string;
  description: string;
}

export interface V1CreateQuestionArgs {
  meta: V1QuestionMeta;
  timestampEnd: bigint;
  outcomeNames: readonly string[];
}

export interface V1DeployMarketArgs {
  collateral: Address;
  parentTokenId: bigint;
  questionId: Hex;
  curve: Address;
  otSeedWei: bigint;
  timestampStart: bigint;
  feeRateWei: bigint;
}

export interface V1DeployArgs {
  createQuestion: V1CreateQuestionArgs;
  /**
   * Builder for the deploy step. Caller passes in the questionId
   * obtained by simulating createQuestion.
   */
  buildDeployMarket: (questionId: Hex) => V1DeployMarketArgs;
}

/**
 * Flat shape consumed by buildV1DeployArgs.
 */
export interface V1DeployFlatInput {
  title: string;
  description: string;
  endTimestamp: string | number | bigint;
  startTimestamp: string | number | bigint;
  outcomes: ReadonlyArray<{ name: string }>;
  collateral: string;
  curve: string;
  parentTokenId: bigint | number;
  /** Human-readable seed amount (e.g. 10000); scaled by `decimals`. */
  otSeed: number | string;
  /** Basis points (e.g. 80 = 0.8%); scaled to chain units by V1_FEE_RATE_SCALE. */
  feeRate: number;
}

export function buildV1DeployArgs(
  input: V1DeployFlatInput,
  decimals: number,
): V1DeployArgs {
  if (input.outcomes.length < 2) {
    throw validationError("Draft needs at least 2 outcomes");
  }
  if (!input.description) {
    throw validationError("V1 deploy requires description");
  }
  const otSeedWei = parseUnits(String(input.otSeed), decimals);
  const feeRateWei = BigInt(input.feeRate) * V1_FEE_RATE_SCALE;
  const timestampEnd = asUnixTimestamp(input.endTimestamp);
  const timestampStart = asUnixTimestamp(input.startTimestamp);
  const outcomeNames = input.outcomes.map((o) => o.name);

  return {
    createQuestion: {
      meta: { title: input.title, description: input.description },
      timestampEnd,
      outcomeNames,
    },
    buildDeployMarket: (questionId: Hex) => ({
      collateral: input.collateral as Address,
      parentTokenId: BigInt(input.parentTokenId),
      questionId,
      curve: input.curve as Address,
      otSeedWei,
      timestampStart,
      feeRateWei,
    }),
  };
}
