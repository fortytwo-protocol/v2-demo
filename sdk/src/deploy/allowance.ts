// ERC20 helpers for the deploy preflight.
// All functions take a viem PublicClient so the caller picks the RPC.
//
// "Approval refresh threshold" rationale: the V2 controller's actual
// pull is curve-dependent (calSeedCostByOtDeltas) and almost always
// larger than otSeed * outcomeCount, so we never try to predict the
// exact required allowance. We compare against a sentinel (maxUint256/2)
// and approve maxUint256 when below it; the gas cost of an unnecessary
// refresh is far smaller than the cost of a deploy reverting on
// insufficient allowance.

import {
  encodeFunctionData,
  erc20Abi,
  maxUint256,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

export const APPROVAL_REFRESH_THRESHOLD = maxUint256 / BigInt(2);

/** True when the live allowance is low enough that we should refresh. */
export function needsApproval(allowance: bigint): boolean {
  return allowance < APPROVAL_REFRESH_THRESHOLD;
}

/** Read the on-chain allowance from any holder to any spender. */
export async function readAllowance(
  client: PublicClient,
  args: { collateral: Address; holder: Address; spender: Address },
): Promise<bigint> {
  return (await client.readContract({
    address: args.collateral,
    abi: erc20Abi,
    functionName: "allowance",
    args: [args.holder, args.spender],
  })) as bigint;
}

/** Read collateral.decimals(). */
export async function readDecimals(
  client: PublicClient,
  collateral: Address,
): Promise<number> {
  return Number(
    await client.readContract({
      address: collateral,
      abi: erc20Abi,
      functionName: "decimals",
    }),
  );
}

/** Encode an unconditional approve(spender, maxUint256) call. */
export function buildApproveCalldata(spender: Address): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, maxUint256],
  });
}

export interface AllowanceApproveCall {
  to: Address;
  data: Hex;
  value: bigint;
}

export type AllowanceCheckResult =
  | { satisfied: true; current: bigint }
  | { satisfied: false; current: bigint; approveCall: AllowanceApproveCall };

/**
 * Read allowance and decide whether an approve is needed. This is the
 * deterministic gate every collateral-pulling op should use — we never
 * rely on simulate-revert shape to detect missing allowance, because the
 * revert text varies by token (OZ v5 custom error, BEP20 string, adaptor-
 * wrapped, etc.).
 */
export async function ensureErc20Allowance(
  client: PublicClient,
  args: { collateral: Address; holder: Address; spender: Address },
): Promise<AllowanceCheckResult> {
  const current = await readAllowance(client, args);
  if (!needsApproval(current)) return { satisfied: true, current };
  return {
    satisfied: false,
    current,
    approveCall: {
      to: args.collateral,
      data: buildApproveCalldata(args.spender),
      value: BigInt(0),
    },
  };
}
