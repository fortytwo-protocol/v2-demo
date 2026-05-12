/**
 * Read helpers for OpenZeppelin AccessControl view methods.
 *
 * AccessControl exposes `hasRole(role, account)` and `getRoleAdmin(role)`
 * with stable selectors across every contract that inherits it. Rather
 * than duplicate per-contract wrappers, these helpers are
 * contract-agnostic: the caller passes the target contract address
 * (`FTControllerV2`, `FTAdaptor`, or any other AccessControl-compliant
 * contract) and the wrapper does the rest.
 *
 * The wrappers use a small private ABI fragment so the abstraction is
 * "any AccessControl contract", not "this specific contract". The full
 * controller/adaptor ABIs already include these methods if you need to
 * read them via the contract-specific helpers.
 */

import type { Address, Hex, PublicClient } from "viem";

const ACCESS_CONTROL_ABI = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getRoleAdmin",
    stateMutability: "view",
    inputs: [{ name: "role", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
] as const;

export async function hasRole(opts: {
  publicClient: PublicClient;
  contract: Address;
  role: Hex;
  account: Address;
}): Promise<boolean> {
  return opts.publicClient.readContract({
    address: opts.contract,
    abi: ACCESS_CONTROL_ABI,
    functionName: "hasRole",
    args: [opts.role, opts.account],
  });
}

export async function getRoleAdmin(opts: {
  publicClient: PublicClient;
  contract: Address;
  role: Hex;
}): Promise<Hex> {
  return opts.publicClient.readContract({
    address: opts.contract,
    abi: ACCESS_CONTROL_ABI,
    functionName: "getRoleAdmin",
    args: [opts.role],
  });
}
