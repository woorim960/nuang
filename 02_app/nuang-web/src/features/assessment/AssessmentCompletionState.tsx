import Image from "next/image";
import type { AssessmentMode } from "@/features/assessment/types";
import styles from "@/features/assessment/AssessmentCompletionState.module.css";

export type AssessmentCompletionViewState =
  | "adaptive"
  | "failed"
  | "insufficient"
  | "preparing"
  | "ready"
  | "recovery"
  | "response-review"
  | "slow"
  | "undetermined";

type AssessmentCompletionStateProps = {
  actionError?: string | null;
  adaptiveAxisLabels?: string[];
  adaptiveQuestionCount?: number;
  isWorking: boolean;
  mode: AssessmentMode;
  onLeave: () => void;
  onReviewAnswers: () => void;
  onRetry: () => void;
  state: AssessmentCompletionViewState;
  totalItems: number;
};

export function AssessmentCompletionState({
  actionError,
  adaptiveAxisLabels = [],
  adaptiveQuestionCount = 0,
  isWorking,
  mode,
  onLeave,
  onReviewAnswers,
  onRetry,
  state,
  totalItems,
}: AssessmentCompletionStateProps) {
  const copy = getCompletionCopy(
    mode,
    state,
    adaptiveAxisLabels,
    adaptiveQuestionCount,
  );
  const isFailure = state === "failed";
  const needsAction =
    state === "failed" ||
    state === "adaptive" ||
    state === "insufficient" ||
    state === "recovery" ||
    state === "response-review" ||
    state === "undetermined";
  const isLoading =
    state === "preparing" || state === "ready" || state === "slow";
  const showRetry = state === "failed" || state === "recovery";
  const showReview =
    state === "adaptive" ||
    state === "insufficient" ||
    state === "response-review" ||
    state === "undetermined";
  const showLeave =
    showRetry ||
    state === "adaptive" ||
    state === "response-review" ||
    state === "undetermined";
  const liveMessage =
    state === "ready"
      ? "결과가 준비됐어요"
      : state === "slow"
        ? "결과 준비를 이어가고 있어요"
        : "결과를 준비하고 있어요";

  return (
    <main
      aria-busy={isLoading}
      className={`${styles.root} ${needsAction ? styles.settled : ""}`}
    >
      <header className={styles.header}>
        <span aria-hidden="true" />
        <p>{mode === "quick" ? "빠른 코어" : "정밀 코어"}</p>
        <span className={styles.count}>
          {totalItems} / {totalItems}
        </span>
      </header>

      <div
        aria-label="검사 진행률"
        aria-valuemax={totalItems}
        aria-valuemin={0}
        aria-valuenow={totalItems}
        className={styles.progressTrack}
        role="progressbar"
      >
        <span className={styles.progressValue} />
      </div>

      <section className={styles.content}>
        <div aria-hidden="true" className={styles.visual}>
          <span className={styles.glow} />
          <span className={`${styles.signal} ${styles.signalOne}`} />
          <span className={`${styles.signal} ${styles.signalTwo}`} />
          <span className={`${styles.signal} ${styles.signalThree}`} />
          <span className={`${styles.signal} ${styles.signalFour}`} />
          <span className={`${styles.signal} ${styles.signalFive}`} />
          <span className={styles.mascotShadow} />
          <Image
            alt=""
            className={styles.mascot}
            height={512}
            priority
            src="/assets/assessment/nuang-loading-mascot-v2.png"
            width={512}
          />
        </div>

        <div
          aria-atomic={needsAction ? "true" : undefined}
          aria-live={needsAction && !isFailure ? "polite" : undefined}
          className={styles.copy}
          role={isFailure ? "alert" : needsAction ? "status" : undefined}
        >
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
        </div>
      </section>

      <footer className={styles.actionSlot}>
        {isLoading ? (
          <p aria-live="polite" className={styles.liveStatus} role="status">
            <span aria-hidden="true" className={styles.liveDot} />
            {liveMessage}
          </p>
        ) : null}
        {showRetry ? (
          <button
            aria-busy={isWorking}
            disabled={isWorking}
            onClick={onRetry}
            type="button"
          >
            {state === "recovery" ? "다시 확인" : "다시 시도"}
          </button>
        ) : null}
        {showReview ? (
          <button
            aria-busy={isWorking}
            disabled={isWorking}
            onClick={onReviewAnswers}
            type="button"
          >
            {state === "adaptive" || state === "undetermined"
              ? "추가 질문 이어가기"
              : state === "response-review"
                ? "답 다시 살펴보기"
                : "답 다시 확인하기"}
          </button>
        ) : null}
        {showLeave ? (
          <button
            className={styles.secondaryAction}
            onClick={onLeave}
            type="button"
          >
            {state === "adaptive" ||
            state === "response-review" ||
            state === "undetermined"
              ? "나중에 이어하기"
              : "나중에 확인하기"}
          </button>
        ) : null}
        {actionError ? (
          <p aria-live="assertive" className={styles.statusNote} role="alert">
            {actionError}
          </p>
        ) : null}
      </footer>
    </main>
  );
}

function getCompletionCopy(
  mode: AssessmentMode,
  state: AssessmentCompletionViewState,
  adaptiveAxisLabels: string[],
  adaptiveQuestionCount: number,
) {
  if (state === "adaptive") {
    const pairCopy = adaptiveAxisLabels.join(" · ");
    return {
      title:
        adaptiveAxisLabels.length === 1
          ? `${pairCopy} 자리만 조금 더 확인할게요`
          : adaptiveAxisLabels.length > 1
            ? `비슷하게 나온 ${adaptiveAxisLabels.length}개 자리만 더 확인할게요`
            : "비슷하게 나온 코드만 조금 더 확인할게요",
      body: (
        <>
          {pairCopy
            ? `${pairCopy} 자리의 답이 비슷하게 나왔어요.`
            : "답이 비슷하게 나온 자리만 확인해요."}
          <br />
          나머지 답은 그대로 두고, 짧은 질문{" "}
          {adaptiveQuestionCount > 0 ? `${adaptiveQuestionCount}개` : "몇 개"}만
          더 이어갈게요.
        </>
      ),
    };
  }

  if (state === "failed") {
    return {
      title: "결과를 준비하지 못했어요",
      body: (
        <>
          답한 내용은 이 기기에 보관됐어요.
          <br />
          다시 시도하면 결과 준비를 이어갈 수 있어요.
        </>
      ),
    };
  }

  if (state === "insufficient") {
    return {
      title: "성향을 보여주려면 답이 조금 더 필요해요",
      body: (
        <>
          판단하기 어렵다고 답한 질문을
          <br />
          조금만 다시 확인해 주세요.
        </>
      ),
    };
  }

  if (state === "response-review") {
    return {
      title: "답을 한 번만 더 살펴봐 주세요",
      body: (
        <>
          서로 다른 방향을 묻는 질문에도 같은 답이 반복됐어요.
          <br />
          평소 모습과 가장 가까운 답인지 확인하면 결과를 더 정확히 정리할 수
          있어요.
        </>
      ),
    };
  }

  if (state === "undetermined") {
    return {
      title: "비슷하게 나온 코드만 조금 더 확인할게요",
      body: (
        <>
          답한 내용은 잘 확인했어요.
          <br />
          해당 자리의 짧은 질문을 더 답하면 결과를 보여드릴게요.
        </>
      ),
    };
  }

  if (state === "recovery") {
    return {
      title: "결과 준비가 예상보다 오래 걸리고 있어요",
      body: (
        <>
          답한 내용은 이 기기에 보관됐어요.
          <br />
          결과 준비 상태를 다시 확인할 수 있어요.
        </>
      ),
    };
  }

  if (state === "slow") {
    return {
      title: "결과 준비가 조금 더 걸리고 있어요",
      body: (
        <>
          답한 내용은 이 기기에 보관됐어요.
          <br />
          결과 준비를 이어가고 있어요.
        </>
      ),
    };
  }

  return mode === "quick"
    ? {
        title: "첫 성향 결과를 준비하고 있어요",
        body: (
          <>
            지금까지 답한 내용을 바탕으로
            <br />
            지금의 나와 가장 가까운 성향을 정리하고 있어요.
          </>
        ),
      }
    : {
        title: "성향 결과를 준비하고 있어요",
        body: (
          <>
            여러 상황에서 답한 내용을 모아
            <br />
            성향 결과를 자세히 정리하고 있어요.
          </>
        ),
      };
}
