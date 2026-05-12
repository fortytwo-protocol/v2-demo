import { useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { bsc } from "wagmi/chains";
import { createWalletClient, custom, type WalletClient } from "viem";
import { bindOps, type BoundOps } from "./sdk-ops";
import { useEnvironment } from "./environment";

export type OpsStatus =
  | { kind: "ready"; ops: BoundOps }
  | { kind: "disconnected" }
  | { kind: "wrong-chain"; expectedChainId: number; actualChainId: number }
  | { kind: "loading" };

/**
 * Returns either the bound ops or a structured reason they aren't ready.
 * Builds the wallet client directly from the connector's EIP-1193 provider
 * rather than using `useWalletClient`, because some custom providers (like
 * the test-wallet shim) don't emit the `connect`/`accountsChanged` events
 * that wagmi's hook waits for, leaving it stuck in `isLoading`.
 */
export function useOpsStatus(): OpsStatus {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { env } = useEnvironment();
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [walletError, setWalletError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isConnected || !address || !connector || chainId !== bsc.id) {
      setWalletClient(null);
      return;
    }
    setWalletError(null);
    (async () => {
      try {
        const provider = (await connector.getProvider()) as Parameters<
          typeof custom
        >[0];
        if (cancelled) return;
        const client = createWalletClient({
          account: address,
          chain: bsc,
          transport: custom(provider),
        });
        setWalletClient(client);
      } catch (err) {
        if (!cancelled) setWalletError(err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, address, connector, chainId]);

  return useMemo(() => {
    if (!isConnected || !address) return { kind: "disconnected" };
    if (chainId !== bsc.id)
      return {
        kind: "wrong-chain",
        expectedChainId: bsc.id,
        actualChainId: chainId,
      };
    if (walletError) return { kind: "loading" };
    if (!walletClient || !publicClient) return { kind: "loading" };
    return {
      kind: "ready",
      ops: bindOps(publicClient, walletClient, address, env.controllerV2),
    };
  }, [
    isConnected,
    address,
    chainId,
    walletClient,
    walletError,
    publicClient,
    env.controllerV2,
  ]);
}

/** Convenience: returns the ops object or null if not ready. */
export function useBoundOps(): BoundOps | null {
  const status = useOpsStatus();
  return status.kind === "ready" ? status.ops : null;
}

export function opsStatusHint(status: OpsStatus): string | null {
  switch (status.kind) {
    case "ready":
      return null;
    case "disconnected":
      return "Connect your wallet to enable these actions.";
    case "wrong-chain":
      return `Switch your wallet to BNB Smart Chain (id ${status.expectedChainId}). It's currently on chain ${status.actualChainId}.`;
    case "loading":
      return "Waiting for wallet to finish initialising…";
  }
}
