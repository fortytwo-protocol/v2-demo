// Single boundary between the playground UI and `@ft/sdk` chain ops.
// Binds the connected wallet's `walletClient.sendTransaction` to each
// SDK op's SubmitStrategy and exposes a tidy callable per op. Views
// call these methods; nothing else in the playground imports SDK ops
// directly.

import type {
  Address,
  Hex,
  PublicClient,
  TransactionReceipt,
  WalletClient,
} from "viem";
import { bsc } from "viem/chains";
import {
  deployMarketV2,
  type V2DeployArgs,
} from "@ft/sdk/deploy";
import {
  addOutcomes,
  extendMarket,
  finaliseMarket,
  postUpdate,
  resolveMarket,
  seedOutcomes,
  setMarketImage,
  setOutcomeImage,
  unresolveMarket,
} from "@ft/sdk";

export interface OpLifecycle {
  onSubmitted?: (hash: Hex) => void;
  onMined?: (receipt: TransactionReceipt) => void;
  onApproveSubmitted?: (hash: Hex) => void;
  onApproveMined?: (receipt: TransactionReceipt) => void;
}

export interface BoundOps {
  account: Address;
  controllerV2: Address;

  deploy(args: V2DeployArgs, on?: OpLifecycle): ReturnType<typeof deployMarketV2>;

  seed(
    input: { marketAddress: Address; collateral: Address; tokenIds: bigint[]; otAmounts: (bigint | number | string)[] },
    on?: OpLifecycle,
  ): ReturnType<typeof seedOutcomes>;

  addOutcomes(
    questionId: Hex,
    outcomes: ReadonlyArray<{ name: string; imageUri: string }>,
    on?: OpLifecycle,
  ): ReturnType<typeof addOutcomes>;

  extend(questionId: Hex, newEndTimestamp: bigint, on?: OpLifecycle): ReturnType<typeof extendMarket>;

  setMarketImage(questionId: Hex, imageUri: string, on?: OpLifecycle): ReturnType<typeof setMarketImage>;

  setOutcomeImage(
    questionId: Hex,
    outcomeIndex: number,
    imageUri: string,
    on?: OpLifecycle,
  ): ReturnType<typeof setOutcomeImage>;

  postUpdate(questionId: Hex, data: Hex, on?: OpLifecycle): ReturnType<typeof postUpdate>;

  resolve(questionId: Hex, answer: number | bigint, on?: OpLifecycle): ReturnType<typeof resolveMarket>;

  unresolve(questionId: Hex, on?: OpLifecycle): ReturnType<typeof unresolveMarket>;

  finalise(questionId: Hex, answer: number | bigint, on?: OpLifecycle): ReturnType<typeof finaliseMarket>;
}

export function bindOps(
  publicClient: PublicClient,
  walletClient: WalletClient,
  account: Address,
  controllerV2: Address,
): BoundOps {
  const walletSubmit = {
    kind: "wallet" as const,
    sendTx: ({ to, data }: { to: Address; data: Hex }) =>
      walletClient.sendTransaction({
        to,
        data,
        chain: bsc,
        account,
      }),
  };
  // The deploy + seed paths use their own SubmitStrategy variant that
  // tags the tx role ("approve" vs "deploy" / "seed"). The underlying
  // sendTx ignores the role tag.
  const allowanceSubmit = {
    kind: "wallet" as const,
    sendTx: ({ to, data }: { to: Address; data: Hex; role: string }) =>
      walletClient.sendTransaction({
        to,
        data,
        chain: bsc,
        account,
      }),
  };
  const base = { publicClient, account, controllerV2 };

  return {
    account,
    controllerV2,

    deploy(args, on) {
      return deployMarketV2({
        publicClient,
        controllerV2,
        account,
        args,
        submit: allowanceSubmit,
        on: {
          onApproveSubmitted: on?.onApproveSubmitted,
          onApproveMined: on?.onApproveMined,
          onDeploySubmitted: on?.onSubmitted,
          onDeployMined: on?.onMined,
        },
      });
    },

    seed({ marketAddress, collateral, tokenIds, otAmounts }, on) {
      return seedOutcomes({
        publicClient,
        account,
        controllerV2,
        collateral,
        marketAddress,
        tokenIds,
        otAmounts,
        submit: allowanceSubmit,
        on: {
          onApproveSubmitted: on?.onApproveSubmitted,
          onApproveMined: on?.onApproveMined,
          onSeedSubmitted: on?.onSubmitted,
          onSeedMined: on?.onMined,
        },
      });
    },

    addOutcomes(questionId, outcomes, on) {
      return addOutcomes({
        ...base,
        questionId,
        outcomes,
        submit: walletSubmit,
        on,
      });
    },

    extend(questionId, newEndTimestamp, on) {
      return extendMarket({
        ...base,
        questionId,
        newEndTimestamp,
        submit: walletSubmit,
        on,
      });
    },

    setMarketImage(questionId, imageUri, on) {
      return setMarketImage({
        ...base,
        questionId,
        imageUri,
        submit: walletSubmit,
        on,
      });
    },

    setOutcomeImage(questionId, outcomeIndex, imageUri, on) {
      return setOutcomeImage({
        ...base,
        questionId,
        outcomeIndex,
        imageUri,
        submit: walletSubmit,
        on,
      });
    },

    postUpdate(questionId, data, on) {
      return postUpdate({
        ...base,
        questionId,
        data,
        submit: walletSubmit,
        on,
      });
    },

    resolve(questionId, answer, on) {
      return resolveMarket({
        ...base,
        questionId,
        answer,
        submit: walletSubmit,
        on,
      });
    },

    unresolve(questionId, on) {
      return unresolveMarket({
        ...base,
        questionId,
        submit: walletSubmit,
        on,
      });
    },

    finalise(questionId, answer, on) {
      return finaliseMarket({
        ...base,
        questionId,
        answer,
        submit: walletSubmit,
        on,
      });
    },
  };
}
