"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { buildPrecisionIntroHref } from "@/features/assessment/precision-entry";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import styles from "./AssessmentHomeCoreSection.module.css";

type CoreJourneyState = {
  caption: string;
  cta: string;
  eyebrow: string;
  href: string;
  progress?: number;
  step: 0 | 1 | 2;
  title: string;
};

export function AssessmentHomeCoreSection() {
  const [attempts, setAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    listLocalAttempts()
      .then((nextAttempts) => {
        if (isMounted) setAttempts(nextAttempts);
      })
      .catch(() => {
        if (isMounted) setAttempts([]);
      })
      .finally(() => {
        if (isMounted) setLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const journey = useMemo(() => buildJourneyState(attempts), [attempts]);

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
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{journey.eyebrow}</p>
          <h3>{journey.title}</h3>
          <p className={styles.caption}>{journey.caption}</p>
        </div>
        <div className={styles.characterStage}>
          <span />
          <NuangCharacter
            className={styles.character}
            motif="purple"
            size="md"
          />
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

      <ol aria-label="뉴앙 코드 여정" className={styles.steps}>
        {[
          { label: "첫 검사", step: 0 },
          { label: "정밀 검사", step: 1 },
          { label: "성향지도", step: 2 },
        ].map((item) => {
          const isComplete = item.step < journey.step;
          const isCurrent = item.step === journey.step;

          return (
            <li
              aria-current={isCurrent ? "step" : undefined}
              data-complete={isComplete}
              data-current={isCurrent}
              key={item.label}
            >
              <span>
                {isComplete ? (
                  <Check aria-hidden="true" size={12} strokeWidth={2.2} />
                ) : (
                  item.step + 1
                )}
              </span>
              <small>{item.label}</small>
            </li>
          );
        })}
      </ol>

      <Link className={styles.primaryAction} href={journey.href}>
        {journey.cta}
        <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
      </Link>
    </div>
  );
}

function buildJourneyState(
  attempts: LocalAssessmentAttempt[],
): CoreJourneyState {
  const fullCompleted = getLatestAttempt(attempts, "nu-core-full", "completed");
  const fullInProgress = getLatestAttempt(
    attempts,
    "nu-core-full",
    "in_progress",
  );
  const quickCompleted = getLatestAttempt(
    attempts,
    "nu-core-quick",
    "completed",
  );
  const quickInProgress = getLatestAttempt(
    attempts,
    "nu-core-quick",
    "in_progress",
  );

  if (fullCompleted) {
    const score = fullCompleted.resultSnapshot?.scoreResult;
    const resultTitle =
      score?.code && score.profileName
        ? `${score.code} · ${score.profileName}`
        : "내 정밀 성향 결과";

    return {
      caption: "성향지도와 사람 비교에서 사용할 자세한 결과가 준비됐어요.",
      cta: "내 성향 결과 보기",
      eyebrow: "정밀 성향 검사 완료",
      href: `/results/local/${fullCompleted.id}`,
      step: 2,
      title: resultTitle,
    };
  }

  if (fullInProgress) {
    return {
      caption: "지금까지 답한 내용은 그대로 남아 있어요.",
      cta: "정밀 검사 이어하기",
      eyebrow: "답하던 검사",
      href: buildPrecisionIntroHref({
        backDestination: "/assessments",
        entrySource: "home",
        returnDestination: "/assessments",
      }),
      progress: getAttemptProgress(fullInProgress),
      step: 1,
      title: "조금 더 자세한 내 모습을 알아봐요",
    };
  }

  if (quickCompleted) {
    return {
      caption: "더 다양한 상황에 답하면 성향지도와 비교 기준이 완성돼요.",
      cta: "정밀 성향 검사 시작하기",
      eyebrow: "첫 성향 검사 완료",
      href: buildPrecisionIntroHref({
        backDestination: `/results/local/${quickCompleted.id}`,
        entrySource: "first-result",
        returnDestination: "/assessments",
      }),
      step: 1,
      title: "내 모습을 더 자세히 알아볼 차례예요",
    };
  }

  if (quickInProgress) {
    return {
      caption: "지금까지 답한 내용은 그대로 남아 있어요.",
      cta: "첫 성향 검사 이어하기",
      eyebrow: "답하던 검사",
      href: "/assessments/nu-core-quick?returnTo=%2Fassessments",
      progress: getAttemptProgress(quickInProgress),
      step: 0,
      title: "내 첫 뉴앙 코드를 만들고 있어요",
    };
  }

  return {
    caption: "약 3분 동안 평소 모습을 답하면 첫 뉴앙 코드를 만날 수 있어요.",
    cta: "첫 성향 검사 시작하기",
    eyebrow: "뉴앙이 처음이라면",
    href: "/assessments/nu-core-quick?returnTo=%2Fassessments",
    step: 0,
    title: "나를 설명하는 다섯 글자를 만나보세요",
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
