import { describe, expect, it } from "vitest";
import { encodeOutcomes, decodeOutcomes } from "../src/lib/outcomes";

describe("encodeOutcomes / decodeOutcomes", () => {
  it("encodes a single index as 2^index", () => {
    expect(encodeOutcomes([0])).toBe(BigInt(1));
    expect(encodeOutcomes([1])).toBe(BigInt(2));
    expect(encodeOutcomes([2])).toBe(BigInt(4));
    expect(encodeOutcomes([5])).toBe(BigInt(32));
  });

  it("OR-combines multiple indices into a bitmask", () => {
    expect(encodeOutcomes([0, 2, 5])).toBe(BigInt(37));
    expect(encodeOutcomes([1, 3])).toBe(BigInt(10));
  });

  it("is order-insensitive", () => {
    expect(encodeOutcomes([5, 2, 0])).toBe(encodeOutcomes([0, 2, 5]));
  });

  it("decodes back into the same set", () => {
    const indices = [0, 2, 5, 8];
    const answer = encodeOutcomes(indices);
    expect(decodeOutcomes(answer)).toEqual(indices);
  });

  it("decodes empty answer to []", () => {
    expect(decodeOutcomes(BigInt(0))).toEqual([]);
  });

  it("rejects negative indices", () => {
    expect(() => encodeOutcomes([-1])).toThrow(/negative/);
  });

  it("supports indices well above 32", () => {
    const answer = encodeOutcomes([60, 100]);
    expect(decodeOutcomes(answer)).toEqual([60, 100]);
  });
});
