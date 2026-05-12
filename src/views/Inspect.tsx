import { useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { useUrlState } from "../lib/url-state";
import { loadRecents, forgetRecent, type RecentMarket } from "../lib/recents";
import { shortenAddress } from "../lib/format";
import {
  ENVIRONMENTS,
  useEnvironment,
  type EnvironmentName,
} from "../lib/environment";
import { probeMarketEnv } from "../lib/probe";
import { Card, CardPad, CardTitle } from "../components/Card";
import { AddressInput } from "../components/AddressInput";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { Icon } from "../components/icons/Icon";

const ENV_ORDER: EnvironmentName[] = ["production", "staging"];

export function Inspect() {
  const [, navigate] = useUrlState();
  const { env, setEnvName } = useEnvironment();
  const publicClient = usePublicClient();
  const [input, setInput] = useState("");
  const [recents, setRecents] = useState<RecentMarket[]>(() => loadRecents());
  const [probing, setProbing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const openMarket = (address: Address, targetEnv?: EnvironmentName) => {
    if (targetEnv && targetEnv !== env.name) {
      setEnvName(targetEnv);
    }
    navigate({ view: "market", marketAddress: address, marketTab: "overview" });
  };

  // Validate the typed address: must be a known market on either env.
  // Wrong-env addresses get auto-switched; unknown addresses get rejected.
  const handleLoad = async () => {
    const trimmed = input.trim();
    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      setLoadError("Not a valid 0x address.");
      return;
    }
    if (!publicClient) {
      setLoadError("RPC client not ready — try again in a moment.");
      return;
    }
    setLoadError(null);
    setProbing(true);
    try {
      const result = await probeMarketEnv(publicClient, trimmed as Address);
      if (result.kind === "not-a-market") {
        setLoadError(
          "No market found at this address on Production or Staging.",
        );
        return;
      }
      openMarket(trimmed as Address, result.env);
    } catch (e) {
      setLoadError(
        `Couldn't probe market: ${(e as Error)?.message ?? "unknown error"}`,
      );
    } finally {
      setProbing(false);
    }
  };

  // Group recents by env. Legacy entries (no env field, predating this
  // change) fall back to the current env — clicking them won't switch.
  const grouped: Record<EnvironmentName, RecentMarket[]> = {
    production: [],
    staging: [],
  };
  for (const r of recents) {
    const key: EnvironmentName = r.env ?? env.name;
    grouped[key].push(r);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="breadcrumb">
            <span className="breadcrumb-active">Home</span>
          </div>
          <h1 className="page-title">Inspect a market</h1>
          <div className="page-sub">
            Paste any FTControllerV2 market address to view its state and manage it.
          </div>
        </div>
        <Button variant="primary" onClick={() => navigate({ view: "deploy" })}>
          <Icon name="plus" size={14} />
          Deploy new market
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: 24 }}>
        <CardPad>
          <CardTitle>Market address</CardTitle>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <div style={{ flex: 1 }}>
              <AddressInput
                value={input}
                onChange={(v) => {
                  setInput(v);
                  if (loadError) setLoadError(null);
                }}
                onValid={() => undefined}
                placeholder="0x… (43 chars)"
                autoFocus
              />
            </div>
            <Button
              variant="secondary"
              disabled={
                probing || !/^0x[0-9a-fA-F]{40}$/.test(input.trim())
              }
              onClick={handleLoad}
            >
              {probing ? "Checking…" : "Load"}
            </Button>
          </div>
          {loadError ? (
            <div className="pg-tx-error" style={{ marginTop: 10 }}>
              {loadError}
            </div>
          ) : (
            <div className="empty-hint" style={{ marginTop: 10 }}>
              Reads are public — you don&apos;t need a wallet to inspect. We&apos;ll
              auto-detect whether the address belongs to Production or Staging.
            </div>
          )}
        </CardPad>

        <Card>
          <div style={{ padding: 20 }}>
            <CardTitle>Recent</CardTitle>
            {recents.length === 0 ? (
              <div className="empty-hint">
                Markets you deploy or inspect will appear here.
              </div>
            ) : (
              <div className="pg-recents-groups">
                {ENV_ORDER.map((envName) => {
                  const items = grouped[envName];
                  if (items.length === 0) return null;
                  return (
                    <div key={envName} className="pg-recents-group">
                      <div className="pg-recents-group-header">
                        {ENVIRONMENTS[envName].label}
                      </div>
                      <div className="pg-recents">
                        {items.map((r) => (
                          <div
                            key={`${envName}:${r.address}`}
                            className="pg-recent-item"
                            onClick={() => openMarket(r.address, r.env ?? envName)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                openMarket(r.address, r.env ?? envName);
                            }}
                          >
                            <div className="pg-recent-meta">
                              <span className="pg-recent-label">
                                {r.label ?? "Untitled market"}
                              </span>
                              <span className="pg-recent-address mono">
                                {shortenAddress(r.address)}
                              </span>
                            </div>
                            <IconButton
                              icon="close"
                              title="Forget"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecents(forgetRecent(r.address, r.env));
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
