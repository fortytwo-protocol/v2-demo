import { describe, expect, it } from "vitest";
import { encodeFunctionData, type Address } from "viem";
import { FT_ADAPTOR_ABI } from "../../src/abi";
import { buildSeedOutcomesArgs, OT_DECIMALS } from "../../src/seed/args";

const MARKET_ADDRESS =
  "0x1234567890abcdef1234567890abcdef12345678" as Address;
const TID0 = BigInt(1);
const TID1 = BigInt(2);

describe("buildSeedOutcomesArgs", () => {
  it("scales human-readable otAmounts by OT_DECIMALS = 18", () => {
    const args = buildSeedOutcomesArgs({
      marketAddress: MARKET_ADDRESS,
      tokenIds: [TID0, TID1],
      otAmounts: [1000, "1.5"],
    });
    expect(OT_DECIMALS).toBe(18);
    expect(args.tokenIds).toEqual([TID0, TID1]);
    expect(args.otAmounts).toEqual([
      BigInt(1000) * BigInt(10) ** BigInt(18),
      BigInt("1500000000000000000"),
    ]);
  });

  it("passes through pre-scaled bigint amounts unchanged", () => {
    const raw = BigInt("123456789");
    const args = buildSeedOutcomesArgs({
      marketAddress: MARKET_ADDRESS,
      tokenIds: [TID0],
      otAmounts: [raw],
    });
    expect(args.otAmounts).toEqual([raw]);
  });

  it("rejects empty input", () => {
    expect(() =>
      buildSeedOutcomesArgs({
        marketAddress: MARKET_ADDRESS,
        tokenIds: [],
        otAmounts: [],
      }),
    ).toThrow(/at least one tokenId/);
  });

  it("rejects mismatched array lengths", () => {
    expect(() =>
      buildSeedOutcomesArgs({
        marketAddress: MARKET_ADDRESS,
        tokenIds: [TID0, TID1],
        otAmounts: [BigInt(1)],
      }),
    ).toThrow(/length mismatch/);
  });

  it("encodes deterministic FTAdaptor.seedLiquidity calldata", () => {
    const args = buildSeedOutcomesArgs({
      marketAddress: MARKET_ADDRESS,
      tokenIds: [TID0, TID1],
      otAmounts: [1000, 2000],
    });
    const calldata = encodeFunctionData({
      abi: FT_ADAPTOR_ABI,
      functionName: "seedLiquidity",
      args: [args.marketAddress, args.tokenIds, args.otAmounts],
    });
    expect(calldata).toMatchSnapshot();
  });
});
