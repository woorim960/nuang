"use client";

import { Heart, SmilePlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CommunityWriteGateTarget } from "@/features/community/community-write-gate";
import type { ApiClosedPayload } from "@/lib/api/closed-state-data";

type ReactionPreviewStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "closed" }
  | { message: string; status: "error" };

export function CommunityReactionPreview({
  cardTitle,
  previewCount,
  target,
}: {
  cardTitle: string;
  previewCount: number;
  target: CommunityWriteGateTarget;
}) {
  const [status, setStatus] = useState<ReactionPreviewStatus>({
    status: "idle",
  });

  async function handleReactionClick() {
    setStatus({ status: "pending" });

    try {
      const response = await fetch("/api/community-feed", {
        body: JSON.stringify({
          action: "react",
          reaction: "like",
          target,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | ApiClosedPayload
        | null;

      if (payload?.error === "feature_closed") {
        setStatus({
          message: payload.display.message,
          status: "closed",
        });
        return;
      }

      setStatus({
        message: "반응 준비 상태를 확인하지 못했어요.",
        status: "error",
      });
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 반응 준비 상태를 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  return (
    <div className="border-t border-line px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-soft text-primary">
            <Heart aria-hidden="true" size={16} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black">반응 {previewCount}</p>
            <p className="text-xs font-semibold text-muted">
              공식 주제 카드 · 내 반응 미저장
            </p>
          </div>
        </div>
        <Button
          aria-label={`${cardTitle} 반응 준비 확인`}
          className="min-h-9 px-3"
          disabled={status.status === "pending"}
          icon={<SmilePlus aria-hidden="true" size={15} />}
          onClick={handleReactionClick}
          variant="secondary"
        >
          {status.status === "pending" ? "확인 중" : "공감 준비"}
        </Button>
      </div>
      <ReactionPreviewStatusMessage status={status} />
    </div>
  );
}

function ReactionPreviewStatusMessage({
  status,
}: {
  status: ReactionPreviewStatus;
}) {
  if (status.status === "idle") return null;

  if (status.status === "pending") {
    return (
      <p
        aria-live="polite"
        className="mt-2 text-xs font-semibold text-muted"
        role="status"
      >
        반응 준비 상태 확인 중
      </p>
    );
  }

  if (status.status === "error") {
    return (
      <p className="mt-2 text-xs font-semibold text-[#9a6400]" role="alert">
        {status.message}
      </p>
    );
  }

  return (
    <p
      aria-live="polite"
      className="mt-2 text-xs font-semibold text-muted"
      role="status"
    >
      {status.message}
    </p>
  );
}
