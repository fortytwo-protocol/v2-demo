import { describe, expect, it } from "vitest";
import { encodeFunctionData, type Hex } from "viem";
import { FT_ADAPTOR_ABI } from "../../src/abi";
import { buildExtendArgs } from "../../src/extend/args";

const QID =
  "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789" as Hex;

describe("buildExtendArgs", () => {
  it("coerces a numeric timestamp to bigint", () => {
    const args = buildExtendArgs({
      questionId: QID,
      newEndTimestamp: 1798761540,
    });
    expect(args.newEndTimestamp).toBe(BigInt(1798761540));
  });

  it("encodes deterministic FTAdaptor.modifyTimestampEnd calldata", () => {
    const args = buildExtendArgs({
      questionId: QID,
      newEndTimestamp: 1798761540,
    });
    const calldata = encodeFunctionData({
      abi: FT_ADAPTOR_ABI,
      functionName: "modifyTimestampEnd",
      args: [args.questionId, args.newEndTimestamp],
    });
    expect(calldata).toMatchSnapshot();
  });
});
