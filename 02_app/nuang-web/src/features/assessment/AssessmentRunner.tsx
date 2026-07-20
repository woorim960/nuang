"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AssessmentMidpointCheckpoint } from "@/features/assessment/AssessmentMidpointCheckpoint";
import { AssessmentRecoveryOverlay } from "@/features/assessment/AssessmentRecoveryOverlay";
import {
  AssessmentCompletionState,
  type AssessmentCompletionViewState,
} from "@/features/assessment/AssessmentCompletionState";
import { AssessmentLoadingState } from "@/features/assessment/AssessmentLoadingState";
import {
  AssessmentBottomSheet,
  AssessmentQuestionDock,
  AssessmentQuestionGuideButton,
  AssessmentQuestionHeader,
  AssessmentScaleResponseOptions,
  AssessmentUnsureControl,
  AssessmentUnsureSheet,
  assessmentUnsureReasons,
  useAssessmentQuestionScroll,
} from "@/features/assessment/AssessmentQuestionControls";
import {
  hasUniformCoreResponses,
  prepareAssessmentCompletion,
} from "@/features/assessment/assessment-completion";
import {
  getAdaptiveItemsForDomains,
  getAssessmentRunItems,
  getAttemptAdaptiveAxisLabels,
} from "@/features/assessment/assessment-adaptive";
import {
  halfwayCheckpointId,
  shouldShowHalfwayCheckpoint,
} from "@/features/assessment/assessment-milestone";
import {
  beginLocalAttemptCompletion,
  beginLocalAdaptiveFollowUp,
  completeLocalAttempt,
  getLatestCompletedAttempt,
  getOrCreateLocalAttempt,
  reopenLocalAttemptForReview,
  saveLocalAnswer,
  saveLocalMilestone,
  saveLocalProgress,
  startLocalAdaptiveFollowUp,
} from "@/features/assessment/assessment-storage";
import { responseOptions } from "@/features/assessment/quick-core-seed";
import type {
  AssessmentAnswer,
  AssessmentDefinition,
  AssessmentMilestoneStatus,
  AssessmentUnsureReason,
  LocalAssessmentAttempt,
  LocalPersistStatus,
} from "@/features/assessment/types";
import { coreResultCopyVersion } from "@/features/result/report-copy";
import type { ResponseValue } from "@/lib/scoring/types";
import { isCoreResultUndetermined } from "@/lib/scoring/core";
import { cn } from "@/lib/utils/cn";
import styles from "./AssessmentRunner.module.css";

type RunnerSurface = "completion" | "question" | "midpoint";
type MilestoneDestination = "midpoint" | "questions" | "home";
type QuestionDirection = "backward" | "forward";

type PendingMilestoneAction = {
  currentIndex: number;
  destination: MilestoneDestination;
  status: AssessmentMilestoneStatus;
};

const completionRevealDelayMs = 300;
const completionReadyHoldMs = 400;
const completionSlowDelayMs = 4_000;
const completionRecoveryDelayMs = 10_000;
const adaptiveResponseOptions = responseOptions.filter(
  (option) => option.value !== 3,
);

export function AssessmentRunner({
  assessment,
  returnDestination = null,
}: {
  assessment: AssessmentDefinition;
  returnDestination?: string | null;
}) {
  const router = useRouter();
  const persistedAttemptRef = useRef<LocalAssessmentAttempt | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionRequestIdRef = useRef<string | null>(null);
  const completionRunIdRef = useRef(0);
  const completionShownAtRef = useRef<number | null>(null);
  const completionTimersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const [attempt, setAttempt] = useState<LocalAssessmentAttempt | null>(null);
  const [surface, setSurface] = useState<RunnerSurface>("question");
  const [persistStatus, setPersistStatus] =
    useState<LocalPersistStatus>("idle");
  const [pendingAnswer, setPendingAnswer] = useState<AssessmentAnswer | null>(
    null,
  );
  const [pendingMilestone, setPendingMilestone] =
    useState<PendingMilestoneAction | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [isActionSaving, setIsActionSaving] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isUnsureOpen, setIsUnsureOpen] = useState(false);
  const [runnerError, setRunnerError] = useState<string | null>(null);
  const [questionDirection, setQuestionDirection] =
    useState<QuestionDirection>("forward");
  const [completionState, setCompletionState] =
    useState<AssessmentCompletionViewState>("preparing");

  useEffect(() => {
    let isMounted = true;

    async function loadAttempt() {
      try {
        const reusableQuickAttempt =
          assessment.mode === "full"
            ? await getLatestCompletedAttempt("nu-core-quick")
            : undefined;
        let nextAttempt = await getOrCreateLocalAttempt(
          assessment,
          reusableQuickAttempt,
          returnDestination,
        );
        const needsResponseReview = hasUniformCoreResponses(
          assessment,
          nextAttempt,
        );
        if (
          nextAttempt.completionStatus === "insufficient_evidence" &&
          !needsResponseReview &&
          !nextAttempt.adaptiveItemIds?.length &&
          nextAttempt.resultSnapshot?.scoreResult &&
          isCoreResultUndetermined(nextAttempt.resultSnapshot.scoreResult)
        ) {
          const adaptiveItems = getAdaptiveItemsForDomains(
            assessment,
            nextAttempt.resultSnapshot.scoreResult.domains
              .filter(
                (domain) =>
                  domain.status === "valid" &&
                  domain.score !== null &&
                  Math.round(domain.score) === 50,
              )
              .map((domain) => domain.domainId),
          );

          if (adaptiveItems.length > 0) {
            nextAttempt = await startLocalAdaptiveFollowUp(
              nextAttempt,
              adaptiveItems.map((item) => item.itemId),
            );
          }
        }
        const needsMidpoint =
          !nextAttempt.adaptiveItemIds?.length &&
          shouldShowHalfwayCheckpoint(nextAttempt, assessment);

        if (needsMidpoint && !nextAttempt.milestones?.[halfwayCheckpointId]) {
          try {
            nextAttempt = await saveLocalMilestone(
              nextAttempt,
              halfwayCheckpointId,
              "shown",
            );
          } catch {
            // The final checkpoint action persists the resolved status again.
          }
        }

        if (!isMounted) return;
        persistedAttemptRef.current = nextAttempt;
        setAttempt(nextAttempt);
        if (nextAttempt.adaptiveStatus === "intro") {
          setCompletionState("adaptive");
          setSurface("completion");
          return;
        }
        if (nextAttempt.adaptiveStatus === "in_progress") {
          setSurface("question");
          return;
        }
        if (
          nextAttempt.completionStatus === "submitting" ||
          nextAttempt.completionStatus === "insufficient_evidence"
        ) {
          completionRequestIdRef.current =
            nextAttempt.completionRequestId ?? null;
        }
        if (nextAttempt.completionStatus === "insufficient_evidence") {
          setCompletionState(
            needsResponseReview
              ? "response-review"
              : nextAttempt.resultSnapshot?.scoreResult &&
                  isCoreResultUndetermined(
                    nextAttempt.resultSnapshot.scoreResult,
                  )
                ? "undetermined"
                : "insufficient",
          );
          setSurface("completion");
        } else {
          setSurface(needsMidpoint ? "midpoint" : "question");
        }
      } catch {
        if (isMounted) {
          setRunnerError(
            "검사를 불러오지 못했어요. 잠시 후 새로고침해 주세요.",
          );
        }
      }
    }

    void loadAttempt();

    return () => {
      isMounted = false;
      if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
      completionRunIdRef.current += 1;
      clearCompletionTimers();
    };
  }, [assessment, returnDestination]);

  const runItems = useMemo(
    () =>
      attempt ? getAssessmentRunItems(assessment, attempt) : assessment.items,
    [assessment, attempt],
  );
  const currentItem = useMemo(() => {
    if (!attempt) return null;
    return runItems[attempt.currentIndex] ?? null;
  }, [attempt, runItems]);
  const adaptiveAxisLabels = useMemo(
    () => (attempt ? getAttemptAdaptiveAxisLabels(assessment, attempt) : []),
    [assessment, attempt],
  );
  useAssessmentQuestionScroll(
    surface === "question" ? (currentItem?.itemId ?? null) : null,
  );

  if (!attempt || !currentItem) {
    if (!runnerError) {
      return <AssessmentLoadingState mode={assessment.mode} />;
    }

    return (
      <main className={styles.loading}>
        <div aria-hidden="true" className={styles.loadingLine} />
        <p
          aria-live={runnerError ? "assertive" : "polite"}
          className={cn(
            styles.loadingMessage,
            runnerError && styles.inlineError,
          )}
          role={runnerError ? "alert" : "status"}
        >
          {runnerError}
        </p>
      </main>
    );
  }

  if (surface === "completion") {
    return (
      <AssessmentCompletionState
        adaptiveAxisLabels={adaptiveAxisLabels}
        adaptiveQuestionCount={runItems.length - assessment.items.length}
        isWorking={isActionSaving}
        mode={assessment.mode}
        onLeave={leaveCompletion}
        onReviewAnswers={() => void reviewInsufficientAnswers()}
        onRetry={() =>
          void startCompletion(persistedAttemptRef.current ?? attempt, true)
        }
        state={completionState}
        totalItems={
          completionState === "adaptive"
            ? assessment.items.length
            : runItems.length
        }
      />
    );
  }

  const currentAnswer = attempt.responses[currentItem.itemId];
  const isAdaptiveQuestion =
    currentItem.responseFormat === "forced_direction_4";
  const phaseStartIndex = isAdaptiveQuestion ? assessment.items.length : 0;
  const phaseItemCount = isAdaptiveQuestion
    ? runItems.length - assessment.items.length
    : assessment.items.length;
  const phaseCurrentIndex = attempt.currentIndex - phaseStartIndex;
  const isPersisting = persistStatus === "saving";
  const hasPendingAnswerHere = pendingAnswer?.itemId === currentItem.itemId;
  const hasPendingAnswerElsewhere = Boolean(
    pendingAnswer && pendingAnswer.itemId !== currentItem.itemId,
  );
  const isCurrentAnswerBlocked =
    hasPendingAnswerHere || Boolean(pendingMilestone);
  const isChoiceDisabled =
    isPersisting || isActionSaving || hasPendingAnswerElsewhere;
  const canGoNext = Boolean(currentAnswer) && !isCurrentAnswerBlocked;
  const selectedUnsureReason = currentAnswer?.unsureReason
    ? assessmentUnsureReasons.find(
        (reason) => reason.id === currentAnswer.unsureReason,
      )
    : undefined;
  const visibleRecoveryStatus =
    persistStatus === "failed" ||
    persistStatus === "saving" ||
    persistStatus === "saved"
      ? persistStatus
      : null;

  function setPersistedAttempt(nextAttempt: LocalAssessmentAttempt) {
    persistedAttemptRef.current = nextAttempt;
    setAttempt(
      pendingAnswer
        ? mergePendingAnswer(nextAttempt, pendingAnswer)
        : nextAttempt,
    );
  }

  function finishRecovery() {
    setPersistStatus("saved");
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
    recoveryTimerRef.current = setTimeout(() => {
      setShowRecovery(false);
      setPersistStatus("idle");
    }, 900);
  }

  function clearCompletionTimers() {
    completionTimersRef.current.forEach((timer) => clearTimeout(timer));
    completionTimersRef.current.clear();
  }

  function scheduleCompletionAction(action: () => void, delayMs: number) {
    const timer = setTimeout(() => {
      completionTimersRef.current.delete(timer);
      action();
    }, delayMs);
    completionTimersRef.current.add(timer);
  }

  async function startCompletion(
    sourceAttempt: LocalAssessmentAttempt,
    revealImmediately = false,
  ) {
    const runId = completionRunIdRef.current + 1;
    completionRunIdRef.current = runId;
    clearCompletionTimers();
    setRunnerError(null);
    setIsActionSaving(true);
    setCompletionState("preparing");
    completionShownAtRef.current = revealImmediately ? Date.now() : null;

    if (revealImmediately) {
      setSurface("completion");
    } else {
      scheduleCompletionAction(() => {
        if (completionRunIdRef.current !== runId) return;
        completionShownAtRef.current = Date.now();
        setSurface("completion");
        setCompletionState("preparing");
      }, completionRevealDelayMs);
    }

    scheduleCompletionAction(() => {
      if (
        completionRunIdRef.current === runId &&
        completionShownAtRef.current !== null
      ) {
        setCompletionState("slow");
      }
    }, completionSlowDelayMs);

    scheduleCompletionAction(() => {
      if (
        completionRunIdRef.current === runId &&
        completionShownAtRef.current !== null
      ) {
        setCompletionState("recovery");
        setIsActionSaving(false);
      }
    }, completionRecoveryDelayMs);

    try {
      const readiness = prepareAssessmentCompletion(assessment, sourceAttempt);

      if (readiness.needsAdaptiveFollowUp) {
        const adaptiveItems = getAdaptiveItemsForDomains(
          assessment,
          readiness.adaptiveDomainIds,
        );

        if (adaptiveItems.length === 0) {
          throw new Error("ADAPTIVE_ITEMS_UNAVAILABLE");
        }

        const adaptiveAttempt = await startLocalAdaptiveFollowUp(
          sourceAttempt,
          adaptiveItems.map((item) => item.itemId),
        );

        if (completionRunIdRef.current !== runId) return;
        clearCompletionTimers();
        completionRequestIdRef.current = null;
        persistedAttemptRef.current = adaptiveAttempt;
        setAttempt(adaptiveAttempt);
        setCompletionState("adaptive");
        setSurface("completion");
        setIsActionSaving(false);
        return;
      }

      const requestedCompletionId =
        completionRequestIdRef.current ??
        sourceAttempt.completionRequestId ??
        crypto.randomUUID();
      completionRequestIdRef.current = requestedCompletionId;

      const submittingAttempt = await beginLocalAttemptCompletion(
        sourceAttempt,
        requestedCompletionId,
        readiness.responseSnapshotHash,
      );

      if (completionRunIdRef.current !== runId) return;

      persistedAttemptRef.current = submittingAttempt;
      completionRequestIdRef.current =
        submittingAttempt.completionRequestId ?? requestedCompletionId;

      const completed = await completeLocalAttempt(submittingAttempt, {
        completionRequestId: completionRequestIdRef.current,
        evidenceStatus: readiness.evidenceStatus,
        resultCopyVersion: coreResultCopyVersion,
        resultSnapshot: {
          ...readiness.versionBundle,
          createdAt: new Date().toISOString(),
          responseSnapshotHash: readiness.responseSnapshotHash,
          resultCopyVersion: coreResultCopyVersion,
          resultStatus:
            readiness.evidenceStatus === "insufficient_evidence"
              ? "insufficient_evidence"
              : "ready",
          scoreResult: readiness.result,
        },
      });

      if (completionRunIdRef.current !== runId) return;

      clearCompletionTimers();
      persistedAttemptRef.current = completed;
      setAttempt(completed);

      if (readiness.evidenceStatus === "insufficient_evidence") {
        completionShownAtRef.current = Date.now();
        setSurface("completion");
        setCompletionState(
          readiness.needsResponseReview
            ? "response-review"
            : isCoreResultUndetermined(readiness.result)
              ? "undetermined"
              : "insufficient",
        );
        setIsActionSaving(false);
        return;
      }

      if (completionShownAtRef.current === null) {
        router.replace(`/results/local/${completed.id}`);
        return;
      }

      setCompletionState("ready");
      setIsActionSaving(false);
      scheduleCompletionAction(() => {
        if (completionRunIdRef.current === runId) {
          router.replace(`/results/local/${completed.id}`);
        }
      }, completionReadyHoldMs);
    } catch {
      if (completionRunIdRef.current !== runId) return;
      clearCompletionTimers();
      setIsActionSaving(false);

      if (sourceAttempt.localPersistStatus !== "saved") {
        setSurface("question");
        setRunnerError(
          "마지막 답을 이 기기에 보관하지 못했어요. 답을 다시 골라 주세요.",
        );
        return;
      }

      completionShownAtRef.current = Date.now();
      setSurface("completion");
      setCompletionState("failed");
    }
  }

  async function reviewInsufficientAnswers() {
    const sourceAttempt = persistedAttemptRef.current;
    if (!sourceAttempt) return;

    if (
      (completionState === "adaptive" || completionState === "undetermined") &&
      sourceAttempt.adaptiveItemIds?.length
    ) {
      completionRunIdRef.current += 1;
      clearCompletionTimers();
      completionRequestIdRef.current = null;
      setIsActionSaving(true);
      setQuestionDirection("forward");

      try {
        const nextAttempt = await beginLocalAdaptiveFollowUp(sourceAttempt);
        persistedAttemptRef.current = nextAttempt;
        setAttempt(nextAttempt);
        setSurface("question");
      } catch {
        setRunnerError(
          "추가 질문을 열지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      } finally {
        setIsActionSaving(false);
      }
      return;
    }

    if (completionState === "response-review") {
      completionRunIdRef.current += 1;
      clearCompletionTimers();
      completionRequestIdRef.current = null;
      setIsActionSaving(true);
      setQuestionDirection("backward");

      try {
        const nextAttempt = await reopenLocalAttemptForReview(sourceAttempt, 0);
        persistedAttemptRef.current = nextAttempt;
        setAttempt(nextAttempt);
        setCompletionState("preparing");
        setSurface("question");
      } catch {
        setRunnerError(
          "확인할 질문을 열지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
      } finally {
        setIsActionSaving(false);
      }
      return;
    }

    const reviewIndex = Math.max(
      0,
      assessment.items.findIndex(
        (item) => sourceAttempt.responses[item.itemId]?.isUnsure === true,
      ),
    );
    const optimisticAttempt = { ...sourceAttempt, currentIndex: reviewIndex };

    completionRunIdRef.current += 1;
    clearCompletionTimers();
    completionRequestIdRef.current = null;
    setCompletionState("preparing");
    setSurface("question");
    setQuestionDirection("backward");
    setAttempt(optimisticAttempt);
    setIsActionSaving(true);

    try {
      const nextAttempt = await saveLocalProgress(sourceAttempt, reviewIndex);
      persistedAttemptRef.current = nextAttempt;
      setAttempt(nextAttempt);
    } catch {
      setRunnerError(
        "확인할 질문을 열었어요. 새 답을 고르면 이 기기에 함께 보관돼요.",
      );
    } finally {
      setIsActionSaving(false);
    }
  }

  function leaveCompletion() {
    completionRunIdRef.current += 1;
    clearCompletionTimers();
    setIsActionSaving(false);
    router.push("/home");
  }

  async function handleAnswer(
    value?: ResponseValue,
    isUnsure = false,
    unsureReason?: AssessmentUnsureReason,
  ) {
    const currentAttempt = attempt;
    const persistedAttempt = persistedAttemptRef.current;
    if (
      !currentAttempt ||
      !persistedAttempt ||
      !currentItem ||
      hasPendingAnswerElsewhere ||
      isPersisting
    ) {
      return;
    }

    const answer: AssessmentAnswer = {
      itemId: currentItem.itemId,
      value,
      isUnsure,
      unsureReason,
      answeredAt: new Date().toISOString(),
    };
    const optimisticAttempt = mergePendingAnswer(currentAttempt, answer);

    setRunnerError(null);
    setPendingAnswer(answer);
    setAttempt(optimisticAttempt);
    setPersistStatus("saving");
    setShowRecovery(false);

    try {
      const nextAttempt = await saveLocalAnswer(
        persistedAttempt,
        answer,
        currentAttempt.currentIndex,
      );
      persistedAttemptRef.current = nextAttempt;
      setAttempt(nextAttempt);
      setPendingAnswer(null);
      setPersistStatus("idle");
    } catch {
      setPersistStatus("failed");
      setShowRecovery(true);
    }
  }

  async function retryPendingOperation() {
    const currentAttempt = attempt;
    if (!currentAttempt) return;

    if (pendingAnswer) {
      const persistedAttempt = persistedAttemptRef.current;
      if (!persistedAttempt) return;

      setPersistStatus("saving");
      setShowRecovery(true);
      try {
        const nextAttempt = await saveLocalAnswer(
          persistedAttempt,
          pendingAnswer,
          currentAttempt.currentIndex,
        );
        persistedAttemptRef.current = nextAttempt;
        setAttempt(nextAttempt);
        setPendingAnswer(null);
        finishRecovery();
      } catch {
        setPersistStatus("failed");
      }
      return;
    }

    if (pendingMilestone) {
      await persistMilestone(pendingMilestone, true);
    }
  }

  async function persistMilestone(
    action: PendingMilestoneAction,
    isRetry = false,
  ) {
    const persistedAttempt = persistedAttemptRef.current;
    if (!persistedAttempt) return;

    setIsActionSaving(true);
    setRunnerError(null);
    if (isRetry) {
      setPersistStatus("saving");
      setShowRecovery(true);
    }

    try {
      const nextAttempt = await saveLocalMilestone(
        persistedAttempt,
        halfwayCheckpointId,
        action.status,
        action.currentIndex,
      );
      persistedAttemptRef.current = nextAttempt;
      setAttempt(nextAttempt);
      setPendingMilestone(null);
      setPersistStatus("idle");
      setShowRecovery(false);

      if (action.destination === "midpoint") setSurface("midpoint");
      if (action.destination === "questions") setSurface("question");
      if (action.destination === "home") router.push("/home");
    } catch {
      setPendingMilestone(action);
      setPersistStatus("failed");
      setShowRecovery(true);
    } finally {
      setIsActionSaving(false);
    }
  }

  async function goNext() {
    const currentAttempt = attempt;
    const persistedAttempt = persistedAttemptRef.current;
    if (
      !currentAttempt ||
      !persistedAttempt ||
      !canGoNext ||
      isPersisting ||
      isActionSaving
    ) {
      return;
    }

    setRunnerError(null);

    if (
      !isAdaptiveQuestion &&
      shouldShowHalfwayCheckpoint(currentAttempt, assessment)
    ) {
      await persistMilestone({
        currentIndex: currentAttempt.currentIndex,
        destination: "midpoint",
        status: "shown",
      });
      return;
    }

    if (currentAttempt.currentIndex === runItems.length - 1) {
      void startCompletion(persistedAttempt);
      return;
    }

    setQuestionDirection("forward");
    setIsActionSaving(true);
    try {
      const nextAttempt = await saveLocalProgress(
        persistedAttempt,
        currentAttempt.currentIndex + 1,
      );
      setPersistedAttempt(nextAttempt);
    } catch {
      setRunnerError(
        "다음 문항으로 이동하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsActionSaving(false);
    }
  }

  async function goPrevious() {
    const currentAttempt = attempt;
    const persistedAttempt = persistedAttemptRef.current;
    if (
      !currentAttempt ||
      !persistedAttempt ||
      currentAttempt.currentIndex === phaseStartIndex ||
      isPersisting ||
      isActionSaving ||
      pendingMilestone
    ) {
      return;
    }

    setRunnerError(null);
    setQuestionDirection("backward");
    setIsActionSaving(true);
    try {
      const nextAttempt = await saveLocalProgress(
        persistedAttempt,
        currentAttempt.currentIndex - 1,
      );
      persistedAttemptRef.current = nextAttempt;
      setAttempt(
        pendingAnswer
          ? mergePendingAnswer(nextAttempt, pendingAnswer)
          : nextAttempt,
      );
    } catch {
      setRunnerError(
        "이전 문항으로 이동하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsActionSaving(false);
    }
  }

  async function resolveMidpoint(
    status: Extract<AssessmentMilestoneStatus, "completed" | "deferred">,
  ) {
    const currentAttempt = attempt;
    if (!currentAttempt) return;

    const nextIndex = Math.min(
      currentAttempt.currentIndex + 1,
      assessment.items.length - 1,
    );
    setQuestionDirection("forward");
    await persistMilestone({
      currentIndex: nextIndex,
      destination: status === "deferred" ? "home" : "questions",
      status,
    });
  }

  function leaveAssessment() {
    setIsExitOpen(false);
    router.push("/home");
  }

  const isMidpoint = surface === "midpoint";

  return (
    <main className={styles.runner}>
      <AssessmentQuestionHeader
        closeLabel="검사 닫기"
        countLabel={
          isAdaptiveQuestion
            ? `추가 질문 ${phaseItemCount}개 중 ${phaseCurrentIndex + 1}번째`
            : `전체 ${assessment.items.length}개 중 ${attempt.currentIndex + 1}번째 문항`
        }
        current={phaseCurrentIndex + 1}
        onClose={() => setIsExitOpen(true)}
        progressLabel="검사 진행률"
        title={isAdaptiveQuestion ? "코드 추가 확인" : assessment.title}
        total={phaseItemCount}
      />

      {isMidpoint ? (
        <AssessmentMidpointCheckpoint
          isSaving={isActionSaving || isPersisting}
          onContinue={() => void resolveMidpoint("completed")}
          onDefer={() => void resolveMidpoint("deferred")}
        />
      ) : (
        <>
          <section className={styles.mainContent}>
            <AssessmentQuestionGuideButton onClick={() => setIsHelpOpen(true)}>
              {isAdaptiveQuestion
                ? "비슷하게 나온 코드만 다시 확인해요"
                : "답하는 기준 · 최근 6개월의 평소 모습"}
            </AssessmentQuestionGuideButton>

            <div
              aria-atomic="true"
              aria-live="polite"
              className={cn(
                styles.questionRegion,
                questionDirection === "backward"
                  ? styles.questionBackward
                  : styles.questionForward,
              )}
              key={currentItem.itemId}
            >
              {currentItem.contextLabel ? (
                <p className={styles.context}>{currentItem.contextLabel}</p>
              ) : null}
              <h1
                className={cn(
                  styles.question,
                  !currentItem.contextLabel && styles.questionWithoutContext,
                )}
              >
                {currentItem.text}
              </h1>
            </div>

            <AssessmentScaleResponseOptions
              disabled={isChoiceDisabled}
              guide={
                isAdaptiveQuestion
                  ? "두 방향 중 조금이라도 더 가까운 쪽을 선택해 주세요."
                  : "최근 6개월의 평소 모습을 떠올리며, 비슷한 상황에서 이 모습이 얼마나 자주 나타나는지 하나 선택해 주세요."
              }
              legend={
                isAdaptiveQuestion
                  ? "반반보다 조금이라도 더 가까운 쪽은?"
                  : "이럴 때 내 모습은?"
              }
              name={`response-${currentItem.itemId}`}
              onChange={(value) => void handleAnswer(value)}
              options={
                isAdaptiveQuestion ? adaptiveResponseOptions : responseOptions
              }
              selectedValue={
                currentAnswer?.isUnsure ? undefined : currentAnswer?.value
              }
            />

            {isAdaptiveQuestion ? (
              <p className={styles.inlineNotice}>
                앞선 답이 같게 나온 자리만 확인하는 질문이에요. 정답은 없으며,
                두 방향 중 평소 내 모습에 조금이라도 더 가까운 쪽을 골라주세요.
              </p>
            ) : (
              <AssessmentUnsureControl
                disabled={isChoiceDisabled}
                onOpen={() => setIsUnsureOpen(true)}
                selectedReason={selectedUnsureReason?.id}
              />
            )}

            {hasPendingAnswerElsewhere ? (
              <p className={styles.inlineNotice}>
                보관되지 않은 답이 있는 문항으로 돌아가 다시 시도해 주세요.
              </p>
            ) : null}
            {runnerError ? (
              <p className={styles.inlineError} role="alert">
                {runnerError}
              </p>
            ) : null}
          </section>

          <AssessmentQuestionDock
            nextDisabled={!canGoNext || isPersisting || isActionSaving}
            nextLabel={
              attempt.currentIndex === runItems.length - 1
                ? "결과 보기"
                : "다음"
            }
            onNext={() => void goNext()}
            onPrevious={() => void goPrevious()}
            previousDisabled={
              attempt.currentIndex === phaseStartIndex ||
              isPersisting ||
              isActionSaving ||
              Boolean(pendingMilestone)
            }
          />
        </>
      )}

      {showRecovery && visibleRecoveryStatus ? (
        <AssessmentRecoveryOverlay
          aboveTallDock={isMidpoint}
          kind={pendingMilestone ? "progress" : "answer"}
          onRetry={() => void retryPendingOperation()}
          status={visibleRecoveryStatus}
        />
      ) : null}

      {isHelpOpen ? (
        <AssessmentBottomSheet
          copy="특별했던 한 번보다 최근 6개월의 평소 모습을 떠올리며, 비슷한 상황에서 문장 속 모습이 얼마나 자주 나타나는지 답해 주세요."
          onClose={() => setIsHelpOpen(false)}
          title="어떤 모습을 떠올리면 될까요?"
        >
          <p className={styles.sheetNote}>
            비슷한 경험이 거의 없다면 ‘이 상황은 답하기 어려워요’를 선택해도
            괜찮아요.
          </p>
          <div className={styles.sheetActions}>
            <button
              className={styles.sheetAction}
              onClick={() => setIsHelpOpen(false)}
              type="button"
            >
              이해했어요
            </button>
          </div>
        </AssessmentBottomSheet>
      ) : null}

      {isUnsureOpen ? (
        <AssessmentUnsureSheet
          onClose={() => setIsUnsureOpen(false)}
          onSelect={(reason) => {
            setIsUnsureOpen(false);
            void handleAnswer(undefined, true, reason);
          }}
          selectedReason={currentAnswer?.unsureReason}
        />
      ) : null}

      {isExitOpen ? (
        <AssessmentBottomSheet
          copy={
            pendingAnswer
              ? "지금 나가면 현재 화면에서 고른 답만 사라져요. 이전까지 보관된 답은 홈에서 다시 이어볼 수 있어요."
              : "지금까지 답한 내용은 그대로 두고 나중에 이어할 수 있어요."
          }
          onClose={() => setIsExitOpen(false)}
          title={
            pendingAnswer
              ? "보관하지 못한 답이 있어요"
              : "검사를 잠시 멈출까요?"
          }
        >
          {pendingAnswer ? (
            <div className={styles.sheetActions}>
              <button
                className={styles.sheetAction}
                onClick={() => {
                  setIsExitOpen(false);
                  void retryPendingOperation();
                }}
                type="button"
              >
                다시 보관하기
              </button>
              <button
                className={cn(styles.sheetAction, styles.sheetActionSecondary)}
                onClick={leaveAssessment}
                type="button"
              >
                이 답은 남기지 않고 나가기
              </button>
            </div>
          ) : (
            <div className={styles.sheetActions}>
              <button
                className={styles.sheetAction}
                onClick={() => setIsExitOpen(false)}
                type="button"
              >
                계속 검사하기
              </button>
              <button
                className={cn(styles.sheetAction, styles.sheetActionSecondary)}
                onClick={leaveAssessment}
                type="button"
              >
                홈에서 이어하기
              </button>
            </div>
          )}
        </AssessmentBottomSheet>
      ) : null}
    </main>
  );
}

function mergePendingAnswer(
  attempt: LocalAssessmentAttempt,
  pendingAnswer: AssessmentAnswer,
) {
  return {
    ...attempt,
    responses: {
      ...attempt.responses,
      [pendingAnswer.itemId]: pendingAnswer,
    },
  };
}
