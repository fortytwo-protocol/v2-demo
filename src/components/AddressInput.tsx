import { useState, useEffect } from "react";
import type { Address } from "viem";
import { isValidAddress } from "../lib/format";
import { Input } from "./Field";

interface Props {
  value: string;
  onValid: (address: Address) => void;
  onChange?: (raw: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function AddressInput({
  value,
  onValid,
  onChange,
  placeholder = "0x…",
  autoFocus,
}: Props) {
  const [touched, setTouched] = useState(false);
  const trimmed = value.trim();
  const valid = trimmed === "" || isValidAddress(trimmed);

  useEffect(() => {
    if (trimmed && isValidAddress(trimmed)) {
      onValid(trimmed as Address);
    }
  }, [trimmed, onValid]);

  return (
    <Input
      type="text"
      mono
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={() => setTouched(true)}
      placeholder={placeholder}
      invalid={touched && trimmed !== "" && !valid}
      spellCheck={false}
      autoComplete="off"
    />
  );
}
