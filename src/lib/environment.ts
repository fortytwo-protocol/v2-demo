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
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { bscMainnet, bscUat, externalAddresses } from "@ft/sdk/addresses";

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

const BSCSCAN_URL =
  import.meta.env.VITE_BSCSCAN_URL ?? "https://bscscan.com";

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
      { label: "PowerCurve", address: bscMainnet.PowerCurve![0]!.addy },
      { label: "PowerLDACurve", address: bscMainnet.PowerLDACurve![0]!.addy },
      { label: "ClockCurve", address: bscMainnet.ClockCurve![0]!.addy },
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
      { label: "PowerCurve", address: bscUat.PowerCurve![0]!.addy },
      { label: "PowerLDACurve", address: bscUat.PowerLDACurve![0]!.addy },
      { label: "ClockCurve", address: bscUat.ClockCurve![0]!.addy },
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
