"use client";

import { ArrowRight, CircleCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readClientAccountResults } from "@/features/account/client-account-results";
import { AssessmentRestartSheet } from "@/features/assessment/AssessmentRestartSheet";
import { synchronizeAccountAssessmentAttempts } from "@/features/assessment/assessment-account-sync";
import {
  createFreshLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import { buildPrecisionIntroHref } from "@/features/assessment/precision-entry";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  collectValidatedCoreResultCandidates,
  selectLatestCompletedCoreReport,
  selectRepresentativeCoreResult,
} from "@/features/result/unified-core-report";
import {
  buildAccountCoreResultHref,
  buildLocalCoreResultHref,
} from "@/features/result/unified-core-report/core-result-route-contract";
import styles from "./AssessmentHomeCoreSection.module.css";

export type CoreJourneyState = {
  answeredCount?: number;
  cta: string;
  description: string;
  eyebrow: string;
  href: string;
  progress?: number;
  resumeOrdinal?: number;
  resumeSurface?: CoreResumeSurface;
  secondaryAction?: CoreJourneySecondaryAction;
  title: string;
  totalCount?: number;
};

export type CoreResumeSurface =
  | "adaptive_intro"
  | "adaptive_question"
  | "completion_pending"
  | "midpoint"
  | "question";

type CoreAssessmentKind = "full" | "quick";

type CoreJourneySecondaryAction = {
  assessmentKind: CoreAssessmentKind;
  hasActiveAttempt: boolean;
  label: string;
  type: "restart";
};

type RestartIntent = CoreJourneySecondaryAction & {
  resumeHref: string;
  resumeLabel: string;
};

export function AssessmentHomeCoreSection() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [accountResults, setAccountResults] = useState<AccountResultSummary[]>(
    [],
  );
  const [loaded, setLoaded] = useState(false);
  const [readError, setReadError] = useState(false);
  const [restartIntent, setRestartIntent] = useState<RestartIntent | null>(
    null,
  );
  const [restartError, setRestartError] = useState<string | null>(null);
  const [restartPending, setRestartPending] = useState(false);
  const [restoredFromAnotherDevice, setRestoredFromAnotherDevice] =
    useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadJourney() {
      let restoredCount = 0;

      try {
        const syncResult = await synchronizeAccountAssessmentAttempts();
        if (syncResult.status === "synced") {
          restoredCount = syncResult.restoredCount;
        }
      } catch {
        // Account sync must not hide a journey already kept on this device.
      }

      const [localRead, accountRead] = await Promise.all([
        listLocalAttempts()
          .then((nextAttempts) => ({ nextAttempts, state: "ready" as const }))
          .catch(() => ({ nextAttempts: [], state: "error" as const })),
        readClientAccountResults(),
      ]);

      return { accountRead, localRead, restoredCount };
    }

    void loadJourney()
      .then(({ accountRead, localRead, restoredCount }) => {
        if (!isMounted) return;
        setAttempts(localRead.nextAttempts);
        setAccountResults(accountRead.results);
        setRestoredFromAnotherDevice(restoredCount > 0);
        setReadError(
          localRead.state === "error" || accountRead.state === "error",
        );
      })
      .catch(() => {
        if (!isMounted) return;
        setAttempts([]);
        setAccountResults([]);
        setReadError(true);
      })
      .finally(() => {
        if (isMounted) setLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const journey = useMemo(
    () =>
      readError
        ? {
            cta: "내 결과 확인하기",
            description:
              "저장된 결과 일부를 불러오지 못했어요. 결과 화면에서 다시 확인해 주세요.",
            eyebrow: "결과 확인 필요",
            href: "/my/reports",
            title: "내 결과를 다시 확인해 주세요",
          }
        : buildCoreJourneyState(attempts, accountResults),
    [accountResults, attempts, readError],
  );

  async function restartAssessment(intent: RestartIntent) {
    if (restartPending) return;

    setRestartPending(true);
    setRestartError(null);

    try {
      const assessment =
        intent.assessmentKind === "full"
          ? candidateFullCoreAssessment
          : candidateQuickCoreAssessment;
      await createFreshLocalAttempt(assessment, "/home");
      setRestartIntent(null);
      router.push(getAssessmentHref(intent.assessmentKind));
    } catch {
      setRestartError(
        "새 검사를 준비하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setRestartPending(false);
    }
  }

  if (!loaded) {
    return (
      <div aria-label="내 기본 코드 상태 확인 중" className={styles.skeleton}>
        <span />
        <span />
        <span />
      </div>
    );
  }

  const secondaryAction = journey.secondaryAction;

  return (
    <div
      className={styles.journey}
      data-has-secondary-action={Boolean(secondaryAction)}
    >
      <div className={styles.heroRow}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{journey.eyebrow}</p>
          <h2>{journey.title}</h2>
          <p className={styles.description}>{journey.description}</p>
        </div>

        <div
          aria-hidden="true"
          className={styles.characterStage}
          data-illustration-slot="core-assessment-hero"
        >
          <span className={styles.characterHalo} />
          <span className={styles.orbit} />
          <Image
            alt=""
            className={styles.characterIllustration}
            draggable={false}
            height={960}
            priority
            src="/assets/assessment/nuang-home-assessment-mascot-v1.webp"
            width={640}
          />
        </div>
      </div>

      {restoredFromAnotherDevice ? (
        <p aria-live="polite" className={styles.restoreNotice} role="status">
          <CircleCheck aria-hidden="true" size={16} strokeWidth={1.9} />
          다른 기기에서 답하던 내용까지 불러왔어요
        </p>
      ) : null}

      {journey.progress !== undefined ? (
        <div className={styles.progressBlock}>
          <div className={styles.progressMeta}>
            <span>{getProgressLabel(journey)}</span>
            <strong>{journey.progress}%</strong>
          </div>
          <div
            aria-label="검사 진행률"
            aria-valuemax={journey.totalCount ?? 100}
            aria-valuemin={0}
            aria-valuenow={journey.answeredCount ?? journey.progress}
            aria-valuetext={getProgressAriaText(journey)}
            className={styles.progressTrack}
            role="progressbar"
          >
            <span style={{ width: `${journey.progress}%` }} />
          </div>
        </div>
      ) : null}

      <div
        aria-label="성향 검사 바로가기"
        className={styles.actions}
        data-split={Boolean(secondaryAction)}
        role="group"
      >
        <Link className={styles.primaryAction} href={journey.href}>
          <span>{journey.cta}</span>
          <span className={styles.actionIcon}>
            <ArrowRight aria-hidden="true" size={17} strokeWidth={1.9} />
          </span>
        </Link>

        {secondaryAction ? (
          <button
            className={styles.secondaryAction}
            onClick={() => {
              setRestartError(null);
              setRestartIntent({
                ...secondaryAction,
                resumeHref: journey.href,
                resumeLabel: journey.cta,
              });
            }}
            type="button"
          >
            {secondaryAction.label}
          </button>
        ) : null}
      </div>

      {restartError ? (
        <p className={styles.restartError} role="alert">
          {restartError}
        </p>
      ) : null}

      {restartIntent ? (
        <AssessmentRestartSheet
          assessmentLabel={
            restartIntent.assessmentKind === "full"
              ? "정밀 성향 검사"
              : "첫 성향 검사"
          }
          hasActiveAttempt={restartIntent.hasActiveAttempt}
          isWorking={restartPending}
          onClose={() => {
            if (!restartPending) setRestartIntent(null);
          }}
          onRestart={() => void restartAssessment(restartIntent)}
          onResume={() => {
            setRestartIntent(null);
            router.push(restartIntent.resumeHref);
          }}
          resumeLabel={restartIntent.resumeLabel}
        />
      ) : null}
    </div>
  );
}

export function buildCoreJourneyState(
  attempts: LocalAssessmentAttempt[],
  accountResults: AccountResultSummary[],
): CoreJourneyState {
  const fullInProgress = getLatestAttempt(
    attempts,
    "nu-core-full",
    "in_progress",
  );
  const quickInProgress = getLatestAttempt(
    attempts,
    "nu-core-quick",
    "in_progress",
  );

  if (fullInProgress) {
    return buildInProgressJourney(fullInProgress, {
      assessmentKind: "full",
      assessmentLabel: "정밀 성향 검사",
      href: buildPrecisionIntroHref({
        backDestination: "/home",
        entrySource: "home",
        returnDestination: "/home",
      }),
    });
  }

  if (quickInProgress) {
    return buildInProgressJourney(quickInProgress, {
      assessmentKind: "quick",
      assessmentLabel: "첫 성향 검사",
      href: "/assessments/nu-core-quick?returnTo=%2Fhome",
    });
  }

  const collection = collectValidatedCoreResultCandidates({
    accountReadState: "ready",
    accountResults,
    localAttempts: attempts,
  });
  const representative = selectRepresentativeCoreResult(collection);
  const latest = selectLatestCompletedCoreReport(collection);

  if (representative?.identity.kind === "full") {
    const href = representative.identity.accountResultReportId
      ? buildAccountCoreResultHref({
          backHref: "/home",
          resultReportId: representative.identity.accountResultReportId,
        })
      : buildLocalCoreResultHref({
          backHref: "/home",
          localResultId: representative.identity.localResultId!,
        });
    return {
      cta: "내 성향 결과 보기",
      description: "내 다섯 글자와 자세한 성향 해석을 다시 볼 수 있어요.",
      eyebrow: "정밀 성향 검사 완료",
      href,
      secondaryAction: {
        assessmentKind: "full",
        hasActiveAttempt: false,
        label: "정밀 검사 다시하기",
        type: "restart",
      },
      title: `${representative.result.code} · ${representative.result.currentProfileName}`,
    };
  }

  if (representative?.identity.kind === "quick") {
    return {
      cta: "정밀 성향 검사 시작하기",
      description: "여러 상황에서 보이는 내 모습을 더 자세히 살펴봐요.",
      eyebrow: "첫 성향 검사 완료",
      href: buildPrecisionIntroHref({
        backDestination: "/home",
        entrySource: "first-result",
        returnDestination: "/home",
      }),
      title: "내 모습을 조금 더 자세히 알아볼 차례예요",
    };
  }

  if (latest.latestCompletionRecord) {
    return {
      cta: "결과 상태 확인하기",
      description: "완료한 결과를 현재 형식으로 열 수 있는지 확인해 주세요.",
      eyebrow: "완료 결과 확인 필요",
      href: "/my/reports",
      title: "최근 결과를 확인해 주세요",
    };
  }

  return {
    cta: "첫 성향 검사 시작하기",
    description: "약 3분이면 나를 설명하는 첫 다섯 글자를 만날 수 있어요.",
    eyebrow: "뉴앙이 처음이라면",
    href: "/assessments/nu-core-quick?returnTo=%2Fhome",
    title: "3분이면 내 성향의 첫 단서를 만나요",
  };
}

function getLatestAttempt(
  attempts: LocalAssessmentAttempt[],
  assessmentId: string,
  state: LocalAssessmentAttempt["state"],
) {
  return [...attempts]
    .filter(
      (attempt) =>
        attempt.assessmentId === assessmentId && attempt.state === state,
    )
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
}

function getAttemptProgress(attempt: LocalAssessmentAttempt) {
  const { answeredCount, totalCount } = getAttemptCounts(attempt);
  if (totalCount === 0) return 0;
  return clamp(Math.round((answeredCount / totalCount) * 100), 0, 100);
}

function buildInProgressJourney(
  attempt: LocalAssessmentAttempt,
  options: {
    assessmentKind: CoreAssessmentKind;
    assessmentLabel: string;
    href: string;
  },
): CoreJourneyState {
  const { answeredCount, totalCount } = getAttemptCounts(attempt);
  const resumeSurface = getResumeSurface(attempt);
  const resumeOrdinal = getResumeOrdinal(attempt, resumeSurface, totalCount);
  const remainingCount = Math.max(0, totalCount - answeredCount);
  const base = {
    answeredCount,
    eyebrow: `${options.assessmentLabel} · 이어서`,
    href: options.href,
    progress: getAttemptProgress(attempt),
    resumeOrdinal,
    resumeSurface,
    secondaryAction: {
      assessmentKind: options.assessmentKind,
      hasActiveAttempt: true,
      label: "처음부터 다시",
      type: "restart" as const,
    },
    totalCount,
  };

  if (resumeSurface === "midpoint") {
    return {
      ...base,
      cta: "계속 이어하기",
      description: `${answeredCount}개 답변이 그대로 남아 있어요.`,
      title: "중간 쉼표부터 이어가요",
    };
  }

  if (resumeSurface === "adaptive_intro") {
    return {
      ...base,
      cta: "확인 질문 이어가기",
      description: "답한 내용은 그대로 두고, 비슷하게 나온 자리만 확인해요.",
      title: "마지막 확인 질문을 이어가요",
    };
  }

  if (resumeSurface === "adaptive_question") {
    const adaptiveTotal = attempt.adaptiveItemIds?.length ?? 0;
    const adaptiveAnswered = countAnswered(
      attempt,
      attempt.adaptiveItemIds ?? [],
    );
    const adaptiveRemaining = Math.max(0, adaptiveTotal - adaptiveAnswered);
    return {
      ...base,
      cta: `확인 질문 ${resumeOrdinal}번부터 이어하기`,
      description:
        adaptiveRemaining > 0
          ? `${adaptiveRemaining}개만 더 답하면 결과가 완성돼요.`
          : "마지막 답을 확인하면 결과가 완성돼요.",
      title: `확인 질문 ${resumeOrdinal}번부터 이어가요`,
    };
  }

  if (resumeSurface === "completion_pending") {
    return {
      ...base,
      answeredCount: totalCount,
      cta: "결과 준비 이어가기",
      description: "답한 내용은 그대로 남아 있어요.",
      progress: 100,
      title: "답변은 모두 끝났어요",
    };
  }

  return {
    ...base,
    cta: `${resumeOrdinal}번부터 이어하기`,
    description:
      answeredCount === 0
        ? `${remainingCount}개 질문에 답하면 첫 결과를 볼 수 있어요.`
        : `${answeredCount}개 답변 완료 · ${remainingCount}개 남음`,
    title: `${resumeOrdinal}번부터 이어가요`,
  };
}

function getAttemptCounts(attempt: LocalAssessmentAttempt) {
  const runItemIds = [...attempt.itemIds, ...(attempt.adaptiveItemIds ?? [])];
  const totalCount = runItemIds.length;
  return {
    answeredCount: clamp(countAnswered(attempt, runItemIds), 0, totalCount),
    totalCount,
  };
}

function countAnswered(attempt: LocalAssessmentAttempt, itemIds: string[]) {
  return itemIds.reduce(
    (count, itemId) => count + (attempt.responses[itemId] ? 1 : 0),
    0,
  );
}

function getResumeSurface(attempt: LocalAssessmentAttempt): CoreResumeSurface {
  if (attempt.adaptiveStatus === "intro") return "adaptive_intro";
  if (attempt.adaptiveStatus === "in_progress") return "adaptive_question";
  if (
    attempt.completionStatus === "submitting" ||
    attempt.completionStatus === "failed" ||
    attempt.completionStatus === "insufficient_evidence"
  ) {
    return "completion_pending";
  }
  if (attempt.milestones?.HALFWAY_BREAK_V1?.status === "shown") {
    return "midpoint";
  }
  return "question";
}

function getResumeOrdinal(
  attempt: LocalAssessmentAttempt,
  surface: CoreResumeSurface,
  totalCount: number,
) {
  if (surface === "adaptive_question") {
    return clamp(
      attempt.currentIndex - attempt.itemIds.length + 1,
      1,
      Math.max(1, attempt.adaptiveItemIds?.length ?? 1),
    );
  }
  return clamp(attempt.currentIndex + 1, 1, Math.max(1, totalCount));
}

function getProgressLabel(journey: CoreJourneyState) {
  if (journey.answeredCount === undefined || journey.totalCount === undefined) {
    return "검사 진행률";
  }
  return `${journey.totalCount}개 중 ${journey.answeredCount}개 답변`;
}

function getProgressAriaText(journey: CoreJourneyState) {
  if (journey.answeredCount === undefined || journey.totalCount === undefined) {
    return `${journey.progress ?? 0}% 진행`;
  }

  const resumeCopy =
    journey.resumeSurface === "midpoint"
      ? "중간 쉼표부터 이어서 진행"
      : journey.resumeSurface === "adaptive_intro"
        ? "마지막 확인 질문 안내부터 이어서 진행"
        : journey.resumeSurface === "adaptive_question"
          ? `확인 질문 ${journey.resumeOrdinal ?? 1}번부터 이어서 진행`
          : journey.resumeSurface === "completion_pending"
            ? "결과 준비부터 이어서 진행"
            : `${journey.resumeOrdinal ?? 1}번부터 이어서 진행`;

  return `${journey.totalCount}개 중 ${journey.answeredCount}개 답변 완료, ${resumeCopy}`;
}

function getAssessmentHref(kind: CoreAssessmentKind) {
  return kind === "full"
    ? buildPrecisionIntroHref({
        backDestination: "/home",
        entrySource: "home",
        returnDestination: "/home",
      })
    : "/assessments/nu-core-quick?returnTo=%2Fhome";
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
