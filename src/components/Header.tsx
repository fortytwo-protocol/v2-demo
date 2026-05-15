import { useState } from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { bsc } from "wagmi/chains";
import { shortenAddress } from "../lib/format";
import { useEnvironment, type EnvironmentName } from "../lib/environment";
import { useUrlState } from "../lib/url-state";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { Icon } from "./icons/Icon";
import { MintFaucetDialog } from "./MintFaucetDialog";

export function Header() {
  const { env, setEnvName } = useEnvironment();
  const [, navigate] = useUrlState();
  const [mintOpen, setMintOpen] = useState(false);

  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          type="button"
          className="app-logo app-logo-button"
          onClick={() => navigate({ view: "inspect" })}
          aria-label="Home"
        >
          42 Markets V2 Demo
        </button>
      </div>
      <div className="app-header-right">
        <EnvToggle
          current={env.name}
          onChange={(name) => setEnvName(name)}
        />
        {env.name === "staging" && (
          <button
            type="button"
            className="pg-btn pg-btn-secondary"
            onClick={() => setMintOpen(true)}
            style={{ padding: "8px 12px", fontSize: 12 }}
          >
            <Icon name="collateral" size={12} />
            Mint FTBUSDT
          </button>
        )}
        <WalletPill />
      </div>
      {mintOpen && <MintFaucetDialog onClose={() => setMintOpen(false)} />}
    </header>
  );
}

function EnvToggle({
  current,
  onChange,
}: {
  current: EnvironmentName;
  onChange: (next: EnvironmentName) => void;
}) {
  return (
    <div
      className="pg-env-toggle"
      role="group"
      aria-label="Environment"
    >
      <button
        type="button"
        className={`pg-env-toggle-btn${current === "production" ? " is-active" : ""}`}
        onClick={() => onChange("production")}
        aria-pressed={current === "production"}
      >
        Production
      </button>
      <button
        type="button"
        className={`pg-env-toggle-btn${current === "staging" ? " is-active" : ""}`}
        onClick={() => onChange("staging")}
        aria-pressed={current === "staging"}
      >
        Staging
      </button>
    </div>
  );
}

function WalletPill() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];
  const wrongChain = isConnected && chainId !== bsc.id;

  if (!isConnected) {
    return (
      <Button
        variant="primary"
        onClick={() => injected && connect({ connector: injected, chainId: bsc.id })}
        disabled={!injected || isPending || status === "connecting"}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </Button>
    );
  }

  return (
    <>
      {wrongChain ? (
        <button
          type="button"
          className="pg-btn pg-btn-secondary"
          onClick={() => switchChain({ chainId: bsc.id })}
          disabled={isSwitching}
          style={{ padding: "6px 10px", fontSize: 12 }}
        >
          {isSwitching ? "Switching…" : "Switch to BSC"}
        </button>
      ) : (
        <Badge tone="success" withDot>
          BNB Smart Chain
        </Badge>
      )}
      <button
        type="button"
        className="pg-btn pg-btn-secondary"
        onClick={() => disconnect()}
        title="Disconnect"
        style={{ padding: "8px 12px", fontSize: 12 }}
      >
        <span className="mono">{shortenAddress(address)}</span>
        <Icon name="close" size={12} />
      </button>
    </>
  );
}
