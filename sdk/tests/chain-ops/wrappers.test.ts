import { describe, expect, it, vi } from "vitest";
import {
  maxUint256,
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import {
  addOutcomes,
  extendMarket,
  finaliseMarket,
  finaliseMarketManually,
  flagMarket,
  postUpdate,
  resolveMarket,
  seedOutcomes,
  setMarketImage,
  setOutcomeImage,
  unflagMarket,
  unresolveMarket,
} from "../../src/chain-ops";

const ADAPTOR = "0xC07Edb0d2C998267fB8472CB48A2398ee7ACC183" as Address;
const ACCOUNT = "0x000000000000000000000000000000000000beef" as Address;
const QID = "0xabcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123" as Hex;
const MARKET = "0x000000000000000000000000000000000000cafe" as Address;
const TX = "0xdeadbeef00000000000000000000000000000000000000000000000000000001" as Hex;

const fakeReceipt = (hash: Hex): TransactionReceipt =>
  ({
    transactionHash: hash,
    logs: [],
    status: "success",
  }) as unknown as TransactionReceipt;

function makeMocks(opts: { allowance?: "max" | "zero" } = {}) {
  const allowance = opts.allowance ?? "max";
  const simulateContract = vi.fn(
    async (_args: {
      address: Address;
      functionName: string;
      args: unknown[];
    }) => ({ result: undefined }) as never,
  );
  const readContract = vi.fn(async (args: { functionName: string }) => {
    if (args.functionName === "allowance") {
      return allowance === "max" ? maxUint256 : BigInt(0);
    }
    throw new Error(`unexpected readContract call: ${args.functionName}`);
  });
  const waitForTransactionReceipt = vi.fn(
    async ({ hash }: { hash: Hex }) => fakeReceipt(hash),
  );
  const publicClient = {
    readContract,
    simulateContract,
    waitForTransactionReceipt,
  } as unknown as PublicClient;
  const sendSingle = vi.fn(async () => TX);
  return { publicClient, simulateContract, sendSingle };
}

describe("resolveMarket", () => {
  it("calls FTControllerV2.resolveOutcome(questionId, answer)", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await resolveMarket({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      answer: 1,
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(CONTROLLER);
    expect(sim.functionName).toBe("resolveOutcome");
    expect(sim.args).toEqual([QID, BigInt(1)]);
  });
});

describe("unresolveMarket", () => {
  it("calls FTControllerV2.unresolveOutcome(questionId)", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await unresolveMarket({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(CONTROLLER);
    expect(sim.functionName).toBe("unresolveOutcome");
    expect(sim.args).toEqual([QID]);
  });
});

describe("finaliseMarket", () => {
  it("calls FTControllerV2.finaliseOutcome(questionId, answer)", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await finaliseMarket({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      answer: 2,
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(CONTROLLER);
    expect(sim.functionName).toBe("finaliseOutcome");
    expect(sim.args).toEqual([QID, BigInt(2)]);
  });
});

describe("extendMarket", () => {
  it("calls FTControllerV2.modifyTimestampEnd", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await extendMarket({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      newEndTimestamp: 1798761540,
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(CONTROLLER);
    expect(sim.functionName).toBe("modifyTimestampEnd");
    expect(sim.args).toEqual([QID, BigInt(1798761540)]);
  });
});

describe("seedOutcomes", () => {
  const COLLATERAL = "0x000000000000000000000000000000000000c01a" as Address;

  it("calls FTControllerV2.seedLiquidity", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    const sendBatch = vi.fn(async () => TX);
    await seedOutcomes({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      marketAddress: MARKET,
      collateral: COLLATERAL,
      tokenIds: [BigInt(1), BigInt(2)],
      otAmounts: [1000, "500"],
      submit: { kind: "atomic", sendSingle, sendBatch },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(CONTROLLER);
    expect(sim.functionName).toBe("seedLiquidity");
  });

  it("emits approve+seed batch when allowance is short (atomic strategy)", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, sendSingle } = makeMocks({ allowance: "zero" });
    const sendBatch = vi.fn(
      async (
        _calls: Array<{ to: Address; data: Hex; value?: bigint }>,
      ) => TX,
    );
    await seedOutcomes({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      marketAddress: MARKET,
      collateral: COLLATERAL,
      tokenIds: [BigInt(1)],
      otAmounts: [BigInt(1)],
      submit: { kind: "atomic", sendSingle, sendBatch },
    });
    expect(sendBatch).toHaveBeenCalledOnce();
    const calls = sendBatch.mock.calls[0]![0];
    expect(calls[0]!.to).toBe(COLLATERAL);
    expect(calls[1]!.to).toBe(CONTROLLER);
    expect(sendSingle).not.toHaveBeenCalled();
    expect(publicClient.simulateContract).not.toHaveBeenCalled();
  });
});

const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;

describe("addOutcomes", () => {
  it("calls FTControllerV2.addOutcomes (plural)", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await addOutcomes({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      outcomes: [{ name: "Yes", imageUri: "y.png" }],
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.functionName).toBe("addOutcomes");
    expect(sim.address).toBe(CONTROLLER);
  });
});

describe("setMarketImage", () => {
  it("calls FTControllerV2.setImageUri", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await setMarketImage({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      imageUri: "ipfs://X",
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(CONTROLLER);
    expect(sim.functionName).toBe("setImageUri");
  });
});

describe("setOutcomeImage", () => {
  it("calls FTControllerV2.setOutcomeImageUri", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await setOutcomeImage({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      outcomeIndex: 1,
      imageUri: "ipfs://Y",
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(CONTROLLER);
    expect(sim.functionName).toBe("setOutcomeImageUri");
  });
});

describe("postUpdate", () => {
  it("calls FTControllerV2.postUpdate", async () => {
    const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await postUpdate({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      data: "0xdeadbeef" as Hex,
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(CONTROLLER);
    expect(sim.functionName).toBe("postUpdate");
  });
});

describe("flag/unflag", () => {
  it("flagMarket calls FTControllerV2.flag(qid)", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await flagMarket({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].functionName).toBe("flag");
  });

  it("unflagMarket calls FTControllerV2.unflag(qid)", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await unflagMarket({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].functionName).toBe("unflag");
  });
});

describe("finaliseMarketManually", () => {
  it("calls FTControllerV2.finaliseManually(qid, answer)", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await finaliseMarketManually({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      questionId: QID,
      answer: 5,
      submit: { kind: "atomic", sendSingle },
    });
    const simArgs = simulateContract.mock.calls[0]![0];
    expect(simArgs.functionName).toBe("finaliseManually");
    expect(simArgs.args).toEqual([QID, BigInt(5)]);
  });
});
