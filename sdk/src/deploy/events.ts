/**
 * Pulls (questionId, market) out of deploy-tx receipts.
 *
 * We filter by `log.address === expectedAddress` so future batched deploys
 * (parent + child markets, multi-call batches, etc.) don't silently bind
 * to the wrong emission. If more than one matching event shows up the
 * receipt is ambiguous and we throw rather than guess.
 */

import { parseEventLogs, type Address, type Hex, type Log } from "viem";
import { FT_CONTROLLER_V2_ABI, FT_MARKET_CONTROLLER_ABI } from "../abi";

function matchesAddress(logAddress: Address, expected: Address): boolean {
  return logAddress.toLowerCase() === expected.toLowerCase();
}

export interface V2DeployedMarket {
  questionId: Hex;
  market: Address;
}

/**
 * Parse CreateNewMarket emitted by FTControllerV2 during deployMarket.
 * Returns null if not present; throws if the receipt contains more than
 * one from the same controller (ambiguous).
 */
export function decodeV2CreateNewMarket(
  logs: Log[],
  controller: Address,
): V2DeployedMarket | null {
  const events = parseEventLogs({
    abi: FT_CONTROLLER_V2_ABI,
    eventName: "CreateNewMarket",
    logs,
  }).filter((e) => matchesAddress(e.address, controller));

  if (events.length > 1) {
    throw new Error(
      `Ambiguous receipt: ${events.length} CreateNewMarket events from ${controller}`,
    );
  }

  const [event] = events;
  if (!event) return null;

  return {
    questionId: event.args.questionId,
    market: event.args.market,
  };
}

/**
 * Parse CreateNewQuestion emitted by FTMarketController (V1) during
 * createQuestion. Returns null if not present or ambiguous.
 */
export function decodeV1CreateNewQuestion(
  logs: Log[],
  controller: Address,
): Hex | null {
  const events = parseEventLogs({
    abi: FT_MARKET_CONTROLLER_ABI,
    eventName: "CreateNewQuestion",
    logs,
  }).filter((e) => matchesAddress(e.address, controller));

  if (events.length > 1) {
    throw new Error(
      `Ambiguous receipt: ${events.length} CreateNewQuestion events from ${controller}`,
    );
  }

  return events[0]?.args.questionId ?? null;
}
