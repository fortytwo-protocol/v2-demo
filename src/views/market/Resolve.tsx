import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { CardPad, CardTitle } from "../../components/Card";
import { Button } from "../../components/Button";
import { TxButton } from "../../components/TxButton";
import { Badge } from "../../components/Badge";
import { useBoundOps } from "../../lib/use-bound-ops";
import { useInvalidateMarket, type MarketSnapshot } from "../../lib/snapshot";
import { UtcDate } from "../../components/UtcDate";
import {
  decodeOutcomes,
  encodeOutcomes,
} from "../../lib/outcomes";

interface Props {
  address: Address;
  snapshot: MarketSnapshot | undefined;
}

const OUTCOME_TINTS = [
  "#AA64FF",
  "#de8bf3",
  "#5B8FF9",
  "#5AD8A6",
  "#F6BD16",
  "#E86452",
  "#6DC8EC",
  "#945FB9",
];

export function Resolve({ address, snapshot }: Props) {
  const ops = useBoundOps();
  const { address: connectedAddress } = useAccount();
  const invalidate = useInvalidateMarket();

  // Pending answer pre-populates the picker so the user can either
  // confirm + finalise as-is, or amend before re-submitting.
  const pendingAnswer = snapshot?.config.answer ?? BigInt(0);
  const pendingIndices = useMemo(
    () => decodeOutcomes(pendingAnswer),
    [pendingAnswer],
  );

  const [selected, setSelected] = useState<Set<number>>(new Set());
  useEffect(() => {
    setSelected(new Set(pendingIndices));
  }, [pendingAnswer, pendingIndices]);

  if (!snapshot) {
    return (
      <div className="pg-empty">
        <h2>Loading…</h2>
      </div>
    );
  }

  const oracleAddress = snapshot.metadata.oracle;
  const isOracle =
    !!connectedAddress &&
    connectedAddress.toLowerCase() === oracleAddress.toLowerCase();

  const hasPending = pendingAnswer > BigInt(0) && !snapshot.config.isFinalised;
  const proposedAnswer = encodeOutcomes([...selected]);
  const matchesPending = proposedAnswer === pendingAnswer;

  const toggle = (idx: number) => {
    if (snapshot.config.isFinalised) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="grid-detail">
      <CardPad>
        <CardTitle>Pick winning outcome(s)</CardTitle>
        <div className="empty-hint" style={{ marginBottom: 12 }}>
          The oracle{" "}
          {isOracle ? (
            <Badge>YOU</Badge>
          ) : (
            <span>(not you — this will revert)</span>
          )}{" "}
          submits the resolved outcome(s). Answer is encoded as a bitmask —{" "}
          <span className="mono">2^index</span> per outcome, OR-ed together.
          Tick every outcome that wins.
        </div>

        <div className="pg-resolve-picker">
          {snapshot.outcomes.map((o) => {
            const checked = selected.has(o.index);
            const tint = OUTCOME_TINTS[o.index % OUTCOME_TINTS.length]!;
            return (
              <label
                key={o.index}
                className={`pg-resolve-option${checked ? " is-checked" : ""}${snapshot.config.isFinalised ? " is-disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={snapshot.config.isFinalised}
                  onChange={() => toggle(o.index)}
                />
                <span
                  className="pg-resolve-dot"
                  style={{ background: tint }}
                />
                <span className="pg-resolve-name">{o.name}</span>
                <span
                  className="mono"
                  style={{ color: "var(--text-faint)", fontSize: 11 }}
                >
                  bit {o.index} · id {o.tokenId.toString()}
                </span>
              </label>
            );
          })}
        </div>

        {selected.size > 0 && (
          <div
            className="mono"
            style={{
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-faint)",
            }}
          >
            answer = {proposedAnswer.toString()}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          {!hasPending && !snapshot.config.isFinalised && (
            <TxButton
              disabled={!ops || selected.size === 0}
              run={async () => {
                if (!ops || selected.size === 0)
                  throw new Error("Pick an outcome");
                await ops.resolve(snapshot.questionId, proposedAnswer);
                invalidate(address);
              }}
            >
              Submit resolution
            </TxButton>
          )}
          {hasPending && (
            <>
              <TxButton
                disabled={!ops || selected.size === 0 || matchesPending}
                run={async () => {
                  if (!ops || selected.size === 0)
                    throw new Error("Pick an outcome");
                  await ops.resolve(snapshot.questionId, proposedAnswer);
                  invalidate(address);
                }}
              >
                Re-submit with selection
              </TxButton>
              <TxButton
                disabled={!ops}
                variant="secondary"
                run={async () => {
                  if (!ops) throw new Error("Wallet not ready");
                  await ops.unresolve(snapshot.questionId);
                  invalidate(address);
                  setSelected(new Set());
                }}
              >
                Withdraw pending answer
              </TxButton>
              <TxButton
                disabled={!ops}
                run={async () => {
                  if (!ops) throw new Error("Wallet not ready");
                  // Finalise locks in the currently pending answer.
                  await ops.finalise(snapshot.questionId, pendingAnswer);
                  invalidate(address);
                }}
              >
                Finalise pending
              </TxButton>
            </>
          )}
          {snapshot.config.isFinalised && (
            <Badge tone="success" withDot>
              Finalised: {decodeOutcomes(pendingAnswer)
                .map((i) => snapshot.outcomes[i]?.name ?? `#${i}`)
                .join(", ")}
            </Badge>
          )}
        </div>
      </CardPad>

      <CardPad>
        <CardTitle>Resolution status</CardTitle>
        <div className="pg-stat-grid">
          <div className="pg-stat">
            <div className="pg-stat-label">Pending answer</div>
            <div
              className="pg-stat-value mono"
              style={{ fontSize: 16 }}
            >
              {hasPending ? pendingAnswer.toString() : "—"}
            </div>
          </div>
          <div className="pg-stat">
            <div className="pg-stat-label">Finalised</div>
            <div
              className="pg-stat-value"
              style={{ fontSize: 14, fontWeight: 500 }}
            >
              {snapshot.config.isFinalised ? "yes" : "no"}
            </div>
          </div>
          {hasPending && (
            <div className="pg-stat" style={{ gridColumn: "1 / -1" }}>
              <div className="pg-stat-label">Pending winners</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {pendingIndices.map((i) => (
                  <Badge key={i} tone="warn">
                    {snapshot.outcomes[i]?.name ?? `#${i + 1}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <div className="pg-stat" style={{ gridColumn: "1 / -1" }}>
            <div className="pg-stat-label">End</div>
            <div
              className="pg-stat-value"
              style={{ fontSize: 14, fontWeight: 500 }}
            >
              <UtcDate unix={snapshot.config.timestampEnd} />
            </div>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={() => invalidate(address)}
          style={{ marginTop: 16, width: "100%" }}
        >
          Refresh state
        </Button>
      </CardPad>
    </div>
  );
}
