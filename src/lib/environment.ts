// Production / staging environment switch.
//
// Both environments run on BSC mainnet (chainId 56) — the same wallet
// connection works for either. What changes between them is the
// controller / lens / router proxy addresses, the seed collateral
// (USDT vs FTUSD), and the explorer base URL. Everything that needs
// to know about the active environment reads it through
// `useEnvironment()`; switching invalidates React Query so cached
// reads from the old env don't leak into the new one.

import {
  bscMainnet,
  bscUat,
  externalAddresses,
  type FtDeployment,
} from "@ft/sdk/addresses";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";

export type EnvironmentName = "production" | "staging";

export interface CollateralPreset {
  label: string;
  address: Address;
  decimals: number;
}

export interface CurvePreset {
  label: string;
  address: Address;
}

export interface Environment {
  name: EnvironmentName;
  label: string;
  /** Short tag shown next to the logo (e.g. "Mainnet · v2"). */
  tag: string;
  controllerV2: Address;
  lensV2: Address;
  routerV2: Address;
  bscscanUrl: string;
  collateralPresets: CollateralPreset[];
  curvePresets: CurvePreset[];
}

const BSCSCAN_URL = import.meta.env.VITE_BSCSCAN_URL ?? "https://bscscan.com";

function powerLdaV2Presets(dep: FtDeployment): CurvePreset[] {
  return (dep.PowerLDACurveV2 ?? []).map((curve, i) => {
    const raw = curve.timeKinkStart;
    const kink =
      typeof raw === "string" || typeof raw === "number"
        ? Number(raw) / 1e18
        : NaN;
    const label = Number.isFinite(kink)
      ? `PowerLDACurveV2 · kink ${kink.toFixed(2)}`
      : `PowerLDACurveV2 #${i + 1}`;
    return { label, address: curve.addy };
  });
}

export const ENVIRONMENTS: Record<EnvironmentName, Environment> = {
  production: {
    name: "production",
    label: "Production",
    tag: "BSC Mainnet · v2",
    controllerV2: bscMainnet.FTControllerProxy!,
    lensV2: bscMainnet.FTLensV2!,
    routerV2: bscMainnet.FTRouterProxy!,
    bscscanUrl: BSCSCAN_URL,
    collateralPresets: [
      {
        label: "USDT",
        address: externalAddresses.bscMainnetUsdt,
        decimals: 18,
      },
    ],
    curvePresets: [
      { label: "ClockCurve", address: bscMainnet.ClockCurve![0]!.addy },
      ...powerLdaV2Presets(bscMainnet),
    ],
  },
  staging: {
    name: "staging",
    label: "Staging (UAT)",
    tag: "BSC UAT · v2",
    controllerV2: bscUat.FTControllerProxy!,
    lensV2: bscUat.FTLensV2!,
    routerV2: bscUat.FTRouterProxy!,
    bscscanUrl: BSCSCAN_URL,
    collateralPresets: [
      { label: "FTBUSDT", address: bscUat.FTUSD!, decimals: 18 },
    ],
    curvePresets: [
      { label: "ClockCurve", address: bscUat.ClockCurve![0]!.addy },
      ...powerLdaV2Presets(bscUat),
    ],
  },
};

const STORAGE_KEY = "ft-playground.environment.v1";
const DEFAULT_ENV: EnvironmentName = "production";

function loadStoredEnv(): EnvironmentName {
  if (typeof localStorage === "undefined") return DEFAULT_ENV;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "production" || raw === "staging") return raw;
  return DEFAULT_ENV;
}

interface ContextValue {
  env: Environment;
  setEnvName: (name: EnvironmentName) => void;
}

const EnvironmentContext = createContext<ContextValue | null>(null);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<EnvironmentName>(() => loadStoredEnv());
  const qc = useQueryClient();

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, name);
    }
  }, [name]);

  const setEnvName = (next: EnvironmentName) => {
    if (next === name) return;
    setName(next);
    // Any cached snapshot/read belongs to the old env's controller. Drop
    // them all so the next render hits the right contracts.
    qc.clear();
    // If the user was viewing a market that doesn't exist on the new env,
    // bounce back to the inspect view by clearing the URL.
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "market") {
      window.history.replaceState({}, "", window.location.pathname);
      // Notify the URL state provider that the URL changed without a
      // pushState. popstate doesn't fire on replaceState; dispatch one
      // manually so subscribers re-parse.
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const value = useMemo<ContextValue>(
    () => ({ env: ENVIRONMENTS[name], setEnvName }),
    // setEnvName closes over `name` so we depend on it explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [name],
  );

  return createElement(EnvironmentContext.Provider, { value }, children);
}

export function useEnvironment(): ContextValue {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) {
    throw new Error("useEnvironment must be used inside <EnvironmentProvider>");
  }
  return ctx;
}
