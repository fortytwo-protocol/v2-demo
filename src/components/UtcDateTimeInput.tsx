// datetime-local input bound to unix seconds, interpreted as UTC.
//
// The protocol stores end timestamps in UTC; the v2 dashboard's
// UtcDateTimeInput follows the same convention. The "wall clock" the
// user picks in the field is treated as UTC regardless of viewer
// time zone, and a Local / UTC hint row below the field makes the
// translation obvious.

import { useRef } from "react";
import {
  formatLocal,
  formatUtc,
  unixToUtcInput,
  utcInputToUnix,
} from "../lib/format";
import { Input } from "./Field";

interface Props {
  /** Unix seconds (bigint), or null when empty. */
  value: bigint | null;
  /** Called with unix seconds (or null if cleared). */
  onChange: (next: bigint | null) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /**
   * When true (default), seeds the field with UTC-now on first focus if empty,
   * so the native picker opens in UTC instead of the browser's local "now".
   */
  seedNowOnFocus?: boolean;
}

export function UtcDateTimeInput({
  value,
  onChange,
  disabled,
  autoFocus,
  seedNowOnFocus = true,
}: Props) {
  const seededRef = useRef(false);
  const hasValue = value !== null;
  const stringValue = hasValue ? unixToUtcInput(value!) : "";

  return (
    <>
      <Input
        type="datetime-local"
        step={1}
        value={stringValue}
        disabled={disabled}
        autoFocus={autoFocus}
        onFocus={() => {
          if (!seedNowOnFocus || seededRef.current || hasValue) return;
          seededRef.current = true;
          onChange(BigInt(Math.floor(Date.now() / 1000)));
        }}
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw) {
            onChange(null);
            return;
          }
          try {
            onChange(utcInputToUnix(raw));
          } catch {
            onChange(null);
          }
        }}
      />
      {hasValue && (
        <div className="pg-utc-hint">
          <span>
            UTC: <strong className="mono">{formatUtc(value!)}</strong>
          </span>
          <span>
            Local: <strong className="mono">{formatLocal(value!)}</strong>
          </span>
        </div>
      )}
    </>
  );
}
