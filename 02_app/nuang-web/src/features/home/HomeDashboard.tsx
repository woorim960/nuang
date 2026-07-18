"use client";

import {
  ArrowRight,
  Bell,
  BookOpen,
  Compass,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { ButtonLink } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { getValidatedLocalResultSnapshot } from "@/features/assessment/assessment-result-snapshot";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  type FeedItem,
  listHomeFeedPreviewItems,
} from "@/features/feed/feed-seed";

const titleByAssessmentId: Record<string, string> = {
  "nu-core-full": "정밀 코어",
  "nu-core-quick": "빠른 코어",
};

type HomeDashboardProps = {
  feedPreviewItems?: FeedItem[];
};

export function HomeDashboard({
  feedPreviewItems = listHomeFeedPreviewItems(),
}: HomeDashboardProps = {}) {
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

  const inProgressAttempt = getLatestInProgressAttempt(attempts);
  const latestCompletedAttempt = getLatestCompletedAttempt(attempts);
  const latestResult = useMemo(
    () =>
      latestCompletedAttempt
        ? calculateAttemptResult(latestCompletedAttempt)
        : null,
    [latestCompletedAttempt],
  );
  const dailyPrompt = getDailyPrompt(feedPreviewItems);

  return (
    <div className="grid gap-6 pb-2">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-lg font-black text-primary">NUANG</p>
          <h1 className="mt-3 text-2xl font-black">오늘의 리듬을 열어볼까요</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            검사, 리포트, 피드를 한 흐름으로 이어서 나를 조금 더 선명하게
            봅니다.
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-white text-muted shadow-[0_10px_24px_rgb(63_56_118_/_8%)]">
          <Bell aria-hidden="true" size={19} />
        </div>
      </header>

      <section className="-mx-5 border-y border-line bg-white px-5 py-5 sm:-mx-6 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <StatusPill tone="primary">오늘의 추천</StatusPill>
            <DailyFocus
              inProgressAttempt={inProgressAttempt}
              latestCompletedAttempt={latestCompletedAttempt}
              latestResult={latestResult}
              loaded={loaded}
            />
          </div>
          <NuangCharacter motif="purple" priority size="md" />
        </div>
      </section>

      <section className="grid gap-3">
        <SectionHeader
          description="앱을 오래 둘러보지 않아도 오늘 필요한 순서대로 이어져요."
          title="오늘의 메뉴"
        />
        <div className="border-y border-line">
          <ActionLine
            body="내 코드, 캐릭터, 세부 신호를 한 번에 확인해요."
            href="/my/profile"
            icon={<Sparkles aria-hidden="true" size={18} />}
            title="내 성향 자세히 보기"
          />
          <ActionLine
            body="검사 결과와 1:1 비교 리포트를 다시 열어봐요."
            href="/my/reports"
            icon={<FileText aria-hidden="true" size={18} />}
            title="내 리포트 모아보기"
          />
          <ActionLine
            body="다른 리듬의 생각을 읽고 가볍게 반응해요."
            href="/feed"
            icon={<Compass aria-hidden="true" size={18} />}
            title="피드에서 반응 보기"
          />
        </div>
      </section>

      {dailyPrompt && <DailyPrompt item={dailyPrompt} />}

      <FeedPreview items={feedPreviewItems} />

      <section className="-mx-5 border-y border-line bg-[#f7faf8] px-5 py-5 sm:-mx-6 sm:px-6">
        <div className="flex items-start gap-3">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-success"
            size={20}
          />
          <div>
            <h2 className="text-sm font-black">공유와 비교는 내가 정해요</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              직접 응답, 원점수, 민감 항목은 공개 화면에 넣지 않습니다. 공유와
              비교는 열어둔 범위 안에서만 작동해요.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function DailyFocus({
  inProgressAttempt,
  latestCompletedAttempt,
  latestResult,
  loaded,
}: {
  inProgressAttempt?: LocalAssessmentAttempt;
  latestCompletedAttempt?: LocalAssessmentAttempt;
  latestResult: ReturnType<typeof calculateAttemptResult> | null;
  loaded: boolean;
}) {
  if (!loaded) {
    return (
      <div className="mt-3">
        <h2 className="text-xl font-black">오늘의 루틴을 불러오는 중</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          기기에 남아 있는 검사 흐름을 확인하고 있어요.
        </p>
      </div>
    );
  }

  if (inProgressAttempt) {
    const title =
      titleByAssessmentId[inProgressAttempt.assessmentId] ?? "코어 검사";
    const answered = Object.keys(inProgressAttempt.responses).length;
    const total = inProgressAttempt.itemIds.length;
    const progress = total > 0 ? Math.round((answered / total) * 100) : 0;

    return (
      <div className="mt-3">
        <h2 className="text-xl font-black">{title}를 이어갈 시간이에요</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {answered} / {total}문항까지 왔어요. 오늘은 남은 문항만 가볍게
          마무리해도 충분합니다.
        </p>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eceaf4]">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ButtonLink
          className="mt-4 w-full"
          href={`/assessments/${inProgressAttempt.assessmentId}`}
        >
          이어하기
        </ButtonLink>
      </div>
    );
  }

  if (latestCompletedAttempt && latestResult) {
    const title =
      titleByAssessmentId[latestCompletedAttempt.assessmentId] ?? "코어 검사";
    const isFullResult = latestCompletedAttempt.mode === "full";

    return (
      <div className="mt-3">
        <h2 className="text-xl font-black">
          {latestResult.profileName ?? "내 코드가 준비됐어요"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {latestResult.code ?? "-----"} · {title} 기준으로{" "}
          {isFullResult
            ? "성향지도와 비교를 이어갈 수 있어요."
            : "첫 성향 결과를 확인하고 정밀 검사로 이어갈 수 있어요."}
        </p>
        <div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line text-center">
          <MiniMetric label="코드" value={latestResult.code ?? "-----"} />
          <MiniMetric
            label="지도"
            value={isFullResult ? "열림" : "정밀 후"}
          />
          <MiniMetric
            label="비교"
            value={isFullResult ? "가능" : "정밀 후"}
          />
        </div>
        <ButtonLink
          className="mt-4 w-full"
          href={`/results/local/${latestCompletedAttempt.id}`}
          variant="secondary"
        >
          리포트 다시 보기
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <h2 className="text-xl font-black">빠른 코어로 오늘의 기준을 만들어요</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        로그인 없이 3분 정도면 첫 뉴앙 코드와 리포트를 볼 수 있어요.
      </p>
      <div className="mt-4 grid grid-cols-3 divide-x divide-line border-y border-line text-center">
        <MiniMetric label="진행" value="간단하게" />
        <MiniMetric label="시간" value="3분" />
        <MiniMetric label="결과" value="첫 코드" />
      </div>
      <ButtonLink className="mt-4 w-full" href="/assessments/nu-core-quick">
        빠른 코어 시작
      </ButtonLink>
    </div>
  );
}

function SectionHeader({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div>
      <h2 className="text-base font-black">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
    </div>
  );
}

function ActionLine({
  body,
  href,
  icon,
  title,
}: {
  body: string;
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link
      className="flex min-h-[76px] items-center gap-3 py-4 text-left"
      href={href}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-soft text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black text-foreground">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted">{body}</span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="shrink-0 text-muted"
        size={17}
      />
    </Link>
  );
}

function DailyPrompt({ item }: { item: FeedItem }) {
  return (
    <section className="-mx-5 border-y border-line bg-[#fffaf0] px-5 py-5 sm:-mx-6 sm:px-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-soft text-primary">
          <BookOpen aria-hidden="true" size={18} />
        </span>
        <div className="min-w-0">
          <StatusPill tone="caution">오늘의 질문</StatusPill>
          <h2 className="mt-2 text-lg font-black leading-6">{item.title}</h2>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
            {item.body}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
            <span>{item.replyLabel}</span>
            <span>{item.likeLabel}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <p className="truncate text-[11px] font-bold text-muted">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-foreground">
        {value}
      </p>
    </div>
  );
}

function FeedPreview({ items }: { items: FeedItem[] }) {
  return (
    <section className="grid gap-3">
      <SectionHeader
        description="오늘의 질문, 밸런스 게임, 리포트 공유를 한 번에 훑어봐요."
        title="피드 미리보기"
      />
      <div className="border-y border-line">
        {items.slice(0, 3).map((item) => {
          return (
            <article
              className="border-b border-line py-4 last:border-b-0"
              key={item.id}
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-muted">
                <span>{item.authorHandle}</span>
                <span>·</span>
                <span>{item.timeLabel}</span>
              </div>
              <h3 className="mt-2 text-sm font-black leading-5">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
                {item.body}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                <span>{item.replyLabel}</span>
                <span>{item.likeLabel}</span>
              </div>
            </article>
          );
        })}
      </div>
      <ButtonLink
        className="w-full"
        href="/feed"
        icon={<Compass aria-hidden="true" size={17} />}
      >
        피드 전체 보기
      </ButtonLink>
    </section>
  );
}

function getLatestInProgressAttempt(attempts: LocalAssessmentAttempt[]) {
  return [...attempts]
    .filter((attempt) => attempt.state === "in_progress")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

function getLatestCompletedAttempt(attempts: LocalAssessmentAttempt[]) {
  return [...attempts]
    .filter((attempt) => attempt.state === "completed")
    .sort((a, b) =>
      (b.completedAt ?? b.updatedAt).localeCompare(
        a.completedAt ?? a.updatedAt,
      ),
    )[0];
}

function getDailyPrompt(items: FeedItem[]) {
  return (
    items.find((item) => item.kind === "daily_question") ??
    items.find((item) => item.kind === "balance_game")
  );
}

function calculateAttemptResult(attempt: LocalAssessmentAttempt) {
  return getValidatedLocalResultSnapshot(attempt)?.scoreResult ?? null;
}
