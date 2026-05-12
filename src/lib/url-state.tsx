// URL search-param routing without a router lib. State is owned by a
// single provider so every `useUrlState()` consumer sees the same
// snapshot — calling `navigate()` updates the URL AND re-renders every
// view subscribed to it.
//
// Three views:
//   ?view=inspect         (default)
//   ?view=deploy
//   ?view=market&address=0x…&tab=overview|outcomes|resolve

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Address } from "viem";

export type ViewName = "inspect" | "deploy" | "market";
export type MarketTab = "overview" | "outcomes" | "resolve";

export interface UrlState {
  view: ViewName;
  marketAddress: Address | null;
  marketTab: MarketTab;
}

function parse(search: string): UrlState {
  const params = new URLSearchParams(search);
  const view = (params.get("view") ?? "inspect") as ViewName;
  const address = params.get("address");
  const tab = (params.get("tab") ?? "overview") as MarketTab;
  return {
    view: ["inspect", "deploy", "market"].includes(view) ? view : "inspect",
    marketAddress:
      address && /^0x[0-9a-fA-F]{40}$/.test(address)
        ? (address as Address)
        : null,
    marketTab: ["overview", "outcomes", "resolve"].includes(tab)
      ? tab
      : "overview",
  };
}

function serialize(state: Partial<UrlState>): string {
  const params = new URLSearchParams();
  if (state.view && state.view !== "inspect") params.set("view", state.view);
  if (state.view === "market" && state.marketAddress) {
    params.set("address", state.marketAddress);
    if (state.marketTab && state.marketTab !== "overview") {
      params.set("tab", state.marketTab);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

interface UrlContextValue {
  state: UrlState;
  navigate: (next: Partial<UrlState>) => void;
}

const UrlStateContext = createContext<UrlContextValue | null>(null);

export function UrlStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UrlState>(() =>
    typeof window === "undefined"
      ? { view: "inspect", marketAddress: null, marketTab: "overview" }
      : parse(window.location.search),
  );

  useEffect(() => {
    function onPop() {
      setState(parse(window.location.search));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (next: Partial<UrlState>) => {
    setState((prev) => {
      const merged: UrlState = { ...prev, ...next };
      const url = serialize(merged);
      window.history.pushState({}, "", url || window.location.pathname);
      return merged;
    });
  };

  return (
    <UrlStateContext.Provider value={{ state, navigate }}>
      {children}
    </UrlStateContext.Provider>
  );
}

export function useUrlState(): [UrlState, (next: Partial<UrlState>) => void] {
  const ctx = useContext(UrlStateContext);
  if (!ctx) {
    throw new Error("useUrlState must be used inside <UrlStateProvider>");
  }
  return [ctx.state, ctx.navigate];
}
