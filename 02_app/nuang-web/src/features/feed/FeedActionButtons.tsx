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
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import type { FeedReplyPreview } from "@/features/feed/feed-seed";
import { FeedMoreMenu } from "@/features/feed/FeedMoreMenu";
import { SafeLinkedText } from "@/features/feed/SafeLinkedText";
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
  commentDisabledMessage,
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
  commentDisabledMessage?: string;
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
            "flex items-center text-[var(--nu-color-text-muted)]",
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
              "min-w-0 flex-1 text-sm font-medium outline-none placeholder:text-[var(--nu-neutral-400)]",
              commentComposer
                ? "min-h-11 rounded-[14px] border border-[var(--nu-color-community-border)] bg-white px-3 focus:border-[var(--nu-color-community)] focus:ring-2 focus:ring-[var(--nu-color-community)]/10"
                : questionMode
                  ? "min-h-10 rounded-[15px] border border-[var(--nu-color-community-border)] bg-[var(--nu-community-50)] px-3 focus:border-[var(--nu-color-community)] focus:ring-2 focus:ring-[var(--nu-color-community)]/10"
                  : "min-h-9 border-0 border-b border-[var(--nu-neutral-200)] bg-transparent px-0 focus:border-[var(--nu-color-text-strong)]",
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
                ? "h-11 rounded-[14px] bg-[var(--nu-color-community)] px-4 text-white shadow-community disabled:bg-[var(--nu-community-100)] disabled:shadow-none"
                : questionMode
                  ? "h-9 px-1 text-[var(--nu-color-community)] disabled:text-[var(--nu-neutral-300)]"
                  : "h-9 px-1 text-[var(--nu-color-text-strong)] disabled:text-[var(--nu-neutral-300)]",
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
      {isCommentOpen && !allowComment ? (
        <p className="mt-2 text-caption leading-[1.5] text-[var(--nu-neutral-500)]">
          {commentDisabledMessage ??
            (questionMode
              ? "답변 대상으로 지정된 성향만 답변을 남길 수 있어요."
              : "새 댓글 작성이 마감됐어요.")}
        </p>
      ) : null}
      {isCommentOpen && questionMode ? (
        <p className="mt-1.5 text-caption leading-[1.45] text-[var(--nu-neutral-500)]">
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
        className="mt-2 border-t border-[var(--nu-brand-100)] pt-3"
      >
        <div className="mb-1.5 flex items-center justify-between gap-3">
          <strong className="text-label font-bold text-[var(--nu-neutral-800)]">
            답변
          </strong>
          <span className="text-caption font-medium tabular-nums text-[var(--nu-neutral-500)]">
            {replyTotal.toLocaleString("ko-KR")}
          </span>
        </div>
        {replies.length > 0 ? (
          <div className="divide-y divide-[var(--nu-neutral-75)]">
            {replies.map((reply) => (
              <article
                className="grid grid-cols-[30px_minmax(0,1fr)] gap-2 py-2.5"
                key={reply.id}
              >
                <span
                  aria-hidden="true"
                  className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[linear-gradient(145deg,var(--nu-info-50),var(--nu-info-100))] text-caption font-bold text-[var(--nu-info-500)]"
                >
                  {reply.authorName.slice(0, 1)}
                </span>
                <div className="relative min-w-0 pr-8">
                  {reply.reportable ? (
                    <div className="absolute -right-1 -top-1">
                      <FeedMoreMenu
                        compact
                        postId={reply.id}
                        targetType="feed_comment"
                      />
                    </div>
                  ) : null}
                  <p className="m-0 text-label leading-[1.55] text-[var(--nu-neutral-800)]">
                    <strong className="mr-1 font-bold text-[var(--nu-neutral-900)]">
                      {reply.authorName}
                    </strong>
                    {reply.authorCode ? (
                      <span className="mr-1.5 inline-flex min-h-5 items-center rounded-full bg-[var(--nu-color-brand-surface-strong)] px-1.5 text-caption font-bold tracking-[0.04em] text-[var(--nu-info-500)]">
                        {reply.authorCode}
                      </span>
                    ) : null}
                    <SafeLinkedText
                      as="span"
                      links={reply.links}
                      text={reply.body}
                    />
                  </p>
                  <p className="mt-1 flex items-center gap-2.5 text-caption font-medium text-[var(--nu-neutral-500)]">
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
          <p className="py-2 text-caption leading-[1.5] text-[var(--nu-neutral-500)]">
            아직 답변이 없어요. 내 경험을 가장 먼저 나눠보세요.
          </p>
        )}
      </section>
    );
  }

  return (
    <div aria-label="최근 댓글" className="mt-3 space-y-1.5">
      {replies.map((reply) => (
        <div
          className="flex items-start gap-1 text-label leading-[1.45] text-[var(--nu-neutral-900)]"
          key={reply.id}
        >
          <p className="min-w-0 flex-1">
            <span className="font-extrabold text-[var(--nu-color-text-strong)]">
              {reply.authorName}
            </span>{" "}
            <SafeLinkedText as="span" links={reply.links} text={reply.body} />
            {reply.statusLabel ? (
              <span className="ml-1 text-[var(--nu-color-text-muted)]">
                · {reply.statusLabel}
              </span>
            ) : null}
          </p>
          {reply.reportable ? (
            <FeedMoreMenu compact postId={reply.id} targetType="feed_comment" />
          ) : null}
        </div>
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
        "inline-flex min-h-[38px] items-center gap-[5px] rounded-full px-[7px] text-caption font-normal transition-[color,background-color,transform] hover:bg-[var(--nu-color-app-bg)] active:scale-[0.97] disabled:opacity-50",
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
        <span className="text-caption font-normal tabular-nums">
          {(action.count ?? 0).toLocaleString("ko-KR")}
        </span>
      ) : null}
      {showCount && action.type === "comment" ? (
        <span className="text-caption font-normal tabular-nums">
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
    return "text-[var(--nu-color-reaction)] hover:bg-[var(--nu-color-reaction-soft)] focus-visible:outline-[var(--nu-color-reaction)]";
  }

  if (type === "comment" && expanded) {
    return "text-[var(--nu-color-community)] hover:bg-[var(--nu-community-100)] focus-visible:outline-[var(--nu-color-community)]";
  }

  if (type === "bookmark" && active) {
    return "text-[var(--nu-color-text)] hover:bg-[var(--nu-neutral-75)] focus-visible:outline-[var(--nu-color-text)]";
  }

  return "text-[var(--nu-color-text-muted)] focus-visible:outline-[var(--nu-color-text-muted)]";
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
    <BottomSheet
      backdropLabel="게시물 공유 닫기"
      className="w-full max-w-[496px]"
      dialogProps={{ "aria-label": "게시물 공유" }}
      onClose={onClose}
    >
      <header className="flex min-h-14 items-center justify-between border-b border-[var(--nu-neutral-150)] px-4">
        <strong className="text-sm font-bold text-[var(--nu-neutral-800)]">
          공유하기
        </strong>
        <button
          aria-label="공유 닫기"
          className="grid h-10 w-10 place-items-center rounded-full text-[var(--nu-neutral-600)] hover:bg-[var(--nu-brand-100)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={19} strokeWidth={1.9} />
        </button>
      </header>
      <div className="grid divide-y divide-[var(--nu-neutral-75)] px-1 pb-[calc(4px+env(safe-area-inset-bottom))]">
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
    </BottomSheet>
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
      className="flex min-h-13 items-center gap-3 rounded-xl px-3 text-left text-label font-semibold text-[var(--nu-neutral-800)] hover:bg-[var(--nu-brand-50)]"
      onClick={onClick}
      type="button"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--nu-brand-100)] text-[var(--nu-info-500)]">
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
        className="mt-1 text-xs font-medium text-[var(--nu-color-text-muted)]"
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
        status.status === "error"
          ? "text-[var(--nu-warm-700)]"
          : "text-[var(--nu-color-text-muted)]",
      )}
      role={status.status === "error" ? "alert" : "status"}
    >
      {status.message}
    </p>
  );
}
