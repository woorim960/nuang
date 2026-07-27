"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import styles from "./AdminConfirmDialog.module.css";

export function AdminConfirmDialog({
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  open,
  pending = false,
  title,
  tone = "danger",
}: {
  confirmLabel: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  pending?: boolean;
  title: string;
  tone?: "brand" | "danger";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const descriptionId = useId();
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      className={styles.dialog}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClose={() => {
        if (open && !pending) onCancel();
      }}
      ref={ref}
    >
      <button
        aria-label="닫기"
        className={styles.close}
        disabled={pending}
        onClick={onCancel}
        type="button"
      >
        <X aria-hidden="true" size={18} strokeWidth={1.7} />
      </button>
      <span className={styles.icon} data-tone={tone}>
        <AlertTriangle aria-hidden="true" size={22} strokeWidth={1.8} />
      </span>
      <div className={styles.copy}>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
      </div>
      <div className={styles.actions}>
        <button disabled={pending} onClick={onCancel} type="button">
          취소
        </button>
        <button
          data-tone={tone}
          disabled={pending}
          onClick={onConfirm}
          type="button"
        >
          {pending ? "처리 중" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
