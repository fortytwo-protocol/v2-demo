# 42 Markets V2 Demo

A standalone, backend-free demo app for the 42 prediction-market protocol on
BSC. Lets you connect a wallet, deploy new V2 markets, and manage every
operation (seed, add outcomes, extend, set images, post ancillary updates,
resolve / unresolve / finalise) through the public `@ft/sdk` surface.

The app exercises the SDK end-to-end and is the recommended starting point
for integrators who want a working reference before wiring their own UI.

## Stack

- Vite + React 19 + TypeScript (strict)
- wagmi v2 + viem (injected wallet connector — no WalletConnect projectId)
- `@tanstack/react-query`
- `@ft/sdk` — vendored locally under [`./sdk`](./sdk) and exposed via
  `"@ft/sdk": "link:./sdk"`. The same code that ships from the monorepo.

## Environments

A header toggle switches between two BSC deployments:

| Env        | Chain         | Collateral preset |
| ---------- | ------------- | ----------------- |
| Production | BSC mainnet   | USDT              |
| Staging    | BSC mainnet*  | FTBUSDT (faucet)  |

\* Staging uses the same chain but a separate controller / lens / router.
The staging tab also surfaces a "Mint FTBUSDT" dialog that calls the
faucet directly.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:5174
```

Connect any injected wallet (MetaMask, Rabby, Frame…) on BSC. Reads are
public — you don't need a wallet to inspect existing markets.

## Scripts

| Command            | What it does                               |
| ------------------ | ------------------------------------------ |
| `pnpm dev`         | Vite dev server with HMR                   |
| `pnpm build`       | Type-check + production build → `dist/`    |
| `pnpm preview`     | Serve the built bundle                     |
| `pnpm typecheck`   | `tsc -b --noEmit` for app + SDK            |
| `pnpm test`        | Vitest single run                          |
| `pnpm test:watch`  | Vitest watch mode                          |

## Project layout

```
.
├── src/                # The Vite app
│   ├── views/          # Top-level routes (Inspect, Deploy, Market/*)
│   ├── components/     # Shared UI
│   ├── lib/            # wagmi, snapshot, environment, recents, probe, …
│   └── styles/         # Tokens + component CSS
├── sdk/                # Vendored @ft/sdk (linked via package.json)
│   └── src/            # ancillary, deploy, reads, seed, resolution, …
├── tests/              # App-level vitest specs
└── vite.config.ts
```

The app only uses the public SDK surface — same imports an external
integrator would use after `pnpm add @ft/sdk`:

```ts
import { buildV2DeployArgs } from "@ft/sdk/deploy";
import { snapshotMarket, getConfig } from "@ft/sdk/reads";
import { decodeAncillary, buildAncillaryJson } from "@ft/sdk/ancillary";
import { outcomeIndexToTokenId } from "@ft/sdk/tokens";
import { bscMainnet, bscUat, externalAddresses } from "@ft/sdk/addresses";
```

## Static hosting

The build is fully static (no server), suitable for S3 + CloudFront or any
static host. `base: "./"` in `vite.config.ts` makes asset paths relative so
the bundle works under any prefix.

### GitHub Pages

A workflow at [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)
builds on every push to `main` and publishes `dist/` to GitHub Pages. The
live site lives at `https://fortytwo-protocol.github.io/v2-demo/`.

One-time setup: in repo **Settings → Pages**, set **Source** to
"GitHub Actions". After that, every merge to `main` redeploys automatically.

## License

MIT — see [LICENSE](./LICENSE).
