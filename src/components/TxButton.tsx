// Wraps any chain-op into a button with built-in lifecycle:
//   - disables while in flight
//   - simulates first (the SDK does this internally; we just gate UI on the result)
//   - surfaces decoded revert errors inline below the button
//   - calls `onSuccess` after the receipt mines
//
// The op itself is provided by the caller as a thunk; this component
// doesn't know about specific SDK functions.

import { useState } from "react";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import {
  decodeContractError,
  formatRevertError,
  type DecodedRevert,
} from "@ft/sdk/errors";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  run: () => Promise<unknown>;
  onSuccess?: () => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "submitting"; message: string }
  | { kind: "error"; decoded: DecodedRevert };

export function TxButton({
  children,
  variant = "primary",
  disabled,
  run,
  onSuccess,
}: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const { isConnected } = useAccount();
  const busy = phase.kind === "submitting";

  return (
    <div className="pg-tx-button">
      <Button
        variant={variant}
        disabled={disabled || busy || !isConnected}
        onClick={async () => {
          setPhase({ kind: "submitting", message: "Simulating…" });
          try {
            await run();
            setPhase({ kind: "idle" });
            onSuccess?.();
          } catch (err) {
            const decoded = decodeContractError(err);
            if (decoded.kind === "user-rejected") {
              setPhase({ kind: "idle" });
              return;
            }
            setPhase({ kind: "error", decoded });
            console.warn("[TxButton] error:", decoded);
          }
        }}
      >
        {busy ? phase.message : children}
      </Button>
      {!isConnected && <div className="pg-tx-hint">Connect your wallet first</div>}
      {phase.kind === "error" && (
        <div className="pg-tx-error">{formatRevertError(phase.decoded)}</div>
      )}
    </div>
  );
}
