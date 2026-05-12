// Encode/decode protocol-level multi-outcome answers.
//
// The on-chain `answer` is a bitmask: each selected outcome at index `i`
// contributes `2^i`. Multiple selected outcomes are OR-ed together so
// the contract can finalise a single answer that resolves multiple
// winners simultaneously. Mirrors the encoding used in the admin
// dashboard (`lib/utils/resolution.ts`).

export function encodeOutcomes(selectedIndices: readonly number[]): bigint {
  let answer = BigInt(0);
  for (const i of selectedIndices) {
    if (i < 0) throw new Error(`encodeOutcomes: negative index ${i}`);
    answer |= BigInt(1) << BigInt(i);
  }
  return answer;
}

export function decodeOutcomes(answer: bigint | number): number[] {
  let n = typeof answer === "bigint" ? answer : BigInt(answer);
  const out: number[] = [];
  let idx = 0;
  while (n > BigInt(0) && idx < 256) {
    if ((n & BigInt(1)) === BigInt(1)) out.push(idx);
    n >>= BigInt(1);
    idx++;
  }
  return out;
}
