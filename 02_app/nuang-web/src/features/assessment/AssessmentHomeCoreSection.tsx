"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readClientAccountResults } from "@/features/account/client-account-results";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
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
  cta: string;
  description: string;
  eyebrow: string;
  href: string;
  progress?: number;
  title: string;
};

export function AssessmentHomeCoreSection() {
  const [attempts, setAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [accountResults, setAccountResults] = useState<AccountResultSummary[]>(
    [],
  );
  const [loaded, setLoaded] = useState(false);
  const [readError, setReadError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      listLocalAttempts()
        .then((nextAttempts) => ({ nextAttempts, state: "ready" as const }))
        .catch(() => ({ nextAttempts: [], state: "error" as const })),
      readClientAccountResults(),
    ])
      .then(([localRead, accountRead]) => {
        if (!isMounted) return;
        setAttempts(localRead.nextAttempts);
        setAccountResults(accountRead.results);
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

  if (!loaded) {
    return (
      <div aria-label="내 기본 코드 상태 확인 중" className={styles.skeleton}>
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className={styles.journey}>
      <div className={styles.mainRow}>
        <div className={styles.characterStage}>
          <span />
          <NuangCharacter
            className={styles.character}
            motif="purple"
            priority
            size="md"
          />
        </div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{journey.eyebrow}</p>
          <h2>{journey.title}</h2>
        </div>
      </div>

      {journey.progress !== undefined ? (
        <div className={styles.progressBlock}>
          <div className={styles.progressMeta}>
            <span>검사 진행률</span>
            <strong>{journey.progress}%</strong>
          </div>
          <div
            aria-label="검사 진행률"
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={journey.progress}
            className={styles.progressTrack}
            role="progressbar"
          >
            <span style={{ width: `${journey.progress}%` }} />
          </div>
        </div>
      ) : null}

      <p className={styles.description}>{journey.description}</p>

      <Link className={styles.primaryAction} href={journey.href}>
        {journey.cta}
        <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
      </Link>
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
    return {
      cta: "정밀 검사 이어하기",
      description: "답했던 내용은 그대로 남아 있어요.",
      eyebrow: "답하던 정밀 검사",
      href: buildPrecisionIntroHref({
        backDestination: "/home",
        entrySource: "home",
        returnDestination: "/home",
      }),
      progress: getAttemptProgress(fullInProgress),
      title: "답하던 곳부터 이어가요",
    };
  }

  if (quickInProgress) {
    return {
      cta: "첫 성향 검사 이어하기",
      description: "답했던 내용부터 바로 이어갈 수 있어요.",
      eyebrow: "답하던 첫 검사",
      href: "/assessments/nu-core-quick?returnTo=%2Fhome",
      progress: getAttemptProgress(quickInProgress),
      title: "답하던 곳부터 이어가요",
    };
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
  if (attempt.itemIds.length === 0) return 0;
  return Math.round(
    (Object.keys(attempt.responses).length / attempt.itemIds.length) * 100,
  );
}
