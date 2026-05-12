import { describe, it, expect } from "vitest";
import {
  shortenAddress,
  formatUtc,
  formatLocal,
  unixToUtcInput,
  utcInputToUnix,
} from "../src/lib/format";

describe("shortenAddress", () => {
  it("returns em-dash for empty input", () => {
    expect(shortenAddress(undefined)).toBe("—");
  });

  it("trims with default 4 chars on each end", () => {
    expect(
      shortenAddress("0x1234567890abcdef1234567890abcdef12345678"),
    ).toBe("0x1234…5678");
  });

  it("returns short inputs unchanged", () => {
    expect(shortenAddress("0xabcd")).toBe("0xabcd");
  });
});

describe("formatUtc", () => {
  it("formats unix seconds (bigint) to UTC", () => {
    const unix = BigInt(Math.floor(Date.UTC(2026, 3, 1) / 1000));
    expect(formatUtc(unix)).toBe("2026-04-01 00:00 UTC");
  });

  it("returns em-dash for invalid input", () => {
    expect(formatUtc(NaN)).toBe("—");
  });
});

describe("UTC datetime input round-trip", () => {
  it("treats the input wall clock as UTC, not local", () => {
    // Picking "2026-04-01T13:00:00" in a UTC-bound field should map to
    // 13:00 UTC regardless of the viewer's time zone.
    const expected = BigInt(Math.floor(Date.UTC(2026, 3, 1, 13, 0, 0) / 1000));
    expect(utcInputToUnix("2026-04-01T13:00:00")).toBe(expected);
  });

  it("round-trips: unix → input string → unix", () => {
    const unix = BigInt(1_777_000_000);
    const input = unixToUtcInput(unix);
    expect(input).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(utcInputToUnix(input)).toBe(unix);
  });

  it("returns empty string for zero / invalid", () => {
    expect(unixToUtcInput(0)).toBe("");
    expect(unixToUtcInput(BigInt(0))).toBe("");
  });

  it("throws on invalid input", () => {
    expect(() => utcInputToUnix("not a date")).toThrow();
  });
});

describe("formatLocal", () => {
  it("returns a non-empty string for valid input", () => {
    // We don't lock the exact format because it depends on the test
    // runner's locale; just sanity-check it produces something.
    const unix = BigInt(Math.floor(Date.UTC(2026, 3, 1) / 1000));
    const local = formatLocal(unix);
    expect(local.length).toBeGreaterThan(0);
    expect(local).not.toBe("—");
  });

  it("returns em-dash for invalid input", () => {
    expect(formatLocal(NaN)).toBe("—");
  });
});
