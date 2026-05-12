import { describe, expect, it } from "vitest";
import { encodeFunctionData, stringToHex, type Address } from "viem";
import { FT_ADAPTOR_ABI, FT_CONTROLLER_V2_ABI } from "../../src/abi";
import { buildAncillaryJson } from "../../src/ancillary";
import {
  buildV2DeployArgs,
  type V2DeployFlatInput,
} from "../../src/deploy/v2-args";

const ORACLE = "0xC07Edb0d2C998267fB8472CB48A2398ee7ACC183" as Address;

const ancillaryData = stringToHex(
  buildAncillaryJson({
    isEarlyResolution: false,
    description:
      "Resolves YES if BTC/USD on Coinbase closes >= $200,000 at 23:59 UTC on Dec 31, 2026 per the daily close. Resolves NO otherwise.",
  }),
);

const fixtureFlat: V2DeployFlatInput = {
  title: "Will Bitcoin close above $200,000 on Dec 31, 2026?",
  imageUri: "",
  endTimestamp: "2026-12-31T23:59:00+00:00",
  startTimestamp: "2026-05-07T12:42:00+00:00",
  outcomes: [
    { name: "Yes", imageUri: "" },
    { name: "No", imageUri: "" },
  ],
  collateral: "0x61553e2c0373F6767977cACE65719006197C18ce",
  curve: "0xFd5e709A6776dd164318e372f83B0c654802Ab3D",
  parentTokenId: 0,
  ancillaryData,
  otSeed: 10000,
  oracle: ORACLE,
};

describe("buildV2DeployArgs", () => {
  it("builds the expected struct shape from a flat input", () => {
    const args = buildV2DeployArgs(fixtureFlat, 18);
    expect(args.paramsQuestion.title).toBe(fixtureFlat.title);
    expect(args.paramsQuestion.outcomeNames).toEqual(["Yes", "No"]);
    expect(args.paramsQuestion.outcomeImageUris).toEqual(["", ""]);
    expect(args.paramsQuestion.timestampEnd).toBe(BigInt(1798761540));
    expect(args.paramsMarket.collateral.toLowerCase()).toBe(
      fixtureFlat.collateral.toLowerCase(),
    );
    expect(args.paramsMarket.curve.toLowerCase()).toBe(
      fixtureFlat.curve.toLowerCase(),
    );
    expect(args.paramsMarket.parentTokenId).toBe(BigInt(0));
    expect(args.oracle).toBe(ORACLE);
    expect(args.otSeedWei).toBe(BigInt(10000) * BigInt(10) ** BigInt(18));
  });

  it("encodes deterministic FTControllerV2.deployMarket calldata (controller mode)", () => {
    const args = buildV2DeployArgs(fixtureFlat, 18);
    if (!args.oracle) throw new Error("fixtureFlat must set oracle");
    const calldata = encodeFunctionData({
      abi: FT_CONTROLLER_V2_ABI,
      functionName: "deployMarket",
      args: [args.paramsQuestion, args.paramsMarket, args.oracle, args.otSeedWei],
    });
    expect(calldata).toMatchSnapshot();
  });

  it("encodes deterministic FTAdaptor.deployMarket calldata (adaptor mode)", () => {
    const args = buildV2DeployArgs(fixtureFlat, 18);
    const calldata = encodeFunctionData({
      abi: FT_ADAPTOR_ABI,
      functionName: "deployMarket",
      args: [args.paramsQuestion, args.paramsMarket, args.otSeedWei],
    });
    expect(calldata).toMatchSnapshot();
  });

  it("rejects a flat input with fewer than 2 outcomes", () => {
    const bad: V2DeployFlatInput = {
      ...fixtureFlat,
      outcomes: [fixtureFlat.outcomes[0]!],
    };
    expect(() => buildV2DeployArgs(bad, 18)).toThrow(/at least 2 outcomes/);
  });
});
