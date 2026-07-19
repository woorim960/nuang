"use client";

import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import type { ApiClosedPayload } from "@/lib/api/closed-state-data";
import { cn } from "@/lib/utils/cn";

type FeedMoreMenuStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "notice" }
  | { message: string; status: "error" };

type FeedMoreMenuFailurePayload =
  | ApiClosedPayload
  | {
      error?: string;
      message?: string;
    };

export function FeedMoreMenu({
  postId,
  targetType = "feed_seed_card",
}: {
  postId: string;
  targetType?: "feed_post" | "feed_seed_card";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<FeedMoreMenuStatus>({ status: "idle" });

  return (
    <div className="relative ml-auto">
      <button
        aria-expanded={open}
        aria-label="더 보기"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[#5f5864] transition-colors hover:bg-[#f5f2f6]"
        onClick={() => {
          setOpen((value) => !value);
          setStatus({ status: "idle" });
        }}
        type="button"
      >
        <MoreHorizontal aria-hidden="true" size={21} strokeWidth={1.9} />
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b1620]/35"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            aria-labelledby={`feed-more-title-${postId}`}
            aria-modal="true"
            className="w-full max-w-[520px] rounded-t-[24px] bg-white px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_44px_rgba(40,32,51,0.16)]"
            role="dialog"
          >
            <span
              aria-hidden="true"
              className="mx-auto mb-3 block h-1 w-10 rounded-full bg-[#ded8e1]"
            />
            <h2
              className="px-2 pb-2 text-center text-sm font-extrabold text-[#2d2831]"
              id={`feed-more-title-${postId}`}
            >
              게시물 메뉴
            </h2>
            <button
              className="flex min-h-12 w-full items-center rounded-[14px] px-4 text-left text-sm font-semibold text-[#3e3742] hover:bg-[#f7f4f8] disabled:text-[#9a9a9a]"
              disabled={status.status === "pending"}
              onClick={() => {
                void submitNotInterested();
              }}
              type="button"
            >
              관심 없음
            </button>
            <FeedMoreMenuStatusMessage status={status} />
            <button
              className="mt-1 flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[#f3f0f4] text-sm font-bold text-[#4b444f]"
              onClick={() => setOpen(false)}
              type="button"
            >
              닫기
            </button>
          </section>
        </div>
      ) : null}
    </div>
  );

  async function submitNotInterested() {
    setStatus({ status: "pending" });

    try {
      const request: FeedWriteRequest = {
        action: "not_interested",
        target: {
          id: postId,
          type: targetType,
        },
      };
      const response = await fetch("/api/feed", {
        body: JSON.stringify(request),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as FeedMoreMenuFailurePayload | null;

      if (response.status === 401) {
        setStatus({
          message: "로그인 후 사용할 수 있어요.",
          status: "notice",
        });
        return;
      }

      if (
        payload &&
        "error" in payload &&
        payload.error === "feature_closed" &&
        "display" in payload
      ) {
        setStatus({
          message: payload.display.message,
          status: "notice",
        });
        return;
      }

      if (!response.ok) {
        setStatus({
          message: payload?.message ?? "요청 상태를 확인하지 못했어요.",
          status: "error",
        });
        return;
      }

      setStatus({
        message: "피드에서 덜 보여드릴게요.",
        status: "notice",
      });
      setOpen(false);
      router.refresh();
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 요청을 확인하지 못했어요.",
        status: "error",
      });
    }
  }
}

function FeedMoreMenuStatusMessage({ status }: { status: FeedMoreMenuStatus }) {
  if (status.status === "idle") return null;

  return (
    <p
      className={cn(
        "px-4 pb-2 pt-1 text-xs font-medium",
        status.status === "error" ? "text-[#9a6400]" : "text-[#737373]",
      )}
      role={status.status === "error" ? "alert" : "status"}
    >
      {status.status === "pending" ? "반영 중" : status.message}
    </p>
  );
}
