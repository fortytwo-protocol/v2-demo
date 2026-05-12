import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons/Icon";

interface RowProps {
  icon?: IconName;
  label: ReactNode;
  children: ReactNode;
}

export function Row({ icon, label, children }: RowProps) {
  return (
    <div className="pg-row">
      <span className="pg-row-label">
        {icon && <Icon name={icon} />}
        {label}
      </span>
      <span className="pg-row-value">{children}</span>
    </div>
  );
}

export function Rows({ children }: { children: ReactNode }) {
  return <div className="pg-rows">{children}</div>;
}
