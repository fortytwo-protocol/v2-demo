/**
 * Decode revert errors from viem into structured, human-readable form.
 *
 * Why this exists: every v2 hook used to do `error?.message` straight to a
 * toast, which surfaces multi-line viem diagnostics that bury the actual
 * revert reason. With a centralised decoder + the canonical V2_ERROR_ABI we
 * can show the operator the real custom error name (and its decoded args)
 * regardless of which contract along the call chain reverted.
 *
 * Surfaces three kinds of result:
 *   - "user-rejected"  — wallet rejection, callers should generally stay silent
 *   - "decoded"        — we recognised a custom error; `name` + `args` populated
 *   - "string-revert"  — old-style `revert("…")` reason string
 *   - "unknown"        — neither selector matched nor message parseable
 *
 * Also exposes `formatRevertError` to turn the decoded result into a single-
 * line, friendly title for `messageApi.error` and `<RevertErrorAlert />`.
 */
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult,
  isAddress,
  type Hex,
} from "viem";
import { V2_ERROR_ABI } from "./abi";

export type DecodedRevert =
  | { kind: "user-rejected"; shortMessage: string; raw: unknown }
  | {
      kind: "decoded";
      name: string;
      args: readonly unknown[];
      shortMessage: string;
      data?: Hex;
      raw: unknown;
    }
  | {
      kind: "string-revert";
      reason: string;
      shortMessage: string;
      raw: unknown;
    }
  | {
      kind: "unknown";
      shortMessage: string;
      data?: Hex;
      raw: unknown;
    };

/** Friendly one-liners for the errors operators are most likely to hit.
 *  Anything not in here falls back to the raw `Name(arg1, arg2)` rendering. */
const FRIENDLY_TITLES: Record<string, (args: readonly unknown[]) => string> = {
  AccessControlUnauthorizedAccount: ([account, role]) =>
    `Wallet ${shortAddr(account)} is missing role ${shortRole(role)}.`,
  ReentrancyGuardReentrantCall: () => "Reentrancy detected. Try again.",
  RegistryOnlyCreator: () =>
    "Only the original question creator can perform this action.",
  RegistryOnlyOracle: () => "Only the oracle can perform this action.",
  RegistryOnlyCreatorOrOracleOrAdmin: () =>
    "Restricted to creator, oracle, or admin.",
  RegistryAlreadyFinalised: () => "Question is already finalised.",
  RegistryAlreadyFlagged: () => "Market is already flagged.",
  RegistryNotFlagged: () => "Market is not flagged.",
  RegistryNotResolved: () => "Question has not been resolved yet.",
  RegistryQuestionIsFlagged: () =>
    "Action blocked: market is currently flagged.",
  RegistryQuestionAlreadyExists: () =>
    "A question with this ID is already registered.",
  RegistryQuestionNotFound: () => "Question not found on-chain.",
  RegistryEndTimestampHasPassed: () =>
    "End timestamp is in the past — this question can no longer be modified or extended.",
  RegistryEndTimestampBeforeExisting: () =>
    "New end timestamp must be later than the current one.",
  RegistryInvalidAnswer: () =>
    "Invalid answer index — must be between 1 and the number of outcomes.",
  RegistrySameAnswer: () => "Answer is unchanged from the current resolution.",
  RegistryManualFinaliseTooEarly: () =>
    "Cannot manually finalise yet — wait for the dispute window.",
  RegistryCollateralNotWhitelisted: () =>
    "Collateral token is not on the registry whitelist.",
  RegistryCurveNotAllowed: () =>
    "Curve contract is not on the registry whitelist.",
  RegistrySeedBelowMinimum: () => "Seed amount is below the minimum.",
  RegistryDuplicateOutcome: () =>
    "Duplicate outcome name — outcomes must be unique.",
  RegistryEmptyTitle: () => "Market title cannot be empty.",
  RegistryEmptyName: () => "Outcome name cannot be empty.",
  RegistryExceedMaxTitleLength: () => "Market title exceeds the max length.",
  RegistryExceedMaxNameLength: () => "Outcome name exceeds the max length.",
  RegistryExceedMaxNames: () => "Too many outcomes for this market.",
  RegistryInsufficientOutcomesGiven: () => "At least 2 outcomes are required.",
  RegistryOutcomeImagesMismatch: () =>
    "Outcome image URI count must match outcome name count.",
  RegistryPaused: () => "Registry is paused.",
  AdaptorInvalidQuestion: () => "Adaptor: invalid question ID.",
  AdaptorSeedCostExceedsBudget: () =>
    "Computed seed cost exceeds your approved budget. Increase approval.",
  AdaptorMarketDoesNotMatchQuestionId: () =>
    "Adaptor: market does not belong to the given question.",
  AdaptorOtAmountsDoesNotMatch: () =>
    "Adaptor: outcome token amounts do not match.",
  RouterSlippage: () =>
    "Slippage exceeded — increase slippage tolerance and retry.",
  RouterDbCViolated: () =>
    "DBC invariant violated — try a smaller swap amount.",
  RouterInvalidMarket: () => "Router: invalid market address.",
  RouterInvalidSwapAmount: () => "Router: swap amount is invalid.",
  RouterNotClaimableYet: () => "Position is not claimable yet.",
  RouterIntegratorFeeTooHigh: () => "Integrator fee exceeds maximum.",
  MarketEnded: () => "Market has ended — trading is closed.",
  MarketNotStarted: () => "Market has not started yet.",
  MarketResolved: () => "Market is already resolved.",
  MarketNotResolved: () => "Market has not been resolved yet.",
  MarketNotFinalised: () => "Market has not been finalised yet.",
  MarketPaused: () => "Market is paused.",
  MarketSwapAmountCannotBeZero: () => "Swap amount must be greater than zero.",
  MarketSwapPriceInvalidated: ([collateralDelta, otDelta]) =>
    `Swap price moved — collateralDelta=${collateralDelta}, otDelta=${otDelta}. Retry with fresh quote.`,
  MarketInsufficientSeedCollateral: () =>
    "Insufficient seed collateral — increase otSeed.",
  ERC20InsufficientAllowance: ([spender, allowance, needed]) =>
    `Insufficient allowance: spender ${shortAddr(spender)} has ${allowance}, needs ${needed}.`,
  ERC20InsufficientBalance: ([sender, balance, needed]) =>
    `Insufficient balance: ${shortAddr(sender)} has ${balance}, needs ${needed}.`,
  SafeERC20FailedOperation: ([token]) =>
    `ERC20 call to ${shortAddr(token)} failed.`,
  SafeTransferFailed: () => "ERC20 transfer failed.",
  SafeTransferFromFailed: () =>
    "ERC20 transferFrom failed — check balance and allowance.",
  GuessTargetUnreachable: ([current, target]) =>
    `Curve solver could not reach target (current=${current}, target=${target}).`,
  GuessExceedMaxIterations: ([n]) =>
    `Curve solver exceeded ${n} iterations without converging.`,
  LensInvalidTokenId: ([tokenId]) =>
    `Lens: invalid token ID ${tokenId}.`,
  CurveInvalidCost: ([quantity]) =>
    `Curve: invalid cost for quantity ${quantity}.`,
};

export function decodeContractError(error: unknown): DecodedRevert {
  if (isUserRejection(error)) {
    return {
      kind: "user-rejected",
      shortMessage: "Transaction rejected by user.",
      raw: error,
    };
  }

  // viem stacks errors via `cause`; walk the chain to find the most specific
  // one that carries decoded data.
  const reverted =
    error instanceof BaseError
      ? (error.walk(
          (e) => e instanceof ContractFunctionRevertedError,
        ) as ContractFunctionRevertedError | null)
      : null;

  if (reverted?.data && reverted.data.errorName) {
    const { errorName, args } = reverted.data;
    return {
      kind: "decoded",
      name: errorName,
      args: (args ?? []) as readonly unknown[],
      shortMessage: reverted.shortMessage ?? errorName,
      data: undefined,
      raw: error,
    };
  }

  // Fallback: pull a 4-byte selector blob from the error and try to decode
  // against the canonical V2 error ABI. Catches errors that bubbled from a
  // callee whose ABI wasn't passed to `writeContract`. viem stores the raw
  // selector on `.signature` / `.raw` of the ContractFunctionRevertedError when
  // the user-supplied abi didn't recognise it, so check those first before
  // walking the generic cause chain.
  const rawData =
    (reverted as { raw?: Hex } | null)?.raw ||
    (reverted as { signature?: Hex } | null)?.signature ||
    extractHexData(error);
  if (rawData) {
    try {
      const decoded = decodeErrorResult({
        abi: V2_ERROR_ABI,
        data: rawData,
      });
      return {
        kind: "decoded",
        name: decoded.errorName,
        args: (decoded.args ?? []) as readonly unknown[],
        shortMessage:
          (error instanceof BaseError && error.shortMessage) ||
          decoded.errorName,
        data: rawData,
        raw: error,
      };
    } catch {
      // selector wasn't in our ABI; fall through to string/unknown handling
    }
  }

  const stringReason = extractStringRevert(error);
  if (stringReason) {
    return {
      kind: "string-revert",
      reason: stringReason,
      shortMessage: stringReason,
      raw: error,
    };
  }

  const shortMessage =
    (error instanceof BaseError && error.shortMessage) ||
    (error instanceof Error ? error.message.split("\n")[0] : String(error));
  return { kind: "unknown", shortMessage, data: rawData, raw: error };
}

/** Strip the `raw` viem-error reference and normalise any BigInts inside
 *  `args` so the result is safe to store in React state / pass to renderers
 *  without crashing JSON.stringify in dev tooling and browser extensions
 *  (which run in isolated contexts that don't share our BigInt polyfill). */
export function stripRaw(decoded: DecodedRevert): DecodedRevert {
  if (decoded.kind === "decoded") {
    return {
      ...decoded,
      args: decoded.args.map(normaliseBigInt) as readonly unknown[],
      raw: undefined,
    };
  }
  return { ...decoded, raw: undefined };
}

function normaliseBigInt(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normaliseBigInt);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normaliseBigInt(v);
    }
    return out;
  }
  return value;
}

/** Single-line user-facing title for a decoded revert. Safe for toasts. */
export function formatRevertError(decoded: DecodedRevert): string {
  switch (decoded.kind) {
    case "user-rejected":
      return decoded.shortMessage;
    case "string-revert":
      return decoded.reason;
    case "unknown":
      return decoded.shortMessage || "Transaction reverted (no reason given).";
    case "decoded": {
      const signature =
        decoded.args.length === 0
          ? `${decoded.name}()`
          : `${decoded.name}(${decoded.args.map(formatArg).join(", ")})`;
      const friendly = FRIENDLY_TITLES[decoded.name];
      return friendly ? `${signature} — ${friendly(decoded.args)}` : signature;
    }
  }
}

function isUserRejection(error: unknown): boolean {
  if (!error) return false;
  // viem's UserRejectedRequestError sets name + code 4001
  const name = (error as { name?: string }).name ?? "";
  if (name.includes("UserRejected")) return true;
  if ((error as { code?: number }).code === 4001) return true;
  const msg =
    (error instanceof Error ? error.message : String(error)) ?? "";
  return (
    msg.includes("User rejected") ||
    (msg.includes("rejected") && msg.toLowerCase().includes("user"))
  );
}

function extractHexData(error: unknown): Hex | undefined {
  if (!error) return undefined;
  // Walk the cause chain looking for `.data` that's a 0x-prefixed string.
  const seen = new Set<unknown>();
  let cur: unknown = error;
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const data = (cur as { data?: unknown }).data;
    if (typeof data === "string" && data.startsWith("0x") && data.length >= 10) {
      return data as Hex;
    }
    if (
      typeof data === "object" &&
      data !== null &&
      typeof (data as { data?: unknown }).data === "string" &&
      ((data as { data: string }).data).startsWith("0x")
    ) {
      return (data as { data: Hex }).data;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return undefined;
}

function extractStringRevert(error: unknown): string | undefined {
  // Old-style `revert("reason")` shows up in viem as
  // `reverted with reason: "<reason>"` in shortMessage, or as a string
  // in the `details` field.
  const short =
    error instanceof BaseError ? error.shortMessage : undefined;
  if (short) {
    const m = short.match(/reason(?:\s+string)?:?\s*['"]?([^'"\n]+)['"]?/i);
    if (m) return m[1].trim();
  }
  return undefined;
}

function formatArg(arg: unknown): string {
  if (typeof arg === "bigint") return arg.toString();
  if (typeof arg === "string") {
    if (isAddress(arg)) return shortAddr(arg);
    return arg;
  }
  if (Array.isArray(arg)) return `[${arg.map(formatArg).join(", ")}]`;
  return String(arg);
}

function shortAddr(value: unknown): string {
  if (typeof value !== "string") return String(value);
  if (!isAddress(value)) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function shortRole(value: unknown): string {
  if (typeof value !== "string") return String(value);
  if (!value.startsWith("0x")) return value;
  return `${value.slice(0, 10)}…${value.slice(-6)}`;
}
