"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FeedPollSummary } from "@/features/feed/feed-seed";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import { cn } from "@/lib/utils/cn";
import styles from "./FeedPollCard.module.css";

type VoteStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "success" }
  | { message: string; status: "error" };

export function FeedPollCard({
  allowVote = true,
  poll,
  returnTo = "/feed",
  variant = "feed",
}: {
  allowVote?: boolean;
  poll: FeedPollSummary;
  returnTo?: string;
  variant?: "feed" | "home" | "playground";
}) {
  const router = useRouter();
  const [status, setStatus] = useState<VoteStatus>({ status: "idle" });
  const [viewerVoteOptionId, setViewerVoteOptionId] = useState(
    poll.viewerVoteOptionId,
  );
  const [perspectiveOpen, setPerspectiveOpen] = useState(
    !poll.viewerVoteOptionId,
  );
  const [perspectiveCode, setPerspectiveCode] = useState<string | null>(null);
  const [showParticipatingCodes, setShowParticipatingCodes] = useState(false);
  const resumedVoteRef = useRef(false);
  const hasVoted = Boolean(viewerVoteOptionId);
  const canVote = allowVote && status.status !== "pending";
  const selectedPerspective = perspectiveCode
    ? (poll.codePerspectives.find((row) => row.code === perspectiveCode) ??
      null)
    : null;
  const activePerspectiveCode = selectedPerspective?.code ?? null;
  const perspectiveOptions = selectedPerspective?.options ?? poll.options;
  const viewerPerspective = poll.viewerCode
    ? (poll.codePerspectives.find((row) => row.code === poll.viewerCode) ??
      null)
    : null;

  useEffect(() => {
    if (!allowVote || hasVoted || resumedVoteRef.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    const resumedPollId = searchParams.get("pollId");
    const resumedOptionId = searchParams.get("optionId");
    const shouldResume =
      searchParams.get("auth") === "connected" &&
      searchParams.get("resumeFeed") === "poll" &&
      resumedPollId === poll.id &&
      poll.options.some((option) => option.id === resumedOptionId);

    if (!shouldResume || !resumedOptionId) return;

    resumedVoteRef.current = true;
    const timeoutId = window.setTimeout(() => {
      setStatus({ status: "pending" });

      void postPollVote(poll.id, resumedOptionId)
        .then((response) => {
          if (!response.ok) {
            setStatus({
              message: "로그인은 완료됐지만 투표를 저장하지 못했어요.",
              status: "error",
            });
            return;
          }

          setViewerVoteOptionId(resumedOptionId);
          router.replace(returnTo);
          router.refresh();
        })
        .catch(() => {
          setStatus({
            message: "네트워크 연결 때문에 투표를 확인하지 못했어요.",
            status: "error",
          });
        });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [allowVote, hasVoted, poll.id, poll.options, returnTo, router]);

  async function handleVote(optionId: string) {
    if (!canVote || optionId === viewerVoteOptionId) return;

    const isReplacingVote = hasVoted;
    setStatus({ status: "pending" });

    try {
      const response = await postPollVote(poll.id, optionId);

      if (response.status === 401) {
        const resumePath = createPollResumePath({
          optionId,
          pollId: poll.id,
          returnTo,
        });

        router.push(
          `/login?next=${encodeURIComponent(resumePath)}&reason=poll`,
        );
        return;
      }

      if (!response.ok) {
        setStatus({
          message: "투표를 저장하지 못했어요.",
          status: "error",
        });
        return;
      }

      setViewerVoteOptionId(optionId);
      setPerspectiveOpen(true);
      router.refresh();
      setStatus(
        isReplacingVote
          ? { message: "선택을 바꿨어요.", status: "success" }
          : { status: "idle" },
      );
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 투표를 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  return (
    <div
      className={cn(
        variant === "home"
          ? "mt-3"
          : variant === "playground"
            ? "mt-0"
            : "mt-4 border-y border-[#ececec] py-3",
      )}
    >
      <p
        className={cn(
          variant === "playground"
            ? "text-[13px] font-medium leading-[1.55] tracking-[-0.012em] text-[#20232a]"
            : "font-extrabold text-[#111111]",
          variant === "home"
            ? "max-w-[25ch] text-[19px] leading-7 tracking-[-0.025em]"
            : variant === "feed"
              ? "text-[15px] leading-6"
              : "",
        )}
      >
        {poll.question}
      </p>
      <div className={cn("space-y-2", variant === "home" ? "mt-4" : "mt-3")}>
        {poll.options.map((option) => (
          <button
            aria-pressed={option.id === viewerVoteOptionId}
            className={cn(
              "w-full text-left disabled:cursor-default",
              variant === "playground"
                ? "min-h-[52px] rounded-[13px] border border-[#e6e7eb] bg-white px-3.5 py-3 transition-[border-color,background-color,opacity]"
                : variant === "home"
                  ? "min-h-[56px] rounded-[13px] border border-[#ebe8ef] bg-[#fdfcfd] px-3 py-3 transition-[border-color,background-color,transform]"
                  : "py-2 transition-opacity",
              variant === "playground" && option.id === viewerVoteOptionId
                ? "border-[#8b621f] bg-[#fbf3e4]"
                : variant === "home" && option.id === viewerVoteOptionId
                  ? "border-[#8b621f] bg-[#fbf3e4]"
                  : "",
              canVote ? "hover:opacity-70" : "",
            )}
            disabled={!canVote}
            key={option.id}
            onClick={() => void handleVote(option.id)}
            type="button"
          >
            <div className="flex items-center justify-between gap-4">
              <span
                className={cn(
                  variant === "playground"
                    ? "text-[12px] font-medium text-[#20232a]"
                    : "text-[15px] font-bold text-[#111111]",
                  variant === "playground" && option.id === viewerVoteOptionId
                    ? "text-[#8b621f]"
                    : "",
                )}
              >
                {option.label}
              </span>
              {hasVoted ? (
                <span
                  className={cn(
                    "tabular-nums",
                    variant === "playground"
                      ? "text-[11px] font-medium text-[#737887]"
                      : "text-sm font-black text-[#111111]",
                    variant === "playground" && option.id === viewerVoteOptionId
                      ? "text-[#8b621f]"
                      : "",
                  )}
                >
                  {option.ratio}%
                </span>
              ) : null}
            </div>
            {hasVoted ? (
              <div
                className={cn(
                  "mt-2 w-full",
                  variant === "playground"
                    ? "h-[3px] rounded-full bg-[#e9e8ef]"
                    : variant === "home"
                      ? "h-1 rounded-full bg-[#eeeeee]"
                      : "h-[3px] bg-[#eeeeee]",
                )}
              >
                <div
                  className={cn(
                    "h-full",
                    variant === "playground"
                      ? "rounded-full bg-[#8b621f]"
                      : variant === "home"
                        ? "rounded-full bg-[#8b621f]"
                        : "bg-[#8b621f]",
                  )}
                  style={{ width: `${option.ratio}%` }}
                />
              </div>
            ) : null}
          </button>
        ))}
      </div>
      {hasVoted && variant === "feed" ? (
        <div className="mt-3 flex items-center justify-between gap-4 text-[13px] font-semibold text-[#737373]">
          <span>총 {poll.totalVotes.toLocaleString("ko-KR")}명 참여</span>
          {poll.canViewCodeStats ? (
            <Link
              className="text-[#111111]"
              href={createStatsHref(poll.statsHref, variant)}
            >
              뉴앙 코드별 통계 보기
            </Link>
          ) : (
            <span>코드별 비교는 참여자가 더 모이면 열려요</span>
          )}
        </div>
      ) : hasVoted && variant === "playground" ? (
        <section
          aria-label="뉴앙 코드별 관점 보기"
          className={styles.perspective}
        >
          <div className={styles.perspectiveHeader}>
            <button
              aria-controls={`poll-perspective-${poll.id}`}
              aria-expanded={perspectiveOpen}
              aria-label={`코드별 관점 ${perspectiveOpen ? "접기" : "펼치기"}`}
              className={styles.perspectiveToggle}
              onClick={() => setPerspectiveOpen((current) => !current)}
              type="button"
            >
              <strong>코드별 관점 보기</strong>
              <span>
                {poll.totalVotes.toLocaleString("ko-KR")}명 참여
                <ChevronDown
                  aria-hidden="true"
                  className={styles.perspectiveChevron}
                  data-open={perspectiveOpen ? "true" : "false"}
                  size={16}
                  strokeWidth={2}
                />
              </span>
            </button>
          </div>

          {perspectiveOpen ? (
            <div
              className={styles.perspectiveBody}
              id={`poll-perspective-${poll.id}`}
            >
              <div
                aria-label="관점 선택"
                className={styles.perspectiveTabs}
                role="group"
              >
                <button
                  aria-pressed={activePerspectiveCode === null}
                  className={styles.perspectiveTab}
                  onClick={() => setPerspectiveCode(null)}
                  type="button"
                >
                  전체
                </button>
                {poll.viewerCode ? (
                  <button
                    aria-pressed={activePerspectiveCode === poll.viewerCode}
                    className={styles.perspectiveTab}
                    disabled={!viewerPerspective}
                    onClick={() => setPerspectiveCode(poll.viewerCode)}
                    title={
                      viewerPerspective
                        ? undefined
                        : "내 코드의 첫 투표가 생기면 열려요"
                    }
                    type="button"
                  >
                    내 코드 {poll.viewerCode}
                    {!viewerPerspective ? " · 집계 중" : ""}
                  </button>
                ) : null}
                <button
                  aria-expanded={showParticipatingCodes}
                  aria-pressed={showParticipatingCodes}
                  className={styles.perspectiveTab}
                  onClick={() =>
                    setShowParticipatingCodes((current) => !current)
                  }
                  type="button"
                >
                  참여 코드 {poll.codePerspectives.length}
                </button>
              </div>

              {showParticipatingCodes ? (
                <div className={styles.codePicker}>
                  {poll.codePerspectives.length > 0 ? (
                    poll.codePerspectives.map((row) => (
                      <button
                        aria-label={`${row.code} ${row.totalVotes}명`}
                        aria-pressed={activePerspectiveCode === row.code}
                        className={styles.codeChoice}
                        key={row.code}
                        onClick={() => setPerspectiveCode(row.code)}
                        type="button"
                      >
                        <strong>{row.code}</strong>
                        <span>{row.totalVotes}명</span>
                      </button>
                    ))
                  ) : (
                    <p className={styles.codePending}>
                      아직 코드가 확인된 참여자가 없어요.
                    </p>
                  )}
                </div>
              ) : null}

              {selectedPerspective ? (
                <p className={styles.perspectiveName}>
                  <strong>{selectedPerspective.code}</strong>
                  <span>{selectedPerspective.name}</span>
                </p>
              ) : null}

              <div className={styles.perspectiveResults}>
                {perspectiveOptions.map((option) => (
                  <div key={option.label}>
                    <div className={styles.perspectiveLabel}>
                      <span>{option.label}</span>
                      <strong>{option.ratio}%</strong>
                    </div>
                    <div className={styles.perspectiveTrack}>
                      <span style={{ width: `${option.ratio}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className={styles.perspectiveNote}>
                {createPerspectiveNote(selectedPerspective, perspectiveOptions)}
              </p>
            </div>
          ) : null}
        </section>
      ) : !hasVoted ? (
        <p
          className={cn(
            "mt-3",
            variant === "playground"
              ? "text-[11px] font-normal text-[#8d8f96]"
              : "text-[13px] font-semibold text-[#737373]",
          )}
        >
          하나를 고르면 결과와 코드별 관점을 볼 수 있어요.
        </p>
      ) : null}
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
      {status.status === "success" ? (
        <p className="mt-2 text-xs font-medium text-[#8b621f]" role="status">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}

function createPerspectiveNote(
  selectedPerspective: FeedPollSummary["codePerspectives"][number] | null,
  options: Array<{ label: string; ratio: number }>,
) {
  if (!selectedPerspective) {
    return "전체 참여자의 현재 선택이에요. 같은 선택을 골라도 이유는 사람마다 다를 수 있어요.";
  }

  const sortedOptions = [...options].sort(
    (left, right) => right.ratio - left.ratio,
  );
  const leadingOption = sortedOptions[0];
  const followingOption = sortedOptions[1];

  if (!leadingOption) {
    return "참여가 더 모이면 이 코드의 선택 차이를 보여드릴게요.";
  }

  if (
    followingOption &&
    Math.abs(leadingOption.ratio - followingOption.ratio) <= 10
  ) {
    return `${selectedPerspective.code} 안에서도 선택이 비슷하게 나뉘었어요. 같은 코드라도 상황과 경험에 따라 생각은 달라질 수 있어요.`;
  }

  return `${selectedPerspective.code} 참여자에게서는 ‘${leadingOption.label}’ 선택이 ${leadingOption.ratio}%로 더 많았어요. 이 결과만으로 코드 전체를 단정하지는 않아요.`;
}

async function postPollVote(pollId: string, optionId: string) {
  return fetch("/api/feed", {
    body: JSON.stringify({
      action: "vote_poll",
      optionId,
      pollId,
    } satisfies FeedWriteRequest),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
}

function createPollResumePath({
  optionId,
  pollId,
  returnTo,
}: {
  optionId: string;
  pollId: string;
  returnTo: string;
}) {
  const safeReturnTo =
    returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/feed";
  const url = new URL(safeReturnTo, "https://nuang.local");

  url.searchParams.set("resumeFeed", "poll");
  url.searchParams.set("pollId", pollId);
  url.searchParams.set("optionId", optionId);

  return `${url.pathname}${url.search}`;
}

function createStatsHref(
  statsHref: string,
  variant: "feed" | "home" | "playground",
) {
  if (variant !== "home") return statsHref;

  const url = new URL(statsHref, "https://nuang.local");
  url.searchParams.set("from", "home");
  return `${url.pathname}${url.search}`;
}
