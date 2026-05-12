/**
 * Outcome ↔ tokenId mapping primitives.
 *
 * V2 markets use 6909-style multi-token IDs where each outcome's
 * OT (outcome token) lives at `tokenId = 2 ** outcomeIndex`.
 *
 * Contract source of truth: `Market.toTokenId` in
 * ft-contracts/src/libraries/Market.sol.
 *
 * Use these helpers instead of hand-deriving the formula at call
 * sites — they keep the SDK aligned with whatever the contracts say
 * is canonical.
 */

/**
 * Convert a 0-based outcome index to its on-chain tokenId.
 *
 *   outcome 0 → tokenId 1
 *   outcome 1 → tokenId 2
 *   outcome 2 → tokenId 4
 *   outcome 3 → tokenId 8
 *   ...
 */
export function outcomeIndexToTokenId(indexOutcomeFromZero: number | bigint): bigint {
  const i = typeof indexOutcomeFromZero === "bigint"
    ? indexOutcomeFromZero
    : BigInt(indexOutcomeFromZero);
  if (i < BigInt(0)) {
    throw new Error(`outcomeIndexToTokenId: index must be ≥ 0, got ${i}`);
  }
  return BigInt(1) << i;
}

/**
 * Reverse of {@link outcomeIndexToTokenId}: maps a tokenId back to its
 * outcome index. Throws if the tokenId isn't a power of two (i.e. not
 * a valid V2 outcome token).
 */
export function tokenIdToOutcomeIndex(tokenId: bigint): number {
  if (!isValidTokenId(tokenId)) {
    throw new Error(`tokenIdToOutcomeIndex: ${tokenId} is not a valid outcome tokenId (must be a power of 2)`);
  }
  // Number of trailing zeros in a power of two = log2.
  let i = 0;
  let n = tokenId;
  while (n > BigInt(1)) {
    n >>= BigInt(1);
    i++;
  }
  return i;
}

/** Valid V2 outcome tokenIds are positive powers of two. */
export function isValidTokenId(tokenId: bigint): boolean {
  return tokenId > BigInt(0) && (tokenId & (tokenId - BigInt(1))) === BigInt(0);
}

/**
 * Convenience: produce the full tokenId list for a market with N
 * outcomes, in outcome-index order. Useful for bulk operations like
 * seeding all outcomes.
 */
export function outcomeTokenIds(numOutcomes: number | bigint): bigint[] {
  const n = typeof numOutcomes === "bigint" ? Number(numOutcomes) : numOutcomes;
  const result: bigint[] = [];
  for (let i = 0; i < n; i++) {
    result.push(outcomeIndexToTokenId(i));
  }
  return result;
}
