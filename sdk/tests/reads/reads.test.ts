import { describe, expect, it, vi } from "vitest";
import {
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import {
  getAncillaryUpdates,
  getConfig,
  getNumOutcomes,
  getOutcomeAnswer,
  getOutcomeNames,
  getQuestionSnapshot,
  isFinalised,
  predictMarketAddress,
  simulateMint,
  snapshotMarket,
} from "../../src/reads";

const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
const LENS = "0x4AAd5A856941FB64df10362024e3Ece24023d4d1" as Address;
const MARKET = "0x000000000000000000000000000000000000cafe" as Address;
const TREASURY = "0x000000000000000000000000000000000000face" as Address;
const QID =
  "0xabcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123" as Hex;

describe("controller per-question reads", () => {
  it("getNumOutcomes forwards to readContract", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string; args: unknown[] }) =>
        BigInt(3),
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getNumOutcomes({
      publicClient,
      controllerV2: CONTROLLER,
      questionId: QID,
    });
    expect(result).toBe(BigInt(3));
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: CONTROLLER,
      functionName: "getNumOutcomes",
      args: [QID],
    });
  });

  it("getOutcomeAnswer returns bigint", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) => BigInt(1),
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getOutcomeAnswer({
      publicClient,
      controllerV2: CONTROLLER,
      questionId: QID,
    });
    expect(result).toBe(BigInt(1));
  });

  it("getOutcomeNames returns array", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) => ["Yes", "No"],
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getOutcomeNames({
      publicClient,
      controllerV2: CONTROLLER,
      questionId: QID,
    });
    expect(result).toEqual(["Yes", "No"]);
  });

  it("isFinalised returns bool", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) => true,
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await isFinalised({
      publicClient,
      controllerV2: CONTROLLER,
      questionId: QID,
    });
    expect(result).toBe(true);
  });
});

describe("getConfig", () => {
  it("destructures the tuple into a named struct", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string; args: unknown[] }) => [
        TREASURY,
        BigInt(80),
        BigInt(2),
        BigInt(1798761540),
        BigInt(0),
        false,
      ],
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const config = await getConfig({
      publicClient,
      controllerV2: CONTROLLER,
      market: MARKET,
    });
    expect(config).toEqual({
      treasury: TREASURY,
      feeRate: BigInt(80),
      numOutcomes: BigInt(2),
      timestampEnd: BigInt(1798761540),
      answer: BigInt(0),
      isFinalised: false,
    });
  });
});

describe("predictMarketAddress", () => {
  it("forwards the deploy params in order", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string; args: unknown[] }) =>
        MARKET,
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await predictMarketAddress({
      publicClient,
      controllerV2: CONTROLLER,
      collateral: TREASURY,
      parentTokenId: BigInt(0),
      questionId: QID,
      curve: TREASURY,
      timestampStart: BigInt(0),
    });
    expect(result).toBe(MARKET);
    expect(readContract.mock.calls[0]![0].args).toEqual([
      TREASURY,
      BigInt(0),
      QID,
      TREASURY,
      BigInt(0),
    ]);
  });
});

describe("getAncillaryUpdates", () => {
  it("maps tuple struct into named shape", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string; args: unknown[] }) => [
        { timestamp: BigInt(100), update: "0xaa" as Hex },
        { timestamp: BigInt(200), update: "0xbb" as Hex },
      ],
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getAncillaryUpdates({
      publicClient,
      controllerV2: CONTROLLER,
      questionId: QID,
      owner: TREASURY,
    });
    expect(result).toEqual([
      { timestamp: BigInt(100), update: "0xaa" },
      { timestamp: BigInt(200), update: "0xbb" },
    ]);
  });
});

describe("getQuestionSnapshot (multicall composer)", () => {
  it("batches six per-question reads in one multicall", async () => {
    const multicall = vi.fn(
      async (_args: {
        contracts: Array<{ functionName: string }>;
        allowFailure: boolean;
      }) =>
        [
          BigInt(2),                  // numOutcomes
          ["Yes", "No"],              // outcomeNames
          BigInt(1798761540),         // outcomeEnd
          BigInt(0),                  // outcomeAnswer
          false,                      // isFinalised
          BigInt(80),                 // feeRate
        ] as never,
    );
    const publicClient = { multicall } as unknown as PublicClient;
    const snap = await getQuestionSnapshot({
      publicClient,
      controllerV2: CONTROLLER,
      questionId: QID,
      market: MARKET,
    });
    expect(snap).toEqual({
      numOutcomes: BigInt(2),
      outcomeNames: ["Yes", "No"],
      outcomeEnd: BigInt(1798761540),
      outcomeAnswer: BigInt(0),
      isFinalised: false,
      feeRate: BigInt(80),
    });
    const call = multicall.mock.calls[0]![0];
    expect(call.allowFailure).toBe(false);
    expect(call.contracts.map((c) => c.functionName)).toEqual([
      "getNumOutcomes",
      "getOutcomeNames",
      "getOutcomeEnd",
      "getOutcomeAnswer",
      "isFinalised",
      "getFeeRate",
    ]);
  });
});

describe("lens reads", () => {
  it("snapshotMarket forwards to readContract", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string; args: unknown[] }) => ({
        ots: [],
        deploy: {},
        state: {},
      }),
    );
    const publicClient = { readContract } as unknown as PublicClient;
    await snapshotMarket({ publicClient, lensV2: LENS, market: MARKET });
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: LENS,
      functionName: "snapshotMarket",
      args: [MARKET],
    });
  });

  it("simulateMint uses simulateContract (non-view) and defaults dataSwap/dataGuess", async () => {
    const simulateContract = vi.fn(
      async (_args: {
        address: Address;
        functionName: string;
        args: unknown[];
      }) => ({ result: { pre: {}, post: {} } }),
    );
    const publicClient = { simulateContract } as unknown as PublicClient;
    await simulateMint({
      publicClient,
      lensV2: LENS,
      market: MARKET,
      tokenId: BigInt(1),
      amount: BigInt(1000),
      isExactIn: true,
    });
    const call = simulateContract.mock.calls[0]![0];
    expect(call.functionName).toBe("simulateMint");
    expect(call.args).toEqual([
      MARKET,
      BigInt(1),
      BigInt(1000),
      true,
      "0x",
      "0x",
      BigInt(0),
    ]);
  });
});
