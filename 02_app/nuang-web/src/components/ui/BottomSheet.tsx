"use client";

import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import { useModalDialog } from "@/hooks/useModalDialog";
import { cn } from "@/lib/utils/cn";
import styles from "./BottomSheet.module.css";

type BottomSheetDialogProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children" | "className" | "ref" | "role" | "tabIndex"
> & {
  [key: `data-${string}`]: boolean | number | string | undefined;
};

export type BottomSheetProps = {
  backdropDisabled?: boolean;
  backdropLabel?: string;
  children: ReactNode;
  className?: string;
  dialogProps?: BottomSheetDialogProps;
  dialogRef?: RefObject<HTMLElement | null>;
  initialFocus?: "dialog" | "first";
  onClose: () => void;
  open?: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
};

export function BottomSheet({
  backdropDisabled = false,
  backdropLabel = "팝업 닫기",
  children,
  className,
  dialogProps,
  dialogRef,
  initialFocus = "first",
  onClose,
  open = true,
  returnFocusRef,
}: BottomSheetProps) {
  const modalRef = useModalDialog<HTMLElement>({
    initialFocus,
    onClose,
    open,
    returnFocusRef,
  });
  const setDialogRef = useCallback(
    (element: HTMLElement | null) => {
      modalRef.current = element;
      if (dialogRef) dialogRef.current = element;
    },
    [dialogRef, modalRef],
  );

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.layer}
      data-bottom-sheet-layer="true"
      data-modal-layer="true"
    >
      <button
        aria-label={backdropLabel}
        className={styles.backdrop}
        data-modal-backdrop="true"
        disabled={backdropDisabled}
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <section
        {...dialogProps}
        aria-modal="true"
        className={cn(styles.sheet, className)}
        data-bottom-sheet="true"
        ref={setDialogRef}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </section>
    </div>,
    document.body,
  );
}
