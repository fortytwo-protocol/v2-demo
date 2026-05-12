/**
 * Read helpers for FTRouterV2 — view wrappers around the router's
 * controller pointers and per-market version probe.
 *
 * Each helper is a thin typed wrapper over `publicClient.readContract`
 * that knows the ABI + function name. Integrators that prefer the raw
 * viem call still can; these wrappers exist so callers don't have to
 * import the ABI or remember function names.
 */

import type { Address, PublicClient } from "viem";
import { FT_ROUTER_V2_ABI } from "../abi";

interface RouterReadBase {
  publicClient: PublicClient;
  routerV2: Address;
}

export async function getControllerV1(opts: RouterReadBase): Promise<Address> {
  return opts.publicClient.readContract({
    address: opts.routerV2,
    abi: FT_ROUTER_V2_ABI,
    functionName: "controllerV1",
  });
}

export async function getControllerV2(opts: RouterReadBase): Promise<Address> {
  return opts.publicClient.readContract({
    address: opts.routerV2,
    abi: FT_ROUTER_V2_ABI,
    functionName: "controllerV2",
  });
}

/**
 * Returns the version code emitted by the router for `market` —
 * the `uint8` from `isMarketVersion(market)`, narrowed to a JS `number`.
 */
export async function getMarketVersion(
  opts: RouterReadBase & { market: Address },
): Promise<number> {
  const result = await opts.publicClient.readContract({
    address: opts.routerV2,
    abi: FT_ROUTER_V2_ABI,
    functionName: "isMarketVersion",
    args: [opts.market],
  });
  return Number(result);
}
