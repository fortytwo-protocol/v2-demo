import { describe, it, expect, beforeEach } from "vitest";
import {
  loadRecents,
  touchRecent,
  forgetRecent,
  clearRecents,
} from "../src/lib/recents";
import type { Address } from "viem";

const A = "0x1111111111111111111111111111111111111111" as Address;
const B = "0x2222222222222222222222222222222222222222" as Address;
const C = "0x3333333333333333333333333333333333333333" as Address;

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
  key() {
    return null;
  }
  get length() {
    return this.store.size;
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage() as unknown as Storage;
});

describe("recents", () => {
  it("starts empty", () => {
    expect(loadRecents()).toEqual([]);
  });

  it("adds an entry on first touch", () => {
    touchRecent(A, "production", "Hello");
    const list = loadRecents();
    expect(list).toHaveLength(1);
    expect(list[0]!.address).toBe(A);
    expect(list[0]!.label).toBe("Hello");
    expect(list[0]!.env).toBe("production");
  });

  it("bumps lastTouched on repeat touch, dedups by (address, env)", () => {
    touchRecent(A, "production");
    const firstStamp = loadRecents()[0]!.lastTouched;
    const after = firstStamp + 1000;
    const realDateNow = Date.now;
    Date.now = () => after;
    try {
      touchRecent(A, "production");
    } finally {
      Date.now = realDateNow;
    }
    const list = loadRecents();
    expect(list).toHaveLength(1);
    expect(list[0]!.lastTouched).toBeGreaterThan(firstStamp);
  });

  it("treats same address on different envs as separate entries", () => {
    touchRecent(A, "production", "Prod");
    touchRecent(A, "staging", "Stage");
    const list = loadRecents();
    expect(list).toHaveLength(2);
  });

  it("preserves the prior label when no new label is provided", () => {
    touchRecent(A, "production", "First label");
    touchRecent(A, "production");
    expect(loadRecents()[0]!.label).toBe("First label");
  });

  it("orders by lastTouched desc", () => {
    touchRecent(A, "production", "A");
    touchRecent(B, "production", "B");
    touchRecent(C, "production", "C");
    const list = loadRecents();
    expect(list.map((r) => r.address)).toEqual([C, B, A]);
  });

  it("evicts oldest entries past the cap", () => {
    const addresses: Address[] = Array.from({ length: 25 }, (_, i) => {
      return (`0x${String(i + 1).padStart(40, "0")}`) as Address;
    });
    let stamp = 1_000_000;
    const realDateNow = Date.now;
    try {
      for (const addr of addresses) {
        stamp += 1;
        Date.now = () => stamp;
        touchRecent(addr, "production");
      }
    } finally {
      Date.now = realDateNow;
    }
    const list = loadRecents();
    expect(list).toHaveLength(20);
    expect(list.find((r) => r.address === addresses[0])).toBeUndefined();
    expect(list.find((r) => r.address === addresses[4])).toBeUndefined();
    expect(list.find((r) => r.address === addresses[5])).toBeDefined();
  });

  it("forgets an address scoped to env", () => {
    touchRecent(A, "production");
    touchRecent(B, "production");
    forgetRecent(A, "production");
    const list = loadRecents();
    expect(list).toHaveLength(1);
    expect(list[0]!.address).toBe(B);
  });

  it("clears all", () => {
    touchRecent(A, "production");
    touchRecent(B, "staging");
    clearRecents();
    expect(loadRecents()).toEqual([]);
  });
});
