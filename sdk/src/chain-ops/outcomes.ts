/**
 * Add outcomes to an existing FTControllerV2 market via
 * FTControllerV2.addOutcomes (plural).
 *
 * Notes:
 *   - The FTAdaptor's equivalent is the singular `addOutcome`; for
 *     FTAdaptor-routed calls see `@ft/sdk/integrations/ft-adaptor`.
 *   - There is no controller-side fused "add + seed" call; compose
 *     `addOutcomes` + `seedOutcomes` if you need both. For the
 *     atomic-against-frontrunning path, use
 *     `addOutcomesAndSeedViaFTAdaptor` from the FTAdaptor submodule.
 *
 * Single-tx write; no allowance handling. Gated by the per-question
 * creator on chain.
 */

import type { Address, PublicClient } from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";
import {
  executeWrite,
  type ExecuteWriteResult,
  type WriteSubmitStrategy,
  type WriteLifecycleCallbacks,
} from "./execute-write";

export interface AddOutcomesOptions {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  questionId: `0x${string}`;
  outcomes: ReadonlyArray<{ name: string; imageUri: string }>;
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export async function addOutcomes(
  options: AddOutcomesOptions,
): Promise<ExecuteWriteResult> {
  if (options.outcomes.length === 0) {
    throw new Error("addOutcomes: at least one outcome required");
  }
  const names = options.outcomes.map((o) => o.name);
  const imageUris = options.outcomes.map((o) => o.imageUri);
  return executeWrite({
    publicClient: options.publicClient,
    account: options.account,
    contract: { address: options.controllerV2, abi: FT_CONTROLLER_V2_ABI },
    call: {
      functionName: "addOutcomes",
      args: [options.questionId, names, imageUris],
    },
    submit: options.submit,
    on: options.on,
  });
}
