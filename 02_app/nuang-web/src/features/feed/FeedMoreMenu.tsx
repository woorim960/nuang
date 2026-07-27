"use client";

import { ArrowLeft, Flag, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import { useModalDialog } from "@/hooks/useModalDialog";
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
  compact = false,
  postId,
  targetType = "feed_seed_card",
}: {
  compact?: boolean;
  postId: string;
  targetType?: "feed_comment" | "feed_post" | "feed_seed_card";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "report">("menu");
  const [reportReason, setReportReason] = useState<ReportReason | null>(null);
  const [reportDetails, setReportDetails] = useState("");
  const [status, setStatus] = useState<FeedMoreMenuStatus>({ status: "idle" });
  const dialogRef = useModalDialog<HTMLElement>({
    onClose: () => setOpen(false),
    open,
  });

  return (
    <div className={compact ? "relative" : "relative ml-auto"}>
      <button
        aria-expanded={open}
        aria-label="더 보기"
        className={
          compact
            ? "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--nu-color-text-muted)] transition-colors hover:bg-[var(--nu-color-app-bg)]"
            : "grid h-[42px] w-[42px] shrink-0 place-items-center rounded-full text-[var(--nu-color-text)] transition-colors hover:bg-[var(--nu-color-app-bg)]"
        }
        onClick={() => {
          setOpen((value) => !value);
          setView("menu");
          setStatus({ status: "idle" });
        }}
        type="button"
      >
        <MoreHorizontal
          aria-hidden="true"
          size={compact ? 19 : 24}
          strokeWidth={compact ? 1.8 : 2}
        />
      </button>
      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--nu-brand-900)]/35"
              data-modal-layer="true"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
            >
              <section
                aria-labelledby={`feed-more-title-${postId}`}
                aria-modal="true"
                className="max-h-[88dvh] w-full max-w-[430px] overscroll-contain overflow-y-auto rounded-t-[24px] bg-white px-3 pb-[calc(12px+env(safe-area-inset-bottom))] pt-2 shadow-sheet"
                ref={dialogRef}
                role="dialog"
                tabIndex={-1}
              >
                <span
                  aria-hidden="true"
                  className="mx-auto mb-3 block h-1 w-10 rounded-full bg-[var(--nu-neutral-200)]"
                />
                <header className="relative flex min-h-10 items-center justify-center px-2 pb-2">
                  {view === "report" ? (
                    <button
                      aria-label="메뉴로 돌아가기"
                      className="absolute left-1 grid h-9 w-9 place-items-center rounded-full text-[var(--nu-color-text-muted)] hover:bg-[var(--nu-color-app-bg)]"
                      onClick={() => {
                        setView("menu");
                        setStatus({ status: "idle" });
                      }}
                      type="button"
                    >
                      <ArrowLeft
                        aria-hidden="true"
                        size={19}
                        strokeWidth={1.8}
                      />
                    </button>
                  ) : null}
                  <h2
                    className="px-2 text-center text-sm font-bold text-[var(--nu-color-text)]"
                    id={`feed-more-title-${postId}`}
                  >
                    {view === "report" ? "신고하기" : "콘텐츠 메뉴"}
                  </h2>
                </header>
                {view === "menu" ? (
                  <>
                    {targetType !== "feed_comment" ? (
                      <button
                        className="flex min-h-12 w-full items-center rounded-[14px] px-4 text-left text-sm font-semibold text-[var(--nu-color-text)] hover:bg-[var(--nu-color-app-bg)] disabled:text-[var(--nu-neutral-400)]"
                        disabled={status.status === "pending"}
                        onClick={() => {
                          void submitNotInterested();
                        }}
                        type="button"
                      >
                        관심 없음
                      </button>
                    ) : null}
                    {targetType !== "feed_seed_card" ? (
                      <button
                        className="flex min-h-12 w-full items-center gap-2 rounded-[14px] px-4 text-left text-sm font-semibold text-[var(--nu-color-danger)] hover:bg-[var(--nu-color-danger-soft)]"
                        onClick={() => {
                          setView("report");
                          setStatus({ status: "idle" });
                        }}
                        type="button"
                      >
                        <Flag aria-hidden="true" size={17} strokeWidth={1.8} />
                        신고하기
                      </button>
                    ) : null}
                  </>
                ) : (
                  <div className="px-1">
                    <p className="px-3 pb-2 text-xs leading-5 text-[var(--nu-color-text-muted)]">
                      가장 가까운 사유를 선택해 주세요.
                    </p>
                    <div className="grid gap-1">
                      {reportReasons.map((reason) => (
                        <label
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[13px] px-3 text-sm font-medium text-[var(--nu-color-text)] hover:bg-[var(--nu-color-app-bg)]"
                          key={reason.value}
                        >
                          <input
                            checked={reportReason === reason.value}
                            className="h-4 w-4 accent-[var(--nu-color-community)]"
                            name={`report-reason-${postId}`}
                            onChange={() => setReportReason(reason.value)}
                            type="radio"
                          />
                          {reason.label}
                        </label>
                      ))}
                    </div>
                    <label className="mt-2 block px-3 text-xs font-semibold text-[var(--nu-color-text-muted)]">
                      추가 내용 (선택)
                      <textarea
                        className="mt-2 min-h-20 w-full resize-none rounded-[14px] border border-[var(--nu-color-community-border)] bg-white px-3 py-2.5 text-sm font-medium leading-5 text-[var(--nu-color-text)] outline-none placeholder:text-[var(--nu-neutral-400)] focus:border-[var(--nu-color-community)]"
                        maxLength={500}
                        onChange={(event) =>
                          setReportDetails(event.target.value)
                        }
                        placeholder="운영팀이 확인할 내용을 적어주세요"
                        value={reportDetails}
                      />
                    </label>
                    <button
                      className="mt-3 min-h-11 w-full rounded-[14px] bg-[var(--nu-color-danger)] text-sm font-bold text-white disabled:bg-[var(--nu-neutral-200)]"
                      disabled={!reportReason || status.status === "pending"}
                      onClick={() => void submitReport()}
                      type="button"
                    >
                      {status.status === "pending" ? "접수 중" : "신고 접수"}
                    </button>
                  </div>
                )}
                <FeedMoreMenuStatusMessage status={status} />
                <button
                  className="mt-1 flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[var(--nu-color-app-bg)] text-sm font-semibold text-[var(--nu-neutral-700)]"
                  data-modal-initial-focus="true"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  닫기
                </button>
              </section>
            </div>,
            document.body,
          )
        : null}
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

  async function submitReport() {
    if (!reportReason || targetType === "feed_seed_card") return;
    setStatus({ status: "pending" });

    try {
      const request: FeedWriteRequest = {
        action: "report_content",
        details: reportDetails.trim() || undefined,
        reason: reportReason,
        target: {
          id: postId,
          type: targetType,
        },
      };
      const response = await fetch("/api/feed", {
        body: JSON.stringify(request),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as FeedMoreMenuFailurePayload | null;

      if (response.status === 401) {
        setStatus({
          message: "로그인 후 신고할 수 있어요.",
          status: "notice",
        });
        return;
      }

      if (!response.ok) {
        setStatus({
          message: payload?.message ?? "신고를 접수하지 못했어요.",
          status: "error",
        });
        return;
      }

      setStatus({
        message: "신고를 접수했어요. 운영팀이 확인할게요.",
        status: "notice",
      });
      setReportReason(null);
      setReportDetails("");
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 신고를 접수하지 못했어요.",
        status: "error",
      });
    }
  }
}

type ReportReason = Extract<
  FeedWriteRequest,
  { action: "report_content" }
>["reason"];

const reportReasons: Array<{ label: string; value: ReportReason }> = [
  { label: "스팸 또는 반복 게시", value: "spam" },
  { label: "괴롭힘 또는 모욕", value: "harassment" },
  { label: "혐오 표현", value: "hate" },
  { label: "성적 콘텐츠", value: "sexual_content" },
  { label: "폭력 또는 위험 행동", value: "violence" },
  { label: "개인정보 노출", value: "privacy" },
  { label: "사기 또는 금전 피해", value: "fraud" },
  { label: "자해·극단적 선택 위험", value: "self_harm" },
  { label: "기타", value: "other" },
];

function FeedMoreMenuStatusMessage({ status }: { status: FeedMoreMenuStatus }) {
  if (status.status === "idle") return null;

  return (
    <p
      className={cn(
        "px-4 pb-2 pt-1 text-xs font-medium",
        status.status === "error"
          ? "text-[var(--nu-warm-700)]"
          : "text-[var(--nu-color-text-muted)]",
      )}
      role={status.status === "error" ? "alert" : "status"}
    >
      {status.status === "pending" ? "반영 중" : status.message}
    </p>
  );
}
