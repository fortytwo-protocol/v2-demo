import { describe, expect, it, vi } from "vitest";
import {
  encodeAbiParameters,
  encodeEventTopics,
  maxUint256,
  pad,
  type Address,
  type Hex,
  type Log,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { FT_CONTROLLER_V2_ABI } from "../../src/abi";
import { deployMarketV2 } from "../../src/deploy/deploy-v2";
import type { V2DeployArgs } from "../../src/deploy/v2-args";

const CONTROLLER = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
const ORACLE = "0x000000000000000000000000000000000000aabb" as Address;
const ACCOUNT = "0x000000000000000000000000000000000000bEEF" as Address;
const COLLATERAL = "0x55d398326f99059fF775485246999027B3197955" as Address;
const QID =
  "0xabcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123" as Hex;
const MARKET = "0x000000000000000000000000000000000000cafe" as Address;
const TX_DEPLOY =
  "0xdeadbeef00000000000000000000000000000000000000000000000000000001" as Hex;
const TX_APPROVE =
  "0xdeadbeef00000000000000000000000000000000000000000000000000000002" as Hex;

const fakeArgs: V2DeployArgs = {
  paramsQuestion: {
    timestampEnd: BigInt(1798761540),
    title: "test",
    ancillaryData: "0x" as Hex,
    imageUri: "",
    outcomeNames: ["Yes", "No"],
    outcomeImageUris: ["", ""],
  },
  paramsMarket: {
    parentTokenId: BigInt(0),
    collateral: COLLATERAL,
    curve: "0x000000000000000000000000000000000000c0Fe" as Address,
    timestampStart: BigInt(1798000000),
  },
  oracle: ORACLE,
  otSeedWei: BigInt(10000) * BigInt(10) ** BigInt(18),
};

function buildCreateNewMarketLog(): Log {
  const topics = encodeEventTopics({
    abi: FT_CONTROLLER_V2_ABI,
    eventName: "CreateNewMarket",
    args: { market: MARKET },
  });
  const data = encodeAbiParameters(
    [
      { type: "address" }, // collateral
      { type: "uint256" }, // parentTokenId
      { type: "bytes32" }, // questionId
      { type: "address" }, // curve
      { type: "uint256" }, // timestampStart
    ],
    [
      COLLATERAL,
      BigInt(0),
      QID,
      "0x000000000000000000000000000000000000c0Fe" as Address,
      BigInt(1798000000),
    ],
  );
  return {
    address: CONTROLLER,
    topics: topics as [Hex, ...Hex[]],
    data,
    blockNumber: BigInt(1),
    blockHash: pad("0x01", { size: 32 }),
    logIndex: 0,
    transactionHash: pad("0x01", { size: 32 }),
    transactionIndex: 0,
    removed: false,
  } as unknown as Log;
}

const fakeReceipt = (hash: Hex, logs: Log[] = []): TransactionReceipt =>
  ({
    transactionHash: hash,
    logs,
    status: "success",
  }) as unknown as TransactionReceipt;

function makePublicClientMock(opts: {
  /** Pre-existing allowance. "max" → satisfied; "zero" → triggers approve. */
  allowance: "max" | "zero";
  simulate?: "ok" | "throw";
  receiptLogs?: Log[];
}): PublicClient {
  const readContract = vi.fn(async (args: { functionName: string }) => {
    if (args.functionName === "allowance") {
      return opts.allowance === "max" ? maxUint256 : BigInt(0);
    }
    throw new Error(`unexpected readContract call: ${args.functionName}`);
  });
  const simulateContract = vi.fn(async () => {
    if (opts.simulate === "throw") throw new Error("some other revert");
    return { result: [QID, MARKET] } as never;
  });
  const waitForTransactionReceipt = vi.fn(
    async ({ hash }: { hash: Hex }) =>
      fakeReceipt(hash, opts.receiptLogs ?? []),
  );
  return {
    readContract,
    simulateContract,
    waitForTransactionReceipt,
  } as unknown as PublicClient;
}

describe("deployMarketV2", () => {
  it("happy path: allowance satisfied → simulate → atomic sendSingle → wait → return", async () => {
    const publicClient = makePublicClientMock({ allowance: "max" });
    const sendSingle = vi.fn(async () => TX_DEPLOY);
    const sendBatch = vi.fn();
    const on = {
      onSimulating: vi.fn(),
      onApproveSubmitted: vi.fn(),
      onApproveMined: vi.fn(),
      onDeploySubmitted: vi.fn(),
      onDeployMined: vi.fn(),
    };

    const result = await deployMarketV2({
      publicClient,
      args: fakeArgs,
      controllerV2: CONTROLLER,
      account: ACCOUNT,
      submit: { kind: "atomic", sendSingle, sendBatch },
      on,
    });

    expect(result.txHash).toBe(TX_DEPLOY);
    expect(result.questionId).toBe(QID);
    expect(result.marketAddress).toBe(MARKET);
    expect(sendSingle).toHaveBeenCalledTimes(1);
    expect(sendSingle).toHaveBeenCalledWith(CONTROLLER, expect.any(String));
    expect(sendBatch).not.toHaveBeenCalled();
    expect(on.onSimulating).toHaveBeenCalledOnce();
    expect(on.onDeploySubmitted).toHaveBeenCalledWith(TX_DEPLOY);
    expect(on.onDeployMined).toHaveBeenCalledOnce();
    expect(on.onApproveSubmitted).not.toHaveBeenCalled();
    expect(on.onApproveMined).not.toHaveBeenCalled();
  });

  it("happy path: wallet sendTx with role: deploy", async () => {
    const publicClient = makePublicClientMock({ allowance: "max" });
    const sendTx = vi.fn(async () => TX_DEPLOY);

    const result = await deployMarketV2({
      publicClient,
      args: fakeArgs,
      controllerV2: CONTROLLER,
      account: ACCOUNT,
      submit: { kind: "wallet", sendTx },
    });

    expect(result.txHash).toBe(TX_DEPLOY);
    expect(sendTx).toHaveBeenCalledTimes(1);
    expect(sendTx).toHaveBeenCalledWith(
      expect.objectContaining({ to: CONTROLLER, role: "deploy" }),
    );
  });

  it("simulate is invoked with the 4-arg controller call shape", async () => {
    const publicClient = makePublicClientMock({ allowance: "max" });
    const simulateSpy = publicClient.simulateContract as unknown as ReturnType<
      typeof vi.fn
    >;
    const sendSingle = vi.fn(async () => TX_DEPLOY);

    await deployMarketV2({
      publicClient,
      args: fakeArgs,
      controllerV2: CONTROLLER,
      account: ACCOUNT,
      submit: { kind: "atomic", sendSingle, sendBatch: vi.fn() },
    });

    const simCall = simulateSpy.mock.calls[0]![0] as {
      address: Address;
      functionName: string;
      args: readonly unknown[];
    };
    expect(simCall.address).toBe(CONTROLLER);
    expect(simCall.functionName).toBe("deployMarket");
    expect(simCall.args).toHaveLength(4);
    expect(simCall.args[2]).toBe(ORACLE);
  });

  it("throws when args.oracle is missing", async () => {
    const publicClient = makePublicClientMock({ allowance: "max" });
    const argsNoOracle: V2DeployArgs = { ...fakeArgs, oracle: undefined };

    await expect(
      deployMarketV2({
        publicClient,
        args: argsNoOracle,
        controllerV2: CONTROLLER,
        account: ACCOUNT,
        submit: { kind: "atomic", sendSingle: vi.fn(), sendBatch: vi.fn() },
      }),
    ).rejects.toThrow(/args\.oracle is required/);
  });

  it("allowance short: atomic strategy uses sendBatch (skips simulate)", async () => {
    const publicClient = makePublicClientMock({
      allowance: "zero",
      receiptLogs: [buildCreateNewMarketLog()],
    });
    const sendSingle = vi.fn();
    const sendBatch = vi.fn(
      async (_calls: Array<{ to: Address; data: Hex; value?: bigint }>) =>
        TX_DEPLOY,
    );
    const on = { onApproveSubmitted: vi.fn(), onDeploySubmitted: vi.fn() };

    await deployMarketV2({
      publicClient,
      args: fakeArgs,
      controllerV2: CONTROLLER,
      account: ACCOUNT,
      submit: { kind: "atomic", sendSingle, sendBatch },
      on,
    });

    expect(sendSingle).not.toHaveBeenCalled();
    expect(sendBatch).toHaveBeenCalledTimes(1);
    const calls = sendBatch.mock.calls[0]![0];
    expect(calls).toHaveLength(2);
    expect(calls[0]!.to).toBe(COLLATERAL); // approve
    expect(calls[1]!.to).toBe(CONTROLLER); // deploy
    expect(on.onDeploySubmitted).toHaveBeenCalledWith(TX_DEPLOY);
    expect(on.onApproveSubmitted).not.toHaveBeenCalled();
    expect(publicClient.simulateContract).not.toHaveBeenCalled();
  });

  it("allowance short: wallet strategy sends approve then simulates then deploys", async () => {
    const publicClient = makePublicClientMock({
      allowance: "zero",
      receiptLogs: [buildCreateNewMarketLog()],
    });
    const seq: string[] = [];
    const sendTx = vi.fn(async (req: { role: string }) => {
      seq.push(req.role);
      return req.role === "approve" ? TX_APPROVE : TX_DEPLOY;
    });
    const on = {
      onApproveSubmitted: vi.fn(),
      onApproveMined: vi.fn(),
      onDeploySubmitted: vi.fn(),
      onDeployMined: vi.fn(),
    };

    await deployMarketV2({
      publicClient,
      args: fakeArgs,
      controllerV2: CONTROLLER,
      account: ACCOUNT,
      submit: { kind: "wallet", sendTx },
      on,
    });

    expect(seq).toEqual(["approve", "deploy"]);
    expect(on.onApproveSubmitted).toHaveBeenCalledWith(TX_APPROVE);
    expect(on.onApproveMined).toHaveBeenCalledOnce();
    expect(on.onDeploySubmitted).toHaveBeenCalledWith(TX_DEPLOY);
    expect(on.onDeployMined).toHaveBeenCalledOnce();
    // Wallet path simulates after approve mines, before deploy signing.
    expect(publicClient.simulateContract).toHaveBeenCalledOnce();
  });

  it("rethrows simulate errors unchanged when allowance is already satisfied", async () => {
    const publicClient = makePublicClientMock({
      allowance: "max",
      simulate: "throw",
    });
    const sendSingle = vi.fn();

    await expect(
      deployMarketV2({
        publicClient,
        args: fakeArgs,
        controllerV2: CONTROLLER,
        account: ACCOUNT,
        submit: { kind: "atomic", sendSingle, sendBatch: vi.fn() },
      }),
    ).rejects.toThrow("some other revert");

    expect(sendSingle).not.toHaveBeenCalled();
  });

  it("throws clearly when receipt has no CreateNewMarket event and no simulated fallback", async () => {
    const publicClient = makePublicClientMock({ allowance: "zero" });
    const sendBatch = vi.fn(async () => TX_DEPLOY);

    await expect(
      deployMarketV2({
        publicClient,
        args: fakeArgs,
        controllerV2: CONTROLLER,
        account: ACCOUNT,
        submit: { kind: "atomic", sendSingle: vi.fn(), sendBatch },
      }),
    ).rejects.toThrow(/CreateNewMarket event was missing/);
  });
});
