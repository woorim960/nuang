"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { StatusPill } from "@/components/ui/StatusPill";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { coreAssessments } from "@/lib/product/mock-data";

type CoreStatus = {
  detail: string;
  href: string;
  label: string;
  tone: "success" | "caution" | "neutral";
};

export function AssessmentHomeCoreSection() {
  const [attempts, setAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    listLocalAttempts().then((nextAttempts) => {
      if (!isMounted) return;
      setAttempts(nextAttempts);
      setLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const hero = useMemo(() => buildHeroState(attempts), [attempts]);

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-line bg-surface-soft p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <StatusPill tone="primary">{hero.eyebrow}</StatusPill>
            <h2 className="mt-3 text-xl font-black">{hero.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{hero.caption}</p>
            <Link
              aria-label={`${hero.cta}: ${hero.title}`}
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgb(101_70_215_/_22%)]"
              href={hero.href}
            >
              {hero.cta}
            </Link>
          </div>
          <NuangCharacter motif="purple" size="lg" />
        </div>
        </div>
      </section>

      <section className="grid gap-3">
        <SectionHeader
          label="코어 검사"
          note="성향지도와 대표 성향을 만드는 기본 검사"
        />
        {coreAssessments.map((assessment) => {
          const status = getCoreStatus(assessment.assessmentId, attempts, loaded);

          return (
            <Link
              aria-label={`${assessment.title}: ${status.label}, ${status.detail}`}
              className="flex min-h-24 items-center justify-between gap-3 rounded-lg border border-line bg-white p-4"
              href={status.href}
              key={assessment.href}
            >
              <div className="flex min-w-0 items-center gap-3">
                <NuangCharacter motif={assessment.motif} size="sm" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold">{assessment.title}</h3>
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {assessment.caption} · 약 {assessment.duration}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-muted">
                    {status.detail}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <TinyBadge>{assessment.mapImpact}</TinyBadge>
                    <TinyBadge>{assessment.resultUse}</TinyBadge>
                    <TinyBadge>{assessment.storage}</TinyBadge>
                  </div>
                </div>
              </div>
              <ChevronRight aria-hidden="true" className="shrink-0 text-muted" size={18} />
            </Link>
          );
        })}
      </section>
    </>
  );
}

function SectionHeader({ label, note }: { label: string; note: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
        <ChevronRight aria-hidden="true" size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold">{label}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{note}</p>
      </div>
    </div>
  );
}

function TinyBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#eff0f6] px-2.5 py-1 text-xs font-semibold text-muted">
      {children}
    </span>
  );
}

function getCoreStatus(
  assessmentId: string,
  attempts: LocalAssessmentAttempt[],
  loaded: boolean,
): CoreStatus {
  if (!loaded) {
    return {
      detail: "로컬 상태 확인 중",
      href: `/assessments/${assessmentId}`,
      label: "확인 중",
      tone: "neutral",
    };
  }

  const completed = attempts.find(
    (attempt) => attempt.assessmentId === assessmentId && attempt.state === "completed",
  );
  const inProgress = attempts.find(
    (attempt) => attempt.assessmentId === assessmentId && attempt.state === "in_progress",
  );
  const quickCompleted = attempts.find(
    (attempt) =>
      attempt.assessmentId === "nu-core-quick" && attempt.state === "completed",
  );

  if (completed) {
    return {
      detail: "완료 결과를 다시 볼 수 있어요",
      href: `/results/local/${completed.id}`,
      label: "완료",
      tone: "success",
    };
  }

  if (inProgress) {
    return {
      detail: `${Object.keys(inProgress.responses).length} / ${inProgress.itemIds.length} 응답 완료`,
      href: `/assessments/${assessmentId}`,
      label: "진행 중",
      tone: "caution",
    };
  }

  if (assessmentId === "nu-core-full" && quickCompleted) {
    return {
      detail: "빠른 코어 응답을 이어받아 확장해요",
      href: "/assessments/nu-core-full",
      label: "확장 가능",
      tone: "caution",
    };
  }

  return {
    detail: "로그인 없이 바로 시작할 수 있어요",
    href: `/assessments/${assessmentId}`,
    label: "시작 가능",
    tone: "neutral",
  };
}

function buildHeroState(attempts: LocalAssessmentAttempt[]) {
  const fullCompleted = attempts.find(
    (attempt) =>
      attempt.assessmentId === "nu-core-full" && attempt.state === "completed",
  );
  const fullInProgress = attempts.find(
    (attempt) =>
      attempt.assessmentId === "nu-core-full" && attempt.state === "in_progress",
  );
  const quickCompleted = attempts.find(
    (attempt) =>
      attempt.assessmentId === "nu-core-quick" && attempt.state === "completed",
  );
  const quickInProgress = attempts.find(
    (attempt) =>
      attempt.assessmentId === "nu-core-quick" && attempt.state === "in_progress",
  );

  if (fullCompleted) {
    return {
      caption: "성향지도와 함께 기능의 기준이 되는 결과가 이 기기에 있어요.",
      cta: "정밀 결과 보기",
      eyebrow: "정밀 코어 완료",
      href: `/results/local/${fullCompleted.id}`,
      title: "현재 대표 성향을 다시 확인해요",
    };
  }

  if (fullInProgress) {
    return {
      caption: `${Object.keys(fullInProgress.responses).length} / ${fullInProgress.itemIds.length}개 응답을 완료했어요.`,
      cta: "정밀 코어 이어하기",
      eyebrow: "진행 중인 검사",
      href: "/assessments/nu-core-full",
      title: "조금만 더 답하면 성향지도가 열려요",
    };
  }

  if (quickCompleted) {
    return {
      caption: "20문항 예비 결과를 바탕으로 정밀 코어를 이어갈 수 있어요.",
      cta: "정밀 코어로 확장",
      eyebrow: "빠른 코어 완료",
      href: "/assessments/nu-core-full",
      title: "성향지도를 만들 준비가 됐어요",
    };
  }

  if (quickInProgress) {
    return {
      caption: `${Object.keys(quickInProgress.responses).length} / ${quickInProgress.itemIds.length}개 응답을 완료했어요.`,
      cta: "빠른 코어 이어하기",
      eyebrow: "진행 중인 검사",
      href: "/assessments/nu-core-quick",
      title: "예비 결과를 먼저 확인해요",
    };
  }

  return {
    caption: "로그인 없이 예비 결과를 먼저 확인해요.",
    cta: "빠른 코어 시작",
    eyebrow: "처음이신가요?",
    href: "/assessments/nu-core-quick",
    title: "20문항 빠른 코어",
  };
}
