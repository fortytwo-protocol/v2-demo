/**
 * High-level extend chain op on FTControllerV2.modifyTimestampEnd.
 * Single-tx write; no allowance handling. Gated by the per-question
 * creator on chain.
 *
 * For FTAdaptor-routed extends, see `@ft/sdk/integrations/ft-adaptor`.
 */

import type { Address, PublicClient } from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";
import { buildExtendArgs } from "../extend/args";
import {
  executeWrite,
  type ExecuteWriteResult,
  type WriteSubmitStrategy,
  type WriteLifecycleCallbacks,
} from "./execute-write";

export interface ExtendMarketOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  newEndTimestamp: number | bigint;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function extendMarket(
  options: ExtendMarketOptions,
): Promise<ExecuteWriteResult> {
  const args = buildExtendArgs({
    questionId: options.questionId,
    newEndTimestamp: options.newEndTimestamp,
  });
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: {
      functionName: "modifyTimestampEnd",
      args: [args.questionId, args.newEndTimestamp],
    },
    submit: options.submit,
    on: options.on,
  });
}
