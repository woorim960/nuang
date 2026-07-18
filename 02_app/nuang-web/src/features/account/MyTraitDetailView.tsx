"use client";

import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { NuangCharacterMotif } from "@/components/character/nuang-character-assets";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";
import {
  listFreeTopicResultsLocalFirst,
  syncQueuedFreeTopicResults,
  type StoredFreeTopicResult,
} from "@/features/assessment/free-topic-storage";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readJsonResponse } from "@/features/account/response-json";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { fullScoringRelease } from "@/features/assessment/full-core-seed";
import { quickScoringRelease } from "@/features/assessment/quick-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { calculateCoreScore } from "@/lib/scoring/core";
import type {
  CoreScoreResult,
  FacetScore,
  ItemResponse,
} from "@/lib/scoring/types";

const domainShortLabel: Record<string, string> = {
  ER: "마음",
  OE: "감각",
  RO: "관계",
  SE: "사람",
  SM: "일상",
};

const motifByPrefix: Record<string, NuangCharacterMotif> = {
  SC: "forest",
  SV: "water",
  TC: "sun",
  TV: "flame",
};

export function MyTraitDetailView() {
  const [accountResults, setAccountResults] = useState<AccountResultSummary[]>(
    [],
  );
  const [attempts, setAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [topicResults, setTopicResults] = useState<StoredFreeTopicResult[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const [nextAttempts, nextAccountResults] = await Promise.all([
        listLocalAttempts(),
        listAccountResults(),
        syncQueuedFreeTopicResults(),
      ]);

      const nextTopicResults = await listFreeTopicResultsLocalFirst();

      if (!isMounted) return;
      setAccountResults(nextAccountResults);
      setAttempts(nextAttempts);
      setTopicResults(nextTopicResults);
      setLoaded(true);
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const localScore = useMemo(() => buildLatestScore(attempts), [attempts]);
  const latestAccountResult = useMemo(
    () => buildLatestAccountResult(accountResults),
    [accountResults],
  );
  const detail = localScore
    ? buildLocalTraitDetail(localScore)
    : latestAccountResult
      ? buildAccountTraitDetail(latestAccountResult)
      : null;

  if (!loaded) {
    return (
      <section
        aria-live="polite"
        className="border-y border-line py-6 text-sm text-muted"
        role="status"
      >
        내 성향을 불러오는 중
      </section>
    );
  }

  if (!detail) {
    return (
      <section className="border-y border-line py-7">
        <h1 className="text-2xl font-black">아직 성향 결과가 없어요</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          코어 검사를 완료하면 이 화면에서 코드 지도, 세부 신호, 변화 기록을 볼
          수 있어요.
        </p>
      </section>
    );
  }

  const code = detail.code;
  const motif = motifByPrefix[code.slice(0, 2)] ?? "purple";
  const domainAxes = detail.domains.map((domain) => ({
    id: domain.domainId,
    label: domain.label,
    shortLabel: domainShortLabel[domain.domainId] ?? domain.label,
    value: domain.score,
  }));

  return (
    <div className="grid gap-6">
      <section className="border-b border-line pb-6 pt-7">
        <div className="flex items-center justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[38px] font-black leading-none tracking-normal">
              {code}
            </p>
            <h1 className="mt-3 text-2xl font-black">{detail.profileName}</h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {detail.sourceLabel}와 무료 주제 검사 기록을 함께 참고해 현재
              성향을 정리해요.
            </p>
          </div>
          <NuangCharacter motif={motif} size="lg" />
        </div>
      </section>

      <section className="border-b border-line pb-6">
        <h2 className="text-base font-bold">코드 지도</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          내 성향의 중심 구조를 오각형으로 보여줘요.
        </p>
        <div className="mt-4">
          <TraitRadarChart
            ariaLabel="내 코드 지도"
            axes={domainAxes}
            centerLabel="코드 지도"
          />
        </div>
      </section>

      <section className="border-b border-line pb-6">
        <h2 className="text-base font-bold">세부 신호</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          가운데 50을 기준으로 양쪽 방향이 펼쳐지는 방식이에요.
        </p>
        {detail.facets.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {detail.facets.map((facet) => (
              <CenteredFacetBar facet={facet} key={facet.facetId} />
            ))}
          </div>
        ) : (
          <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted">
            이전에 저장된 결과는 코드 지도 요약만 보관되어 있어요. 새 코어
            검사를 완료하면 이곳에 세부 신호까지 채워집니다.
          </p>
        )}
      </section>

      <section className="pb-8">
        <h2 className="text-base font-bold">최근 더 선명해진 부분</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          여러 검사를 통해 축적된 데이터가 충분히 같은 방향을 보여줄 때 대표
          성향이 업데이트돼요.
        </p>
        {topicResults.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {topicResults.slice(0, 3).map((topicResult) => (
              <div
                className="border-t border-line pt-3"
                key={topicResult.localResultId}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">
                      {topicResult.assessment.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {topicResult.assessment.categoryLabel} ·{" "}
                      {formatDate(topicResult.completedAt)}
                    </p>
                  </div>
                  <p className="text-lg font-black tabular-nums">
                    {getAverageScore(topicResult)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-muted">
            무료 주제 검사를 더 해보면 이곳에 변화 신호가 쌓여요.
          </p>
        )}
      </section>
    </div>
  );
}

function CenteredFacetBar({
  facet,
}: {
  facet: Pick<FacetScore, "facetId" | "label" | "score">;
}) {
  const value = facet.score ?? 50;
  const bounded = Math.max(0, Math.min(100, Math.round(value)));
  const leftWidth = bounded < 50 ? 50 - bounded : 0;
  const rightWidth = bounded >= 50 ? bounded - 50 : 0;

  return (
    <div
      aria-label={`${facet.label} ${bounded}점`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={bounded}
      role="meter"
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold">{facet.label}</span>
        <span className="tabular-nums text-muted">{bounded}</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-px bg-line">
        <div className="flex h-2.5 justify-end bg-[#f6f5f9]">
          <div
            className="h-full bg-water"
            style={{ width: `${leftWidth * 2}%` }}
          />
        </div>
        <div className="h-2.5 bg-[#f6f5f9]">
          <div
            className="h-full bg-primary"
            style={{ width: `${rightWidth * 2}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function buildLocalTraitDetail({
  attempt,
  result,
}: {
  attempt: LocalAssessmentAttempt;
  result: CoreScoreResult;
}) {
  return {
    code: result.code ?? "-----",
    domains: result.domains,
    facets: result.facets,
    profileName: result.profileName ?? "대표 성향 계산 중",
    sourceLabel:
      attempt.assessmentId === "nu-core-full" ? "정밀 코어" : "빠른 코어",
  };
}

function buildAccountTraitDetail(result: AccountResultSummary) {
  return {
    code: result.profileCode,
    domains: result.domains,
    facets: result.facets,
    profileName: result.profileName,
    sourceLabel: result.kind === "full" ? "정밀 코어" : "빠른 코어",
  };
}

function buildLatestScore(attempts: LocalAssessmentAttempt[]) {
  return attempts
    .filter((attempt) => attempt.state === "completed")
    .map((attempt) => {
      const scoringRelease =
        attempt.assessmentId === "nu-core-full"
          ? fullScoringRelease
          : quickScoringRelease;
      const responses: ItemResponse[] = Object.values(attempt.responses).map(
        (response) => ({
          itemId: response.itemId,
          isUnsure: response.isUnsure,
          value: response.value,
        }),
      );
      const result: CoreScoreResult = calculateCoreScore(
        scoringRelease,
        responses,
      );
      return { attempt, result };
    })
    .sort((a, b) =>
      (b.attempt.completedAt ?? b.attempt.updatedAt).localeCompare(
        a.attempt.completedAt ?? a.attempt.updatedAt,
      ),
    )[0];
}

function buildLatestAccountResult(results: AccountResultSummary[]) {
  return [...results].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )[0];
}

async function listAccountResults(): Promise<AccountResultSummary[]> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });

    if (!response.ok) return [];

    const body = await readJsonResponse<{
      ok?: boolean;
      results?: AccountResultSummary[];
    }>(response);

    return body?.ok && Array.isArray(body.results) ? body.results : [];
  } catch {
    return [];
  }
}

function getAverageScore(result: StoredFreeTopicResult) {
  const values = Object.values(result.result.scoresByTargetId);
  if (values.length === 0) return "-";

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}
