// Renders the ancillary payload attached to a market — a chronological
// list where the first entry is the initial deploy bytes and any
// subsequent entries are appendages from `postUpdate`. The contract
// stores the deploy's ancillaryData as the first update under the
// creator's owner key, so a single `getAncillaryUpdates` read covers
// everything.
//
// Uses `decodeAncillary` from @ft/sdk/ancillary which auto-detects the
// payload shape (JSON object, key-value, plain text, or raw hex).

import ReactMarkdown from "react-markdown";
import type { DecodedAncillary } from "@ft/sdk/ancillary";
import { UtcDate } from "./UtcDate";

interface Entry {
  timestamp: bigint;
  hex: `0x${string}`;
  decoded: DecodedAncillary;
}

export function AncillaryView({ entries }: { entries: ReadonlyArray<Entry> }) {
  if (entries.length === 0) {
    return (
      <div className="pg-ancillary-empty">
        No ancillary data on chain yet.
      </div>
    );
  }
  return (
    <ol className="pg-ancillary-updates">
      {entries.map((e, i) => (
        <li key={`${e.timestamp.toString()}-${i}`}>
          <div className="pg-ancillary-update-ts">
            <UtcDate unix={e.timestamp} />
            {i === 0 && (
              <span className="pg-ancillary-tag"> · deploy</span>
            )}
          </div>
          <DecodedBlock decoded={e.decoded} hex={e.hex} />
        </li>
      ))}
    </ol>
  );
}

function DecodedBlock({
  decoded,
  hex,
}: {
  decoded: DecodedAncillary;
  hex: `0x${string}`;
}) {
  if (decoded.kind === "json") {
    // Surface the markdown `description` field — that's the operator-facing
    // resolution text. The remaining fields (is_early_resolution,
    // whitelisted, …) stay as JSON so nothing is hidden.
    const { description, ...rest } = decoded.data as {
      description?: unknown;
      [k: string]: unknown;
    };
    const descriptionText =
      typeof description === "string" && description.trim().length > 0
        ? description
        : null;
    const restEntries = Object.entries(rest);
    return (
      <div className="pg-ancillary-json-wrap">
        {descriptionText && (
          <div className="pg-ancillary-md markdown">
            <ReactMarkdown>{descriptionText}</ReactMarkdown>
          </div>
        )}
        {restEntries.length > 0 && (
          <pre className="pg-ancillary-block pg-ancillary-json">
            {JSON.stringify(Object.fromEntries(restEntries), null, 2)}
          </pre>
        )}
      </div>
    );
  }
  if (decoded.kind === "kv") {
    return (
      <dl className="pg-ancillary-kv">
        {decoded.fields.map((f, i) => (
          <div key={i} className="pg-ancillary-kv-row">
            <dt>{f.key}</dt>
            <dd>{Array.isArray(f.value) ? f.value.join(", ") : f.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (decoded.kind === "text") {
    return <pre className="pg-ancillary-block pg-ancillary-text">{decoded.value}</pre>;
  }
  return (
    <pre className="pg-ancillary-block pg-ancillary-hex mono">{hex}</pre>
  );
}
