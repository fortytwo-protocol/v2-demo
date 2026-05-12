import { describe, expect, it, vi } from "vitest";
import {
  type Address,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";
import { FT_ADAPTOR_ABI } from "../../src/abi";
import { executeWrite } from "../../src/chain-ops/execute-write";

const ADAPTOR = "0xC07Edb0d2C998267fB8472CB48A2398ee7ACC183" as Address;
const ACCOUNT = "0x000000000000000000000000000000000000beef" as Address;
const TX = "0xdeadbeef00000000000000000000000000000000000000000000000000000001" as Hex;
const QID = "0xabcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123" as Hex;

const fakeReceipt = (hash: Hex): TransactionReceipt =>
  ({
    transactionHash: hash,
    logs: [],
    status: "success",
  }) as unknown as TransactionReceipt;

function makePublicClientMock(opts: {
  simulate: "ok" | "revert";
}): PublicClient {
  const simulateContract = vi.fn(async () => {
    if (opts.simulate === "ok") return { result: undefined } as never;
    throw new Error("revert");
  });
  const waitForTransactionReceipt = vi.fn(
    async ({ hash }: { hash: Hex }) => fakeReceipt(hash),
  );
  return { simulateContract, waitForTransactionReceipt } as unknown as PublicClient;
}

describe("executeWrite", () => {
  it("simulate ok → atomic sendSingle → wait → return", async () => {
    const publicClient = makePublicClientMock({ simulate: "ok" });
    const sendSingle = vi.fn(async () => TX);
    const on = {
      onSimulating: vi.fn(),
      onSubmitted: vi.fn(),
      onMined: vi.fn(),
    };

    const result = await executeWrite({
      publicClient,
      account: ACCOUNT,
      contract: { address: ADAPTOR, abi: FT_ADAPTOR_ABI },
      call: { functionName: "unresolveOutcome", args: [QID] },
      submit: { kind: "atomic", sendSingle },
      on,
    });

    expect(result.txHash).toBe(TX);
    expect(sendSingle).toHaveBeenCalledTimes(1);
    expect(on.onSimulating).toHaveBeenCalledOnce();
    expect(on.onSubmitted).toHaveBeenCalledWith(TX);
    expect(on.onMined).toHaveBeenCalledOnce();
  });

  it("simulate ok → wallet sendTx with role: write → wait", async () => {
    const publicClient = makePublicClientMock({ simulate: "ok" });
    const sendTx = vi.fn(async () => TX);

    const result = await executeWrite({
      publicClient,
      account: ACCOUNT,
      contract: { address: ADAPTOR, abi: FT_ADAPTOR_ABI },
      call: { functionName: "unresolveOutcome", args: [QID] },
      submit: { kind: "wallet", sendTx },
    });

    expect(result.txHash).toBe(TX);
    expect(sendTx).toHaveBeenCalledTimes(1);
    expect(sendTx).toHaveBeenCalledWith(
      expect.objectContaining({ to: ADAPTOR, role: "write" }),
    );
  });

  it("rethrows simulate revert without submitting", async () => {
    const publicClient = makePublicClientMock({ simulate: "revert" });
    const sendSingle = vi.fn();

    await expect(
      executeWrite({
        publicClient,
        account: ACCOUNT,
        contract: { address: ADAPTOR, abi: FT_ADAPTOR_ABI },
        call: { functionName: "unresolveOutcome", args: [QID] },
        submit: { kind: "atomic", sendSingle },
      }),
    ).rejects.toThrow("revert");
    expect(sendSingle).not.toHaveBeenCalled();
  });
});
