import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={`pg-card${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function CardPad({ children, className }: CardProps) {
  return <div className={`pg-card pg-card-pad${className ? ` ${className}` : ""}`}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="pg-card-title">{children}</div>;
}
