"use client";

import { ArrowLeft, ChevronDown, LockKeyhole, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { CommunityTagInput } from "@/features/feed/CommunityTagInput";
import { FeedTopicSelector } from "@/features/feed/FeedTopicSelector";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import {
  maxFeedTagCount,
  type FeedPostTopicCategory,
} from "@/features/feed/feed-topic";
import styles from "./CommunityBalanceGameComposer.module.css";

type BalanceGameEditValue = {
  body: string;
  category?: FeedPostTopicCategory | null;
  options: [string, string];
  pollStatus: "active" | "closed";
  postId: string;
  question: string;
  ratios?: [number, number];
  tags?: string[];
  totalVotes: number;
};

type ComposerStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "error" | "notice" };

type ConfirmMode = "delete" | "exit" | null;

export function CommunityBalanceGameComposer({
  initialValue,
  returnTo = "/feed",
}: {
  initialValue?: BalanceGameEditValue;
  returnTo?: string;
}) {
  const router = useRouter();
  const isEditing = Boolean(initialValue);
  const pollLocked = Boolean(
    initialValue &&
    (initialValue.totalVotes > 0 || initialValue.pollStatus === "closed"),
  );
  const [question, setQuestion] = useState(initialValue?.question ?? "");
  const [optionA, setOptionA] = useState(initialValue?.options[0] ?? "");
  const [optionB, setOptionB] = useState(initialValue?.options[1] ?? "");
  const [body, setBody] = useState(initialValue?.body ?? "");
  const [category, setCategory] = useState<FeedPostTopicCategory | null>(
    initialValue?.category ?? null,
  );
  const [tags, setTags] = useState(initialValue?.tags ?? []);
  const [attempted, setAttempted] = useState(false);
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null);
  const [lockDetailOpen, setLockDetailOpen] = useState(false);
  const [status, setStatus] = useState<ComposerStatus>({ status: "idle" });
  const closeConfirm = useCallback(() => setConfirmMode(null), []);

  const trimmedQuestion = question.trim();
  const trimmedOptionA = optionA.trim();
  const trimmedOptionB = optionB.trim();
  const optionsDiffer =
    trimmedOptionA.toLocaleLowerCase("ko-KR") !==
    trimmedOptionB.toLocaleLowerCase("ko-KR");
  const fieldsValid =
    trimmedQuestion.length >= 4 &&
    trimmedOptionA.length > 0 &&
    trimmedOptionB.length > 0 &&
    optionsDiffer;
  const canSubmit = status.status !== "pending" && (pollLocked || fieldsValid);
  const isDirty = initialValue
    ? body !== initialValue.body ||
      category !== (initialValue.category ?? null) ||
      tags.join("\u0000") !== (initialValue.tags ?? []).join("\u0000") ||
      (!pollLocked &&
        (question !== initialValue.question ||
          optionA !== initialValue.options[0] ||
          optionB !== initialValue.options[1]))
    : Boolean(
        question || optionA || optionB || body || category || tags.length,
      );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          aria-label="이전 화면으로 돌아가기"
          className={styles.backButton}
          onClick={requestExit}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
        </button>
        <h1>{isEditing ? "투표 수정" : "투표 만들기"}</h1>
        <button
          aria-disabled={!canSubmit}
          className={styles.saveButton}
          data-ready={canSubmit ? "true" : "false"}
          disabled={status.status === "pending"}
          onClick={() => void saveBalanceGame()}
          type="button"
        >
          {status.status === "pending"
            ? isEditing
              ? "저장 중"
              : "업로드 중"
            : isEditing
              ? "저장"
              : "업로드"}
        </button>
      </header>

      <form
        className={styles.content}
        onSubmit={(event) => event.preventDefault()}
      >
        <div className={styles.identityRow}>
          <span aria-hidden="true" className={styles.identityAvatar}>
            나
          </span>
          <strong>나</strong>
          <span className={styles.visibility}>전체 공개</span>
        </div>

        {pollLocked && initialValue ? (
          <LockedBalancePreview
            detailOpen={lockDetailOpen}
            initialValue={initialValue}
            onToggleDetail={() => setLockDetailOpen((current) => !current)}
          />
        ) : (
          <section className={styles.pollEditor}>
            <label className={styles.questionField}>
              <span>질문</span>
              <textarea
                aria-describedby={
                  attempted && trimmedQuestion.length < 4
                    ? "balance-question-error"
                    : undefined
                }
                aria-invalid={attempted && trimmedQuestion.length < 4}
                aria-label="투표 질문"
                autoFocus={!isEditing}
                maxLength={160}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setStatus({ status: "idle" });
                }}
                placeholder="어떤 선택이 더 끌리나요?"
                rows={3}
                value={question}
              />
              {question.length >= 128 ? (
                <small>{question.length}/160</small>
              ) : null}
            </label>
            {attempted && trimmedQuestion.length < 4 ? (
              <p className={styles.fieldError} id="balance-question-error">
                {trimmedQuestion
                  ? "질문을 4자 이상 적어 주세요."
                  : "질문을 적어 주세요."}
              </p>
            ) : null}

            <fieldset className={styles.optionGroup}>
              <legend>선택지</legend>
              <div className={styles.optionStack}>
                <label data-error={attempted && !trimmedOptionA}>
                  <span aria-hidden="true" className={styles.optionMarker}>
                    A
                  </span>
                  <span className="sr-only">첫 번째 선택</span>
                  <input
                    aria-label="첫 번째 선택지"
                    maxLength={80}
                    onChange={(event) => {
                      setOptionA(event.target.value);
                      setStatus({ status: "idle" });
                    }}
                    placeholder="첫 번째 선택을 적어 주세요"
                    value={optionA}
                  />
                  {optionA.length >= 64 ? (
                    <small>{optionA.length}/80</small>
                  ) : null}
                </label>
                <label
                  data-error={attempted && (!trimmedOptionB || !optionsDiffer)}
                >
                  <span aria-hidden="true" className={styles.optionMarker}>
                    B
                  </span>
                  <span className="sr-only">두 번째 선택</span>
                  <input
                    aria-label="두 번째 선택지"
                    maxLength={80}
                    onChange={(event) => {
                      setOptionB(event.target.value);
                      setStatus({ status: "idle" });
                    }}
                    placeholder="두 번째 선택을 적어 주세요"
                    value={optionB}
                  />
                  {optionB.length >= 64 ? (
                    <small>{optionB.length}/80</small>
                  ) : null}
                </label>
              </div>
              {attempted && (!trimmedOptionA || !trimmedOptionB) ? (
                <p className={styles.fieldError}>
                  두 선택지를 모두 적어 주세요.
                </p>
              ) : !optionsDiffer && trimmedOptionA && trimmedOptionB ? (
                <p className={styles.fieldError}>
                  서로 다른 선택지를 적어 주세요.
                </p>
              ) : null}
            </fieldset>
          </section>
        )}

        <section className={styles.noteSection}>
          <label>
            <span>
              {pollLocked ? "게시글 설명" : "덧붙일 말"} <small>선택</small>
            </span>
            <textarea
              aria-label="투표 설명"
              maxLength={800}
              onChange={(event) => {
                setBody(event.target.value);
                setStatus({ status: "idle" });
              }}
              placeholder="이 선택이 궁금한 이유나 상황을 적어보세요."
              rows={4}
              value={body}
            />
          </label>
        </section>

        <FeedTopicSelector onChange={setCategory} selectedCategory={category} />

        <CommunityTagInput
          onChange={(nextTags) => {
            setTags(nextTags);
            setStatus({ status: "idle" });
          }}
          onLimitReached={() =>
            setStatus({
              message: `태그는 최대 ${maxFeedTagCount}개까지 추가할 수 있어요.`,
              status: "notice",
            })
          }
          tags={tags}
        />

        {status.status === "error" || status.status === "notice" ? (
          <p
            aria-live="polite"
            className={styles.status}
            data-error={status.status === "error" ? "true" : "false"}
            role={status.status === "error" ? "alert" : "status"}
          >
            {status.message}
          </p>
        ) : null}

        {isEditing ? (
          <section className={styles.deleteSection}>
            <button onClick={() => setConfirmMode("delete")} type="button">
              <Trash2 aria-hidden="true" size={17} strokeWidth={1.8} />
              투표 삭제
            </button>
          </section>
        ) : null}
      </form>

      {confirmMode ? (
        <BottomSheet
          backdropLabel="확인창 닫기"
          className={styles.confirmSheet}
          dialogProps={{ "aria-labelledby": "balance-confirm-title" }}
          onClose={closeConfirm}
        >
          <div>
            <strong id="balance-confirm-title">
              {confirmMode === "delete"
                ? "투표를 삭제할까요?"
                : "작성 중인 내용을 나갈까요?"}
            </strong>
            <p>
              {confirmMode === "delete"
                ? "피드와 내 프로필에서 사라지고, 투표 결과도 더 이상 볼 수 없어요."
                : "나가면 바뀐 내용이 저장되지 않아요."}
            </p>
          </div>
          <div>
            <button
              data-modal-initial-focus="true"
              onClick={closeConfirm}
              type="button"
            >
              {confirmMode === "delete" ? "계속 두기" : "계속 작성"}
            </button>
            <button
              disabled={status.status === "pending"}
              onClick={() =>
                confirmMode === "delete"
                  ? void deleteBalanceGame()
                  : router.push(returnTo)
              }
              type="button"
            >
              {confirmMode === "delete" ? "삭제" : "나가기"}
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </main>
  );

  function requestExit() {
    if (isDirty) {
      setConfirmMode("exit");
      return;
    }
    router.push(returnTo);
  }

  async function saveBalanceGame() {
    setAttempted(true);
    if (!canSubmit) return;
    setStatus({ status: "pending" });

    const poll = pollLocked
      ? undefined
      : {
          options: [trimmedOptionA, trimmedOptionB] as [string, string],
          question: trimmedQuestion,
        };
    const request: FeedWriteRequest = initialValue
      ? {
          action: "update_post",
          body: body.trim(),
          poll,
          postId: initialValue.postId,
          topic: {
            category,
            source: "manual",
            tags,
          },
          visibility: "public",
        }
      : {
          action: "create_post",
          body: body.trim(),
          poll,
          source: "balance_game",
          sourceId: "user_balance_game_v1",
          topic: {
            category,
            source: "manual",
            tags,
          },
          visibility: "public",
        };

    try {
      const response = await fetch("/api/feed", {
        body: JSON.stringify(request),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        feedWrite?: { id?: string; moderationStatus?: string | null };
        message?: string;
      } | null;

      if (response.status === 401) {
        const next = isEditing
          ? `/feed/balance/${initialValue?.postId}/edit`
          : "/feed/balance/new";
        router.push(`/login?next=${encodeURIComponent(next)}&reason=community`);
        return;
      }
      if (!response.ok || !payload?.feedWrite?.id) {
        setStatus({
          message:
            payload?.message ??
            `투표를 ${isEditing ? "수정" : "업로드"}하지 못했어요.`,
          status: "error",
        });
        return;
      }

      router.push(
        isEditing
          ? returnTo
          : payload.feedWrite.moderationStatus === "pending_review"
            ? "/feed?review=pending"
            : `/feed?posted=${encodeURIComponent(payload.feedWrite.id)}`,
      );
      router.refresh();
    } catch {
      setStatus({
        message: "연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
        status: "error",
      });
    }
  }

  async function deleteBalanceGame() {
    if (!initialValue) return;
    setStatus({ status: "pending" });

    try {
      const response = await fetch("/api/feed", {
        body: JSON.stringify({
          action: "delete_post",
          postId: initialValue.postId,
        } satisfies FeedWriteRequest),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        message?: string;
      } | null;

      if (!response.ok) {
        setConfirmMode(null);
        setStatus({
          message: payload?.message ?? "투표를 삭제하지 못했어요.",
          status: "error",
        });
        return;
      }

      router.push("/feed?deleted=balance");
      router.refresh();
    } catch {
      setConfirmMode(null);
      setStatus({
        message: "연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.",
        status: "error",
      });
    }
  }
}

function LockedBalancePreview({
  detailOpen,
  initialValue,
  onToggleDetail,
}: {
  detailOpen: boolean;
  initialValue: BalanceGameEditValue;
  onToggleDetail: () => void;
}) {
  const ratios = initialValue.ratios ?? [0, 0];

  return (
    <section className={styles.lockedSection}>
      <button
        aria-expanded={detailOpen}
        className={styles.lockedNotice}
        onClick={onToggleDetail}
        type="button"
      >
        <LockKeyhole aria-hidden="true" size={15} strokeWidth={1.9} />
        <span>
          {initialValue.pollStatus === "closed"
            ? `투표 마감 · ${initialValue.totalVotes.toLocaleString("ko-KR")}명 참여`
            : `${initialValue.totalVotes.toLocaleString("ko-KR")}명이 참여했어요 · 질문과 선택지는 유지돼요`}
        </span>
        <ChevronDown
          aria-hidden="true"
          data-open={detailOpen ? "true" : "false"}
          size={15}
          strokeWidth={1.8}
        />
      </button>
      {detailOpen ? (
        <p className={styles.lockDetail}>
          참여한 사람의 선택이 달라지지 않도록 질문과 선택지는 수정할 수 없어요.
        </p>
      ) : null}

      <div className={styles.lockedPoll}>
        <strong>{initialValue.question}</strong>
        {initialValue.options.map((option, index) => (
          <div className={styles.lockedOption} key={option}>
            <p>
              <span>{option}</span>
              <b>{ratios[index] ?? 0}%</b>
            </p>
            <div>
              <span style={{ width: `${ratios[index] ?? 0}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
