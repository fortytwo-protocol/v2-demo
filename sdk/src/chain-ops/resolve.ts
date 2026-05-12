/**
 * High-level resolution chain ops on FTControllerV2:
 *   - resolveMarket   → resolveOutcome(questionId, answer)
 *   - unresolveMarket → unresolveOutcome(questionId)
 *   - finaliseMarket  → finaliseOutcome(questionId, answer)
 *
 * Each is gated on chain by the per-question oracle (see
 * `question.oracle` storage on FTControllerV2). For markets where the
 * oracle is an adaptor (e.g. FTAdaptor-deployed markets), call through
 * that adaptor instead — see `@ft/sdk/integrations/ft-adaptor`.
 *
 * Single-tx writes; no allowance handling.
 */

import type { Address, PublicClient } from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";
import {
  buildResolveArgs,
  buildUnresolveArgs,
  buildFinaliseArgs,
} from "../resolution/args";
import {
  executeWrite,
  type ExecuteWriteResult,
  type WriteSubmitStrategy,
  type WriteLifecycleCallbacks,
} from "./execute-write";

export interface ResolveOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  answer: number | bigint;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function resolveMarket(
  options: ResolveOptions,
): Promise<ExecuteWriteResult> {
  const args = buildResolveArgs({
    questionId: options.questionId,
    answer: options.answer,
  });
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "resolveOutcome", args: [args.questionId, args.answer] },
    submit: options.submit,
    on: options.on,
  });
}

export interface UnresolveOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function unresolveMarket(
  options: UnresolveOptions,
): Promise<ExecuteWriteResult> {
  const args = buildUnresolveArgs({ questionId: options.questionId });
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "unresolveOutcome", args: [args.questionId] },
    submit: options.submit,
    on: options.on,
  });
}

export interface FinaliseOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  answer: number | bigint;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function finaliseMarket(
  options: FinaliseOptions,
): Promise<ExecuteWriteResult> {
  const args = buildFinaliseArgs({
    questionId: options.questionId,
    answer: options.answer,
  });
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "finaliseOutcome", args: [args.questionId, args.answer] },
    submit: options.submit,
    on: options.on,
  });
}
