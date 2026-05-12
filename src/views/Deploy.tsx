import { useMemo, useState } from "react";
import type { Address } from "viem";
import { useAccount } from "wagmi";
import { buildV2DeployArgs } from "@ft/sdk/deploy";
import { useBoundOps } from "../lib/use-bound-ops";
import { useUrlState } from "../lib/url-state";
import { encodeAncillary } from "../lib/ancillary-form";
import { isValidAddress, shortenAddress } from "../lib/format";
import { touchRecent } from "../lib/recents";
import { useEnvironment } from "../lib/environment";

import { Card } from "../components/Card";
import { Field, FieldGrid, FormSection, Input, Select, Textarea } from "../components/Field";
import { IconButton } from "../components/IconButton";
import { Button } from "../components/Button";
import { TxButton } from "../components/TxButton";
import { Badge } from "../components/Badge";
import { ImagePreview } from "../components/ImagePreview";
import { UtcDateTimeInput } from "../components/UtcDateTimeInput";
import { UtcDate } from "../components/UtcDate";
import { Icon } from "../components/icons/Icon";

interface OutcomeDraft {
  name: string;
  imageUri: string;
}

const CUSTOM_KEY = "__custom__";

export function Deploy() {
  const [, navigate] = useUrlState();
  const { address: connectedAddress } = useAccount();
  const ops = useBoundOps();
  const { env } = useEnvironment();
  const collateralPresets = env.collateralPresets;
  const curvePresets = env.curvePresets;

  const [title, setTitle] = useState("");
  const [imageUri, setImageUri] = useState("");
  const [outcomes, setOutcomes] = useState<OutcomeDraft[]>([
    { name: "Yes", imageUri: "" },
    { name: "No", imageUri: "" },
  ]);
  const [start, setStart] = useState<bigint | null>(null);
  const [end, setEnd] = useState<bigint | null>(null);
  const [collateralKey, setCollateralKey] = useState<string>(
    collateralPresets[0]!.address,
  );
  const [collateralCustom, setCollateralCustom] = useState("");
  const [curveKey, setCurveKey] = useState<string>(curvePresets[0]!.address);
  const [curveCustom, setCurveCustom] = useState("");
  const [oracle, setOracle] = useState("");
  const [otSeed, setOtSeed] = useState("10000");
  const [description, setDescription] = useState("");
  const [isEarlyResolution, setIsEarlyResolution] = useState(false);

  // Default oracle to the connected wallet whenever it changes and the user
  // hasn't manually overridden the field.
  const oracleEffective =
    oracle.trim() === "" ? connectedAddress ?? "" : oracle.trim();

  const collateralAddress: Address | null = useMemo(() => {
    if (collateralKey === CUSTOM_KEY)
      return isValidAddress(collateralCustom.trim())
        ? (collateralCustom.trim() as Address)
        : null;
    return collateralKey as Address;
  }, [collateralKey, collateralCustom]);

  const collateralDecimals = useMemo(() => {
    const preset = collateralPresets.find((p) => p.address === collateralKey);
    return preset?.decimals ?? 18;
  }, [collateralKey]);

  const curveAddress: Address | null = useMemo(() => {
    if (curveKey === CUSTOM_KEY)
      return isValidAddress(curveCustom.trim())
        ? (curveCustom.trim() as Address)
        : null;
    return curveKey as Address;
  }, [curveKey, curveCustom]);

  const ancillaryHex = useMemo(
    () => encodeAncillary({ description, isEarlyResolution }),
    [description, isEarlyResolution],
  );

  const formError = useMemo(() => {
    if (!title.trim()) return "Title is required";
    if (outcomes.length < 2) return "At least 2 outcomes are required";
    if (outcomes.some((o) => !o.name.trim()))
      return "Every outcome needs a name";
    if (start === null || end === null)
      return "Start and end timestamps are required";
    if (end <= start) return "End must be after start";
    if (!collateralAddress) return "Pick a collateral";
    if (!curveAddress) return "Pick a curve";
    if (!isValidAddress(oracleEffective)) return "Oracle must be a valid address";
    return null;
  }, [
    title,
    outcomes,
    start,
    end,
    collateralAddress,
    curveAddress,
    oracleEffective,
  ]);

  const buildArgs = () => {
    if (
      formError ||
      !collateralAddress ||
      !curveAddress ||
      !isValidAddress(oracleEffective) ||
      start === null ||
      end === null
    )
      throw new Error(formError ?? "Form not ready");
    return buildV2DeployArgs(
      {
        title: title.trim(),
        imageUri: imageUri.trim(),
        endTimestamp: end,
        startTimestamp: start,
        outcomes: outcomes.map((o) => ({
          name: o.name.trim(),
          imageUri: o.imageUri.trim(),
        })),
        collateral: collateralAddress,
        curve: curveAddress,
        parentTokenId: BigInt(0),
        ancillaryData: ancillaryHex,
        otSeed,
        oracle: oracleEffective as Address,
      },
      collateralDecimals,
    );
  };

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
        <span className="breadcrumb-active">Deploy new market</span>
      </div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Deploy a new prediction market</h1>
          <div className="page-sub">
            One transaction creates the question and seeds initial liquidity. If
            an allowance is needed, an approve tx is sent first automatically.
          </div>
        </div>
      </div>

      <div className="deploy-grid">
        <div>
          <FormSection
            icon="questionId"
            title="The question"
            hint="What you're asking the market"
          >
            <FieldGrid cols={1}>
              <Field label="Title">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Will X happen by Y?"
                />
              </Field>
              <Field icon="image" label="Image URI">
                <Input
                  mono
                  value={imageUri}
                  onChange={(e) => setImageUri(e.target.value)}
                  placeholder="https://… or ipfs://…"
                />
              </Field>
              <Field icon="outcomes" label={`Outcomes (${outcomes.length}, ≥2)`}>
                <OutcomeEditor outcomes={outcomes} onChange={setOutcomes} />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            icon="time"
            title="Schedule"
            hint="When the market opens and closes"
          >
            <FieldGrid>
              <Field icon="start" label="Start (UTC)">
                <UtcDateTimeInput value={start} onChange={setStart} />
              </Field>
              <Field icon="end" label="End (UTC)">
                <UtcDateTimeInput value={end} onChange={setEnd} />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            icon="collateral"
            title="Market mechanics"
            hint="Collateral, curve, oracle, initial seed"
          >
            <FieldGrid>
              <Field icon="collateral" label="Collateral">
                <Select
                  value={collateralKey}
                  onChange={(e) => setCollateralKey(e.target.value)}
                >
                  {collateralPresets.map((p) => (
                    <option key={p.address} value={p.address}>
                      {p.label} — {shortenAddress(p.address)}
                    </option>
                  ))}
                  <option value={CUSTOM_KEY}>Custom address…</option>
                </Select>
                {collateralKey === CUSTOM_KEY && (
                  <Input
                    mono
                    style={{ marginTop: 8 }}
                    placeholder="0x…"
                    value={collateralCustom}
                    onChange={(e) => setCollateralCustom(e.target.value)}
                  />
                )}
              </Field>
              <Field icon="curve" label="Curve">
                <Select
                  value={curveKey}
                  onChange={(e) => setCurveKey(e.target.value)}
                >
                  {curvePresets.map((p) => (
                    <option key={p.address} value={p.address}>
                      {p.label} — {shortenAddress(p.address)}
                    </option>
                  ))}
                  <option value={CUSTOM_KEY}>Custom address…</option>
                </Select>
                {curveKey === CUSTOM_KEY && (
                  <Input
                    mono
                    style={{ marginTop: 8 }}
                    placeholder="0x…"
                    value={curveCustom}
                    onChange={(e) => setCurveCustom(e.target.value)}
                  />
                )}
              </Field>
              <Field
                icon="oracle"
                label="Oracle"
                hint="Defaults to your connected wallet — change only if a different address should resolve this market."
              >
                <Input
                  mono
                  value={oracle || connectedAddress || ""}
                  onChange={(e) => setOracle(e.target.value)}
                  placeholder="0x…"
                />
              </Field>
              <Field
                icon="collateral"
                label="OT seed amount"
                hint="Seeds each outcome equally. Burned during the first trade."
              >
                <Input
                  value={otSeed}
                  onChange={(e) => setOtSeed(e.target.value)}
                  placeholder="10000"
                />
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection
            icon="ancillary"
            title="Ancillary data"
            hint="Resolution context (encoded as bytes)"
          >
            <FieldGrid cols={1}>
              <Field label="Description">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Plain-language explanation of how this resolves…"
                />
              </Field>
              <Field
                label="Early resolution"
                hint="Set true if the market can be resolved before its end timestamp."
              >
                <label
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 13,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isEarlyResolution}
                    onChange={(e) => setIsEarlyResolution(e.target.checked)}
                  />
                  Allow early resolution
                </label>
              </Field>
              <details className="pg-ancillary-preview">
                <summary>Encoded hex preview</summary>
                <pre>{ancillaryHex}</pre>
              </details>
            </FieldGrid>
          </FormSection>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginTop: 32,
              flexWrap: "wrap",
            }}
          >
            <TxButton
              disabled={!ops || !!formError}
              run={async () => {
                if (!ops) throw new Error("Wallet not ready");
                const args = buildArgs();
                const result = await ops.deploy(args);
                touchRecent(result.marketAddress, env.name, title.trim() || undefined);
                navigate({
                  view: "market",
                  marketAddress: result.marketAddress,
                  marketTab: "overview",
                });
              }}
            >
              Simulate &amp; Deploy
            </TxButton>
            <Button onClick={() => navigate({ view: "inspect" })}>Cancel</Button>
            {formError ? (
              <span className="pg-tx-hint" style={{ color: "var(--warning)" }}>
                {formError}
              </span>
            ) : (
              <span className="pg-tx-hint" style={{ marginLeft: "auto" }}>
                Approval + deploy in one flow
              </span>
            )}
          </div>
        </div>

        <div className="pg-preview-sticky">
          <Card>
            <ImagePreview src={imageUri.trim() || null} />
            <div style={{ padding: 18 }}>
              <div className="pg-preview-title">
                {title.trim() || "Untitled market"}
              </div>
              <div className="pg-preview-outcomes">
                {outcomes.map((o, i) => (
                  <span key={i} className="pg-badge pg-badge-muted">
                    {o.name || `Outcome ${i + 1}`}
                  </span>
                ))}
              </div>
              <div className="pg-preview-meta">
                <div className="pg-preview-meta-row">
                  <span>Collateral</span>
                  <span>
                    <Badge>
                      {collateralKey === CUSTOM_KEY
                        ? "Custom"
                        : collateralPresets.find((p) => p.address === collateralKey)?.label}
                    </Badge>
                  </span>
                </div>
                <div className="pg-preview-meta-row">
                  <span>Curve</span>
                  <span className="mono">
                    {curveKey === CUSTOM_KEY
                      ? shortenAddress(curveCustom)
                      : curvePresets.find((p) => p.address === curveKey)?.label}
                  </span>
                </div>
                <div className="pg-preview-meta-row">
                  <span>Oracle</span>
                  <span className="mono">
                    {oracleEffective ? shortenAddress(oracleEffective) : "—"}
                  </span>
                </div>
                <div className="pg-preview-meta-row">
                  <span>Seed</span>
                  <span className="mono">{otSeed || "—"} OT</span>
                </div>
                <div className="pg-preview-meta-row">
                  <span>End</span>
                  <span>{end !== null ? <UtcDate unix={end} /> : <span className="mono">—</span>}</span>
                </div>
              </div>
            </div>
          </Card>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-faint)",
              textAlign: "center",
              marginTop: 10,
            }}
          >
            Live preview · updates as you type
          </div>
        </div>
      </div>
    </>
  );
}

function OutcomeEditor({
  outcomes,
  onChange,
}: {
  outcomes: OutcomeDraft[];
  onChange: (next: OutcomeDraft[]) => void;
}) {
  const updateAt = (i: number, patch: Partial<OutcomeDraft>) => {
    onChange(outcomes.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));
  };
  return (
    <div className="pg-outcome-rows">
      {outcomes.map((o, i) => (
        <div key={i} className="pg-outcome-row">
          <span className="pg-outcome-num">
            {String(i + 1).padStart(2, "0")}
          </span>
          <Input
            value={o.name}
            onChange={(e) => updateAt(i, { name: e.target.value })}
            placeholder="Outcome name"
          />
          <Input
            mono
            value={o.imageUri}
            onChange={(e) => updateAt(i, { imageUri: e.target.value })}
            placeholder="image URI (optional)"
          />
          <IconButton
            icon="close"
            title="Remove outcome"
            disabled={outcomes.length <= 2}
            onClick={() =>
              onChange(outcomes.filter((_, idx) => idx !== i))
            }
          />
        </div>
      ))}
      <button
        type="button"
        className="pg-outcome-add"
        onClick={() => onChange([...outcomes, { name: "", imageUri: "" }])}
      >
        <Icon name="plus" size={12} />
        Add outcome
      </button>
    </div>
  );
}
