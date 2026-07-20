"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { ButtonLink } from "@/components/ui/Button";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";
import {
  getLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import { buildPrecisionIntroHref } from "@/features/assessment/precision-entry";
import {
  getDomainNarrative,
  getHighestDomains,
} from "@/features/result/report-copy";

const toneByDomain = {
  SE: "flame",
  ER: "water",
  SM: "forest",
  RO: "primary",
  OE: "sun",
} as const;

const domainShortLabel: Record<string, string> = {
  ER: "반응",
  OE: "탐색",
  RO: "관계",
  SE: "사람",
  SM: "일상",
};

const facetShortLabel: Record<string, string> = {
  "ER-IR": "감정",
  "ER-WD": "걱정",
  "OE-AE": "새 경험",
  "OE-CI": "호기심",
  "OE-IE": "아이디어",
  "RO-EC": "관심",
  "RO-RN": "선택·존중",
  "SE-AI": "표현",
  "SE-RE": "함께",
  "SM-EP": "실행",
  "SM-OS": "정리",
};

const previewDomainAxes = [
  { id: "SE", label: "사람 사이 에너지", shortLabel: "사람", value: 72 },
  { id: "OE", label: "생각과 탐색", shortLabel: "탐색", value: 66 },
  {
    id: "RO",
    label: "관계에서 관심이 가는 곳",
    shortLabel: "관계",
    value: 58,
  },
  { id: "SM", label: "일상을 꾸리는 방식", shortLabel: "일상", value: 68 },
  { id: "ER", label: "걱정과 감정 반응", shortLabel: "반응", value: 64 },
];

export function LocalMapView() {
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [hasQuickResult, setHasQuickResult] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    listLocalAttempts().then((attempts) => {
      if (!isMounted) return;
      const fullAttempt = attempts.find(
        (attempt) =>
          attempt.state === "completed" &&
          attempt.releaseId === candidateFullCoreAssessment.releaseId,
      );
      const quickAttempt = attempts.find(
        (attempt) =>
          attempt.state === "completed" &&
          attempt.releaseId === candidateQuickCoreAssessment.releaseId,
      );
      setAttemptId(fullAttempt?.id ?? null);
      setHasQuickResult(Boolean(quickAttempt));
      setLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!loaded) {
    return (
      <div
        aria-live="polite"
        className="rounded-lg border border-line bg-white p-4 text-sm text-muted"
        role="status"
      >
        성향지도 불러오는 중
      </div>
    );
  }

  if (!attemptId) {
    return <EmptyMapState hasQuickResult={hasQuickResult} />;
  }

  return <CompletedMap attemptId={attemptId} />;
}

function CompletedMap({ attemptId }: { attemptId: string }) {
  const [attempt, setAttempt] =
    useState<Awaited<ReturnType<typeof getLocalAttempt>>>(undefined);

  useEffect(() => {
    let isMounted = true;

    getLocalAttempt(attemptId).then((nextAttempt) => {
      if (isMounted) setAttempt(nextAttempt);
    });

    return () => {
      isMounted = false;
    };
  }, [attemptId]);

  const result = useMemo(() => {
    if (!attempt) return null;
    return calculateLocalAttemptScore(attempt);
  }, [attempt]);

  if (!attempt || !result) {
    return (
      <div
        aria-live="polite"
        className="rounded-lg border border-line bg-white p-4 text-sm text-muted"
        role="status"
      >
        성향지도 계산 중
      </div>
    );
  }

  const code = result.code ?? "-----";
  const profileName = result.profileName ?? "대표 성향 계산 중";
  const motif = "purple";
  const highestDomains = getHighestDomains(result.domains, 2);
  const domainAxes = result.domains.map((domain) => ({
    id: domain.domainId,
    label: domain.label,
    shortLabel: domainShortLabel[domain.domainId] ?? domain.label,
    value: domain.score,
  }));
  const facetAxes = result.facets.map((facet) => ({
    id: facet.facetId,
    label: facet.label,
    shortLabel: facetShortLabel[facet.facetId] ?? facet.label,
    value: facet.score,
  }));

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-line bg-white shadow-[var(--shadow-soft)]">
        <div className="border-b border-line bg-surface-soft p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <StatusPill tone="primary">현재 대표 성향</StatusPill>
              <h2 className="mt-3 text-2xl font-black leading-8">
                {profileName}
              </h2>
              <p className="mt-2 text-sm font-semibold text-muted">{code}</p>
            </div>
            <NuangCharacter motif={motif} size="lg" />
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line border-t border-line text-center">
          <MetricTile
            label="대표 자리"
            value={highestDomains[0]?.label ?? "계산 중"}
          />
          <MetricTile label="지도" value="코드+신호" />
          <MetricTile label="기준" value="정밀 코어" />
        </div>
        <div className="px-4 pb-4">
          <Link
            aria-label={`${profileName} 결과 리포트 다시 보기`}
            className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-primary"
            href={`/results/local/${attempt.id}`}
          >
            리포트 다시 보기
          </Link>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
        <div>
          <StatusPill tone="primary">오각형 성향지도</StatusPill>
          <h2 className="mt-2 text-base font-bold">코드 자리 요약</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            중심에서 멀수록 해당 성향을 더 자주 쓰는 방향이에요.
          </p>
        </div>
        <TraitRadarChart
          ariaLabel="코드 자리 성향지도"
          axes={domainAxes}
          centerLabel="코드 지도"
        />
        {result.domains.map((domain) =>
          domain.score === null ? (
            <div
              className="rounded-lg border border-dashed border-line p-3 text-sm text-muted"
              key={domain.domainId}
            >
              {domain.label}: 응답이 더 필요해요
            </div>
          ) : (
            <ScoreBar
              key={domain.domainId}
              label={domain.label}
              tone={toneByDomain[domain.domainId as keyof typeof toneByDomain]}
              value={Math.round(domain.score)}
            />
          ),
        )}
      </section>

      <section className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
        <div>
          <StatusPill tone="neutral">세부 신호</StatusPill>
          <h2 className="mt-2 text-base font-bold">세부 신호 레이어</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            코드 자리 안에서 어떤 세부 신호가 더 도드라지는지 보여줘요.
          </p>
        </div>
        <TraitRadarChart
          ariaLabel="세부 신호 지도"
          axes={facetAxes}
          centerLabel="세부 신호"
        />
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">지금 두드러지는 자리</h2>
        <div className="mt-3 grid gap-3">
          {highestDomains.map((domain) => {
            const narrative = getDomainNarrative(domain);
            return (
              <div
                className="rounded-lg bg-surface-soft p-3"
                key={domain.domainId}
              >
                <p className="font-bold">{narrative.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {narrative.summary}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">최근 업데이트</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          가장 최근에 완료한 정밀 코어 결과를 기준으로 보여줍니다. 다음 검사를
          완료하면 변화도 함께 확인할 수 있어요.
        </p>
      </section>
    </>
  );
}

function EmptyMapState({ hasQuickResult }: { hasQuickResult: boolean }) {
  return (
    <section className="grid gap-4">
      <div className="overflow-hidden rounded-lg border border-line bg-white shadow-[var(--shadow-soft)]">
        <div className="bg-surface-soft p-5 text-center">
          <div className="mx-auto w-fit">
            <NuangCharacter
              motif={hasQuickResult ? "water" : "purple"}
              size="lg"
            />
          </div>
          <StatusPill tone={hasQuickResult ? "caution" : "neutral"}>
            정밀 코어 필요
          </StatusPill>
          <h2 className="mt-4 text-lg font-bold">
            아직 성향지도를 만들 수 없어요
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            성향지도는 60문항 정밀 코어 결과로만 만들어요. 빠른 코어 결과는 예비
            리포트로만 사용합니다.
          </p>
          <ButtonLink
            className="mt-5 w-full"
            href={buildPrecisionIntroHref({
              backDestination: "/map",
              entrySource: "code-map-gate",
              returnDestination: "/map",
            })}
          >
            정밀 코어 시작
          </ButtonLink>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <div>
          <StatusPill tone="primary">지도 미리보기</StatusPill>
          <h3 className="mt-2 text-base font-bold">검사 후 이렇게 열려요</h3>
        </div>
        <TraitRadarChart
          ariaLabel="성향지도 예시"
          axes={previewDomainAxes}
          caption="예시 그래프이며, 실제 값은 정밀 코어 완료 후 계산돼요."
          centerLabel="코드 지도"
        />
      </div>
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3 py-3">
      <p className="truncate text-[11px] font-bold text-muted">{label}</p>
      <p className="mt-1 truncate text-xs font-black text-foreground">
        {value}
      </p>
    </div>
  );
}
