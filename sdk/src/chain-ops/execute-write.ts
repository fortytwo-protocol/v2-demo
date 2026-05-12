/**
 * Generic single-tx write orchestrator. Simulate → submit → wait.
 * Used by the high-level chain ops (seedOutcome, resolveMarket, etc.)
 * that don't need an allowance-fallback path.
 *
 * For deploys (which DO need allowance fallback) see
 * @ft/sdk/deploy/deployMarketV2.
 */

import {
  encodeFunctionData,
  type Abi,
  type Address,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";

export type WriteSubmitStrategy =
  | {
      kind: "wallet";
      sendTx: (req: { to: Address; data: Hex; role: "write" }) => Promise<Hex>;
    }
  | {
      kind: "atomic";
      sendSingle: (to: Address, data: Hex) => Promise<Hex>;
    };

export interface WriteLifecycleCallbacks {
  onSimulating?: () => void;
  onSubmitted?: (hash: Hex) => void;
  onMined?: (receipt: TransactionReceipt) => void;
}

/** Mutability filter applied to ABI function lookups. Mirrors viem. */
type WriteMutability = "nonpayable" | "payable";

/** Function names on `TAbi` that are non-view (write-eligible). */
type WriteFunctionName<TAbi extends Abi> = ContractFunctionName<
  TAbi,
  WriteMutability
>;

/** Tuple of args for `TFunctionName` on `TAbi`. */
type WriteFunctionArgs<
  TAbi extends Abi,
  TFunctionName extends WriteFunctionName<TAbi>,
> = ContractFunctionArgs<TAbi, WriteMutability, TFunctionName>;

export interface ExecuteWriteOptions<
  TAbi extends Abi,
  TFunctionName extends WriteFunctionName<TAbi>,
> {
  publicClient: PublicClient;
  account: Address;
  contract: { address: Address; abi: TAbi };
  call: {
    functionName: TFunctionName;
    args: WriteFunctionArgs<TAbi, TFunctionName>;
  };
  submit: WriteSubmitStrategy;
  on?: WriteLifecycleCallbacks;
}

export interface ExecuteWriteResult {
  txHash: Hex;
  receipt: TransactionReceipt;
}

export async function executeWrite<
  TAbi extends Abi,
  TFunctionName extends WriteFunctionName<TAbi>,
>(
  options: ExecuteWriteOptions<TAbi, TFunctionName>,
): Promise<ExecuteWriteResult> {
  const { publicClient, account, contract, call, submit, on } = options;

  on?.onSimulating?.();

  // Simulate to surface reverts pre-submission. We don't need the
  // simulated return value for these single-tx writes — we just want
  // to fail-fast if the tx would revert.
  await publicClient.simulateContract({
    address: contract.address,
    abi: contract.abi,
    functionName: call.functionName,
    args: call.args,
    account,
  });

  // viem's `encodeFunctionData` types `functionName` against
  // `AbiStateMutability` while `simulateContract` accepts the narrower
  // write-only union. The generics already vetted the call shape one
  // line above; cast at this single boundary rather than weaken the
  // public types.
  const data = encodeFunctionData({
    abi: contract.abi,
    functionName: call.functionName,
    args: call.args as readonly unknown[],
  } as Parameters<typeof encodeFunctionData>[0]);

  const txHash =
    submit.kind === "wallet"
      ? await submit.sendTx({ to: contract.address, data, role: "write" })
      : await submit.sendSingle(contract.address, data);

  on?.onSubmitted?.(txHash);

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });
  on?.onMined?.(receipt);

  return { txHash, receipt };
}
