# @ft/sdk

Local-only TypeScript SDK for interacting with the FT prediction-market smart contracts. Pure viem; no relayer, wagmi, React, or Next dependencies.

Used by:
- `ft-admin-dashboard` UI hooks (wallet-signed)
- `ft-admin-dashboard` API deploy path (relayer-signed)
- `ftcli` (agent-driven workflows)

This package is not published. It lives in the monorepo as a workspace.

---

## Quick start

Deploy a market against FTControllerV2, then seed liquidity across all outcomes:

```ts
import { createWalletClient, createPublicClient, custom, http, parseUnits } from "viem";
import { bsc } from "viem/chains";
import {
  bscMainnet,
  buildAncillaryJson,
  buildV2DeployArgs,
  deployMarketV2,
  outcomeTokenIds,
  seedOutcomes,
} from "@ft/sdk";

const publicClient = createPublicClient({ chain: bsc, transport: http() });
const walletClient = createWalletClient({ chain: bsc, transport: custom(window.ethereum) });
const [account] = await walletClient.getAddresses();

const submit = {
  kind: "wallet" as const,
  sendTx: async ({ to, data }: { to: `0x${string}`; data: `0x${string}` }) =>
    walletClient.sendTransaction({ to, data, account, chain: bsc }),
};

// 1. Deploy (controller-only path — 4-arg w/ explicit oracle).
const args = buildV2DeployArgs(
  {
    title: "Will it rain in SF on 2026-06-01?",
    imageUri: "ipfs://bafy.../cover.png",
    ancillaryData: buildAncillaryJson({
      description: "Resolves YES if NWS reports >0.01in precipitation at SFO on 2026-06-01 UTC",
    }),
    endTimestamp: "2026-06-01T00:00:00Z",
    startTimestamp: 0,
    outcomes: [{ name: "Yes", imageUri: "" }, { name: "No", imageUri: "" }],
    collateral: bscMainnet.FTUSD!,
    curve: bscMainnet.PowerCurve![0].addy,
    parentTokenId: 0n,
    oracle: bscMainnet.FTAdaptor!, // explicit oracle — controller path
    otSeed: 100,
  },
  6, // collateral decimals
);

const deployed = await deployMarketV2({
  publicClient,
  account,
  controllerV2: bscMainnet.FTControllerProxy!,
  args,
  submit,
});
// → { txHash, questionId, marketAddress, receipt }

// 2. Seed
const tokenIds = outcomeTokenIds(args.paramsQuestion.outcomeNames.length);
await seedOutcomes({
  publicClient,
  account,
  controllerV2: bscMainnet.FTControllerProxy!,
  marketAddress: deployed.marketAddress,
  tokenIds,
  otAmounts: tokenIds.map(() => parseUnits("500", 18)),
  collateral: bscMainnet.FTUSD!,
  submit,
});
```

If your deployment topology routes through FTAdaptor instead (operator-role-gated, the dashboard's path), swap to the matching wrapper from the internal submodule:

```ts
import {
  deployViaFTAdaptor,
  seedViaFTAdaptor,
} from "@ft/sdk/integrations/ft-adaptor";

const deployed = await deployViaFTAdaptor({
  publicClient,
  account,
  adaptor: bscMainnet.FTAdaptor!,
  args, // 3-arg adaptor shape — adaptor is the implicit oracle
  submit,
});

await seedViaFTAdaptor({
  publicClient,
  account,
  adaptor: bscMainnet.FTAdaptor!,
  marketAddress: deployed.marketAddress,
  tokenIds,
  otAmounts: tokenIds.map(() => parseUnits("500", 18)),
  collateral: bscMainnet.FTUSD!,
  submit,
});
```

`@ft/sdk/integrations/ft-adaptor` is an **internal** submodule — not a stable public surface, and subject to change. Future adaptors get sibling submodules under `integrations/`.

---

## Architecture: controller-focused core, integration submodules

The core SDK surface (`@ft/sdk`, `@ft/sdk/chain-ops`, `@ft/sdk/deploy`, …) targets **FTControllerV2 only**. Every chain-op takes `controllerV2: Address` as a flat field and writes directly to the controller. This keeps the public API small and stable — it mirrors the contract that defines protocol semantics, nothing more.

Integration-specific routing (FTAdaptor and any future adaptors) lives in **submodules** under `integrations/`. The dashboard, scripts, and the agent CLI consume `@ft/sdk/integrations/ft-adaptor`; these wrappers are internal and may change without notice. The rationale: FTAdaptor is one of many possible adaptors, and the core SDK should not have to know about every adaptor topology our deployment grows.

The SDK is split into layers from "mechanical contract mirror" up to "single-call orchestration". Pick the layer that matches how much of our flow you want to inherit.

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: chain-ops free functions                   │
│          (sim-first, allowance fallback, lifecycle, │
│          SubmitStrategy) — controller-only          │
├─────────────────────────────────────────────────────┤
│ Layer 0.5: ancillary, snapshots, simulate defaults  │
│            (some policy, easy to bypass)            │
├─────────────────────────────────────────────────────┤
│ Layer 0: ABIs, addresses, tokens, args, errors,     │
│          allowance helpers, reads                   │
│          (mechanical mirrors of the contracts)      │
└─────────────────────────────────────────────────────┘

           ───── sibling submodules ─────
           @ft/sdk/integrations/ft-adaptor   (internal)
           @ft/sdk/integrations/<future>     (future)
```

### Layer 0 — Unopinionated primitives

1:1 mirrors of contract-level facts. No flow, no policy.

| Module | What |
|---|---|
| [`abi/`](src/abi/) | Hand-maintained ABI mirrors of `forge build` artifacts |
| [`addresses.ts`](src/addresses.ts) | Per-network deployment addresses (`bscMainnet`, `bscUat`, `baseUat`) |
| [`tokens.ts`](src/tokens.ts) | `outcomeIndexToTokenId` / `tokenIdToOutcomeIndex` — V2's `2**i` mapping |
| [`errors.ts`](src/errors.ts) | Decode + format revert errors against all contract ABIs |
| [`deploy/{v1,v2}-args.ts`](src/deploy/), [`seed/args.ts`](src/seed/), [`resolution/args.ts`](src/resolution/), [`extend/args.ts`](src/extend/) | Pure arg builders. Validate shape, pass values through. |
| [`deploy/allowance.ts`](src/deploy/allowance.ts) | `readAllowance`, `readDecimals`, `buildApproveCalldata` |
| [`deploy/allowance-errors.ts`](src/deploy/allowance-errors.ts) | `isAllowanceError` classifier |
| [`deploy/events.ts`](src/deploy/events.ts) | `decodeV2CreateNewMarket` event parser |
| [`reads/controller.ts`](src/reads/controller.ts) | Per-question controller view-fn wrappers |
| [`reads/lens.ts`](src/reads/lens.ts) | Lens snapshot/simulate wrappers |

### Layer 0.5 — Mildly opinionated

Some policy baked in but narrow and easily bypassed.

- [`ancillary.ts`](src/ancillary.ts) — `buildAncillaryJson` is our recommended encoding. Deploy builders take `ancillaryData: Hex` directly, so any other format works.
- [`reads/snapshots.ts`](src/reads/snapshots.ts) — `getQuestionSnapshot` chooses which fields to batch via multicall. The free-function reads it composes are unopinionated.
- Lens [`simulate*`](src/reads/lens.ts) helpers default `dataSwap`/`dataGuess` to `"0x"` and `integratorFeeBps` to `0n`. Override on the call.

### Layer 1 — Chain-op orchestration

[`chain-ops/`](src/chain-ops/). Where flow policy lives. **Every chain-op writes against FTControllerV2** and takes `controllerV2: Address` as a flat field on the options object.

1. **Simulate first** — every chain-op preflights via `publicClient.simulateContract` so reverts surface before MetaMask prompts.
2. **Allowance fallback** — when simulate reverts with `ERC20InsufficientAllowance`, the chain-op approves and resubmits. Approves `maxUint256` (operator-friendly default).
3. **Lifecycle callbacks** — `onSimulating` / `onApproveSubmitted` / `onApproveMined` / `onSubmitted` / `onMined` / `onSeedSubmitted` etc. The exact set depends on whether the op has an allowance fallback path.
4. **Wait for receipts** — every op returns after the receipt is mined. Receipt is included in the return.

| Module | Contains |
|---|---|
| [`chain-ops/execute-write.ts`](src/chain-ops/execute-write.ts) | `executeWrite` — generic single-tx orchestrator (sim → submit → receipt; no allowance fallback). Public primitive both the controller chain-ops and the FTAdaptor wrappers compose on top of. |
| [`chain-ops/seed.ts`](src/chain-ops/seed.ts), [`deploy/deploy-v2.ts`](src/deploy/deploy-v2.ts) | Custom orchestrators with allowance fallback |
| [`chain-ops/{resolve,extend,outcomes,metadata,moderation,admin}.ts`](src/chain-ops/) | Typed wrappers over `executeWrite` for specific FTControllerV2 actions |

The full FTControllerV2 chain-op surface:

- **Lifecycle:** `resolveMarket`, `unresolveMarket`, `finaliseMarket`, `extendMarket`, `seedOutcomes`, `addOutcomes`
- **Metadata:** `setMarketImage`, `setOutcomeImage`, `postUpdate`
- **Moderation:** `flagMarket`, `unflagMarket`, `finaliseMarketManually`
- **Admin:** `setFeeRateOverride`, `setFeeRateDefault`, `setWhitelistedCollateral`, `setWhitelistedCurve`, `setTreasury`, `pauseController`, `unpauseController`
- **AccessControl (generic):** `grantRole`, `revokeRole`, `renounceRole`. These take `address: Address` (the AccessControl contract) and work against any contract that exposes the standard role API — not just FTControllerV2.

### Integration submodule — FTAdaptor wrappers

[`integrations/ft-adaptor/`](src/integrations/ft-adaptor/), exported as `@ft/sdk/integrations/ft-adaptor`. Internal helpers that wrap the same chain-ops to dispatch through FTAdaptor's operator-role-gated entry points (which forward to FTControllerV2). Used by the dashboard, scripts, and the agent CLI; not a stable public surface.

| Wrapper | Notes |
|---|---|
| `resolveViaFTAdaptor`, `unresolveViaFTAdaptor`, `finaliseViaFTAdaptor` | Resolution lifecycle through the adaptor. |
| `extendViaFTAdaptor` | Extend end-timestamp via the adaptor. |
| `addOutcomeViaFTAdaptor` | Singular dispatch on `FTAdaptor.addOutcome` (one outcome per call — adaptor entry point is singular). |
| `addOutcomesAndSeedViaFTAdaptor` | Atomic add-and-seed. **Preserved intentionally** — `FTAdaptor.addOutcomeWithSeed` has no controller equivalent and is the only frontrun-safe way to add+seed in one tx. |
| `setImageViaFTAdaptor`, `setOutcomeImageViaFTAdaptor`, `postUpdateViaFTAdaptor` | Metadata through the adaptor. |
| `seedViaFTAdaptor` | Seed liquidity through the adaptor (with allowance fallback). |
| `deployViaFTAdaptor` | 3-arg deploy through the adaptor (adaptor is implicit oracle). Counterpart to `deployMarketV2` from `@ft/sdk/deploy`. |

---

## How calls are gated on chain

| Path | When to use | On-chain gate |
|---|---|---|
| Core (controller) | Question deployed direct to FTControllerV2; caller is the on-chain creator. | `_onlyCreator(questionId, msg.sender)` — only the EOA that deployed |
| `integrations/ft-adaptor` | Question deployed via FTAdaptor (the dashboard's path); caller holds the operator role on the adaptor. | `onlyRole(QUESTION_CREATOR_ROLE)` on FTAdaptor — adaptor admin grants this |

If a question was deployed via FTAdaptor and you call FTControllerV2 directly from your wallet, it reverts: the adaptor is the creator on chain, your wallet isn't. Pick the path that matches the deploy topology.

A few ops live only on the controller (no adaptor counterpart): `flagMarket`, `unflagMarket`, `finaliseMarketManually`, and all admin ops (fee / whitelist / treasury / pause). The adaptor doesn't expose moderation or admin.

---

## `SubmitStrategy` — wallet vs atomic

Every chain-op accepts a `submit` parameter that abstracts how transactions actually get broadcast. Two strategies:

### Wallet (sequential)

```ts
{
  kind: "wallet",
  sendTx: async ({ to, data, role }) => walletClient.sendTransaction({ to, data, ... }),
}
```

Each tx is signed and sent separately. The user signs an approve, waits for it to mine, then signs the main tx. Used for wagmi-driven UI flows where the wallet prompts the user.

### Atomic (relayer / EIP-7702 BEBE)

```ts
{
  kind: "atomic",
  sendSingle: (to, data) => relayer.send({ to, data }),
  sendBatch: (calls) => relayer.sendBebeBatch(calls),
}
```

A relayer sends a single tx (happy path) or bundles `[approve, mainCall]` into one atomic batch (allowance-fallback path). Used by the dashboard's KMS-backed relayer.

The chain-op decides which method to call. The same `deployMarketV2(...)` (or any other chain-op) works with either strategy; the integrator just plugs in the right one.

---

## What is deliberately NOT in the SDK

Anything dashboard-specific or stack-specific stays out. The SDK should be useful to integrators with completely different stacks.

- **Hasura/draft schema types** (`MarketDraft`, `QuestionDraft`, etc.) — dashboard-only domain
- **Whitelist/blacklist visibility, metadata models** — dashboard's UI/UX choices
- **Indexer adapters** — different integrators will use different indexers
- **React hooks** — the SDK is framework-agnostic
- **Authentication / Better Auth** — out of scope
- **Trading surface** (`mintCollateralToExactOt`, `redeemExactOtToCollateral`, `swap*`, `claim*`) — admin SDK scope, not user-facing trading
- **Default-admin transfer flow** — niche; can be added when a real consumer asks

---

## Module map

| Path | Subpath export | Exports |
|---|---|---|
| [`src/abi/`](src/abi/) | `@ft/sdk/abi` | All contract ABIs (`FT_ADAPTOR_ABI`, `FT_CONTROLLER_V2_ABI`, ...) |
| [`src/addresses.ts`](src/addresses.ts) | `@ft/sdk/addresses` | `bscMainnet`, `bscUat`, `baseUat`, `getFtAddresses(network)` |
| [`src/ancillary.ts`](src/ancillary.ts) | `@ft/sdk/ancillary` | `buildAncillaryJson`, `decodeAncillary` |
| [`src/chain-ops/`](src/chain-ops/) | `@ft/sdk/chain-ops` | `executeWrite` + all FTControllerV2 write ops (resolve/extend/seed/outcomes/metadata/moderation/admin) |
| [`src/deploy/`](src/deploy/) | `@ft/sdk/deploy` | `deployMarketV2` (controller-only, 4-arg w/ explicit oracle), `buildV2DeployArgs`, allowance helpers, event decoders |
| [`src/errors.ts`](src/errors.ts) | `@ft/sdk/errors` | `decodeContractError`, `formatRevertError`, `DecodedRevert` |
| [`src/extend/`](src/extend/) | `@ft/sdk/extend` | `buildExtendArgs` |
| [`src/integrations/ft-adaptor/`](src/integrations/ft-adaptor/) | `@ft/sdk/integrations/ft-adaptor` | **Internal.** FTAdaptor-routed wrappers: `resolveViaFTAdaptor`, `extendViaFTAdaptor`, `addOutcomeViaFTAdaptor`, `addOutcomesAndSeedViaFTAdaptor`, `seedViaFTAdaptor`, `deployViaFTAdaptor`, etc. |
| [`src/reads/`](src/reads/) | `@ft/sdk/reads` | Controller / market / router / dispute / access reads, lens snapshots & simulates, `getQuestionSnapshot` |
| [`src/resolution/`](src/resolution/) | `@ft/sdk/resolution` | `buildResolveArgs`, `buildUnresolveArgs`, `buildFinaliseArgs` |
| [`src/seed/`](src/seed/) | `@ft/sdk/seed` | `buildSeedOutcomesArgs`, `OT_DECIMALS` |
| [`src/tokens.ts`](src/tokens.ts) | `@ft/sdk/tokens` | `outcomeIndexToTokenId`, `tokenIdToOutcomeIndex`, `outcomeTokenIds` |

The package root (`@ft/sdk`) re-exports the controller-focused core, so most callers can just `import { ... } from "@ft/sdk"`. The `integrations/ft-adaptor` submodule is **not** re-exported from the root — it must be imported explicitly via `@ft/sdk/integrations/ft-adaptor`, both as a signal that it's internal and to keep the core surface free of integration-specific names.

---

## Maintaining ABIs and addresses

Both [`src/abi/`](src/abi/) and [`src/addresses.ts`](src/addresses.ts) are **hand-maintained**. There is no auto-sync. When the contracts are redeployed:

1. Run `forge build` in `ft-contracts` to regenerate artifacts.
2. Copy the relevant `out/<Contract>.sol/<Contract>.json` `abi` field into the corresponding `src/abi/<contract>.ts` file.
3. Update the relevant network block in `src/addresses.ts`.
4. Run `pnpm test` in this package — the calldata snapshot tests will catch ABI drift.

This is intentional. The team tried auto-generation; it added build-step coupling and obscured what the ABI surface actually is. Hand-maintenance keeps the SDK self-contained and makes diffs reviewable.

---

## Tests

```sh
pnpm vitest run packages/sdk/tests/
```

Tests cover arg builders (with calldata snapshots), chain-op orchestration (mocked clients), the FTAdaptor integration wrappers, reads, and the allowance fallback path. Run before committing any contract-touching change.
