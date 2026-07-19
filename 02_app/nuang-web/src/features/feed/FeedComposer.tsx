"use client";

import { PenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { FeedWriteRequest } from "@/features/feed/feed-contract";
import {
  getDefaultBalanceGameTemplate,
  getDefaultDailyQuestionTemplate,
} from "@/features/feed/feed-prompts";
import type { ApiClosedPayload } from "@/lib/api/closed-state-data";
import { cn } from "@/lib/utils/cn";
import styles from "./FeedComposer.module.css";

type ComposerStatus =
  | { status: "idle" }
  | { status: "pending" }
  | { message: string; status: "notice" }
  | { message: string; status: "error" };

type FeedComposerResponse =
  | ApiClosedPayload
  | {
      error?: string;
      message?: string;
      ok?: boolean;
    };

type ComposerMode = "balance_game" | "daily_question" | "free_text";

const composerModes: Array<{
  label: string;
  mode: ComposerMode;
}> = [
  {
    label: "내 생각",
    mode: "free_text",
  },
  {
    label: "오늘의 질문",
    mode: "daily_question",
  },
  {
    label: "둘 중 하나",
    mode: "balance_game",
  },
];

export function FeedComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<ComposerMode>("free_text");
  const [selectedPollOptionKey, setSelectedPollOptionKey] = useState<
    string | null
  >(null);
  const [status, setStatus] = useState<ComposerStatus>({ status: "idle" });
  const dailyQuestion = getDefaultDailyQuestionTemplate();
  const balanceGame = getDefaultBalanceGameTemplate();
  const selectedPollOption = balanceGame.options.find(
    (option) => option.key === selectedPollOptionKey,
  );
  const trimmedBody = body.trim();
  const canSubmit =
    status.status !== "pending" &&
    (mode === "balance_game"
      ? Boolean(selectedPollOption)
      : trimmedBody.length >= 2);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      setStatus({
        message:
          mode === "balance_game"
            ? "먼저 하나를 골라주세요."
            : "짧은 문장으로 먼저 남겨주세요.",
        status: "error",
      });
      return;
    }

    setStatus({ status: "pending" });

    try {
      const requestBody = buildCreatePostRequest({
        balanceGame,
        body: trimmedBody,
        dailyQuestion,
        mode,
        selectedPollOptionKey,
        selectedPollOptionLabel: selectedPollOption?.label ?? null,
      });
      const response = await fetch("/api/feed", {
        body: JSON.stringify(requestBody),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response
        .json()
        .catch(() => null)) as FeedComposerResponse | null;

      if (response.status === 401) {
        setStatus({
          message: "로그인 후 게시할 수 있어요.",
          status: "notice",
        });
        router.push(`/login?next=${encodeURIComponent("/feed")}`);
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
          message: payload?.message ?? "게시 상태를 확인하지 못했어요.",
          status: "error",
        });
        return;
      }

      setBody("");
      setSelectedPollOptionKey(null);
      router.refresh();
      setStatus({
        message: "게시 요청이 접수됐어요.",
        status: "notice",
      });
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 게시 상태를 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  return (
    <section className={styles.composer}>
      <div className={styles.composerHeading}>
        <span aria-hidden="true">
          <PenLine size={18} strokeWidth={1.9} />
        </span>
        <div>
          <h2>내 이야기 남기기</h2>
          <p>부담 없이 짧게 시작해도 좋아요.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <div
          aria-label="피드 작성 형식"
          className={styles.modeTabs}
          role="tablist"
        >
          {composerModes.map((item) => (
            <button
              aria-selected={mode === item.mode}
              className={cn(
                styles.modeTab,
                mode === item.mode && styles.modeTabSelected,
              )}
              key={item.mode}
              onClick={() => {
                setMode(item.mode);
                if (item.mode !== "balance_game") {
                  setSelectedPollOptionKey(null);
                }
                setStatus({ status: "idle" });
              }}
              role="tab"
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <ComposerModePanel
          balanceGame={balanceGame}
          dailyQuestion={dailyQuestion}
          mode={mode}
          selectedPollOptionKey={selectedPollOptionKey}
          setSelectedPollOptionKey={setSelectedPollOptionKey}
        />
        <label className="sr-only" htmlFor="feed-composer-body">
          글 내용
        </label>
        <textarea
          className={styles.bodyInput}
          id="feed-composer-body"
          maxLength={800}
          onChange={(event) => setBody(event.target.value)}
          placeholder={getPlaceholder(mode)}
          rows={mode === "balance_game" ? 1 : 2}
          value={body}
        />
        <div className={styles.composerFooter}>
          <p>{getHelperText(mode)}</p>
          <button disabled={!canSubmit} type="submit">
            게시하기
          </button>
        </div>
        <ComposerStatusMessage status={status} />
      </form>
    </section>
  );
}

function ComposerModePanel({
  balanceGame,
  dailyQuestion,
  mode,
  selectedPollOptionKey,
  setSelectedPollOptionKey,
}: {
  balanceGame: ReturnType<typeof getDefaultBalanceGameTemplate>;
  dailyQuestion: ReturnType<typeof getDefaultDailyQuestionTemplate>;
  mode: ComposerMode;
  selectedPollOptionKey: string | null;
  setSelectedPollOptionKey: (value: string) => void;
}) {
  if (mode === "daily_question") {
    return <p className={styles.promptCard}>{dailyQuestion.prompt}</p>;
  }

  if (mode === "balance_game") {
    return (
      <div className={styles.balancePanel}>
        <p>{balanceGame.question}</p>
        <div>
          {balanceGame.options.map((option) => (
            <button
              className={cn(
                styles.balanceOption,
                selectedPollOptionKey === option.key &&
                  styles.balanceOptionSelected,
              )}
              key={option.key}
              onClick={() => setSelectedPollOptionKey(option.key)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function buildCreatePostRequest({
  balanceGame,
  body,
  dailyQuestion,
  mode,
  selectedPollOptionKey,
  selectedPollOptionLabel,
}: {
  balanceGame: ReturnType<typeof getDefaultBalanceGameTemplate>;
  body: string;
  dailyQuestion: ReturnType<typeof getDefaultDailyQuestionTemplate>;
  mode: ComposerMode;
  selectedPollOptionKey: string | null;
  selectedPollOptionLabel: string | null;
}): FeedWriteRequest {
  if (mode === "daily_question") {
    return {
      action: "create_post",
      body,
      source: "daily_question",
      sourceId: dailyQuestion.id,
      visibility: "public",
    };
  }

  if (mode === "balance_game") {
    return {
      action: "create_post",
      body: body || `${selectedPollOptionLabel ?? "하나"} 쪽이 더 끌려요.`,
      pollOptionKey: selectedPollOptionKey ?? undefined,
      source: "balance_game",
      sourceId: balanceGame.id,
      visibility: "public",
    };
  }

  return {
    action: "create_post",
    body,
    source: "free_text",
    visibility: "public",
  };
}

function getPlaceholder(mode: ComposerMode) {
  if (mode === "daily_question") {
    return "질문에 대한 내 생각을 적어보세요.";
  }

  if (mode === "balance_game") {
    return "선택한 이유를 짧게 덧붙일 수 있어요.";
  }

  return "오늘의 생각을 공유해보세요.";
}

function getHelperText(mode: ComposerMode) {
  if (mode === "daily_question") {
    return "질문은 가볍게 바뀔 수 있어요.";
  }

  if (mode === "balance_game") {
    return "투표 후 결과를 볼 수 있어요.";
  }

  return "뉴앙 코드를 몰라도 편하게 남길 수 있어요.";
}

function ComposerStatusMessage({ status }: { status: ComposerStatus }) {
  if (status.status === "idle") return null;

  if (status.status === "pending") {
    return (
      <p aria-live="polite" className={styles.status} role="status">
        게시 중
      </p>
    );
  }

  return (
    <p
      className={cn(
        styles.status,
        status.status === "error" && styles.statusError,
      )}
      role={status.status === "error" ? "alert" : "status"}
    >
      {status.message}
    </p>
  );
}
