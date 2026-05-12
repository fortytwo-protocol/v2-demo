import { useState } from "react";
import type { Address, Hex } from "viem";
import { useAccount } from "wagmi";
import { Card, CardPad, CardTitle } from "../../components/Card";
import { Row, Rows } from "../../components/Row";
import { Badge } from "../../components/Badge";
import { CopyButton, IconButton } from "../../components/IconButton";
import { ActionButton } from "../../components/ActionButton";
import { Button } from "../../components/Button";
import { ImagePreview } from "../../components/ImagePreview";
import { TxButton } from "../../components/TxButton";
import { Input } from "../../components/Field";
import { AncillaryView } from "../../components/AncillaryView";
import { PostUpdateDialog } from "../../components/PostUpdateDialog";
import {
  shortenAddress,
  formatTimeLeft,
} from "../../lib/format";
import { UtcDate } from "../../components/UtcDate";
import { UtcDateTimeInput } from "../../components/UtcDateTimeInput";
import { useBoundOps, useOpsStatus, opsStatusHint } from "../../lib/use-bound-ops";
import { useInvalidateMarket, type MarketSnapshot } from "../../lib/snapshot";
import { useEnvironment } from "../../lib/environment";

interface Props {
  address: Address;
  snapshot: MarketSnapshot | undefined;
}

type Dialog = null | "image" | "extend" | "post-update";

export function Overview({ address, snapshot }: Props) {
  const ops = useBoundOps();
  const { address: connectedAddress } = useAccount();
  const { env } = useEnvironment();
  const invalidate = useInvalidateMarket();
  const [dialog, setDialog] = useState<Dialog>(null);

  if (!snapshot) {
    return (
      <div className="pg-empty">
        <h2>Loading market…</h2>
        <p>Reading state from the lens contract.</p>
      </div>
    );
  }

  const imageUri = snapshot.metadata.imageUri;
  const collateralAddress = snapshot.deploy.collateral;
  const curveAddress = snapshot.deploy.curve;
  const oracleAddress = snapshot.metadata.oracle;
  const timestampStart = snapshot.deploy.timestampStart;
  const timestampEnd = snapshot.config.timestampEnd;

  const collateralLabel =
    env.collateralPresets.find(
      (p) => p.address.toLowerCase() === collateralAddress?.toLowerCase(),
    )?.label ?? shortenAddress(collateralAddress);
  const curveLabel =
    env.curvePresets.find(
      (p) => p.address.toLowerCase() === curveAddress?.toLowerCase(),
    )?.label ?? shortenAddress(curveAddress);

  const isOracle =
    !!connectedAddress &&
    connectedAddress.toLowerCase() === oracleAddress.toLowerCase();

  return (
    <>
      <div className="grid-detail">
        <Card>
          <div style={{ position: "relative" }}>
            <ImagePreview
              src={imageUri || null}
              onEdit={() => setDialog("image")}
            />
            <div className="pg-hero-strip">
              <div className="pg-hero-strip-badges">
                {snapshot.config.isFinalised ? (
                  <Badge tone="success" withDot>
                    Finalised
                  </Badge>
                ) : snapshot.config.answer > BigInt(0) ? (
                  <Badge tone="warn" withDot>
                    Resolution pending
                  </Badge>
                ) : (
                  <Badge tone="success" withDot>
                    Active
                  </Badge>
                )}
                <Badge tone="muted">
                  {snapshot.outcomes.length} outcomes
                </Badge>
                {!snapshot.config.isFinalised && (
                  <Badge tone="muted">{formatTimeLeft(timestampEnd)} left</Badge>
                )}
              </div>
            </div>
          </div>
          <Rows>
            <Row icon="market" label="Market">
              <span className="mono">{shortenAddress(address)}</span>
              <CopyButton value={address} />
            </Row>
            <Row icon="questionId" label="Question ID">
              <span className="mono">{shortenAddress(snapshot.questionId)}</span>
              <CopyButton value={snapshot.questionId} />
            </Row>
            <Row icon="collateral" label="Collateral">
              <Badge>{collateralLabel}</Badge>
              {collateralAddress && (
                <span className="mono" style={{ color: "var(--text-faint)" }}>
                  {shortenAddress(collateralAddress)}
                </span>
              )}
            </Row>
            <Row icon="curve" label="Curve">
              <Badge tone="muted">{curveLabel}</Badge>
            </Row>
            <Row icon="oracle" label="Oracle">
              <span className="mono">{shortenAddress(oracleAddress)}</span>
              {isOracle && <Badge>YOU</Badge>}
              <CopyButton value={oracleAddress} />
            </Row>
            <Row icon="start" label="Start">
              <UtcDate unix={timestampStart} />
            </Row>
            <Row icon="end" label="End">
              <UtcDate unix={timestampEnd} />
              {!snapshot.config.isFinalised && (
                <Button
                  variant="chip"
                  disabled={!ops || snapshot.config.isFinalised}
                  onClick={() => setDialog("extend")}
                >
                  Extend
                </Button>
              )}
            </Row>
          </Rows>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <CardPad>
            <CardTitle>Quick actions</CardTitle>
            <OpsHint />

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ActionButton
                icon="image"
                title="Update market image"
                description="Replace the displayed image URI"
                onClick={() => setDialog("image")}
                disabled={!ops}
              />
              <ActionButton
                icon="time"
                title="Modify end timestamp"
                description="Push the resolution deadline later"
                onClick={() => setDialog("extend")}
                disabled={!ops || snapshot.config.isFinalised}
              />
              <ActionButton
                icon="ancillary"
                title="Post ancillary update"
                description="Append new clarification bytes"
                onClick={() => setDialog("post-update")}
                disabled={!ops}
              />
            </div>
          </CardPad>

          <CardPad>
            <CardTitle>State</CardTitle>
            <div className="pg-stat-grid">
              <div className="pg-stat">
                <div className="pg-stat-label">Phase</div>
                <div
                  className="pg-stat-value"
                  style={{
                    color: snapshot.config.isFinalised
                      ? "var(--resolved)"
                      : "var(--success)",
                    fontSize: 16,
                    fontWeight: 600,
                  }}
                >
                  {snapshot.config.isFinalised ? "Finalised" : "Active"}
                </div>
              </div>
              <div className="pg-stat">
                <div className="pg-stat-label">Outcomes</div>
                <div className="pg-stat-value mono">
                  {snapshot.outcomes.length}
                </div>
              </div>
              <div className="pg-stat">
                <div className="pg-stat-label">Time left</div>
                <div className="pg-stat-value" style={{ fontSize: 16 }}>
                  {formatTimeLeft(timestampEnd)}
                </div>
              </div>
              <div className="pg-stat">
                <div className="pg-stat-label">Finalised</div>
                <div
                  className="pg-stat-value"
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  {snapshot.config.isFinalised ? "yes" : "no"}
                </div>
              </div>
            </div>
          </CardPad>
        </div>
      </div>

      <CardPad className="pg-ancillary-card">
        <CardTitle>Ancillary data</CardTitle>
        <AncillaryView entries={snapshot.ancillary} />
      </CardPad>

      {dialog === "image" && (
        <SetImageDialog
          questionId={snapshot.questionId}
          current={imageUri}
          onClose={() => setDialog(null)}
          onSuccess={() => invalidate(address)}
          disabled={!ops}
        />
      )}
      {dialog === "extend" && (
        <ExtendDialog
          questionId={snapshot.questionId}
          currentEnd={timestampEnd}
          onClose={() => setDialog(null)}
          onSuccess={() => invalidate(address)}
          disabled={!ops}
        />
      )}
      {dialog === "post-update" && (
        <PostUpdateDialog
          questionId={snapshot.questionId}
          onClose={() => setDialog(null)}
          onSuccess={() => invalidate(address)}
        />
      )}
    </>
  );
}

function OpsHint() {
  const status = useOpsStatus();
  const hint = opsStatusHint(status);
  if (!hint) return null;
  return (
    <div
      className="empty-hint"
      style={{ marginBottom: 10, color: "var(--warning)" }}
    >
      {hint}
    </div>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div
        className="pg-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2>{title}</h2>
          <IconButton icon="close" title="Close" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

function SetImageDialog({
  questionId,
  current,
  onClose,
  onSuccess,
  disabled,
}: {
  questionId: Hex;
  current: string;
  onClose: () => void;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const ops = useBoundOps();
  const [value, setValue] = useState(current);
  return (
    <ModalShell title="Update market image" onClose={onClose}>
      <Input
        mono
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://… or ipfs://…"
      />
      <ImagePreview src={value.trim() || null} />
      <div className="pg-modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <TxButton
          disabled={disabled || !ops || !value.trim()}
          run={async () => {
            if (!ops) throw new Error("Wallet not ready");
            await ops.setMarketImage(questionId, value.trim());
            onSuccess();
            onClose();
          }}
        >
          Update
        </TxButton>
      </div>
    </ModalShell>
  );
}

function ExtendDialog({
  questionId,
  currentEnd,
  onClose,
  onSuccess,
  disabled,
}: {
  questionId: Hex;
  currentEnd: bigint;
  onClose: () => void;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const ops = useBoundOps();
  const [value, setValue] = useState<bigint | null>(currentEnd);
  return (
    <ModalShell title="Modify end timestamp" onClose={onClose}>
      <div className="empty-hint">
        Current end: <UtcDate unix={currentEnd} />
      </div>
      <UtcDateTimeInput value={value} onChange={setValue} />
      <div className="pg-modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <TxButton
          disabled={disabled || !ops || value === null || value <= currentEnd}
          run={async () => {
            if (!ops || value === null) throw new Error("Wallet not ready");
            await ops.extend(questionId, value);
            onSuccess();
            onClose();
          }}
        >
          Extend
        </TxButton>
      </div>
    </ModalShell>
  );
}

