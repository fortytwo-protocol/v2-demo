import type { ReactNode } from "react";

type Tone = "brand" | "success" | "warn" | "danger" | "muted";

interface Props {
  tone?: Tone;
  withDot?: boolean;
  children: ReactNode;
}

export function Badge({ tone = "brand", withDot, children }: Props) {
  return (
    <span className={`pg-badge pg-badge-${tone}`}>
      {withDot && <span className="pg-badge-dot" />}
      {children}
    </span>
  );
}
