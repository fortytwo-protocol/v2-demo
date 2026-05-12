// On-chain faucet helpers for FTBUSDT (the BSC mock USDT used in
// staging). Source contract: FTUSDFaucetable in
// ft-contracts/src/toys/FTUSDFaucetable.sol. Exposes a public
// `mint(to, amount)` capped by a per-user rolling-window limit.
//
// Only available in staging — production uses real USDT.

import {
  encodeFunctionData,
  parseUnits,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { bsc } from "wagmi/chains";

const FAUCET_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "mintLimit",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "mintRemaining",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;

const DECIMALS = 18;

export interface FaucetStatus {
  decimals: number;
  mintLimit: bigint;
  mintRemaining: bigint;
  balance: bigint;
}

export async function readFaucetStatus(
  publicClient: PublicClient,
  token: Address,
  user: Address,
): Promise<FaucetStatus> {
  const [mintLimit, mintRemaining, balance, decimals] = await Promise.all([
    publicClient.readContract({
      address: token,
      abi: FAUCET_ABI,
      functionName: "mintLimit",
    }),
    publicClient.readContract({
      address: token,
      abi: FAUCET_ABI,
      functionName: "mintRemaining",
      args: [user],
    }),
    publicClient.readContract({
      address: token,
      abi: FAUCET_ABI,
      functionName: "balanceOf",
      args: [user],
    }),
    publicClient
      .readContract({
        address: token,
        abi: FAUCET_ABI,
        functionName: "decimals",
      })
      .catch(() => DECIMALS),
  ]);
  return {
    decimals: Number(decimals),
    mintLimit,
    mintRemaining,
    balance,
  };
}

export async function mintFaucet(
  publicClient: PublicClient,
  walletClient: WalletClient,
  token: Address,
  to: Address,
  humanAmount: string,
  decimals: number,
): Promise<Hex> {
  const amount = parseUnits(humanAmount, decimals);
  // Simulate first so a revert (e.g. ExceedMaxMintPerUser) surfaces
  // through the same decoded-error path as every other write.
  await publicClient.simulateContract({
    address: token,
    abi: FAUCET_ABI,
    functionName: "mint",
    args: [to, amount],
    account: to,
  });
  const data = encodeFunctionData({
    abi: FAUCET_ABI,
    functionName: "mint",
    args: [to, amount],
  });
  const hash = await walletClient.sendTransaction({
    to: token,
    data,
    chain: bsc,
    account: to,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
