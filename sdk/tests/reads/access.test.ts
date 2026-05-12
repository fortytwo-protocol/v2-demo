import { describe, expect, it, vi } from "vitest";
import { type Address, type Hex, type PublicClient } from "viem";
import { getRoleAdmin, hasRole } from "../../src/reads";

const CONTRACT = "0x8Fe93361D2B8b9519C4d20d47a319288Feec9072" as Address;
const ACCOUNT = "0x000000000000000000000000000000000000beef" as Address;
const ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;
const ADMIN_ROLE =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as Hex;

describe("access control reads", () => {
  it("hasRole forwards address/functionName/args and returns the bool", async () => {
    const readContract = vi.fn(
      async (_args: {
        address: Address;
        functionName: string;
        args: unknown[];
      }) => true,
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await hasRole({
      publicClient,
      contract: CONTRACT,
      role: ROLE,
      account: ACCOUNT,
    });
    expect(result).toBe(true);
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: CONTRACT,
      functionName: "hasRole",
      args: [ROLE, ACCOUNT],
    });
  });

  it("getRoleAdmin forwards address/functionName/args and returns the bytes32", async () => {
    const readContract = vi.fn(
      async (_args: {
        address: Address;
        functionName: string;
        args: unknown[];
      }) => ADMIN_ROLE,
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getRoleAdmin({
      publicClient,
      contract: CONTRACT,
      role: ROLE,
    });
    expect(result).toBe(ADMIN_ROLE);
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: CONTRACT,
      functionName: "getRoleAdmin",
      args: [ROLE],
    });
  });
});
