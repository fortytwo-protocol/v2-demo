/**
 * Input validation helpers used by the deploy arg builders. Pure; no
 * chain interaction. Errors thrown here are tagged with `name =
 * "ValidationError"` so callers can branch on it (e.g. dashboard maps
 * those to HTTP 400).
 */

export function validationError(message: string): Error {
  const err = new Error(message);
  err.name = "ValidationError";
  return err;
}

/**
 * Parse an ISO-8601 timestamp into a Unix-seconds bigint suitable for
 * uint96/uint128 contract args. Throws a ValidationError with a
 * helpful message on missing/invalid input.
 */
export function toUnixTimestamp(
  iso: string | null | undefined,
): bigint {
  if (!iso) throw validationError("Missing timestamp on draft");
  const t = Math.floor(new Date(iso).getTime() / 1000);
  if (!Number.isFinite(t) || t <= 0) {
    throw validationError(`Invalid timestamp: ${iso}`);
  }
  return BigInt(t);
}

/**
 * Coerce an already-numeric or pre-parsed timestamp to a uint96/uint128
 * bigint. Strings are routed through {@link toUnixTimestamp} (ISO-8601);
 * numbers and bigints are passed through.
 */
export function asUnixTimestamp(v: string | number | bigint): bigint {
  if (typeof v === "bigint") return v;
  if (typeof v === "number") return BigInt(Math.floor(v));
  return toUnixTimestamp(v);
}
