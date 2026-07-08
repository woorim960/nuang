"use client";

import {
  ArrowRight,
  BarChart3,
  Bell,
  ChevronRight,
  Compass,
  HeartHandshake,
  MessageCircle,
  PlayCircle,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import { quickScoringRelease } from "@/features/assessment/quick-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { NuangNextActionFlow } from "@/features/navigation/NuangNextActionFlow";
import { calculateCoreScore } from "@/lib/scoring/core";
import type { ItemResponse } from "@/lib/scoring/types";

const titleByAssessmentId: Record<string, string> = {
  "nu-core-full": "정밀 코어",
  "nu-core-quick": "빠른 코어",
};

const quickStartLinks = [
  {
    caption: "20문항",
    href: "/assessments/nu-core-quick",
    label: "빠른 코어",
    motif: "water",
  },
  {
    caption: "60문항",
    href: "/assessments/nu-core-full",
    label: "정밀 코어",
    motif: "purple",
  },
  {
    caption: "오각형",
    href: "/map",
    label: "성향지도",
    motif: "forest",
  },
  {
    caption: "피드·비교",
    href: "/together",
    label: "함께",
    motif: "flame",
  },
] as const;

const todayRouteCards = [
  {
    body: "3분 안에 예비 결과를 보고, 원하면 정밀 코어 60문항으로 확장해요.",
    href: "/assessments/nu-core-quick",
    icon: PlayCircle,
    label: "빠른 코어 20문항",
    tone: "primary",
  },
  {
    body: "정밀 결과가 있으면 5축·10축 오각형 지도로 내 흐름을 확인해요.",
    href: "/map",
    icon: BarChart3,
    label: "성향지도 확인",
    tone: "water",
  },
  {
    body: "공식 주제 피드와 공개 범위 기반 1:1 비교 흐름을 먼저 살펴봐요.",
    href: "/together",
    icon: Send,
    label: "함께 피드 읽기",
    tone: "forest",
  },
] as const;

const featureLinks = [
  {
    caption: "빠른 코어, 정밀 코어, 별난 연구소",
    href: "/assessments",
    icon: Search,
    label: "검사 홈 열기",
  },
  {
    caption: "상대가 공개한 범위 안에서",
    href: "/together",
    icon: UsersRound,
    label: "공개 범위 비교 준비",
  },
  {
    caption: "위기 주제는 점수 대신 연결",
    href: "/help",
    icon: ShieldAlert,
    label: "도움 연결 허브",
  },
] as const;

const communityPreview = [
  {
    label: "오늘의 질문",
    text: "나와 다른 리듬을 가진 사람과 맞추는 나만의 방법은?",
    meta: "댓글형",
  },
  {
    label: "성향 카드",
    text: "대표 성향과 성향지도 요약만 골라 가볍게 소개하기",
    meta: "카드형",
  },
  {
    label: "공개 프로필",
    text: "직접 응답 없이 공개 범위 안에서 서로 비교하기",
    meta: "비교형",
  },
] as const;

export function HomeDashboard() {
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

  const inProgressAttempt = attempts.find(
    (attempt) => attempt.state === "in_progress",
  );
  const latestCompletedAttempt = attempts.find(
    (attempt) => attempt.state === "completed",
  );
  const latestResult = useMemo(
    () =>
      latestCompletedAttempt
        ? calculateAttemptResult(latestCompletedAttempt)
        : null,
    [latestCompletedAttempt],
  );

  return (
    <div className="grid gap-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xl font-black tracking-normal text-primary">NUANG</p>
          <h1 className="mt-4 text-2xl font-black tracking-normal">
            안녕하세요, 탐험가님
          </h1>
          <p className="mt-1 text-sm text-muted">
            검사하고, 지도 만들고, 공개 범위 안에서 함께 나눠요.
          </p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-muted shadow-[0_10px_24px_rgb(63_56_118_/_8%)]">
          <Bell aria-hidden="true" size={19} />
        </div>
      </header>

      <QuickStartRail />

      <NuangNextActionFlow />

      {!loaded && (
        <section className="rounded-lg border border-line bg-white p-4 text-sm text-muted">
          로컬 상태 확인 중
        </section>
      )}

      {loaded && inProgressAttempt && (
        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-line bg-surface-soft p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <StatusPill tone="primary">진행 중인 검사</StatusPill>
                <h2 className="mt-3 text-lg font-black">
                  {titleByAssessmentId[inProgressAttempt.assessmentId] ?? "코어 검사"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {Object.keys(inProgressAttempt.responses).length} /{" "}
                  {inProgressAttempt.itemIds.length}
                </p>
              </div>
              <NuangCharacter motif="purple" size="md" />
            </div>
          </div>
          <div className="p-4">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#eceaf4]">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.round(
                    (Object.keys(inProgressAttempt.responses).length /
                      inProgressAttempt.itemIds.length) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <ButtonLink
              className="mt-4 w-full"
              href={`/assessments/${inProgressAttempt.assessmentId}`}
            >
              이어하기
            </ButtonLink>
          </div>
        </section>
      )}

      {loaded && !inProgressAttempt && latestCompletedAttempt && latestResult && (
        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-line bg-[#fff7f1] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <StatusPill tone="success">최근 결과</StatusPill>
                <h2 className="mt-3 text-lg font-black">
                  {latestResult.profileName ?? "결과 확인 가능"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {latestResult.code ?? "-----"} ·{" "}
                  {titleByAssessmentId[latestCompletedAttempt.assessmentId] ??
                    "코어 검사"}
                </p>
              </div>
              <NuangCharacter motif="forest" size="sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-y border-line text-center">
            <MiniMetric label="성향지도" value="열림" />
            <MiniMetric label="비교" value="준비" />
            <MiniMetric label="피드" value="카드 가능" />
          </div>
          <div className="p-4">
            <ButtonLink
              className="w-full"
              href={`/results/local/${latestCompletedAttempt.id}`}
              variant="secondary"
            >
              결과 다시 보기
            </ButtonLink>
          </div>
        </section>
      )}

      {loaded && !inProgressAttempt && !latestCompletedAttempt && (
        <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[var(--shadow-soft)]">
          <div className="border-b border-line bg-surface-soft p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <StatusPill tone="primary">첫 검사</StatusPill>
                <h2 className="mt-3 text-xl font-black">빠른 코어로 시작해요</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  로그인 없이 20문항 예비 결과를 먼저 볼 수 있어요.
                </p>
              </div>
              <NuangCharacter motif="purple" size="md" />
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-line border-y border-line text-center">
            <MiniMetric label="문항" value="20개" />
            <MiniMetric label="시간" value="3분" />
            <MiniMetric label="결과" value="즉시" />
          </div>
          <div className="p-4">
            <ButtonLink className="w-full" href="/assessments/nu-core-quick">
              빠른 코어 시작
            </ButtonLink>
          </div>
        </section>
      )}

      <TodayRouteDeck />

      <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">지금 바로 할 수 있는 것</h2>
          <StatusPill tone="neutral">바로 가능</StatusPill>
        </div>
        {featureLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="flex min-h-20 items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-[0_10px_24px_rgb(63_56_118_/_6%)] transition-transform active:scale-[0.99]"
              href={item.href}
              key={item.href}
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
                <Icon aria-hidden="true" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">{item.label}</h3>
                <p className="mt-1 text-sm text-muted">{item.caption}</p>
              </div>
              <ChevronRight aria-hidden="true" className="text-muted" size={17} />
            </Link>
          );
        })}
      </section>

      <CommunityPreview />
    </div>
  );
}

function TodayRouteDeck() {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">오늘 추천 루트</h2>
          <p className="mt-1 text-sm text-muted">처음 30초 안에 고를 수 있게</p>
        </div>
        <StatusPill tone="success">추천</StatusPill>
      </div>
      <div className="grid gap-3">
        {todayRouteCards.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="group flex min-h-24 items-center gap-3 rounded-lg border border-line bg-white p-4 shadow-[0_12px_28px_rgb(63_56_118_/_7%)]"
              href={item.href}
              key={item.href}
            >
              <div
                className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-white ${
                  item.tone === "water"
                    ? "bg-water"
                    : item.tone === "forest"
                      ? "bg-forest"
                      : "bg-primary"
                }`}
              >
                <Icon aria-hidden="true" size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-black">{item.label}</h3>
                <p className="mt-1 text-sm leading-6 text-muted">{item.body}</p>
              </div>
              <ArrowRight
                aria-hidden="true"
                className="shrink-0 text-muted transition-transform group-active:translate-x-0.5"
                size={18}
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <p className="truncate text-[11px] font-bold text-muted">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-foreground">{value}</p>
    </div>
  );
}

function QuickStartRail() {
  return (
    <section aria-label="빠른 시작" className="-mx-5 overflow-x-auto px-5">
      <div className="flex gap-3 pb-1">
        {quickStartLinks.map((item) => (
          <Link
            className="grid min-w-[90px] justify-items-center gap-2 rounded-lg bg-white px-3 py-3 text-center shadow-[0_10px_24px_rgb(63_56_118_/_9%)] ring-1 ring-line"
            href={item.href}
            key={item.href}
          >
            <span className="rounded-full bg-white p-[2px] ring-1 ring-line">
              <span className="block rounded-full bg-white p-1">
                <NuangCharacter motif={item.motif} size="sm" />
              </span>
            </span>
            <span className="text-xs font-black">{item.label}</span>
            <span className="text-[11px] font-semibold text-muted">{item.caption}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CommunityPreview() {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">피드와 커뮤니티</h2>
          <p className="mt-1 text-sm text-muted">
            공개 범위 안에서 가볍게 나누는 공간
          </p>
        </div>
        <StatusPill tone="caution">단계적 오픈</StatusPill>
      </div>
      <div className="-mx-5 overflow-x-auto px-5">
        <div className="flex gap-3 pb-1">
          {communityPreview.map((item) => (
            <article
              className="min-w-[230px] overflow-hidden rounded-lg border border-line bg-white shadow-[0_12px_28px_rgb(63_56_118_/_7%)]"
              key={item.label}
            >
              <div className="h-1.5 bg-primary" />
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-surface-soft text-primary">
                    {item.label === "오늘의 질문" ? (
                      <MessageCircle aria-hidden="true" size={18} />
                    ) : item.label === "성향 카드" ? (
                      <Sparkles aria-hidden="true" size={18} />
                    ) : (
                      <HeartHandshake aria-hidden="true" size={18} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-black">{item.label}</p>
                    <p className="text-[11px] font-bold text-muted">{item.meta}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{item.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <ButtonLink
        className="w-full"
        href="/together"
        icon={<Compass aria-hidden="true" size={17} />}
      >
        함께 피드 보기
      </ButtonLink>
    </section>
  );
}

function calculateAttemptResult(attempt: LocalAssessmentAttempt) {
  const scoringRelease =
    attempt.assessmentId === fullCoreAssessment.assessmentId
      ? fullScoringRelease
      : quickScoringRelease;
  const responses: ItemResponse[] = Object.values(attempt.responses).map(
    (response) => ({
      isUnsure: response.isUnsure,
      itemId: response.itemId,
      value: response.value,
    }),
  );

  return calculateCoreScore(scoringRelease, responses);
}
