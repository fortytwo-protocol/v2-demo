import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./icons/Icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  title: string;
  description?: string;
}

export function ActionButton({ icon, title, description, ...rest }: Props) {
  return (
    <button type="button" className="pg-action-btn" {...rest}>
      <span className="pg-action-btn-icon">
        <Icon name={icon} size={16} />
      </span>
      <span className="pg-action-btn-text">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </span>
    </button>
  );
}
