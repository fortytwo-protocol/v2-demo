// localStorage-backed list of market addresses the user has personally
// deployed or inspected in this browser. Used to populate the Inspect
// view's "Recent" panel. Capped at MAX_RECENTS, oldest evicted first.

import type { Address } from "viem";
import type { EnvironmentName } from "./environment";

const STORAGE_KEY = "ft-playground.recents.v1";
const MAX_RECENTS = 20;

export interface RecentMarket {
  address: Address;
  env?: EnvironmentName;
  label?: string;
  lastTouched: number;
}

export function loadRecents(): RecentMarket[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentMarket =>
          typeof r === "object" &&
          r !== null &&
          typeof r.address === "string" &&
          typeof r.lastTouched === "number",
      )
      .sort((a, b) => b.lastTouched - a.lastTouched);
  } catch {
    return [];
  }
}

function save(list: RecentMarket[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function touchRecent(
  address: Address,
  env: EnvironmentName,
  label?: string,
) {
  const now = Date.now();
  const lower = address.toLowerCase();
  const existing = loadRecents();
  // Identity is (address, env): the same address can exist on both
  // production and staging as different deployments.
  const without = existing.filter(
    (r) => !(r.address.toLowerCase() === lower && r.env === env),
  );
  const prior = existing.find(
    (r) => r.address.toLowerCase() === lower && r.env === env,
  );
  const merged: RecentMarket = {
    address,
    env,
    label: label ?? prior?.label,
    lastTouched: now,
  };
  const next = [merged, ...without].slice(0, MAX_RECENTS);
  save(next);
  return next;
}

export function forgetRecent(address: Address, env: EnvironmentName | undefined) {
  const lower = address.toLowerCase();
  const next = loadRecents().filter(
    (r) => !(r.address.toLowerCase() === lower && r.env === env),
  );
  save(next);
  return next;
}

export function clearRecents() {
  save([]);
}
