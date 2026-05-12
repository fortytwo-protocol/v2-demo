import { describe, expect, it, vi } from "vitest";
import {
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import {
  grantRole,
  pauseController,
  renounceRole,
  revokeRole,
  setFeeRateDefault,
  setFeeRateOverride,
  setTreasury,
  setWhitelistedCollateral,
  setWhitelistedCurve,
  unpauseController,
} from "../../src/chain-ops";

const ADAPTOR = "0xC07Edb0d2C998267fB8472CB48A2398ee7ACC183" as Address;
const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
const ACCOUNT = "0x000000000000000000000000000000000000beef" as Address;
const TX =
  "0xdeadbeef00000000000000000000000000000000000000000000000000000001" as Hex;
const ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;
const TARGET_USER = "0x000000000000000000000000000000000000face" as Address;

const fakeReceipt = (hash: Hex): TransactionReceipt =>
  ({ transactionHash: hash, logs: [], status: "success" }) as unknown as TransactionReceipt;

function makeMocks() {
  const simulateContract = vi.fn(
    async (_args: {
      address: Address;
      functionName: string;
      args: unknown[];
    }) => ({ result: undefined }) as never,
  );
  const waitForTransactionReceipt = vi.fn(
    async ({ hash }: { hash: Hex }) => fakeReceipt(hash),
  );
  const publicClient = {
    simulateContract,
    waitForTransactionReceipt,
  } as unknown as PublicClient;
  const sendSingle = vi.fn(async () => TX);
  return { publicClient, simulateContract, sendSingle };
}

describe("setFeeRateOverride", () => {
  it("calls FTControllerV2.setFeeRateOverride(market, fee, isOverride)", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await setFeeRateOverride({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      market: TARGET_USER,
      feeRate: 100,
      isOverride: true,
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.functionName).toBe("setFeeRateOverride");
    expect(sim.args).toEqual([TARGET_USER, BigInt(100), true]);
  });
});

describe("setFeeRateDefault", () => {
  it("encodes fee as bigint", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await setFeeRateDefault({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      feeRate: 50,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].args).toEqual([BigInt(50)]);
  });
});

describe("setWhitelistedCollateral", () => {
  it("includes seedMin", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await setWhitelistedCollateral({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      collateral: TARGET_USER,
      whitelist: true,
      collateralSeedMin: BigInt(1000),
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].args).toEqual([
      TARGET_USER,
      true,
      BigInt(1000),
    ]);
  });
});

describe("setWhitelistedCurve", () => {
  it("calls with curve + flag", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await setWhitelistedCurve({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      curve: TARGET_USER,
      whitelist: false,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].args).toEqual([TARGET_USER, false]);
  });
});

describe("setTreasury / pause / unpause", () => {
  it("setTreasury passes the address", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await setTreasury({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      treasury: TARGET_USER,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].args).toEqual([TARGET_USER]);
  });

  it("pauseController calls pause()", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await pauseController({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].functionName).toBe("pause");
  });

  it("unpauseController calls unpause()", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await unpauseController({
      publicClient,
      account: ACCOUNT,
      controllerV2: CONTROLLER,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].functionName).toBe("unpause");
  });
});

describe("AccessControl (generic)", () => {
  it("grantRole on adaptor targets adaptor address", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await grantRole({
      publicClient,
      account: ACCOUNT,
      address: ADAPTOR,
      role: ROLE,
      who: TARGET_USER,
      submit: { kind: "atomic", sendSingle },
    });
    const sim = simulateContract.mock.calls[0]![0];
    expect(sim.address).toBe(ADAPTOR);
    expect(sim.functionName).toBe("grantRole");
    expect(sim.args).toEqual([ROLE, TARGET_USER]);
  });

  it("revokeRole on controller targets controller address", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await revokeRole({
      publicClient,
      account: ACCOUNT,
      address: CONTROLLER,
      role: ROLE,
      who: TARGET_USER,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].address).toBe(CONTROLLER);
    expect(simulateContract.mock.calls[0]![0].functionName).toBe("revokeRole");
  });

  it("renounceRole encodes correctly", async () => {
    const { publicClient, simulateContract, sendSingle } = makeMocks();
    await renounceRole({
      publicClient,
      account: ACCOUNT,
      address: CONTROLLER,
      role: ROLE,
      who: TARGET_USER,
      submit: { kind: "atomic", sendSingle },
    });
    expect(simulateContract.mock.calls[0]![0].functionName).toBe("renounceRole");
  });
});
