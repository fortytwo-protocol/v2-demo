import { describe, expect, it, vi } from "vitest";
import { type Address, type Hex, type PublicClient } from "viem";
import {
  getTotalMarketCap,
  getTotalSupplies,
  readMarketDeployParams,
  readMarketState,
  simPayout,
} from "../../src/reads/market";

const MARKET = "0x000000000000000000000000000000000000cafe" as Address;
const CURVE = "0x000000000000000000000000000000000000beef" as Address;
const TREASURY = "0x000000000000000000000000000000000000face" as Address;
const COLLATERAL = "0x000000000000000000000000000000000000c011" as Address;
const QID =
  "0xabcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123" as Hex;

describe("readMarketState", () => {
  it("maps the readState tuple into a named struct", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) => ({
        market: MARKET,
        curve: CURVE,
        timestampStart: BigInt(1700000000),
        totalMarketCap: BigInt(123456),
        treasury: TREASURY,
        numOutcomes: BigInt(2),
        timestampEnd: BigInt(1798761540),
        answer: BigInt(0),
        isFinalised: false,
      }),
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const state = await readMarketState({ publicClient, market: MARKET });
    expect(state).toEqual({
      market: MARKET,
      curve: CURVE,
      timestampStart: BigInt(1700000000),
      totalMarketCap: BigInt(123456),
      treasury: TREASURY,
      numOutcomes: BigInt(2),
      timestampEnd: BigInt(1798761540),
      answer: BigInt(0),
      isFinalised: false,
    });
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: MARKET,
      functionName: "readState",
    });
  });
});

describe("readMarketDeployParams", () => {
  it("maps the deploy-params tuple into a named struct", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) => ({
        collateral: COLLATERAL,
        parentTokenId: BigInt(0),
        questionId: QID,
        curve: CURVE,
        timestampStart: BigInt(1700000000),
      }),
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const params = await readMarketDeployParams({
      publicClient,
      market: MARKET,
    });
    expect(params).toEqual({
      collateral: COLLATERAL,
      parentTokenId: BigInt(0),
      questionId: QID,
      curve: CURVE,
      timestampStart: BigInt(1700000000),
    });
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: MARKET,
      functionName: "readMarketDeployParams",
    });
  });
});

describe("getTotalSupplies", () => {
  it("forwards to readContract and returns the array", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) => [
        BigInt(100),
        BigInt(200),
      ],
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const supplies = await getTotalSupplies({ publicClient, market: MARKET });
    expect(supplies).toEqual([BigInt(100), BigInt(200)]);
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: MARKET,
      functionName: "totalSupplies",
    });
  });
});

describe("getTotalMarketCap", () => {
  it("forwards to readContract and returns the bigint", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) =>
        BigInt(999_999),
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const cap = await getTotalMarketCap({ publicClient, market: MARKET });
    expect(cap).toBe(BigInt(999_999));
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: MARKET,
      functionName: "totalMarketCap",
    });
  });
});

describe("simPayout", () => {
  it("forwards args in (answerSim, otUserWinning) order", async () => {
    const readContract = vi.fn(
      async (_args: {
        address: Address;
        functionName: string;
        args: unknown[];
      }) => BigInt(42),
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const payout = await simPayout({
      publicClient,
      market: MARKET,
      answerSim: BigInt(1),
      otUserWinning: BigInt(1000),
    });
    expect(payout).toBe(BigInt(42));
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: MARKET,
      functionName: "simPayout",
      args: [BigInt(1), BigInt(1000)],
    });
  });
});
