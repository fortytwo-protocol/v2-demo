import { useState } from "react";
import type { Address } from "viem";
import { Card, CardTitle } from "../../components/Card";
import { Button } from "../../components/Button";
import { IconButton } from "../../components/IconButton";
import { Input } from "../../components/Field";
import { TxButton } from "../../components/TxButton";
import { ImagePreview } from "../../components/ImagePreview";
import { Icon } from "../../components/icons/Icon";
import { useBoundOps } from "../../lib/use-bound-ops";
import { useInvalidateMarket, type MarketSnapshot } from "../../lib/snapshot";

interface Props {
  address: Address;
  snapshot: MarketSnapshot | undefined;
}

type Dialog =
  | null
  | { kind: "add" }
  | { kind: "seed" }
  | { kind: "image"; outcomeIndex: number; current: string };

export function Outcomes({ address, snapshot }: Props) {
  const ops = useBoundOps();
  const invalidate = useInvalidateMarket();
  const [dialog, setDialog] = useState<Dialog>(null);

  if (!snapshot) {
    return (
      <div className="pg-empty">
        <h2>Loading outcomes…</h2>
      </div>
    );
  }

  return (
    <>
      <Card>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-card)",
          }}
        >
          <CardTitle>Outcomes ({snapshot.outcomes.length})</CardTitle>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              onClick={() => setDialog({ kind: "add" })}
              disabled={!ops || snapshot.config.isFinalised}
            >
              <Icon name="plus" size={12} />
              Add outcome
            </Button>
            <Button
              onClick={() => setDialog({ kind: "seed" })}
              disabled={!ops || snapshot.config.isFinalised}
            >
              Seed liquidity
            </Button>
          </div>
        </div>

        <div className="pg-outcomes-table">
          <div className="pg-outcome-tr pg-outcome-tr-header">
            <span>Idx</span>
            <span>Image</span>
            <span>Name</span>
            <span className="pg-outcome-token-col">Token ID</span>
            <span></span>
          </div>
          {snapshot.outcomes.map((o) => {
            // Outcome-level imageUri lives in the CreateNewQuestionV2 event
            // log (best-effort) — not surfaced in the current per-outcome
            // snapshot. Leave the thumb empty until the event-sourced image
            // arrays are plumbed in.
            const imageUri = "";
            return (
              <div className="pg-outcome-tr" key={o.index}>
                <span className="mono" style={{ color: "var(--text-faint)" }}>
                  {String(o.index + 1).padStart(2, "0")}
                </span>
                {imageUri ? (
                  <img className="pg-outcome-thumb" src={imageUri} alt="" />
                ) : (
                  <div className="pg-outcome-thumb" />
                )}
                <span style={{ fontWeight: 500 }}>{o.name}</span>
                <span className="mono pg-outcome-token-col">
                  {o.tokenId.toString()}
                </span>
                <span>
                  <Button
                    variant="chip"
                    disabled={!ops}
                    onClick={() =>
                      setDialog({
                        kind: "image",
                        outcomeIndex: o.index,
                        current: imageUri,
                      })
                    }
                  >
                    Set image
                  </Button>
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {dialog?.kind === "add" && (
        <AddOutcomeDialog
          questionId={snapshot.questionId}
          onClose={() => setDialog(null)}
          onSuccess={() => invalidate(address)}
          disabled={!ops}
        />
      )}
      {dialog?.kind === "seed" && (
        <SeedDialog
          marketAddress={address}
          snapshot={snapshot}
          onClose={() => setDialog(null)}
          onSuccess={() => invalidate(address)}
          disabled={!ops}
        />
      )}
      {dialog?.kind === "image" && (
        <OutcomeImageDialog
          questionId={snapshot.questionId}
          outcomeIndex={dialog.outcomeIndex}
          current={dialog.current}
          onClose={() => setDialog(null)}
          onSuccess={() => invalidate(address)}
          disabled={!ops}
        />
      )}
    </>
  );
}

function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="pg-modal-backdrop" onClick={onClose}>
      <div
        className="pg-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <h2>{title}</h2>
          <IconButton icon="close" onClick={onClose} title="Close" />
        </div>
        {children}
      </div>
    </div>
  );
}

function AddOutcomeDialog({
  questionId,
  onClose,
  onSuccess,
  disabled,
}: {
  questionId: `0x${string}`;
  onClose: () => void;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const ops = useBoundOps();
  const [name, setName] = useState("");
  const [imageUri, setImageUri] = useState("");
  return (
    <ModalShell title="Add outcome" onClose={onClose}>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Outcome name"
        autoFocus
      />
      <Input
        mono
        value={imageUri}
        onChange={(e) => setImageUri(e.target.value)}
        placeholder="Image URI (optional)"
      />
      <div className="empty-hint">
        Note: the new outcome will have no initial liquidity. Use &ldquo;Seed liquidity&rdquo;
        afterwards if you want to seed it.
      </div>
      <div className="pg-modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <TxButton
          disabled={disabled || !ops || !name.trim()}
          run={async () => {
            if (!ops) throw new Error("Wallet not ready");
            await ops.addOutcomes(questionId, [
              { name: name.trim(), imageUri: imageUri.trim() },
            ]);
            onSuccess();
            onClose();
          }}
        >
          Add outcome
        </TxButton>
      </div>
    </ModalShell>
  );
}

function OutcomeImageDialog({
  questionId,
  outcomeIndex,
  current,
  onClose,
  onSuccess,
  disabled,
}: {
  questionId: `0x${string}`;
  outcomeIndex: number;
  current: string;
  onClose: () => void;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const ops = useBoundOps();
  const [value, setValue] = useState(current);
  return (
    <ModalShell title={`Outcome ${outcomeIndex + 1} image`} onClose={onClose}>
      <Input
        mono
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://… or ipfs://…"
      />
      <ImagePreview src={value.trim() || null} />
      <div className="pg-modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <TxButton
          disabled={disabled || !ops || !value.trim()}
          run={async () => {
            if (!ops) throw new Error("Wallet not ready");
            await ops.setOutcomeImage(questionId, outcomeIndex, value.trim());
            onSuccess();
            onClose();
          }}
        >
          Update
        </TxButton>
      </div>
    </ModalShell>
  );
}

function SeedDialog({
  marketAddress,
  snapshot,
  onClose,
  onSuccess,
  disabled,
}: {
  marketAddress: Address;
  snapshot: MarketSnapshot;
  onClose: () => void;
  onSuccess: () => void;
  disabled?: boolean;
}) {
  const ops = useBoundOps();
  const [amount, setAmount] = useState("1000");
  const collateral = snapshot.deploy.collateral;

  return (
    <ModalShell title="Seed additional liquidity" onClose={onClose}>
      <div className="empty-hint">
        Seeds every outcome with the same amount (in OT, 18 decimals). An
        approve tx will be sent first if needed.
      </div>
      <Input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="1000"
      />
      <div className="pg-modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <TxButton
          disabled={disabled || !ops || !collateral || !amount.trim()}
          run={async () => {
            if (!ops) throw new Error("Wallet not ready");
            if (!collateral) throw new Error("Collateral address missing");
            const tokenIds = snapshot.outcomes.map((o) => o.tokenId);
            const otAmounts = snapshot.outcomes.map(() => amount.trim());
            await ops.seed({
              marketAddress,
              collateral,
              tokenIds,
              otAmounts,
            });
            onSuccess();
            onClose();
          }}
        >
          Seed all outcomes
        </TxButton>
      </div>
    </ModalShell>
  );
}
