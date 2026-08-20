"use client";

import { useEffect, useRef, type RefObject } from "react";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type InertRecord = {
  element: HTMLElement;
  hadInertAttribute: boolean;
};

export function useModalDialog<T extends HTMLElement>({
  initialFocus = "first",
  onClose,
  open,
  returnFocusRef,
}: {
  initialFocus?: "dialog" | "first";
  onClose: () => void;
  open: boolean;
  returnFocusRef?: RefObject<HTMLElement | null>;
}): RefObject<T | null> {
  const dialogRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const preferredReturnFocus = returnFocusRef?.current;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscrollBehavior =
      document.body.style.overscrollBehavior;
    const inertRecords = suppressBackgroundInteraction(dialog);

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const initialFocusTarget =
      initialFocus === "dialog"
        ? dialog
        : (dialog.querySelector<HTMLElement>(
            '[data-modal-initial-focus="true"]',
          ) ??
          getFocusableElements(dialog)[0] ??
          dialog);
    initialFocusTarget.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(dialog);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1)!;
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus({ preventScroll: true });
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      } else if (!dialog.contains(activeElement)) {
        event.preventDefault();
        firstElement.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      restoreBackgroundInteraction(inertRecords);

      const returnFocusTarget = preferredReturnFocus ?? previouslyFocused;
      if (returnFocusTarget?.isConnected) {
        returnFocusTarget.focus({ preventScroll: true });
      }
    };
  }, [initialFocus, open, returnFocusRef]);

  return dialogRef;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((element) => element.getAttribute("aria-hidden") !== "true");
}

function suppressBackgroundInteraction(dialog: HTMLElement) {
  const records: InertRecord[] = [];
  let currentElement: HTMLElement = dialog;

  while (
    currentElement.parentElement &&
    currentElement.parentElement !== document.documentElement
  ) {
    const parentElement = currentElement.parentElement;

    for (const sibling of parentElement.children) {
      if (
        !(sibling instanceof HTMLElement) ||
        sibling === currentElement ||
        sibling.hasAttribute("data-modal-backdrop")
      ) {
        continue;
      }

      records.push({
        element: sibling,
        hadInertAttribute: sibling.hasAttribute("inert"),
      });
      sibling.setAttribute("inert", "");
    }

    if (parentElement === document.body) break;
    currentElement = parentElement;
  }

  return records;
}

function restoreBackgroundInteraction(records: InertRecord[]) {
  for (const { element, hadInertAttribute } of records) {
    if (!hadInertAttribute) element.removeAttribute("inert");
  }
}
