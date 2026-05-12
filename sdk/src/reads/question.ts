/**
 * Direct storage reader for FTControllerV2's `RegistryStorage.questions`
 * mapping.
 *
 * The controller stores `title`, `imageUri`, `oracle`, `creator`,
 * `timestampEnd`, `timestampFinalise`, and `answer` in `QuestionStateV2`
 * but doesn't expose getters for the address/string fields. This helper
 * reads them via `eth_getStorageAt` instead of scanning event logs
 * (which public RPCs commonly rate-limit).
 *
 * Storage source of truth:
 *   ft-contracts/src/controllerv2/ControllerStorage.sol
 *
 *   struct QuestionStateV2 {
 *     address creator;              // slot+0 [low 160 bits]
 *     uint96  timestampEnd;         // slot+0 [high 96 bits]
 *     address oracle;               // slot+1 [low 160 bits]
 *     uint96  timestampFinalise;    // slot+1 [high 96 bits]
 *     uint256 answer;               // slot+2
 *     uint96  timestampFlagExpiry;  // slot+3
 *     string  title;                // slot+4
 *     string  imageUri;             // slot+5
 *     string[] outcomeNames;        // slot+6
 *     string[] outcomeImageUris;    // slot+7
 *   }
 *
 * ERC-7201 root for the registry struct (matches OpenZeppelin
 * SlotDerivation.erc7201Slot):
 *   keccak256(uint256(keccak256("fortytwo.storage.Registry")) - 1)
 *     & ~bytes32(uint256(0xff))
 *
 * NOTE: This reads storage by computed slot. If the contract's storage
 * layout changes (e.g. fields added to `QuestionStateV2` before the
 * ones below, or a different ERC-7201 namespace), this helper breaks
 * silently. A controller-side `getQuestion(questionId)` view function
 * would be a more robust long-term fix.
 */

import {
  encodeAbiParameters,
  hexToString,
  keccak256,
  toBytes,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";

function erc7201Root(namespace: string): bigint {
  const inner = BigInt(keccak256(toBytes(namespace)));
  const seed = `0x${(inner - BigInt(1)).toString(16).padStart(64, "0")}` as Hex;
  const outer = BigInt(keccak256(seed));
  const mask = (BigInt(1) << BigInt(256)) - BigInt(1) - BigInt(0xff);
  return outer & mask;
}

/** ERC-7201 root for `fortytwo.storage.Registry`. */
const REGISTRY_ROOT = erc7201Root("fortytwo.storage.Registry");

/** `questions` mapping inside RegistryStorage. EnumerableSet markets
 *  takes the first 2 storage slots (`bytes32[] _values` +
 *  `mapping(bytes32 => uint256) _positions`). */
const QUESTIONS_MAP_SLOT = REGISTRY_ROOT + BigInt(2);

function questionRootSlot(questionId: Hex): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      [questionId, QUESTIONS_MAP_SLOT],
    ),
  );
}

function addSlot(slot: Hex, offset: bigint): Hex {
  const next = BigInt(slot) + offset;
  return `0x${next.toString(16).padStart(64, "0")}` as Hex;
}

async function readSlot(
  publicClient: PublicClient,
  address: Address,
  slot: Hex,
): Promise<Hex> {
  const raw = await publicClient.getStorageAt({ address, slot });
  return (raw ?? `0x${"0".repeat(64)}`) as Hex;
}

/** Solidity packs `address` (low 20 bytes) + `uint96` (high 12 bytes)
 *  in one storage slot. */
function unpackAddressUint96(slot: Hex): { address: Address; uint96: bigint } {
  const hex = slot.slice(2).padStart(64, "0");
  return {
    address: (`0x${hex.slice(24, 64)}`) as Address,
    uint96: BigInt(`0x${hex.slice(0, 24)}`),
  };
}

/**
 * Read a Solidity `string` from storage at `slot`:
 *   - Short strings (≤31 bytes) live inline: high 31 bytes = data,
 *     low byte = `length * 2` (low bit 0).
 *   - Long strings: slot stores `length * 2 + 1`; data lives at
 *     keccak256(slot) and following slots, 32 bytes per slot.
 */
async function readString(
  publicClient: PublicClient,
  address: Address,
  slot: Hex,
): Promise<string> {
  const head = (await readSlot(publicClient, address, slot))
    .slice(2)
    .padStart(64, "0");
  const lastByte = parseInt(head.slice(62, 64), 16);
  if ((lastByte & 1) === 0) {
    const len = lastByte / 2;
    if (len === 0) return "";
    return hexToString(`0x${head.slice(0, len * 2)}`);
  }
  const total = (BigInt(`0x${head}`) - BigInt(1)) / BigInt(2);
  const len = Number(total);
  if (len === 0) return "";
  const dataBase = keccak256(slot);
  const numSlots = Math.ceil(len / 32);
  const chunks: string[] = [];
  for (let i = 0; i < numSlots; i++) {
    const s = addSlot(dataBase, BigInt(i));
    chunks.push(
      (await readSlot(publicClient, address, s)).slice(2).padStart(64, "0"),
    );
  }
  return hexToString(`0x${chunks.join("").slice(0, len * 2)}`);
}

export interface ReadQuestionStateOptions {
  publicClient: PublicClient;
  controllerV2: Address;
  questionId: Hex;
}

export interface QuestionState {
  creator: Address;
  oracle: Address;
  timestampEnd: bigint;
  timestampFinalise: bigint;
  answer: bigint;
  title: string;
  imageUri: string;
}

/**
 * Read the per-question state stored in
 * `FTControllerV2.RegistryStorage.questions[questionId]`.
 *
 * Returns address fields, packed timestamps, the resolution `answer`,
 * and the inline strings `title` + `imageUri`. Outcome arrays
 * (`outcomeNames`, `outcomeImageUris`) live in adjacent slots; for
 * outcome names use `getOutcomeNames` from the controller, which is
 * already a public getter.
 */
export async function readQuestionState(
  opts: ReadQuestionStateOptions,
): Promise<QuestionState> {
  const root = questionRootSlot(opts.questionId);
  const titleSlot = addSlot(root, BigInt(4));
  const imageSlot = addSlot(root, BigInt(5));

  const [s0, s1, s2, title, imageUri] = await Promise.all([
    readSlot(opts.publicClient, opts.controllerV2, root),
    readSlot(opts.publicClient, opts.controllerV2, addSlot(root, BigInt(1))),
    readSlot(opts.publicClient, opts.controllerV2, addSlot(root, BigInt(2))),
    readString(opts.publicClient, opts.controllerV2, titleSlot),
    readString(opts.publicClient, opts.controllerV2, imageSlot),
  ]);

  const { address: creator, uint96: timestampEnd } = unpackAddressUint96(s0);
  const { address: oracle, uint96: timestampFinalise } =
    unpackAddressUint96(s1);
  const answer = BigInt(s2);

  return {
    creator,
    oracle,
    timestampEnd,
    timestampFinalise,
    answer,
    title,
    imageUri,
  };
}
