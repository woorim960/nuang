"use client";

import { Check } from "lucide-react";
import styles from "./AccountConnectPanel.module.css";

export function ConsentCheck({
  checked,
  description,
  emphasis = false,
  label,
  onChange,
  optional = false,
}: {
  checked: boolean;
  description?: string;
  emphasis?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  optional?: boolean;
}) {
  return (
    <label
      className={styles.consentRow}
      data-emphasis={emphasis ? "true" : "false"}
    >
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span aria-hidden="true" className={styles.checkmark}>
        {checked ? <Check size={14} strokeWidth={2.5} /> : null}
      </span>
      <span className={styles.consentLabel}>
        <span>{label}</span>
        {description ? <small>{description}</small> : null}
      </span>
      {optional ? <small>선택</small> : null}
    </label>
  );
}
