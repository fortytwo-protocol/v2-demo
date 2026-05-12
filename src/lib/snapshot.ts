// React Query hook for the lens-based market snapshot.
// Fetches the per-market snapshot, per-outcome snapshots, the on-chain
// outcome names, and (via direct storage read on the controller) the
// title / imageUri / oracle / creator that aren't exposed via getters.
//
// Cache keys are scoped by environment so switching between production
// and staging doesn't leak cached state across controllers.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { type Address, type Hex, type PublicClient } from "viem";
import {
  snapshotMarket,
  snapshotOt,
  getConfig as readControllerConfig,
  getOutcomeNames,
  getAncillaryUpdates,
  readQuestionState,
} from "@ft/sdk/reads";
import { outcomeIndexToTokenId } from "@ft/sdk/tokens";
import { decodeAncillary, type DecodedAncillary } from "@ft/sdk/ancillary";
import { useEnvironment, type Environment } from "./environment";

interface DeployParams {
  collateral: Address;
  parentTokenId: bigint;
  questionId: `0x${string}`;
  curve: Address;
  timestampStart: bigint;
}

interface MarketState {
  market: Address;
  curve: Address;
  timestampStart: bigint;
  totalMarketCap: bigint;
  treasury: Address;
  numOutcomes: bigint;
  timestampEnd: bigint;
  answer: bigint;
  isFinalised: boolean;
}

interface OtSnapshotEntry {
  tokenId: bigint;
  price: bigint;
  supply: bigint;
  totalMarketCap: bigint;
  payoutPerOt: bigint;
}

export interface MarketSnapshot {
  market: Address;
  questionId: `0x${string}`;
  controllerV2: Address;
  deploy: DeployParams;
  state: MarketState;
  ots: readonly OtSnapshotEntry[];
  outcomes: ReadonlyArray<{
    index: number;
    tokenId: bigint;
    name: string;
    snapshot: OtSnapshotEntry;
  }>;
  config: {
    treasury: Address;
    feeRate: bigint;
    numOutcomes: bigint;
    timestampEnd: bigint;
    answer: bigint;
    isFinalised: boolean;
  };
  metadata: {
    title: string;
    imageUri: string;
    oracle: Address;
    creator: Address;
  };
  /**
   * Ancillary entries posted by the creator, chronological. The first
   * entry is the bytes set at deploy time — `deployMarket` registers
   * the initial ancillaryData as the first update under the creator's
   * owner key, so we don't need a separate event scan to surface it.
   */
  ancillary: ReadonlyArray<{
    timestamp: bigint;
    hex: Hex;
    decoded: DecodedAncillary;
  }>;
}

async function fetchSnapshot(
  publicClient: PublicClient,
  env: Environment,
  market: Address,
): Promise<MarketSnapshot> {
  const controllerV2 = env.controllerV2;
  const raw = (await snapshotMarket({
    publicClient,
    lensV2: env.lensV2,
    market,
  })) as unknown as {
    ots: OtSnapshotEntry[];
    deploy: DeployParams;
    state: MarketState;
  };

  const questionId = raw.deploy.questionId;

  const [config, names, questionState] = await Promise.all([
    readControllerConfig({ publicClient, controllerV2, market }),
    getOutcomeNames({ publicClient, controllerV2, questionId }),
    readQuestionState({ publicClient, controllerV2, questionId }),
  ]);

  // `getAncillaryUpdates` is keyed by (questionId, owner). The deploy's
  // initial ancillaryData is registered as the first entry under the
  // creator's key, so this single read covers both initial + subsequent.
  // Failing the read shouldn't kill the rest of the snapshot.
  const rawUpdates = await getAncillaryUpdates({
    publicClient,
    controllerV2,
    questionId,
    owner: questionState.creator,
  }).catch(() => [] as ReadonlyArray<{ timestamp: bigint; update: Hex }>);
  const ancillary = rawUpdates.map((u) => ({
    timestamp: u.timestamp,
    hex: u.update,
    decoded: decodeAncillary(u.update),
  }));

  const otSnapshots = await Promise.all(
    names.map(async (_, index) => {
      const tokenId = outcomeIndexToTokenId(index);
      const otRaw = (await snapshotOt({
        publicClient,
        lensV2: env.lensV2,
        market,
        tokenId,
      })) as unknown as OtSnapshotEntry;
      return otRaw;
    }),
  );

  const outcomes = names.map((name, index) => ({
    index,
    tokenId: outcomeIndexToTokenId(index),
    name,
    snapshot: otSnapshots[index]!,
  }));

  return {
    market,
    questionId,
    controllerV2,
    deploy: raw.deploy,
    state: raw.state,
    ots: raw.ots,
    outcomes,
    config,
    metadata: {
      title: questionState.title,
      imageUri: questionState.imageUri,
      oracle: questionState.oracle,
      creator: questionState.creator,
    },
    ancillary,
  };
}

export function marketSnapshotKey(envName: string, market: Address) {
  return ["market-snapshot", envName, market.toLowerCase()] as const;
}

export function useMarketSnapshot(market: Address | null) {
  const publicClient = usePublicClient();
  const { env } = useEnvironment();
  return useQuery({
    queryKey: market
      ? marketSnapshotKey(env.name, market)
      : ["market-snapshot", env.name, "none"],
    enabled: !!market && !!publicClient,
    queryFn: async () => {
      if (!market || !publicClient) throw new Error("missing client");
      return fetchSnapshot(publicClient, env, market);
    },
  });
}

export function useInvalidateMarket() {
  const qc = useQueryClient();
  const { env } = useEnvironment();
  return (market: Address) =>
    qc.invalidateQueries({ queryKey: marketSnapshotKey(env.name, market) });
}
