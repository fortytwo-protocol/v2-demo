// Probe whether a given address is a market deployed under one of our
// known controllers. Both environments share the same chain (BSC), so a
// single publicClient can interrogate both.
//
// We use `getConfig`, which reverts cheaply for unknown markets — much
// faster than a full lens snapshot and sufficient to distinguish
// "exists here" from "doesn't exist here".

import type { Address, PublicClient } from "viem";
import { getConfig } from "@ft/sdk/reads";
import {
  ENVIRONMENTS,
  type EnvironmentName,
} from "./environment";

export type ProbeResult =
  | { kind: "found"; env: EnvironmentName }
  | { kind: "not-a-market" };

export async function probeMarketEnv(
  publicClient: PublicClient,
  market: Address,
): Promise<ProbeResult> {
  const envs: EnvironmentName[] = ["production", "staging"];
  const results = await Promise.all(
    envs.map(async (name) => {
      try {
        const cfg = await getConfig({
          publicClient,
          controllerV2: ENVIRONMENTS[name].controllerV2,
          market,
        });
        // A real market always has at least 2 outcomes. Zero rules out
        // a stray non-reverting read against an unrelated contract.
        return cfg.numOutcomes > BigInt(0) ? name : null;
      } catch {
        return null;
      }
    }),
  );
  const found = results.find((r): r is EnvironmentName => r !== null);
  return found ? { kind: "found", env: found } : { kind: "not-a-market" };
}
