// Post-ancillary-update dialog. Two tabs:
//   - "Structured" — toggle which JSON fields to include + values,
//     emits a partial JSON envelope. Mirrors the admin dashboard's
//     postUpdate composer (description / whitelisted / is_early_resolution).
//   - "Raw bytes" — plain string sent as UTF-8 hex. Use when the
//     integrator needs a custom payload that isn't JSON.
//
// Both paths submit via `ops.postUpdate(questionId, hex)`.

import { useMemo, useState } from "react";
import { stringToHex, type Hex } from "viem";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Textarea } from "./Field";
import { TxButton } from "./TxButton";
import { useBoundOps } from "../lib/use-bound-ops";

type Mode = "structured" | "raw";
type AmendKey = "description" | "whitelisted" | "earlyResolution";

interface StructuredState {
  description: string;
  whitelisted: boolean;
  earlyResolution: boolean;
  amend: Record<AmendKey, boolean>;
}

function emptyStructured(): StructuredState {
  return {
    description: "",
    whitelisted: true,
    earlyResolution: false,
    amend: { description: true, whitelisted: false, earlyResolution: false },
  };
}

function buildPartialJson(s: StructuredState): string {
  const payload: Record<string, unknown> = {};
  if (s.amend.description) payload.description = s.description.trim();
  if (s.amend.whitelisted) payload.whitelisted = s.whitelisted;
  if (s.amend.earlyResolution) payload.is_early_resolution = s.earlyResolution;
  return JSON.stringify(payload, null, 2);
}

function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

interface Props {
  questionId: Hex;
  onClose: () => void;
  onSuccess: () => void;
}

export function PostUpdateDialog({ questionId, onClose, onSuccess }: Props) {
  const ops = useBoundOps();
  const [mode, setMode] = useState<Mode>("structured");
  const [structured, setStructured] = useState<StructuredState>(emptyStructured);
  const [rawText, setRawText] = useState("");

  const structuredJson = useMemo(
    () => buildPartialJson(structured),
    [structured],
  );

  const anyAmend = Object.values(structured.amend).some(Boolean);

  const submitPayload = (): { text: string; hex: Hex } | null => {
    const text = mode === "structured" ? structuredJson : rawText.trim();
    if (mode === "structured") {
      if (!anyAmend) return null;
      if (!isValidJson(text)) return null;
    } else if (!text) {
      return null;
    }
    return { text, hex: stringToHex(text) };
  };

  const ready = submitPayload() !== null;

  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div
        className="pg-modal pg-modal-wide"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2>Post ancillary update</h2>
          <IconButton icon="close" title="Close" onClick={onClose} />
        </div>

        <div className="empty-hint">
          Free-form bytes appended to this question&apos;s ancillary log. The
          structured form emits a partial JSON envelope; toggle the fields you
          want to amend.
        </div>

        <div
          role="tablist"
          aria-label="Update mode"
          className="pg-mode-tabs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "structured"}
            className={`pg-mode-tab${mode === "structured" ? " is-active" : ""}`}
            onClick={() => setMode("structured")}
          >
            Structured
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "raw"}
            className={`pg-mode-tab${mode === "raw" ? " is-active" : ""}`}
            onClick={() => setMode("raw")}
          >
            Raw bytes
          </button>
        </div>

        {mode === "structured" ? (
          <StructuredEditor state={structured} onChange={setStructured} json={structuredJson} />
        ) : (
          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Plain string — sent as UTF-8 bytes"
            style={{ minHeight: 140 }}
          />
        )}

        <div className="pg-modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <TxButton
            disabled={!ops || !ready}
            run={async () => {
              if (!ops) throw new Error("Wallet not ready");
              const payload = submitPayload();
              if (!payload) throw new Error("Payload incomplete");
              await ops.postUpdate(questionId, payload.hex);
              onSuccess();
              onClose();
            }}
          >
            Post update
          </TxButton>
        </div>
      </div>
    </div>
  );
}

function StructuredEditor({
  state,
  onChange,
  json,
}: {
  state: StructuredState;
  onChange: (next: StructuredState) => void;
  json: string;
}) {
  const setAmend = (key: AmendKey, value: boolean) =>
    onChange({ ...state, amend: { ...state.amend, [key]: value } });

  return (
    <div className="pg-structured">
      <FieldRow
        amend={state.amend.description}
        onToggle={(v) => setAmend("description", v)}
        label="description"
        help="Plain-language explanation of how this market resolves."
      >
        <Textarea
          value={state.description}
          onChange={(e) =>
            onChange({ ...state, description: e.target.value })
          }
          placeholder="Resolves Yes if …"
          disabled={!state.amend.description}
          style={{ minHeight: 60 }}
        />
      </FieldRow>

      <FieldRow
        amend={state.amend.whitelisted}
        onToggle={(v) => setAmend("whitelisted", v)}
        label="whitelisted"
        help="Whether this market appears in default discovery feeds."
      >
        <SwitchInline
          value={state.whitelisted}
          onChange={(v) => onChange({ ...state, whitelisted: v })}
          disabled={!state.amend.whitelisted}
          on="true"
          off="false"
        />
      </FieldRow>

      <FieldRow
        amend={state.amend.earlyResolution}
        onToggle={(v) => setAmend("earlyResolution", v)}
        label="is_early_resolution"
        help="Whether this market can be resolved before its end timestamp."
      >
        <SwitchInline
          value={state.earlyResolution}
          onChange={(v) => onChange({ ...state, earlyResolution: v })}
          disabled={!state.amend.earlyResolution}
          on="true"
          off="false"
        />
      </FieldRow>

      <details className="pg-ancillary-preview">
        <summary>Encoded JSON preview</summary>
        <pre>{json}</pre>
      </details>
    </div>
  );
}

function FieldRow({
  amend,
  onToggle,
  label,
  help,
  children,
}: {
  amend: boolean;
  onToggle: (value: boolean) => void;
  label: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`pg-amend-row${amend ? " is-amending" : ""}`}>
      <label className="pg-amend-toggle">
        <input
          type="checkbox"
          checked={amend}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span>
          Include <code>{label}</code>
        </span>
      </label>
      <div className="pg-amend-help">{help}</div>
      <div className="pg-amend-body">{children}</div>
    </div>
  );
}

function SwitchInline({
  value,
  onChange,
  disabled,
  on,
  off,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  on: string;
  off: string;
}) {
  return (
    <div className="pg-switch-inline">
      <button
        type="button"
        className={`pg-switch-btn${value ? " is-active" : ""}`}
        disabled={disabled}
        onClick={() => onChange(true)}
      >
        {on}
      </button>
      <button
        type="button"
        className={`pg-switch-btn${!value ? " is-active" : ""}`}
        disabled={disabled}
        onClick={() => onChange(false)}
      >
        {off}
      </button>
    </div>
  );
}

