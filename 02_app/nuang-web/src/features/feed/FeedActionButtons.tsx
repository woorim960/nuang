"use client";

import { Bookmark, Heart, MessageCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
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
  className,
  commentComposer = false,
  commentPlaceholder = "댓글 달기",
  includeBookmark = false,
  initialBookmarked = false,
  initialLiked = false,
  postId,
  replyPreview = [],
  returnTo = "/feed",
  targetType = "feed_seed_card",
}: {
  className?: string;
  commentComposer?: boolean;
  commentPlaceholder?: string;
  includeBookmark?: boolean;
  initialBookmarked?: boolean;
  initialLiked?: boolean;
  postId: string;
  replyPreview?: FeedReplyPreview[];
  returnTo?: string;
  targetType?: "feed_post" | "feed_seed_card";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<FeedActionStatus>({ status: "idle" });
  const [commentBody, setCommentBody] = useState("");
  const [isCommentOpen, setIsCommentOpen] = useState(commentComposer);
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
        message: `로그인이 완료됐어요. ${commentComposer ? "등록" : "게시"} 버튼을 누르면 댓글이 등록돼요.`,
        status: "notice",
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [commentComposer, postId]);
  const actions: FeedAction[] = commentComposer
    ? []
    : [
        {
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
        {
          label: "댓글",
          mode: "comment",
          type: "comment",
        },
        {
          label: "공유",
          mode: "local",
          type: "share",
        },
      ];

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
            "flex items-center text-[#242424]",
            includeBookmark ? "justify-between" : "gap-4",
          )}
        >
          <div className="flex items-center gap-4">
            {primaryActions.map((action) => (
              <ActionButton
                action={action}
                active={activeActions.includes(action.type)}
                disabled={status.status === "pending"}
                expanded={action.type === "comment" ? isCommentOpen : undefined}
                key={action.type}
                onClick={handleAction}
              />
            ))}
          </div>
          {bookmarkAction ? (
            <ActionButton
              action={bookmarkAction}
              active={activeActions.includes(bookmarkAction.type)}
              disabled={status.status === "pending"}
              onClick={handleAction}
            />
          ) : null}
        </div>
      ) : null}
      {isCommentOpen && replyPreview.length > 0 ? (
        <FeedReplyPreviewList replies={replyPreview} />
      ) : null}
      {isCommentOpen ? (
        <form
          className={cn(
            "flex items-center gap-2",
            commentComposer ? "mt-0" : "mt-2",
          )}
          onSubmit={handleCommentSubmit}
        >
          <label className="sr-only" htmlFor={`feed-comment-${postId}`}>
            댓글 내용
          </label>
          <input
            className={cn(
              "min-w-0 flex-1 text-sm font-medium outline-none placeholder:text-[#9a9a9a]",
              commentComposer
                ? "min-h-11 rounded-[14px] border border-[#ded9e3] bg-white px-3 focus:border-[#8066d3] focus:ring-2 focus:ring-[#8066d3]/10"
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
                ? "h-11 rounded-[14px] bg-[#5e43c2] px-4 text-white shadow-[0_7px_18px_rgb(94_67_194_/_18%)] disabled:bg-[#d8d2e2] disabled:shadow-none"
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
      <FeedActionStatusMessage status={status} />
    </div>
  );

  async function handleAction(action: FeedAction) {
    if (action.mode === "local") {
      setStatus({
        message: "공유는 프로필과 결과 공유 정책이 연결된 뒤 열릴 예정이에요.",
        status: "notice",
      });
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
        message: "댓글을 조금 더 적어주세요.",
        status: "error",
      });
      return;
    }

    await submitFeedRequest(
      "댓글",
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
      }

      if (actionType === "react" || actionType === "bookmark") {
        setActiveActions((current) =>
          nextActive
            ? current.includes(actionType)
              ? current
              : [...current, actionType]
            : current.filter((item) => item !== actionType),
        );
      }

      setStatus({
        message: getSuccessMessage(actionType, nextActive),
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

function FeedReplyPreviewList({ replies }: { replies: FeedReplyPreview[] }) {
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
}: {
  active: boolean;
  action: FeedAction;
  disabled: boolean;
  expanded?: boolean;
  onClick: (action: FeedAction) => Promise<void>;
}) {
  const isPressable = action.type === "react" || action.type === "bookmark";

  return (
    <button
      aria-label={action.label}
      aria-expanded={action.type === "comment" ? expanded : undefined}
      aria-pressed={isPressable ? active : undefined}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-[#f5f5f5] disabled:opacity-50",
        active ? "text-[#111111]" : "text-[#242424]",
      )}
      disabled={disabled}
      onClick={() => {
        void onClick(action);
      }}
      type="button"
    >
      {getActionIcon(action.type, active)}
    </button>
  );
}

function getActionIcon(type: FeedAction["type"], active: boolean) {
  if (type === "react") {
    return (
      <Heart
        aria-hidden="true"
        fill={active ? "currentColor" : "none"}
        size={22}
        strokeWidth={1.9}
      />
    );
  }

  if (type === "comment") {
    return <MessageCircle aria-hidden="true" size={22} strokeWidth={1.9} />;
  }

  if (type === "bookmark") {
    return (
      <Bookmark
        aria-hidden="true"
        fill={active ? "currentColor" : "none"}
        size={23}
        strokeWidth={1.9}
      />
    );
  }

  return <Send aria-hidden="true" size={21} strokeWidth={1.9} />;
}

function getSuccessMessage(type: FeedAction["type"], active: boolean) {
  if (type === "react")
    return active ? "좋아요를 남겼어요." : "좋아요를 취소했어요.";
  if (type === "bookmark") return active ? "저장했어요." : "저장을 취소했어요.";
  if (type === "comment") return "댓글이 접수됐어요.";

  return "반영됐어요.";
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
