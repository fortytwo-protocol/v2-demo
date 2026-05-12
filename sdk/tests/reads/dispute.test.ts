import { describe, expect, it, vi } from "vitest";
import { type Address, type Hex, type PublicClient } from "viem";
import {
  getDisputeAncillaryUpdates,
  getDisputeAncillaryUpdatesPaginated,
  getLatestDisputeAncillaryUpdate,
} from "../../src/reads";

const REGISTRY = "0x1111111111111111111111111111111111111111" as Address;
const OWNER = "0x000000000000000000000000000000000000face" as Address;
const QID =
  "0xabcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123" as Hex;

describe("dispute registry reads", () => {
  it("getLatestDisputeAncillaryUpdate maps tuple struct into named shape", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string; args: unknown[] }) => ({
        timestamp: BigInt(123),
        answerProposed: BigInt(1),
        data: "0xdead" as Hex,
      }),
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getLatestDisputeAncillaryUpdate({
      publicClient,
      disputeRegistry: REGISTRY,
      questionId: QID,
      owner: OWNER,
    });
    expect(result).toEqual({
      timestamp: BigInt(123),
      answerProposed: BigInt(1),
      data: "0xdead",
    });
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: REGISTRY,
      functionName: "getLatestDisputeAncillaryUpdate",
      args: [QID, OWNER],
    });
  });

  it("getDisputeAncillaryUpdates maps array of tuples", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string; args: unknown[] }) => [
        { timestamp: BigInt(100), answerProposed: BigInt(0), data: "0xaa" as Hex },
        { timestamp: BigInt(200), answerProposed: BigInt(1), data: "0xbb" as Hex },
      ],
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getDisputeAncillaryUpdates({
      publicClient,
      disputeRegistry: REGISTRY,
      questionId: QID,
      owner: OWNER,
    });
    expect(result).toEqual([
      { timestamp: BigInt(100), answerProposed: BigInt(0), data: "0xaa" },
      { timestamp: BigInt(200), answerProposed: BigInt(1), data: "0xbb" },
    ]);
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: REGISTRY,
      functionName: "getDisputeAncillaryUpdates",
      args: [QID, OWNER],
    });
  });

  it("getDisputeAncillaryUpdatesPaginated forwards offset/limit", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string; args: unknown[] }) => [
        { timestamp: BigInt(300), answerProposed: BigInt(2), data: "0xcc" as Hex },
      ],
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getDisputeAncillaryUpdatesPaginated({
      publicClient,
      disputeRegistry: REGISTRY,
      questionId: QID,
      owner: OWNER,
      offset: BigInt(5),
      limit: BigInt(10),
    });
    expect(result).toEqual([
      { timestamp: BigInt(300), answerProposed: BigInt(2), data: "0xcc" },
    ]);
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: REGISTRY,
      functionName: "getDisputeAncillaryUpdatesPaginated",
      args: [QID, OWNER, BigInt(5), BigInt(10)],
    });
  });
});
