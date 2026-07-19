"use client";

import { PenLine, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
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
    label: "글",
    mode: "free_text",
  },
  {
    label: "오늘의 질문",
    mode: "daily_question",
  },
  {
    label: "밸런스 게임",
    mode: "balance_game",
  },
];
const pendingPostStorageKey = "nuang:feed:pending-post";

export function FeedComposer() {
  const router = useRouter();
  const launchButtonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [mode, setMode] = useState<ComposerMode>("free_text");
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (
      searchParams.get("auth") !== "connected" ||
      searchParams.get("resumeFeed") !== "post"
    ) {
      return;
    }

    const pendingPost = readPendingPost();
    clearPostResumeParams();

    if (!pendingPost) return;

    const restoreTimer = window.setTimeout(() => {
      setBody(pendingPost.body);
      setMode(pendingPost.mode);
      setSelectedPollOptionKey(pendingPost.selectedPollOptionKey);
      setOpen(true);
      setStatus({
        message: "로그인됐어요. 내용을 확인하고 게시해 주세요.",
        status: "notice",
      });
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.setTimeout(() => launchButtonRef.current?.focus(), 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

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
        window.sessionStorage.setItem(
          pendingPostStorageKey,
          JSON.stringify({
            body,
            mode,
            selectedPollOptionKey,
          }),
        );
        setStatus({
          message: "로그인 후 게시할 수 있어요.",
          status: "notice",
        });
        router.push(
          `/login?next=${encodeURIComponent("/feed?resumeFeed=post")}&reason=community`,
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
          message: payload?.message ?? "게시 상태를 확인하지 못했어요.",
          status: "error",
        });
        return;
      }

      setBody("");
      setSelectedPollOptionKey(null);
      window.sessionStorage.removeItem(pendingPostStorageKey);
      setOpen(false);
      router.refresh();
      setStatus({
        message: "글을 올렸어요. 확인이 끝나면 다른 사람에게도 보여요.",
        status: "notice",
      });
      window.setTimeout(() => launchButtonRef.current?.focus(), 0);
    } catch {
      setStatus({
        message: "네트워크 연결 때문에 게시 상태를 확인하지 못했어요.",
        status: "error",
      });
    }
  }

  function closeComposer() {
    setOpen(false);
    setStatus({ status: "idle" });
    window.setTimeout(() => launchButtonRef.current?.focus(), 0);
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeComposer();
    }
  }

  return (
    <section className={styles.composer} id="feed-composer">
      <button
        aria-haspopup="dialog"
        className={styles.launchButton}
        onClick={() => {
          setOpen(true);
          setStatus({ status: "idle" });
        }}
        ref={launchButtonRef}
        type="button"
      >
        <span aria-hidden="true" className={styles.launchAvatar}>
          나
        </span>
        <span>지금 떠오른 생각을 나눠보세요</span>
        <PenLine aria-hidden="true" size={18} strokeWidth={1.9} />
      </button>

      {!open ? <ComposerStatusMessage status={status} /> : null}

      {open ? (
        <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
          <section
            aria-labelledby="feed-composer-title"
            aria-modal="true"
            className={styles.sheet}
            role="dialog"
          >
            <header className={styles.sheetHeader}>
              <button
                aria-label="글쓰기 닫기"
                className={styles.closeButton}
                onClick={closeComposer}
                type="button"
              >
                <X aria-hidden="true" size={22} strokeWidth={1.9} />
              </button>
              <h2 id="feed-composer-title">글쓰기</h2>
              <button
                className={styles.publishButton}
                disabled={!canSubmit}
                form="feed-composer-form"
                type="submit"
              >
                {status.status === "pending" ? "게시 중" : "게시"}
              </button>
            </header>

            <form id="feed-composer-form" onSubmit={handleSubmit}>
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
                ref={textareaRef}
                rows={6}
                value={body}
              />

              <div className={styles.publicNote}>
                <strong>피드에 공개되는 글이에요</strong>
                <p>
                  검사 답변이나 점수처럼 민감한 내용은 적지 않는 것을 권해요.
                </p>
              </div>
              <ComposerStatusMessage status={status} />
            </form>
          </section>
        </div>
      ) : null}
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
        <small>오늘의 밸런스 게임</small>
        <p>{balanceGame.question}</p>
        <div>
          {balanceGame.options.map((option) => (
            <button
              aria-pressed={selectedPollOptionKey === option.key}
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
  if (mode === "daily_question") return "이 질문에 대한 내 생각을 적어보세요.";
  if (mode === "balance_game") return "선택한 이유를 덧붙여도 좋아요.";
  return "무슨 생각을 나누고 싶나요?";
}

function ComposerStatusMessage({ status }: { status: ComposerStatus }) {
  if (status.status === "idle") return null;

  return (
    <p
      aria-live="polite"
      className={cn(
        styles.status,
        status.status === "error" && styles.statusError,
      )}
      role={status.status === "error" ? "alert" : "status"}
    >
      {status.status === "pending" ? "게시하는 중이에요" : status.message}
    </p>
  );
}

function readPendingPost() {
  const value = window.sessionStorage.getItem(pendingPostStorageKey);

  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as {
      body?: unknown;
      mode?: unknown;
      selectedPollOptionKey?: unknown;
    };
    const mode = composerModes.some((item) => item.mode === parsed.mode)
      ? (parsed.mode as ComposerMode)
      : "free_text";

    return {
      body: typeof parsed.body === "string" ? parsed.body.slice(0, 800) : "",
      mode,
      selectedPollOptionKey:
        typeof parsed.selectedPollOptionKey === "string"
          ? parsed.selectedPollOptionKey
          : null,
    };
  } catch {
    window.sessionStorage.removeItem(pendingPostStorageKey);
    return null;
  }
}

function clearPostResumeParams() {
  const url = new URL(window.location.href);
  ["auth", "resumeFeed"].forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}
