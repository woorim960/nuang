"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FeedPollSummary } from "@/features/feed/feed-seed";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import { cn } from "@/lib/utils/cn";

type VoteStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "error" };

export function FeedPollCard({ poll }: { poll: FeedPollSummary }) {
  const router = useRouter();
  const [status, setStatus] = useState<VoteStatus>({ status: "idle" });
  const hasVoted = Boolean(poll.viewerVoteOptionId);
  const canVote = status.status !== "pending" && !hasVoted;

  async function handleVote(optionId: string) {
    if (!canVote) return;

    setStatus({ status: "pending" });

    try {
      const response = await fetch("/api/feed", {
        body: JSON.stringify({
          action: "vote_poll",
          optionId,
          pollId: poll.id,
        } satisfies FeedWriteRequest),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/feed")}`);
        return;
      }

      if (!response.ok) {
        setStatus({
          message: "투표를 저장하지 못했어요.",
          status: "error",
        });
        return;
      }

      router.refresh();
      setStatus({ status: "idle" });
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 투표를 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  return (
    <div className="mt-4 border-y border-[#ececec] py-3">
      <p className="text-[15px] font-extrabold leading-6 text-[#111111]">
        {poll.question}
      </p>
      <div className="mt-3 space-y-2">
        {poll.options.map((option) => (
          <button
            aria-pressed={option.viewerHasVoted}
            className={cn(
              "w-full py-2 text-left transition-opacity disabled:cursor-default",
              canVote ? "hover:opacity-70" : "",
            )}
            disabled={!canVote}
            key={option.id}
            onClick={() => void handleVote(option.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[15px] font-bold text-[#111111]">
                {option.label}
              </span>
              {hasVoted ? (
                <span className="text-sm font-black tabular-nums text-[#111111]">
                  {option.ratio}%
                </span>
              ) : null}
            </div>
            {hasVoted ? (
              <div className="mt-2 h-[3px] w-full bg-[#eeeeee]">
                <div
                  className="h-full bg-[#111111]"
                  style={{ width: `${option.ratio}%` }}
                />
              </div>
            ) : null}
          </button>
        ))}
      </div>
      {hasVoted ? (
        <div className="mt-3 flex items-center justify-between gap-4 text-[13px] font-semibold text-[#737373]">
          <span>총 {poll.totalVotes.toLocaleString("ko-KR")}명 참여</span>
          {poll.canViewCodeStats ? (
            <Link className="text-[#111111]" href={poll.statsHref}>
              뉴앙 코드별 통계 보기
            </Link>
          ) : (
            <span>2명 이상 모이면 통계가 열려요</span>
          )}
        </div>
      ) : (
        <p className="mt-3 text-[13px] font-semibold text-[#737373]">
          하나를 고르면 결과를 볼 수 있어요.
        </p>
      )}
      {status.status === "pending" ? (
        <p className="mt-2 text-xs font-medium text-[#737373]" role="status">
          투표 저장 중
        </p>
      ) : null}
      {status.status === "error" ? (
        <p className="mt-2 text-xs font-medium text-[#9a6400]" role="alert">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
