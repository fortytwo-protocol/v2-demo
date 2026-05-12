import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./icons/Icon";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  iconSize?: number;
  variant?: "ghost" | "chip";
}

export function IconButton({
  icon,
  iconSize = 12,
  variant = "ghost",
  className,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`pg-icon-btn pg-icon-btn-${variant}${className ? ` ${className}` : ""}`}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}

export function CopyButton({ value, title }: { value: string; title?: string }) {
  return (
    <IconButton
      icon="copy"
      title={title ?? "Copy"}
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => undefined);
      }}
    />
  );
}
