import { isAddress, type Address } from "viem";

export function shortenAddress(address: string | undefined, chars = 4): string {
  if (!address) return "—";
  if (address.length < 2 * chars + 4) return address;
  return `${address.slice(0, 2 + chars)}…${address.slice(-chars)}`;
}

export function isValidAddress(input: string): input is Address {
  return isAddress(input);
}

export function formatUtc(secondsOrDate: number | bigint | Date): string {
  const d =
    secondsOrDate instanceof Date
      ? secondsOrDate
      : new Date(Number(secondsOrDate) * 1000);
  if (Number.isNaN(d.getTime())) return "—";
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hh}:${mm} UTC`;
}

/** Relative duration in the future, expressed roughly. Returns "ended" if past. */
export function formatTimeLeft(unixSeconds: number | bigint): string {
  const target = Number(unixSeconds) * 1000;
  const now = Date.now();
  const ms = target - now;
  if (ms <= 0) return "ended";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const days = Math.floor(h / 24);
  if (days < 1) return `${h}h ${m % 60}m`;
  return `${days}d ${h % 24}h`;
}

/**
 * Convert a `datetime-local` input value (e.g. "2026-05-12T13:00:00") to
 * unix seconds, treating the wall clock as **UTC**. Mirrors how the v2
 * dashboard's UtcDateTimeInput parses input — the protocol stores end
 * timestamps in UTC, so picking "13:00" in the field should mean 13:00 UTC
 * regardless of where the user is sitting.
 */
export function utcInputToUnix(input: string): bigint {
  // The input is naive (no offset); append Z so Date parses it as UTC.
  const ms = new Date(`${input}Z`).getTime();
  if (Number.isNaN(ms)) throw new Error(`invalid datetime: ${input}`);
  return BigInt(Math.floor(ms / 1000));
}

/** Reverse: unix seconds → "YYYY-MM-DDTHH:MM:SS" in UTC (for the input field). */
export function unixToUtcInput(unix: number | bigint): string {
  const ms = Number(unix) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "";
  // `toISOString` always returns UTC. Trim the trailing "Z" and ms.
  return new Date(ms).toISOString().slice(0, 19);
}

/**
 * Render a unix timestamp in the viewer's local time zone, with the offset
 * suffix (e.g. "May 12, 2026 21:00:00 GMT+8"). Used as the secondary hint
 * next to the canonical UTC display.
 */
export function formatLocal(unix: number | bigint): string {
  const ms = Number(unix) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });
}
