import { useEffect } from "react";
import type { Address } from "viem";
import { useUrlState, type MarketTab } from "../lib/url-state";
import { useMarketSnapshot } from "../lib/snapshot";
import { useEnvironment } from "../lib/environment";
import { shortenAddress } from "../lib/format";
import { touchRecent } from "../lib/recents";
import { Overview } from "./market/Overview";
import { Outcomes } from "./market/Outcomes";
import { Resolve } from "./market/Resolve";

const TABS: { key: MarketTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "outcomes", label: "Outcomes" },
  { key: "resolve", label: "Resolve" },
];

export function Market({ address }: { address: Address }) {
  const [state, navigate] = useUrlState();
  const snap = useMarketSnapshot(address);
  const { env } = useEnvironment();

  useEffect(() => {
    // Touch the recents entry on first successful load — use the event-sourced
    // title if available.
    if (snap.data) {
      touchRecent(address, env.name, snap.data.metadata.title || undefined);
    }
  }, [snap.data, address, env.name]);

  return (
    <>
      <div className="breadcrumb">
        <button
          type="button"
          className="breadcrumb-link"
          onClick={() => navigate({ view: "inspect" })}
        >
          Home
        </button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-active mono">{shortenAddress(address)}</span>
      </div>
      <div className="page-head">
        <div>
          <h1 className="page-title">
            {snap.data
              ? snap.data.metadata.title || "Untitled market"
              : "Loading…"}
          </h1>
          <div className="page-sub">
            {snap.data
              ? `${snap.data.outcomes.length} outcomes · ${snap.data.config.isFinalised ? "Finalised" : "Active"}`
              : snap.isError
                ? `Couldn't load market: ${(snap.error as Error)?.message ?? "unknown error"}`
                : "Reading on-chain state…"}
          </div>
        </div>
        <a
          className="pg-btn pg-btn-secondary"
          href={`${env.bscscanUrl}/address/${address}`}
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: "none" }}
        >
          View on BscScan
        </a>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className="tab"
            role="tab"
            aria-selected={state.marketTab === t.key}
            onClick={() =>
              navigate({
                view: "market",
                marketAddress: address,
                marketTab: t.key,
              })
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {state.marketTab === "overview" && (
        <Overview address={address} snapshot={snap.data} />
      )}
      {state.marketTab === "outcomes" && (
        <Outcomes address={address} snapshot={snap.data} />
      )}
      {state.marketTab === "resolve" && (
        <Resolve address={address} snapshot={snap.data} />
      )}
    </>
  );
}
