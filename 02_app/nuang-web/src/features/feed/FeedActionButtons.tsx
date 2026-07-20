"use client";

import {
  Bookmark,
  Heart,
  Link2,
  MessageCircle,
  Repeat2,
  Send,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import type { FeedReplyPreview } from "@/features/feed/feed-seed";
import type { ApiClosedPayload } from "@/lib/api/closed-state-data";
import { cn } from "@/lib/utils/cn";

type FeedActionStatus =
  | { status: "idle" }
  | { actionLabel: string; status: "pending" }
  | { message: string; status: "notice" }
  | { message: string; status: "error" };

type FeedAction = {
  count?: number;
  label: string;
  makeRequest?: (active: boolean) => FeedWriteRequest;
  mode: "api" | "comment" | "local";
  type: "bookmark" | "comment" | "react" | "share";
};

type FeedActionFailurePayload =
  | ApiClosedPayload
  | {
      error?: string;
      message?: string;
    };

export function FeedActionButtons({
  allowComment = true,
  className,
  commentComposer = false,
  commentPlaceholder = "댓글 달기",
  includeBookmark = false,
  includeComment = true,
  includeShare = true,
  initialBookmarked = false,
  initialLiked = false,
  likeCount = 0,
  postId,
  questionMode = false,
  replyCount = 0,
  replyPreview = [],
  returnTo = "/feed",
  targetType = "feed_seed_card",
}: {
  allowComment?: boolean;
  className?: string;
  commentComposer?: boolean;
  commentPlaceholder?: string;
  includeBookmark?: boolean;
  includeComment?: boolean;
  includeShare?: boolean;
  initialBookmarked?: boolean;
  initialLiked?: boolean;
  likeCount?: number;
  postId: string;
  questionMode?: boolean;
  replyCount?: number;
  replyPreview?: FeedReplyPreview[];
  returnTo?: string;
  targetType?: "feed_post" | "feed_seed_card";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FeedActionStatus>({ status: "idle" });
  const [commentBody, setCommentBody] = useState("");
  const [isCommentOpen, setIsCommentOpen] = useState(commentComposer);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [likeTotal, setLikeTotal] = useState(likeCount);
  const [replies, setReplies] = useState(replyPreview);
  const [replyTotal, setReplyTotal] = useState(replyCount);
  const [activeActions, setActiveActions] = useState<Array<FeedAction["type"]>>(
    createInitialActiveActions({ initialBookmarked, initialLiked }),
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const shouldResumeComment =
      searchParams.get("auth") === "connected" &&
      searchParams.get("resumeFeed") === "comment" &&
      searchParams.get("postId") === postId;

    if (!shouldResumeComment) return;

    const savedDraft = window.sessionStorage.getItem(
      createPendingCommentKey(postId),
    );

    clearResumeFeedParams();

    if (!savedDraft) return;

    const timeoutId = window.setTimeout(() => {
      setCommentBody(savedDraft);
      setIsCommentOpen(true);
      setStatus({
        message: `로그인이 완료됐어요. ${commentComposer ? "등록" : "게시"} 버튼을 누르면 ${questionMode ? "답변" : "댓글"}이 등록돼요.`,
        status: "notice",
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [commentComposer, postId, questionMode]);
  const actions: FeedAction[] = commentComposer
    ? []
    : [
        {
          count: likeTotal,
          label: "좋아요",
          makeRequest: (active) =>
            active
              ? {
                  action: "remove_reaction",
                  reaction: "like",
                  target: {
                    id: postId,
                    type: targetType,
                  },
                }
              : {
                  action: "react",
                  reaction: "like",
                  target: {
                    id: postId,
                    type: targetType,
                  },
                },
          mode: "api",
          type: "react",
        },
      ];

  if (!commentComposer && includeComment) {
    actions.push({
      count: replyTotal,
      label: questionMode ? "답변" : "댓글",
      mode: "comment",
      type: "comment",
    });
  }

  if (!commentComposer && includeShare) {
    actions.push({
      label: "공유",
      mode: "local",
      type: "share",
    });
  }

  if (includeBookmark) {
    actions.push({
      label: "저장",
      makeRequest: (active) =>
        active
          ? {
              action: "remove_bookmark",
              target: {
                id: postId,
                type: targetType,
              },
            }
          : {
              action: "bookmark",
              target: {
                id: postId,
                type: targetType,
              },
            },
      mode: "api",
      type: "bookmark",
    });
  }
  const primaryActions = actions.filter((action) => action.type !== "bookmark");
  const bookmarkAction = actions.find((action) => action.type === "bookmark");

  return (
    <div className={cn("min-w-0", className)}>
      {actions.length > 0 ? (
        <div
          className={cn(
            "flex items-center text-[#6d7280]",
            includeBookmark ? "justify-between" : "gap-1",
          )}
        >
          <div className="flex items-center gap-1">
            {primaryActions.map((action) => (
              <ActionButton
                action={action}
                active={activeActions.includes(action.type)}
                disabled={status.status === "pending"}
                expanded={action.type === "comment" ? isCommentOpen : undefined}
                key={action.type}
                onClick={handleAction}
                showCount
              />
            ))}
          </div>
          {bookmarkAction ? (
            <ActionButton
              action={bookmarkAction}
              active={activeActions.includes(bookmarkAction.type)}
              disabled={status.status === "pending"}
              onClick={handleAction}
              showCount
            />
          ) : null}
        </div>
      ) : null}
      {isCommentOpen ? (
        <FeedReplyPreviewList
          questionMode={questionMode}
          replies={replies}
          replyTotal={replyTotal}
        />
      ) : null}
      {isCommentOpen && allowComment ? (
        <form
          className={cn(
            "flex items-center gap-2",
            commentComposer ? "mt-0" : questionMode ? "mt-3" : "mt-2",
          )}
          onSubmit={handleCommentSubmit}
        >
          <label className="sr-only" htmlFor={`feed-comment-${postId}`}>
            {questionMode ? "답변 내용" : "댓글 내용"}
          </label>
          <input
            className={cn(
              "min-w-0 flex-1 text-sm font-medium outline-none placeholder:text-[#9a9a9a]",
              commentComposer
                ? "min-h-11 rounded-[14px] border border-[#c7e5dc] bg-white px-3 focus:border-[#306e60] focus:ring-2 focus:ring-[#306e60]/10"
                : questionMode
                  ? "min-h-10 rounded-[15px] border border-[#c7e5dc] bg-[#f8fcfa] px-3 focus:border-[#306e60] focus:ring-2 focus:ring-[#306e60]/10"
                  : "min-h-9 border-0 border-b border-[#dedede] bg-transparent px-0 focus:border-[#111111]",
            )}
            id={`feed-comment-${postId}`}
            maxLength={400}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder={commentPlaceholder}
            value={commentBody}
          />
          <button
            className={cn(
              "shrink-0 text-sm font-bold disabled:cursor-not-allowed",
              commentComposer
                ? "h-11 rounded-[14px] bg-[#306e60] px-4 text-white shadow-[0_7px_18px_rgb(48_110_96_/_14%)] disabled:bg-[#d8e3df] disabled:shadow-none"
                : questionMode
                  ? "h-9 px-1 text-[#306e60] disabled:text-[#aebbb7]"
                  : "h-9 px-1 text-[#111111] disabled:text-[#b8b8b8]",
            )}
            disabled={
              commentBody.trim().length < 2 || status.status === "pending"
            }
            type="submit"
          >
            {commentComposer ? "등록" : "게시"}
          </button>
        </form>
      ) : null}
      {isCommentOpen && questionMode && !allowComment ? (
        <p className="mt-2 text-[11px] leading-[1.5] text-[#85818b]">
          답변 대상으로 지정된 성향만 답변을 남길 수 있어요.
        </p>
      ) : null}
      {isCommentOpen && questionMode ? (
        <p className="mt-1.5 text-[11px] leading-[1.45] text-[#85818b]">
          공개한 뉴앙 코드만 표시되며 검사 점수와 응답 내용은 공개되지 않아요.
        </p>
      ) : null}
      <FeedActionStatusMessage status={status} />
      {isShareOpen ? (
        <ShareActionSheet
          onClose={() => setIsShareOpen(false)}
          onSelect={handleShareOption}
        />
      ) : null}
    </div>
  );

  async function handleAction(action: FeedAction) {
    if (action.mode === "local") {
      setIsShareOpen(true);
      setStatus({ status: "idle" });
      return;
    }

    if (action.mode === "comment") {
      setIsCommentOpen((value) => !value);
      setStatus({ status: "idle" });
      return;
    }

    if (!action.makeRequest) return;

    const active = activeActions.includes(action.type);

    await submitFeedRequest(
      action.label,
      action.makeRequest(active),
      action.type,
      !active,
    );
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedBody = commentBody.trim();

    if (trimmedBody.length < 2) {
      setStatus({
        message: `${questionMode ? "답변" : "댓글"}을 조금 더 적어주세요.`,
        status: "error",
      });
      return;
    }

    await submitFeedRequest(
      questionMode ? "답변" : "댓글",
      {
        action: "create_comment",
        body: trimmedBody,
        target: {
          id: postId,
          type: targetType,
        },
      },
      "comment",
      true,
    );
  }

  async function submitFeedRequest(
    actionLabel: string,
    request: FeedWriteRequest,
    actionType: FeedAction["type"],
    nextActive: boolean,
  ) {
    setStatus({
      actionLabel,
      status: "pending",
    });

    try {
      const response = await fetch("/api/feed", {
        body: JSON.stringify(request),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as FeedActionFailurePayload | null;

      if (response.status === 401) {
        if (request.action === "create_comment") {
          window.sessionStorage.setItem(
            createPendingCommentKey(postId),
            request.body,
          );
        }

        const resumePath = createFeedResumePath({
          actionType,
          postId,
          returnTo,
        });
        router.push(
          `/login?next=${encodeURIComponent(resumePath)}&reason=${
            actionType === "comment" ? "comment" : "community"
          }`,
        );
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

      if (actionType === "comment") {
        window.sessionStorage.removeItem(createPendingCommentKey(postId));
        setCommentBody("");
        setIsCommentOpen(true);
        setReplyTotal((current) => current + 1);
        if (request.action === "create_comment") {
          setReplies((current) => [
            {
              authorHandle: "me",
              authorName: "나",
              body: request.body,
              id: `local-${Date.now()}`,
              statusLabel: "게시 전 확인 중",
              timeLabel: "방금",
            },
            ...current,
          ]);
        }
      }

      if (actionType === "react" || actionType === "bookmark") {
        setActiveActions((current) =>
          nextActive
            ? current.includes(actionType)
              ? current
              : [...current, actionType]
            : current.filter((item) => item !== actionType),
        );
        if (actionType === "react") {
          setLikeTotal((current) =>
            Math.max(0, current + (nextActive ? 1 : -1)),
          );
        }
      }

      setStatus({
        message: getSuccessMessage(actionType, nextActive, questionMode),
        status: "notice",
      });
      router.refresh();
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 요청을 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  async function handleShareOption(option: "copy" | "feed" | "kakao") {
    setIsShareOpen(false);

    if (option === "copy") {
      try {
        await window.navigator.clipboard?.writeText(
          `${window.location.origin}/feed?posted=${encodeURIComponent(postId)}`,
        );
        setStatus({ message: "질문 링크를 복사했어요.", status: "notice" });
      } catch {
        setStatus({
          message:
            "공유 링크를 준비했어요. 브라우저의 공유 기능을 이용해 주세요.",
          status: "notice",
        });
      }
      return;
    }

    const shareUrl = `${window.location.origin}/feed?posted=${encodeURIComponent(postId)}`;

    if (option === "feed") {
      router.push(`/feed/new?share=${encodeURIComponent(postId)}`);
      return;
    }

    if (window.navigator.share) {
      try {
        await window.navigator.share({
          text: "뉴앙 커뮤니티에서 함께 보고 싶은 이야기가 있어요.",
          title: "뉴앙 커뮤니티",
          url: shareUrl,
        });
        setStatus({ message: "공유 화면을 열었어요.", status: "notice" });
        return;
      } catch {
        setStatus({ status: "idle" });
        return;
      }
    }

    try {
      await window.navigator.clipboard?.writeText(shareUrl);
      setStatus({
        message: "공유 링크를 복사했어요. 카카오톡 대화창에 붙여넣어 주세요.",
        status: "notice",
      });
    } catch {
      setStatus({
        message: "브라우저의 공유 기능에서 카카오톡을 선택해 주세요.",
        status: "notice",
      });
    }
  }
}

function createFeedResumePath({
  actionType,
  postId,
  returnTo,
}: {
  actionType: FeedAction["type"];
  postId: string;
  returnTo: string;
}) {
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/feed";
  const url = new URL(safeReturnTo, "https://nuang.local");
  url.searchParams.set(
    "resumeFeed",
    actionType === "comment" ? "comment" : "community",
  );
  url.searchParams.set("postId", postId);
  return `${url.pathname}${url.search}`;
}

function createPendingCommentKey(postId: string) {
  return `nuang:feed:pending-comment:${postId}`;
}

function clearResumeFeedParams() {
  const url = new URL(window.location.href);
  ["auth", "resumeFeed", "postId"].forEach((key) => {
    url.searchParams.delete(key);
  });
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function createInitialActiveActions({
  initialBookmarked,
  initialLiked,
}: {
  initialBookmarked: boolean;
  initialLiked: boolean;
}) {
  const activeActions: Array<FeedAction["type"]> = [];

  if (initialLiked) {
    activeActions.push("react");
  }

  if (initialBookmarked) {
    activeActions.push("bookmark");
  }

  return activeActions;
}

function FeedReplyPreviewList({
  questionMode,
  replies,
  replyTotal,
}: {
  questionMode: boolean;
  replies: FeedReplyPreview[];
  replyTotal: number;
}) {
  if (questionMode) {
    return (
      <section
        aria-label="질문의 답변"
        className="mt-2 border-t border-[#ebe8ee] pt-3"
      >
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <strong className="text-[13px] font-bold text-[#343039]">
            답변 {replyTotal.toLocaleString("ko-KR")}개
          </strong>
          {replies.length > 0 ? (
            <span className="text-[11px] font-medium text-[#89858e]">
              최근 답변부터
            </span>
          ) : null}
        </div>
        {replies.length > 0 ? (
          <div className="divide-y divide-[#efedf1]">
            {replies.map((reply) => (
              <article
                className="grid grid-cols-[30px_minmax(0,1fr)] gap-2 py-2.5"
                key={reply.id}
              >
                <span
                  aria-hidden="true"
                  className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[linear-gradient(145deg,#ebe8ff,#def4ef)] text-[10px] font-bold text-[#5a4bc1]"
                >
                  {reply.authorName.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-[13px] leading-[1.55] text-[#343039]">
                    <strong className="mr-1 font-bold text-[#242128]">
                      {reply.authorName}
                    </strong>
                    {reply.authorCode ? (
                      <span className="mr-1.5 inline-flex min-h-5 items-center rounded-full bg-[#f0edff] px-1.5 text-[9px] font-bold tracking-[0.04em] text-[#5c4fc2]">
                        {reply.authorCode}
                      </span>
                    ) : null}
                    {reply.body}
                  </p>
                  <p className="mt-1 flex items-center gap-2.5 text-[10px] font-medium text-[#8a8790]">
                    {reply.timeLabel ? <span>{reply.timeLabel}</span> : null}
                    {reply.statusLabel ? (
                      <span>{reply.statusLabel}</span>
                    ) : null}
                    <button type="button">공감</button>
                    <button type="button">답글</button>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="py-2 text-[12px] leading-[1.5] text-[#817d86]">
            아직 답변이 없어요. 내 경험을 가장 먼저 나눠보세요.
          </p>
        )}
      </section>
    );
  }

  return (
    <div aria-label="최근 댓글" className="mt-3 space-y-1.5">
      {replies.map((reply) => (
        <p className="text-[13px] leading-[1.45] text-[#2a2a2a]" key={reply.id}>
          <span className="font-extrabold text-[#111111]">
            {reply.authorName}
          </span>{" "}
          <span>{reply.body}</span>
          {reply.statusLabel ? (
            <span className="ml-1 text-[#737373]">· {reply.statusLabel}</span>
          ) : null}
        </p>
      ))}
    </div>
  );
}

function ActionButton({
  active,
  action,
  disabled,
  expanded,
  onClick,
  showCount,
}: {
  active: boolean;
  action: FeedAction;
  disabled: boolean;
  expanded?: boolean;
  onClick: (action: FeedAction) => Promise<void>;
  showCount: boolean;
}) {
  const isPressable = action.type === "react" || action.type === "bookmark";

  return (
    <button
      aria-label={action.label}
      aria-expanded={action.type === "comment" ? expanded : undefined}
      aria-pressed={isPressable ? active : undefined}
      className={cn(
        "inline-flex min-h-[38px] items-center gap-[5px] rounded-full px-[7px] text-[12px] font-normal transition-[color,background-color,transform] hover:bg-[#f6f5f2] active:scale-[0.97] disabled:opacity-50",
        getActionToneClass(action.type, active, expanded),
      )}
      disabled={disabled}
      onClick={() => {
        void onClick(action);
      }}
      type="button"
    >
      {getActionIcon(action.type, active)}
      {showCount && action.type === "react" ? (
        <span className="text-[12px] font-normal tabular-nums">
          {(action.count ?? 0).toLocaleString("ko-KR")}
        </span>
      ) : null}
      {showCount && action.type === "comment" ? (
        <span className="text-[12px] font-normal tabular-nums">
          {action.label === "답변" ? `${action.label} ` : null}
          {(action.count ?? 0).toLocaleString("ko-KR")}
        </span>
      ) : null}
    </button>
  );
}

function getActionToneClass(
  type: FeedAction["type"],
  active: boolean,
  expanded?: boolean,
) {
  if (type === "react" && active) {
    return "text-[#c94b61] hover:bg-[#fff0f3] focus-visible:outline-[#c94b61]";
  }

  if (type === "comment" && expanded) {
    return "text-[#306e60] hover:bg-[#e6f4ef] focus-visible:outline-[#306e60]";
  }

  if (type === "bookmark" && active) {
    return "text-[#20232a] hover:bg-[#f3f3f5] focus-visible:outline-[#20232a]";
  }

  return "text-[#6d7280] focus-visible:outline-[#6d7280]";
}

function getActionIcon(type: FeedAction["type"], active: boolean) {
  if (type === "react") {
    return (
      <Heart
        aria-hidden="true"
        fill={active ? "currentColor" : "none"}
        size={24}
        strokeWidth={2}
      />
    );
  }

  if (type === "comment") {
    return <MessageCircle aria-hidden="true" size={24} strokeWidth={2} />;
  }

  if (type === "bookmark") {
    return (
      <Bookmark
        aria-hidden="true"
        fill={active ? "currentColor" : "none"}
        size={24}
        strokeWidth={2}
      />
    );
  }

  return <Send aria-hidden="true" size={24} strokeWidth={2} />;
}

function getSuccessMessage(
  type: FeedAction["type"],
  active: boolean,
  questionMode: boolean,
) {
  if (type === "react")
    return active ? "좋아요를 남겼어요." : "좋아요를 취소했어요.";
  if (type === "bookmark") return active ? "저장했어요." : "저장을 취소했어요.";
  if (type === "comment")
    return `${questionMode ? "답변" : "댓글"}이 접수됐어요.`;

  return "반영됐어요.";
}

function ShareActionSheet({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (option: "copy" | "feed" | "kakao") => Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[#19171d]/35 px-3 pb-[calc(12px+env(safe-area-inset-bottom))] backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        aria-label="게시물 공유"
        aria-modal="true"
        className="w-full max-w-[496px] overflow-hidden rounded-[22px] bg-white shadow-[0_24px_60px_rgb(29_24_37_/_22%)]"
        role="dialog"
      >
        <header className="flex min-h-14 items-center justify-between border-b border-[#ebe8ed] px-4">
          <strong className="text-sm font-bold text-[#2e2a32]">공유하기</strong>
          <button
            aria-label="공유 닫기"
            className="grid h-10 w-10 place-items-center rounded-full text-[#68636d] hover:bg-[#f5f3f6]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} strokeWidth={1.9} />
          </button>
        </header>
        <div className="grid divide-y divide-[#efedf1] px-1 pb-1">
          <ShareOption
            icon={<Link2 aria-hidden="true" size={20} strokeWidth={1.9} />}
            label="링크 복사"
            onClick={() => void onSelect("copy")}
          />
          <ShareOption
            icon={
              <MessageCircle aria-hidden="true" size={20} strokeWidth={1.9} />
            }
            label="카카오톡으로 공유"
            onClick={() => void onSelect("kakao")}
          />
          <ShareOption
            icon={<Repeat2 aria-hidden="true" size={20} strokeWidth={1.9} />}
            label="내 피드에 공유"
            onClick={() => void onSelect("feed")}
          />
        </div>
      </section>
    </div>
  );
}

function ShareOption({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex min-h-13 items-center gap-3 rounded-xl px-3 text-left text-[13px] font-semibold text-[#38333d] hover:bg-[#f8f6f9]"
      onClick={onClick}
      type="button"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f2eff8] text-[#6755c7]">
        {icon}
      </span>
      {label}
    </button>
  );
}

function FeedActionStatusMessage({ status }: { status: FeedActionStatus }) {
  if (status.status === "idle") return null;

  if (status.status === "pending") {
    return (
      <p
        aria-live="polite"
        className="mt-1 text-xs font-medium text-[#737373]"
        role="status"
      >
        {status.actionLabel} 확인 중
      </p>
    );
  }

  return (
    <p
      className={cn(
        "mt-1 text-xs font-medium",
        status.status === "error" ? "text-[#9a6400]" : "text-[#737373]",
      )}
      role={status.status === "error" ? "alert" : "status"}
    >
      {status.message}
    </p>
  );
}
