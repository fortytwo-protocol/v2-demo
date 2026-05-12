import { describe, expect, it, vi } from "vitest";
import { type Address, type PublicClient } from "viem";
import {
  getControllerV1,
  getControllerV2,
  getMarketVersion,
} from "../../src/reads";

const ROUTER = "0x1111111111111111111111111111111111111111" as Address;
const CONTROLLER_V1 = "0x2222222222222222222222222222222222222222" as Address;
const CONTROLLER_V2 = "0x3333333333333333333333333333333333333333" as Address;
const MARKET = "0x000000000000000000000000000000000000cafe" as Address;

describe("router reads", () => {
  it("getControllerV1 forwards to readContract and returns address", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) =>
        CONTROLLER_V1,
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getControllerV1({ publicClient, routerV2: ROUTER });
    expect(result).toBe(CONTROLLER_V1);
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: ROUTER,
      functionName: "controllerV1",
    });
  });

  it("getControllerV2 forwards to readContract and returns address", async () => {
    const readContract = vi.fn(
      async (_args: { address: Address; functionName: string }) =>
        CONTROLLER_V2,
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getControllerV2({ publicClient, routerV2: ROUTER });
    expect(result).toBe(CONTROLLER_V2);
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: ROUTER,
      functionName: "controllerV2",
    });
  });

  it("getMarketVersion forwards market arg and returns number", async () => {
    const readContract = vi.fn(
      async (_args: {
        address: Address;
        functionName: string;
        args: unknown[];
      }) => 2,
    );
    const publicClient = { readContract } as unknown as PublicClient;
    const result = await getMarketVersion({
      publicClient,
      routerV2: ROUTER,
      market: MARKET,
    });
    expect(result).toBe(2);
    expect(readContract.mock.calls[0]![0]).toMatchObject({
      address: ROUTER,
      functionName: "isMarketVersion",
      args: [MARKET],
    });
  });
});
