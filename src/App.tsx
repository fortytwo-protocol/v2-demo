import { Header } from "./components/Header";
import { useUrlState } from "./lib/url-state";
import { Inspect } from "./views/Inspect";
import { Deploy } from "./views/Deploy";
import { Market } from "./views/Market";

export function App() {
  const [state] = useUrlState();

  return (
    <div className="app-shell">
      <Header />
      <main className="app-main">
        {state.view === "inspect" && <Inspect />}
        {state.view === "deploy" && <Deploy />}
        {state.view === "market" && state.marketAddress && (
          <Market address={state.marketAddress} />
        )}
        {state.view === "market" && !state.marketAddress && <Inspect />}
      </main>
    </div>
  );
}
