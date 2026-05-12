/**
 * Seed liquidity into a deployed market via FTControllerV2.seedLiquidity.
 *
 * Allowance is checked by a direct `allowance()` read against the
 * controller (the spender that pulls collateral). When short, callers
 * see an explicit approve step (wallet) or an atomic [approve, seed]
 * batch (relayer).
 *
 * For FTAdaptor-routed seeds, see `@ft/sdk/integrations/ft-adaptor`.
 */

import {
  encodeFunctionData,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { FT_CONTROLLER_V2_ABI } from "../abi";
import { ensureErc20Allowance } from "../deploy/allowance";
import {
  buildSeedOutcomesArgs,
  type SeedOutcomesInput,
} from "../seed/args";

export type SeedSubmitStrategy =
  | {
      kind: "wallet";
      sendTx: (req: {
        to: Address;
        data: Hex;
        role: "approve" | "seed";
      }) => Promise<Hex>;
    }
  | {
      kind: "atomic";
      sendSingle: (to: Address, data: Hex) => Promise<Hex>;
      sendBatch: (
        calls: Array<{ to: Address; data: Hex; value?: bigint }>,
      ) => Promise<Hex>;
    };

export interface SeedLifecycleCallbacks {
  onSimulating?: () => void;
  onApproveSubmitted?: (hash: Hex) => void;
  onApproveMined?: (receipt: TransactionReceipt) => void;
  onSeedSubmitted?: (hash: Hex) => void;
  onSeedMined?: (receipt: TransactionReceipt) => void;
}

export interface SeedOutcomesOptions extends SeedOutcomesInput {
  publicClient: PublicClient;
  account: Address;
  controllerV2: Address;
  collateral: Address;
  submit: SeedSubmitStrategy;
  on?: SeedLifecycleCallbacks;
}

export interface SeedOutcomesResult {
  txHash: Hex;
  receipt: TransactionReceipt;
}

export async function seedOutcomes(
  options: SeedOutcomesOptions,
): Promise<SeedOutcomesResult> {
  const { publicClient, account, controllerV2, collateral, submit, on } = options;
  const args = buildSeedOutcomesArgs(options);

  const seedData = encodeFunctionData({
    abi: FT_CONTROLLER_V2_ABI,
    functionName: "seedLiquidity",
    args: [args.marketAddress, args.tokenIds, args.otAmounts],
  });

  const allowance = await ensureErc20Allowance(publicClient, {
    collateral,
    holder: account,
    spender: controllerV2,
  });

  const simulateSeed = async (): Promise<void> => {
    on?.onSimulating?.();
    await publicClient.simulateContract({
      address: controllerV2,
      abi: FT_CONTROLLER_V2_ABI,
      functionName: "seedLiquidity",
      args: [args.marketAddress, args.tokenIds, args.otAmounts],
      account,
    });
  };

  let txHash: Hex;

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
    await simulateSeed();
    txHash = await submit.sendTx({ to: controllerV2, data: seedData, role: "seed" });
    on?.onSeedSubmitted?.(txHash);
  } else if (allowance.satisfied) {
    await simulateSeed();
    txHash = await submit.sendSingle(controllerV2, seedData);
    on?.onSeedSubmitted?.(txHash);
  } else {
    txHash = await submit.sendBatch([
      allowance.approveCall,
      { to: controllerV2, data: seedData, value: BigInt(0) },
    ]);
    on?.onSeedSubmitted?.(txHash);
  }

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  on?.onSeedMined?.(receipt);

  return { txHash, receipt };
}
