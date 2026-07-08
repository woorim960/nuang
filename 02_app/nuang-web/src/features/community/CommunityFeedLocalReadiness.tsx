"use client";

import { ArrowRight, Compass, Map, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { getLatestCompletedAttempt } from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";

type LocalReadinessState =
  | { kind: "loading" }
  | { kind: "full"; attempt: LocalAssessmentAttempt }
  | { kind: "quick"; attempt: LocalAssessmentAttempt }
  | { kind: "empty" };

type LocalReadinessCopy = {
  actionHref: string;
  actionLabel: string;
  body: string;
  icon: typeof Sparkles;
  labels: string[];
  secondaryHref: string;
  secondaryLabel: string;
  statusLabel: string;
  title: string;
};

export function CommunityFeedLocalReadiness() {
  const [state, setState] = useState<LocalReadinessState>({ kind: "loading" });

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      getLatestCompletedAttempt("nu-core-full"),
      getLatestCompletedAttempt("nu-core-quick"),
    ]).then(([fullAttempt, quickAttempt]) => {
      if (!isMounted) return;

      if (fullAttempt) {
        setState({ kind: "full", attempt: fullAttempt });
        return;
      }

      if (quickAttempt) {
        setState({ kind: "quick", attempt: quickAttempt });
        return;
      }

      setState({ kind: "empty" });
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.kind === "loading") {
    return <CommunityFeedLocalReadinessSkeleton />;
  }

  const copy = getReadinessCopy(state);
  const Icon = copy.icon;

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_14px_30px_rgb(63_56_118_/_8%)]">
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={state.kind === "full" ? "success" : "primary"}>
              내 피드 준비도
            </StatusPill>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-bold text-primary">
              {copy.statusLabel}
            </span>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
              <Icon aria-hidden="true" size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black leading-6">{copy.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{copy.body}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {copy.labels.map((label) => (
              <span
                className="rounded-full bg-[#eff0f6] px-3 py-1 text-xs font-bold text-muted"
                key={label}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:w-[180px]">
          <ButtonLink
            className="w-full"
            href={copy.actionHref}
            icon={<ArrowRight aria-hidden="true" size={17} />}
          >
            {copy.actionLabel}
          </ButtonLink>
          <ButtonLink
            className="w-full"
            href={copy.secondaryHref}
            variant="secondary"
          >
            {copy.secondaryLabel}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

function CommunityFeedLocalReadinessSkeleton() {
  return (
    <article
      aria-live="polite"
      className="overflow-hidden rounded-lg border border-line bg-white shadow-[0_14px_30px_rgb(63_56_118_/_8%)]"
      role="status"
    >
      <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone="neutral">내 피드 준비도</StatusPill>
            <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-bold text-muted">
              확인 중
            </span>
          </div>
          <div className="mt-4 flex items-start gap-3">
            <div className="h-11 w-11 shrink-0 rounded-lg bg-surface-soft" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-black leading-6">피드 추천 상태 확인 중</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                이 기기의 검사 결과를 확인하고 있어요.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["로컬 결과", "공개 카드", "비교 준비"].map((label) => (
              <span
                className="rounded-full bg-[#eff0f6] px-3 py-1 text-xs font-bold text-muted"
                key={label}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:w-[180px]">
          <span className="inline-flex min-h-11 items-center justify-center rounded-lg bg-surface-soft px-4 text-sm font-semibold text-muted">
            준비 중
          </span>
          <span className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 text-sm font-semibold text-muted">
            잠시만요
          </span>
        </div>
      </div>
    </article>
  );
}

function getReadinessCopy(
  state: Exclude<LocalReadinessState, { kind: "loading" }>,
): LocalReadinessCopy {
  if (state.kind === "full") {
    return {
      actionHref: "/my",
      actionLabel: "공개 카드",
      body:
        "정밀 코어 결과가 있어 공식 주제 피드와 내 공개 카드 미리보기를 함께 확인할 수 있어요.",
      icon: Sparkles,
      labels: ["기본 프로필 공개 준비", "민감 항목 비공개 기본값", "비교 가능"],
      secondaryHref: "/map",
      secondaryLabel: "성향지도 보기",
      statusLabel: "공개 카드 준비",
      title: "피드 카드 준비가 거의 끝났어요",
    };
  }

  if (state.kind === "quick") {
    return {
      actionHref: "/assessments/nu-core-full",
      actionLabel: "정밀 코어",
      body:
        "빠른 코어 결과가 있어요. 정밀 코어로 확장하면 공개 카드와 비교 준비가 더 정확해져요.",
      icon: Map,
      labels: ["빠른 코어 완료", "성향지도 확장 가능", "공개 카드 대기"],
      secondaryHref: "/map",
      secondaryLabel: "지도 미리보기",
      statusLabel: "확장 추천",
      title: "성향지도를 더 선명하게 만들 수 있어요",
    };
  }

  return {
    actionHref: "/assessments/nu-core-quick",
    actionLabel: "빠른 코어",
    body:
      "첫 검사만 끝내면 피드, 성향지도, 비교 카드가 내 흐름에 맞춰 더 쉽게 이어져요.",
    icon: Compass,
    labels: ["20문항 시작", "회원가입 없이 가능", "결과 먼저 보기"],
    secondaryHref: "/assessments",
    secondaryLabel: "검사 홈",
    statusLabel: "첫 시작 필요",
    title: "피드를 더 재밌게 보려면 첫 검사가 필요해요",
  };
}
