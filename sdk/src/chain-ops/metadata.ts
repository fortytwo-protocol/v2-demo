/**
 * Metadata chain ops on FTControllerV2:
 *   - setMarketImage   → setImageUri(questionId, imageUri)
 *   - setOutcomeImage  → setOutcomeImageUri(questionId, indexOutcome, imageUri)
 *   - postUpdate       → postUpdate(questionId, dataHex)
 *
 * All three are gated by the per-question creator on chain. For
 * FTAdaptor-routed calls see `@ft/sdk/integrations/ft-adaptor`.
 *
 * Single-tx writes; no allowance handling.
 */

import type { Address, Hex, PublicClient } from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";
import {
  executeWrite,
  type ExecuteWriteResult,
  type WriteSubmitStrategy,
  type WriteLifecycleCallbacks,
} from "./execute-write";

export interface SetMarketImageOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  imageUri: string;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function setMarketImage(
  options: SetMarketImageOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "setImageUri", args: [options.questionId, options.imageUri] },
    submit: options.submit,
    on: options.on,
  });
}

export interface SetOutcomeImageOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  outcomeIndex: number | bigint;
  imageUri: string;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function setOutcomeImage(
  options: SetOutcomeImageOptions,
): Promise<ExecuteWriteResult> {
  const idx =
    typeof options.outcomeIndex === "bigint"
      ? options.outcomeIndex
      : BigInt(options.outcomeIndex);
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: {
      functionName: "setOutcomeImageUri",
      args: [options.questionId, idx, options.imageUri],
    },
    submit: options.submit,
    on: options.on,
  });
}

export interface PostUpdateOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  data: Hex;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function postUpdate(
  options: PostUpdateOptions,
): Promise<ExecuteWriteResult> {
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: { functionName: "postUpdate", args: [options.questionId, options.data] },
    submit: options.submit,
    on: options.on,
  });
}
