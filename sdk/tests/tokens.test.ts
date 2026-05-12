import { describe, expect, it } from "vitest";
import {
  isValidTokenId,
  outcomeIndexToTokenId,
  outcomeTokenIds,
  tokenIdToOutcomeIndex,
} from "../src/tokens";

describe("outcomeIndexToTokenId", () => {
  it("maps 0..N to powers of two", () => {
    expect(outcomeIndexToTokenId(0)).toBe(BigInt(1));
    expect(outcomeIndexToTokenId(1)).toBe(BigInt(2));
    expect(outcomeIndexToTokenId(2)).toBe(BigInt(4));
    expect(outcomeIndexToTokenId(7)).toBe(BigInt(128));
  });

  it("accepts bigint input", () => {
    expect(outcomeIndexToTokenId(BigInt(5))).toBe(BigInt(32));
  });

  it("handles large indexes without precision loss", () => {
    expect(outcomeIndexToTokenId(64)).toBe(BigInt(1) << BigInt(64));
  });

  it("rejects negative indexes", () => {
    expect(() => outcomeIndexToTokenId(-1)).toThrow(/index must be ≥ 0/);
  });
});

describe("tokenIdToOutcomeIndex", () => {
  it("inverts outcomeIndexToTokenId", () => {
    for (let i = 0; i < 12; i++) {
      expect(tokenIdToOutcomeIndex(outcomeIndexToTokenId(i))).toBe(i);
    }
  });

  it("rejects non-power-of-two tokenIds", () => {
    expect(() => tokenIdToOutcomeIndex(BigInt(3))).toThrow(/not a valid outcome tokenId/);
    expect(() => tokenIdToOutcomeIndex(BigInt(0))).toThrow();
  });
});

describe("isValidTokenId", () => {
  it("returns true for positive powers of two", () => {
    expect(isValidTokenId(BigInt(1))).toBe(true);
    expect(isValidTokenId(BigInt(2))).toBe(true);
    expect(isValidTokenId(BigInt(4))).toBe(true);
    expect(isValidTokenId(BigInt(1024))).toBe(true);
  });

  it("returns false for zero, negatives, and non-powers", () => {
    expect(isValidTokenId(BigInt(0))).toBe(false);
    expect(isValidTokenId(BigInt(-1))).toBe(false);
    expect(isValidTokenId(BigInt(3))).toBe(false);
    expect(isValidTokenId(BigInt(6))).toBe(false);
  });
});

describe("outcomeTokenIds", () => {
  it("emits the full tokenId list in order", () => {
    expect(outcomeTokenIds(4)).toEqual([
      BigInt(1),
      BigInt(2),
      BigInt(4),
      BigInt(8),
    ]);
  });

  it("returns empty array for 0", () => {
    expect(outcomeTokenIds(0)).toEqual([]);
  });
});
