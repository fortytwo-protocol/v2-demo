import { describe, expect, it, vi } from "vitest";
import {
  encodeAbiParameters,
  keccak256,
  pad,
  toBytes,
  toHex,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { readQuestionState } from "../../src/reads/question";

const CONTROLLER = "0x000000000000000000000000000000000000c0de" as Address;
const QID =
  "0xabcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123abcd0123" as Hex;

/** Mirror the production slot math so the test exercises the public
 *  shape end-to-end without re-importing private helpers. */
function registryRoot(): bigint {
  const inner = BigInt(keccak256(toBytes("fortytwo.storage.Registry")));
  const seed = `0x${(inner - BigInt(1)).toString(16).padStart(64, "0")}` as Hex;
  const outer = BigInt(keccak256(seed));
  const mask = (BigInt(1) << BigInt(256)) - BigInt(1) - BigInt(0xff);
  return outer & mask;
}

function questionRoot(qid: Hex): Hex {
  const slot = registryRoot() + BigInt(2);
  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "uint256" }],
      [qid, slot],
    ),
  );
}

function bumpSlot(slot: Hex, offset: bigint): Hex {
  const next = BigInt(slot) + offset;
  return `0x${next.toString(16).padStart(64, "0")}` as Hex;
}

function packAddressUint96(addr: Address, ts: bigint): Hex {
  const hi = ts.toString(16).padStart(24, "0");
  const lo = addr.slice(2).padStart(40, "0");
  return `0x${hi}${lo}` as Hex;
}

function shortStringSlot(text: string): Hex {
  const data = toHex(text).slice(2);
  const padded = data.padEnd(62, "0");
  const len = (text.length * 2).toString(16).padStart(2, "0");
  return `0x${padded}${len}` as Hex;
}

describe("readQuestionState", () => {
  it("decodes packed address+uint96, answer, and inline strings", async () => {
    const creator = "0x1111111111111111111111111111111111111111" as Address;
    const oracle = "0x2222222222222222222222222222222222222222" as Address;
    const timestampEnd = BigInt(1_777_000_000);
    const timestampFinalise = BigInt(1_777_500_000);
    const answer = BigInt(3);
    const title = "Hello title";
    const imageUri = "ipfs://Qabc";

    const root = questionRoot(QID);
    const slotMap: Record<string, Hex> = {
      [root.toLowerCase()]: packAddressUint96(creator, timestampEnd),
      [bumpSlot(root, BigInt(1)).toLowerCase()]: packAddressUint96(
        oracle,
        timestampFinalise,
      ),
      [bumpSlot(root, BigInt(2)).toLowerCase()]: pad(toHex(answer), {
        size: 32,
      }),
      [bumpSlot(root, BigInt(4)).toLowerCase()]: shortStringSlot(title),
      [bumpSlot(root, BigInt(5)).toLowerCase()]: shortStringSlot(imageUri),
    };

    const getStorageAt = vi.fn(
      async ({ address, slot }: { address: Address; slot: Hex }) => {
        expect(address).toBe(CONTROLLER);
        const v = slotMap[slot.toLowerCase()];
        return v ?? (`0x${"0".repeat(64)}` as Hex);
      },
    );

    const publicClient = { getStorageAt } as unknown as PublicClient;

    const state = await readQuestionState({
      publicClient,
      controllerV2: CONTROLLER,
      questionId: QID,
    });

    expect(state.creator.toLowerCase()).toBe(creator);
    expect(state.oracle.toLowerCase()).toBe(oracle);
    expect(state.timestampEnd).toBe(timestampEnd);
    expect(state.timestampFinalise).toBe(timestampFinalise);
    expect(state.answer).toBe(answer);
    expect(state.title).toBe(title);
    expect(state.imageUri).toBe(imageUri);
  });

  it("decodes long strings spread across multiple slots", async () => {
    const longTitle = "A".repeat(80); // 80 bytes → 3 slots
    const root = questionRoot(QID);
    const titleSlot = bumpSlot(root, BigInt(4));

    // long marker = length*2 + 1
    const lengthMarker = BigInt(longTitle.length * 2 + 1);
    const headValue = (`0x${lengthMarker.toString(16).padStart(64, "0")}`) as Hex;
    const dataBase = keccak256(titleSlot);

    const dataHex = toHex(longTitle).slice(2);
    const slotMap: Record<string, Hex> = {
      [root.toLowerCase()]: `0x${"0".repeat(64)}` as Hex,
      [bumpSlot(root, BigInt(1)).toLowerCase()]: `0x${"0".repeat(64)}` as Hex,
      [bumpSlot(root, BigInt(2)).toLowerCase()]: `0x${"0".repeat(64)}` as Hex,
      [titleSlot.toLowerCase()]: headValue,
      [bumpSlot(root, BigInt(5)).toLowerCase()]: `0x${"0".repeat(64)}` as Hex,
    };
    // Chunk the data into 32-byte slots starting at keccak256(titleSlot).
    for (let i = 0; i * 64 < dataHex.length; i++) {
      const chunk = dataHex.slice(i * 64, i * 64 + 64).padEnd(64, "0");
      slotMap[bumpSlot(dataBase, BigInt(i)).toLowerCase()] = `0x${chunk}` as Hex;
    }

    const getStorageAt = vi.fn(
      async ({ slot }: { address: Address; slot: Hex }) =>
        slotMap[slot.toLowerCase()] ?? (`0x${"0".repeat(64)}` as Hex),
    );
    const publicClient = { getStorageAt } as unknown as PublicClient;

    const state = await readQuestionState({
      publicClient,
      controllerV2: CONTROLLER,
      questionId: QID,
    });

    expect(state.title).toBe(longTitle);
  });
});
