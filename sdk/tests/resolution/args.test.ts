import { describe, expect, it } from "vitest";
import { encodeFunctionData, type Hex } from "viem";
import { FT_ADAPTOR_ABI } from "../../src/abi";
import {
  buildResolveArgs,
  buildUnresolveArgs,
  buildFinaliseArgs,
} from "../../src/resolution/args";

const QID =
  "0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789" as Hex;

describe("buildResolveArgs", () => {
  it("coerces a numeric answer to bigint", () => {
    const args = buildResolveArgs({ questionId: QID, answer: 1 });
    expect(args.answer).toBe(BigInt(1));
  });

  it("encodes deterministic FTAdaptor.resolveOutcome calldata", () => {
    const args = buildResolveArgs({ questionId: QID, answer: 1 });
    const calldata = encodeFunctionData({
      abi: FT_ADAPTOR_ABI,
      functionName: "resolveOutcome",
      args: [args.questionId, args.answer],
    });
    expect(calldata).toMatchSnapshot();
  });
});

describe("buildUnresolveArgs", () => {
  it("encodes deterministic FTAdaptor.unresolveOutcome calldata", () => {
    const args = buildUnresolveArgs({ questionId: QID });
    const calldata = encodeFunctionData({
      abi: FT_ADAPTOR_ABI,
      functionName: "unresolveOutcome",
      args: [args.questionId],
    });
    expect(calldata).toMatchSnapshot();
  });
});

describe("buildFinaliseArgs", () => {
  it("encodes deterministic FTAdaptor.finaliseOutcome calldata", () => {
    const args = buildFinaliseArgs({ questionId: QID, answer: 2 });
    const calldata = encodeFunctionData({
      abi: FT_ADAPTOR_ABI,
      functionName: "finaliseOutcome",
      args: [args.questionId, args.answer],
    });
    expect(calldata).toMatchSnapshot();
  });
});
