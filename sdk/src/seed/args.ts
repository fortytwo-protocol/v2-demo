// Builders for FTAdaptor / FTControllerV2 `seedLiquidity(market, tokenIds[], otAmounts[])`.
// Both contracts share the same input shape; the chain-op picks which
// to call via the `target` discriminator.

import { parseUnits, type Address } from "viem";

/** OT (Outcome Token) is a 6909 token; decimals = 18. */
export const OT_DECIMALS = 18;

export interface SeedOutcomesInput {
  marketAddress: Address;
  tokenIds: readonly bigint[];
  /**
   * Per-outcome OT amount. Either pre-scaled raw `bigint` (uint256
   * wei), or a human-readable form (`number | string`) that will be
   * scaled by {@link OT_DECIMALS}.
   */
  otAmounts: ReadonlyArray<bigint | number | string>;
}

export interface SeedOutcomesArgs {
  marketAddress: Address;
  tokenIds: readonly bigint[];
  otAmounts: readonly bigint[];
}

export function buildSeedOutcomesArgs(input: SeedOutcomesInput): SeedOutcomesArgs {
  if (input.tokenIds.length === 0) {
    throw new Error("buildSeedOutcomesArgs: at least one tokenId required");
  }
  if (input.tokenIds.length !== input.otAmounts.length) {
    throw new Error(
      `buildSeedOutcomesArgs: tokenIds (${input.tokenIds.length}) and otAmounts (${input.otAmounts.length}) length mismatch`,
    );
  }
  const otAmounts = input.otAmounts.map((amt) =>
    typeof amt === "bigint" ? amt : parseUnits(String(amt), OT_DECIMALS),
  );
  return {
    marketAddress: input.marketAddress,
    tokenIds: input.tokenIds,
    otAmounts,
  };
}
