import { useState } from "react";
import { formatUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  decodeContractError,
  formatRevertError,
  type DecodedRevert,
} from "@ft/sdk/errors";
import { useEnvironment } from "../lib/environment";
import { readFaucetStatus, mintFaucet } from "../lib/faucet";
import { Button } from "./Button";
import { Input } from "./Field";
import { IconButton } from "./IconButton";

export function MintFaucetDialog({ onClose }: { onClose: () => void }) {
  const { env } = useEnvironment();
  const faucet = env.collateralPresets[0];
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const qc = useQueryClient();

  const [amount, setAmount] = useState("1000");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<DecodedRevert | null>(null);

  const status = useQuery({
    queryKey: ["faucet-status", env.name, faucet?.address, address],
    enabled: !!faucet && !!publicClient && !!address,
    queryFn: async () => {
      if (!faucet || !publicClient || !address)
        throw new Error("missing inputs");
      return readFaucetStatus(publicClient, faucet.address, address);
    },
  });

  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div
        className="pg-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2>Mint {faucet?.label ?? "test collateral"}</h2>
          <IconButton icon="close" title="Close" onClick={onClose} />
        </div>
        <div className="empty-hint">
          {faucet?.label} is a faucet token for the staging environment. Each
          wallet has a rolling per-period mint limit enforced by the contract.
        </div>

        {!isConnected && (
          <div className="empty-hint" style={{ color: "var(--warning)" }}>
            Connect your wallet to mint.
          </div>
        )}

        {status.data && (
          <div className="pg-stat-grid">
            <div className="pg-stat">
              <div className="pg-stat-label">Your balance</div>
              <div className="pg-stat-value mono" style={{ fontSize: 14 }}>
                {formatUnits(status.data.balance, status.data.decimals)}
              </div>
            </div>
            <div className="pg-stat">
              <div className="pg-stat-label">Remaining this period</div>
              <div className="pg-stat-value mono" style={{ fontSize: 14 }}>
                {formatUnits(status.data.mintRemaining, status.data.decimals)}
              </div>
            </div>
          </div>
        )}

        <div>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1000"
          />
          <div className="empty-hint" style={{ marginTop: 6 }}>
            Will mint <span className="mono">{amount || "0"}</span>{" "}
            {faucet?.label} (
            <span className="mono">{status.data?.decimals ?? 18} decimals</span>
            ).
          </div>
        </div>

        {error && (
          <div className="pg-tx-error">{formatRevertError(error)}</div>
        )}

        <div className="pg-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={
              submitting ||
              !isConnected ||
              !faucet ||
              !publicClient ||
              !walletClient ||
              !address ||
              !amount.trim()
            }
            onClick={async () => {
              if (
                !faucet ||
                !publicClient ||
                !walletClient ||
                !address ||
                !status.data
              )
                return;
              setError(null);
              setSubmitting(true);
              try {
                await mintFaucet(
                  publicClient,
                  walletClient,
                  faucet.address,
                  address,
                  amount.trim(),
                  status.data.decimals,
                );
                await qc.invalidateQueries({
                  queryKey: [
                    "faucet-status",
                    env.name,
                    faucet.address,
                    address,
                  ],
                });
                onClose();
              } catch (err) {
                const decoded = decodeContractError(err);
                if (decoded.kind !== "user-rejected") setError(decoded);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting ? "Minting…" : "Mint"}
          </Button>
        </div>
      </div>
    </div>
  );
}
