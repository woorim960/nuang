"use client";

import { Heart, MessageCircle } from "lucide-react";
import {
  communityWriteGateSelectEventName,
  getCommunityWriteGateOption,
  type CommunityWriteGateKind,
  type CommunityWriteGateTargetType,
} from "@/features/community/community-write-gate";

export function CommunityWriteGateButton({
  cardTitle,
  kind,
  targetId,
  targetType = "community_preview_card",
}: {
  cardTitle: string;
  kind: Exclude<CommunityWriteGateKind, "post">;
  targetId?: string;
  targetType?: CommunityWriteGateTargetType;
}) {
  const option = getCommunityWriteGateOption(kind);

  return (
    <button
      aria-label={`${cardTitle} ${option.label} 오픈 조건 보기`}
      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-bold text-muted transition-colors hover:bg-surface-soft hover:text-primary"
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent(communityWriteGateSelectEventName, {
            detail: {
              cardTitle,
              kind,
              target: {
                id: targetId ?? createFallbackTargetId(cardTitle),
                type: targetType,
              },
            },
          }),
        );
        const gate = document.getElementById("community-write-gate");
        if (typeof gate?.scrollIntoView === "function") {
          gate.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      }}
      type="button"
    >
      {kind === "reaction" ? (
        <Heart aria-hidden="true" size={16} />
      ) : (
        <MessageCircle aria-hidden="true" size={16} />
      )}
      <span className="truncate">{option.label}</span>
    </button>
  );
}

function createFallbackTargetId(cardTitle: string) {
  return `community_preview_${cardTitle.trim().replace(/\s+/g, "_").slice(0, 64)}`;
}
