// Pure constructor for V2 deploy arguments.
//
// Two on-chain entrypoints share this args shape:
//   FTAdaptor.deployMarket(paramsQuestion, paramsMarket, otSeedWei)
//     — 3 args; oracle is implicitly the adaptor itself.
//   FTControllerV2.deployMarket(paramsQuestion, paramsMarket, oracle, otSeedWei)
//     — 4 args; oracle is explicit.
//
// `oracle` is optional in the input — adaptor-mode callers can omit
// it; controller-mode callers must provide it (deployMarketV2 throws
// at runtime if it's missing in controller-mode).

import { parseUnits, type Address, type Hex } from "viem";
import { asUnixTimestamp, validationError } from "./validation";

/** Hand-typed mirror of the V2 deployMarket struct args. */
export interface V2QuestionParams {
  timestampEnd: bigint;
  title: string;
  ancillaryData: Hex;
  imageUri: string;
  outcomeNames: readonly string[];
  outcomeImageUris: readonly string[];
}

export interface V2MarketParams {
  parentTokenId: bigint;
  collateral: Address;
  curve: Address;
  timestampStart: bigint;
}

export interface V2DeployArgs {
  paramsQuestion: V2QuestionParams;
  paramsMarket: V2MarketParams;
  /**
   * Used in controller-mode (4-arg) calls; omit for adaptor-mode (3-arg).
   * `deployMarketV2` throws at runtime if controller-mode is selected
   * and `oracle` is undefined.
   */
  oracle?: Address;
  otSeedWei: bigint;
}

/** Flat shape consumed by buildV2DeployArgs. Callers are expected to
 *  build it themselves; how is up to the caller (e.g., from a draft
 *  table, from a form, from a script). */
export interface V2DeployFlatInput {
  title: string;
  imageUri: string;
  endTimestamp: string | number | bigint;
  startTimestamp: string | number | bigint;
  outcomes: ReadonlyArray<{ name: string; imageUri: string }>;
  collateral: string;
  curve: string;
  parentTokenId: bigint | number;
  /** Pre-built ancillary bytes. Use buildAncillaryJson from @ft/sdk/ancillary
   *  if you want the recommended JSON format, or supply any other encoding. */
  ancillaryData: Hex;
  /** Human-readable seed amount (e.g. 10000); scaled by `decimals`. */
  otSeed: number | string;
  /**
   * Oracle address. Required for controller-mode (4-arg) deploys;
   * omit for adaptor-mode (3-arg) deploys.
   */
  oracle?: Address;
}

export function buildV2DeployArgs(
  input: V2DeployFlatInput,
  decimals: number,
): V2DeployArgs {
  if (input.outcomes.length < 2) {
    throw validationError("Draft needs at least 2 outcomes");
  }
  return {
    paramsQuestion: {
      timestampEnd: asUnixTimestamp(input.endTimestamp),
      title: input.title,
      ancillaryData: input.ancillaryData,
      imageUri: input.imageUri,
      outcomeNames: input.outcomes.map((o) => o.name),
      outcomeImageUris: input.outcomes.map((o) => o.imageUri),
    },
    paramsMarket: {
      parentTokenId: BigInt(input.parentTokenId),
      collateral: input.collateral as Address,
      curve: input.curve as Address,
      timestampStart: asUnixTimestamp(input.startTimestamp),
    },
    ...(input.oracle ? { oracle: input.oracle } : {}),
    otSeedWei: parseUnits(String(input.otSeed), decimals),
  };
}
