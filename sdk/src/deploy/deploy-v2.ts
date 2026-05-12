/**
 * V2 deploy chain operation against FTControllerV2:
 *   1. read collateral allowance directly (no simulate-revert probe)
 *   2. if short, approve first (wallet: sequential; relayer: BEBE batch)
 *   3. simulate the deploy call once allowance is in place (wallet path
 *      can re-simulate after approve mines; relayer path skips simulate
 *      when approve is needed and lets the batched receipt surface errors)
 *   4. submit
 *   5. wait for receipt and decode CreateNewMarket
 *
 * For FTAdaptor-routed deploys (3-arg, adaptor implicit oracle), see
 * `@ft/sdk/integrations/ft-adaptor`.
 *
 * Signer-agnostic: callers plug in a SubmitStrategy.
 */

import {
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";
import { ensureErc20Allowance } from "./allowance";
import {
  decodeV2CreateNewMarket,
  type V2DeployedMarket,
} from "./events";
import type { V2DeployArgs } from "./v2-args";

export type SubmitStrategy =
  | {
      kind: "wallet";
      sendTx: (req: {
        to: Address;
        data: Hex;
        role: "approve" | "deploy";
      }) => Promise<Hex>;
    }
  | {
      kind: "atomic";
      sendSingle: (to: Address, data: Hex) => Promise<Hex>;
      sendBatch: (
        calls: Array<{ to: Address; data: Hex; value?: bigint }>,
      ) => Promise<Hex>;
    };

export interface DeployLifecycleCallbacks {
  onSimulating?: () => void;
  onApproveSubmitted?: (hash: Hex) => void;
  onApproveMined?: (receipt: TransactionReceipt) => void;
  onDeploySubmitted?: (hash: Hex) => void;
  onDeployMined?: (receipt: TransactionReceipt) => void;
}

export interface DeployMarketV2Options {
  publicClient: PublicClient;
  args: V2DeployArgs;
  controllerV2: Address;
  account: Address;
  submit: SubmitStrategy;
  on?: DeployLifecycleCallbacks;
}

export interface DeployMarketV2Result {
  txHash: Hex;
  questionId: Hex;
  marketAddress: Address;
  receipt: TransactionReceipt;
}

export async function deployMarketV2(
  options: DeployMarketV2Options,
): Promise<DeployMarketV2Result> {
  const { publicClient, args, controllerV2, account, submit, on } = options;

  if (!args.oracle) {
    throw new Error(
      "deployMarketV2: args.oracle is required (controller-mode 4-arg deploy)",
    );
  }

  const collateral = args.paramsMarket.collateral;
  const deployCallArgs = [
    args.paramsQuestion,
    args.paramsMarket,
    args.oracle,
    args.otSeedWei,
  ] as const;

  const deployData = encodeFunctionData({
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "deployMarket",
    args: deployCallArgs,
  });

  const allowance = await ensureErc20Allowance(publicClient, {
    collateral,
    holder: account,
    spender: controllerV2,
  });

  const simulateDeploy = async (): Promise<V2DeployedMarket> => {
    on?.onSimulating?.();
    const { result } = await publicClient.simulateContract({
      address: controllerV2,
      abi: FT_CONTROLLER_V2_ABI,
      functionName: "deployMarket",
      args: deployCallArgs,
      account,
    });
    const [qid, market] = result as [Hex, Address];
    return { questionId: qid, market };
  };

  let txHash: Hex;
  let simulated: V2DeployedMarket | null = null;

  if (submit.kind === "wallet") {
    if (!allowance.satisfied) {
      const approveHash = await submit.sendTx({
        to: allowance.approveCall.to,
        data: allowance.approveCall.data,
        role: "approve",
      });
      on?.onApproveSubmitted?.(approveHash);
      const approveReceipt = await publicClient.waitForTransactionReceipt({
        hash: approveHash,
      });
      on?.onApproveMined?.(approveReceipt);
    }
    // Allowance is in place — simulate to surface non-allowance reverts
    // before asking the user to sign the deploy tx.
    simulated = await simulateDeploy();
    txHash = await submit.sendTx({
      to: controllerV2,
      data: deployData,
      role: "deploy",
    });
    on?.onDeploySubmitted?.(txHash);
  } else if (allowance.satisfied) {
    simulated = await simulateDeploy();
    txHash = await submit.sendSingle(controllerV2, deployData);
    on?.onDeploySubmitted?.(txHash);
  } else {
    // Atomic batch: approve+deploy in one tx. We can't simulate the
    // deploy step pre-batch because allowance isn't live yet; the batch
    // receipt surfaces any other revert atomically.
    txHash = await submit.sendBatch([
      allowance.approveCall,
      { to: controllerV2, data: deployData, value: BigInt(0) },
    ]);
    on?.onDeploySubmitted?.(txHash);
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  on?.onDeployMined?.(receipt);

  // CreateNewMarket emits from the controller. Prefer the onchain-decoded
  // values; fall back to simulated if the receipt doesn't contain the event.
  const onchain = decodeV2CreateNewMarket(receipt.logs, controllerV2);
  const questionId = onchain?.questionId ?? simulated?.questionId;
  const marketAddress = onchain?.market ?? simulated?.market;

  if (!questionId || !marketAddress) {
    throw new Error(
      `deployMarket tx ${txHash} succeeded but CreateNewMarket event was missing`,
    );
  }

  return { txHash, questionId, marketAddress, receipt };
}
