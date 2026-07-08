"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { CommunityWriteGateTarget } from "@/features/community/community-write-gate";
import { hasSensitiveCommunityTopic } from "@/features/community/community-topic-safety";
import type { ApiClosedPayload } from "@/lib/api/closed-state-data";

type CommentPreviewStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "blocked" }
  | { message: string; nextStep: string; status: "closed" }
  | { message: string; status: "error" };

export function CommunityCommentPreview({
  cardTitle,
  target,
}: {
  cardTitle: string;
  target: CommunityWriteGateTarget;
}) {
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<CommentPreviewStatus>({ status: "idle" });
  const trimmedComment = comment.trim();
  const canSubmit = trimmedComment.length >= 2 && status.status !== "pending";
  const submitLabel =
    status.status === "pending"
      ? "확인 중"
      : canSubmit
        ? "준비 확인"
        : "입력 후 확인";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (hasSensitiveCommunityTopic(trimmedComment)) {
      setStatus({
        message: "이 주제는 댓글보다 도움 허브에서 더 안전하게 다룰게요.",
        status: "blocked",
      });
      return;
    }

    if (!canSubmit) {
      setStatus({
        message: "짧은 댓글을 먼저 적어주세요.",
        status: "error",
      });
      return;
    }

    setStatus({ status: "pending" });

    try {
      const response = await fetch("/api/community-feed", {
        body: JSON.stringify({
          action: "create_comment",
          body: trimmedComment,
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
          nextStep: payload.display.nextStep,
          status: "closed",
        });
        return;
      }

      setStatus({
        message: "댓글 준비 상태를 확인하지 못했어요.",
        status: "error",
      });
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 댓글 준비 상태를 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  return (
    <form className="border-t border-line px-4 py-3" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
          <MessageCircle aria-hidden="true" size={16} />
        </div>
        <label className="sr-only" htmlFor={`comment-preview-${target.id}`}>
          {cardTitle} 댓글 미리쓰기
        </label>
        <input
          className="min-h-10 min-w-0 flex-1 rounded-lg border border-line bg-surface-soft px-3 text-sm font-semibold outline-none transition-colors placeholder:text-muted focus:border-primary focus:bg-white"
          id={`comment-preview-${target.id}`}
          maxLength={400}
          onChange={(event) => setComment(event.target.value)}
          placeholder="짧게 미리 써보기"
          value={comment}
        />
        <Button
          aria-label={`${cardTitle} 댓글 준비 확인`}
          className="shrink-0 px-3"
          disabled={!canSubmit}
          type="submit"
          variant="secondary"
        >
          {submitLabel}
        </Button>
      </div>
      <CommentPreviewStatusMessage status={status} />
    </form>
  );
}

function CommentPreviewStatusMessage({
  status,
}: {
  status: CommentPreviewStatus;
}) {
  if (status.status === "idle") return null;

  if (status.status === "pending") {
    return (
      <p
        aria-live="polite"
        className="mt-2 text-xs font-semibold text-muted"
        role="status"
      >
        댓글 준비 상태 확인 중
      </p>
    );
  }

  if (status.status === "blocked") {
    return (
      <p className="mt-2 text-xs font-semibold text-[#9a6400]" role="alert">
        {status.message}{" "}
        <Link className="text-primary" href="/help">
          도움 허브
        </Link>
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
      className="mt-2 text-xs leading-5 text-muted"
      role="status"
    >
      <span className="font-bold text-foreground">{status.message}</span>{" "}
      {status.nextStep}
    </p>
  );
}
