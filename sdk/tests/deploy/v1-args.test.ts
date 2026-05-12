import { describe, expect, it } from "vitest";
import { encodeFunctionData, type Hex } from "viem";
import { FT_MARKET_CONTROLLER_ABI } from "../../src/abi";
import {
  buildV1DeployArgs,
  V1_FEE_RATE_SCALE,
  type V1DeployFlatInput,
} from "../../src/deploy/v1-args";

const fixtureFlat: V1DeployFlatInput = {
  title: "Will ETH close above $5,000 on Dec 31, 2026?",
  description:
    "Resolves YES if ETH/USD on Coinbase closes >= $5,000 at 23:59 UTC on Dec 31, 2026.",
  endTimestamp: "2026-12-31T23:59:00+00:00",
  startTimestamp: "2026-05-07T12:42:00+00:00",
  outcomes: [{ name: "Yes" }, { name: "No" }],
  collateral: "0x61553e2c0373F6767977cACE65719006197C18ce",
  curve: "0xFd5e709A6776dd164318e372f83B0c654802Ab3D",
  parentTokenId: 0,
  otSeed: 10000,
  feeRate: 80,
};

const FIXTURE_QUESTION_ID =
  "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as Hex;

describe("buildV1DeployArgs", () => {
  it("builds the expected struct shape from a flat input", () => {
    const args = buildV1DeployArgs(fixtureFlat, 18);

    expect(args.createQuestion.meta.title).toBe(fixtureFlat.title);
    expect(args.createQuestion.meta.description).toBe(fixtureFlat.description);
    expect(args.createQuestion.outcomeNames).toEqual(["Yes", "No"]);
    expect(args.createQuestion.timestampEnd).toBe(BigInt(1798761540));

    const dep = args.buildDeployMarket(FIXTURE_QUESTION_ID);
    expect(dep.questionId).toBe(FIXTURE_QUESTION_ID);
    expect(dep.parentTokenId).toBe(BigInt(0));
    expect(dep.collateral.toLowerCase()).toBe(
      fixtureFlat.collateral.toLowerCase(),
    );
    expect(dep.curve.toLowerCase()).toBe(fixtureFlat.curve.toLowerCase());
    expect(dep.otSeedWei).toBe(BigInt(10000) * BigInt(10) ** BigInt(18));
    expect(dep.feeRateWei).toBe(BigInt(80) * V1_FEE_RATE_SCALE);
  });

  it("encodes deterministic FTMarketController.createQuestion calldata", () => {
    const args = buildV1DeployArgs(fixtureFlat, 18);
    const calldata = encodeFunctionData({
      abi: FT_MARKET_CONTROLLER_ABI,
      functionName: "createQuestion",
      args: [
        args.createQuestion.meta,
        args.createQuestion.timestampEnd,
        args.createQuestion.outcomeNames,
      ],
    });
    expect(calldata).toMatchSnapshot();
  });

  it("encodes deterministic FTMarketController.deployMarketAndSeedLiquidity calldata", () => {
    const args = buildV1DeployArgs(fixtureFlat, 18);
    const dep = args.buildDeployMarket(FIXTURE_QUESTION_ID);
    const calldata = encodeFunctionData({
      abi: FT_MARKET_CONTROLLER_ABI,
      functionName: "deployMarketAndSeedLiquidity",
      args: [
        dep.collateral,
        dep.parentTokenId,
        dep.questionId,
        dep.curve,
        dep.otSeedWei,
        dep.timestampStart,
        dep.feeRateWei,
      ],
    });
    expect(calldata).toMatchSnapshot();
  });

  it("rejects an input with fewer than 2 outcomes", () => {
    const bad: V1DeployFlatInput = {
      ...fixtureFlat,
      outcomes: [fixtureFlat.outcomes[0]!],
    };
    expect(() => buildV1DeployArgs(bad, 18)).toThrow(/at least 2 outcomes/);
  });

  it("rejects an input missing description (V1 requires it)", () => {
    const bad: V1DeployFlatInput = { ...fixtureFlat, description: "" };
    expect(() => buildV1DeployArgs(bad, 18)).toThrow(/description/);
  });

  it("scales feeRate by V1_FEE_RATE_SCALE (basis points × 1e14)", () => {
    const args = buildV1DeployArgs(fixtureFlat, 18);
    const dep = args.buildDeployMarket(FIXTURE_QUESTION_ID);
    expect(dep.feeRateWei).toBe(BigInt("8000000000000000")); // 80 × 1e14
    expect(V1_FEE_RATE_SCALE).toBe(BigInt(10) ** BigInt(14));
  });
});
