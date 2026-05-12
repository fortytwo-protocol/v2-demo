import { describe, it, expect } from "vitest";
import { hexToString } from "viem";
import { encodeAncillary } from "../src/lib/ancillary-form";
import { buildAncillaryJson } from "@ft/sdk/ancillary";

describe("encodeAncillary", () => {
  it("encodes the SDK's canonical JSON envelope as utf-8 hex", () => {
    const values = {
      description: "Will X happen by Y?",
      isEarlyResolution: false,
    };
    const hex = encodeAncillary(values);
    expect(hex.startsWith("0x")).toBe(true);
    const decoded = hexToString(hex);
    expect(decoded).toBe(buildAncillaryJson(values));
    const parsed = JSON.parse(decoded);
    expect(parsed.description).toBe("Will X happen by Y?");
    expect(parsed.is_early_resolution).toBe(false);
    expect(parsed.whitelisted).toBe(true);
  });

  it("preserves the isEarlyResolution flag", () => {
    const hex = encodeAncillary({
      description: "Anything",
      isEarlyResolution: true,
    });
    const parsed = JSON.parse(hexToString(hex));
    expect(parsed.is_early_resolution).toBe(true);
  });

  it("trims whitespace in the description (SDK contract)", () => {
    const hex = encodeAncillary({
      description: "   spaced   ",
      isEarlyResolution: false,
    });
    const parsed = JSON.parse(hexToString(hex));
    expect(parsed.description).toBe("spaced");
  });
});
