/**
 * High-level moderation + manual-finalise chain ops on FTControllerV2:
 *   - flagMarket             → flag(questionId)
 *   - unflagMarket           → unflag(questionId)
 *   - finaliseMarketManually → finaliseManually(questionId, answer)
 *
 * Operator-only on chain (the controller checks roles); the SDK does
 * not enforce this — callers must already hold the relevant role.
 *
 * Single-tx writes; no allowance handling.
 */

import type { Address, PublicClient } from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";
import {
  executeWrite,
  type ExecuteWriteResult,
  type WriteSubmitStrategy,
  type WriteLifecycleCallbacks,
} from "./execute-write";

export interface FlagOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function flagMarket(
  options: FlagOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "flag", args: [options.questionId] },
    submit: options.submit,
    on: options.on,
  });
}

export async function unflagMarket(
  options: FlagOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "unflag", args: [options.questionId] },
    submit: options.submit,
    on: options.on,
  });
}

export interface FinaliseManuallyOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  answer: number | bigint;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function finaliseMarketManually(
  options: FinaliseManuallyOptions,
): Promise<ExecuteWriteResult> {
  const answer =
    typeof options.answer === "bigint"
      ? options.answer
      : BigInt(options.answer);
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: {
      functionName: "finaliseManually",
      args: [options.questionId, answer],
    },
    submit: options.submit,
    on: options.on,
  });
}
