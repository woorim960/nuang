"use client";

import { ShieldAlert } from "lucide-react";
import type { CommunitySafetyTargetOption } from "@/features/community/safety-action-contract";
import { communitySafetyTargetSelectEventName } from "@/features/community/safety-action-contract";

export function CommunitySafetyTargetButton({
  target,
}: {
  target: CommunitySafetyTargetOption;
}) {
  return (
    <button
      aria-label={`${target.label} 보호 액션 열기`}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-center text-sm font-bold leading-5 text-muted transition-colors hover:bg-surface-soft hover:text-primary"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent(communitySafetyTargetSelectEventName, {
            detail: target,
          }),
        );
        const panel = document.getElementById("community-safety-actions");
        if (typeof panel?.scrollIntoView === "function") {
          panel.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }}
      type="button"
    >
      <ShieldAlert aria-hidden="true" size={16} />
      <span className="truncate">보호</span>
    </button>
  );
}
