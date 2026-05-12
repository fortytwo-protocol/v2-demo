// Minimal wagmi config — `injected()` only. Covers MetaMask, Rabby,
// Frame, Brave Wallet, and any other EIP-1193 wallet the user already
// has installed. No WalletConnect, no third-party SDKs, no projectId.
//
// Adding more connectors later (Coinbase Wallet, WalletConnect, etc.)
// is a localised change — append to the `connectors` array below.

import { createConfig, http } from "wagmi";
import { bsc } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const BSC_RPC = import.meta.env.VITE_BSC_RPC_URL;

export const wagmiConfig = createConfig({
  chains: [bsc],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [bsc.id]: BSC_RPC ? http(BSC_RPC) : http(),
  },
  ssr: false,
});

export { bsc };
