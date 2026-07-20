"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import type { NuangCharacterMotif } from "@/components/character/nuang-character-assets";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";
import type { AccountResultSummary } from "@/features/account/account-result-contract";
import { readJsonResponse } from "@/features/account/response-json";
import {
  listFreeTopicResultsLocalFirst,
  syncQueuedFreeTopicResults,
  type StoredFreeTopicResult,
} from "@/features/assessment/free-topic-storage";
import { listLocalAttempts } from "@/features/assessment/assessment-storage";
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  getCandidateDirectionCopy,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";
import type { CoreScoreResult, FacetScore } from "@/lib/scoring/types";
import styles from "./MyTraitDetailView.module.css";

const domainShortLabel: Record<string, string> = {
  ER: "감정",
  OE: "탐색",
  RO: "관계",
  SE: "에너지",
  SM: "일상",
};

type TraitDomain = {
  domainId: string;
  label: string;
  score: number | null;
  symbol?: string | null;
};

type TraitFacet = Pick<FacetScore, "facetId" | "label" | "score">;

type TraitDetail = {
  code: string;
  completedAt: string;
  domains: TraitDomain[];
  facets: TraitFacet[];
  profileName: string;
  resultHref: string;
  sourceLabel: string;
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
  const detail: TraitDetail | null = localScore
    ? buildLocalTraitDetail(localScore)
    : latestAccountResult
      ? buildAccountTraitDetail(latestAccountResult)
      : null;

  if (!loaded) {
    return <TraitDetailLoading />;
  }

  if (!detail) {
    return <TraitDetailEmpty />;
  }

  const motif: NuangCharacterMotif = "purple";
  const axisRows = nextNuangCodeScheme.positions.map((position) => ({
    position,
    domain: detail.domains.find(
      (domain) => domain.domainId === position.domainId,
    ),
    symbol: detail.code[position.codePosition - 1] ?? null,
  }));
  const domainAxes = axisRows.map(({ position, domain }) => ({
    id: position.domainId,
    label: position.label,
    shortLabel: domainShortLabel[position.domainId] ?? position.label,
    value: domain?.score ?? null,
  }));

  return (
    <div className={styles.content}>
      <section className={styles.hero}>
        <div className={styles.heroIdentity}>
          <div className={styles.characterWrap}>
            <NuangCharacter motif={motif} size="md" />
          </div>
          <div className={styles.heroCopy}>
            <p>{detail.sourceLabel} 검사 기준</p>
            <strong>{detail.code}</strong>
            <h1>{detail.profileName}</h1>
          </div>
        </div>
        <p className={styles.heroDescription}>
          현재 검사에서 가장 가까운 대표 성향이에요. 점수는 고정된 등급이
          아니라, 평소 어느 방향을 더 자주 사용하는지 보여줘요.
        </p>
        <div className={styles.heroMeta}>
          <span>{formatLongDate(detail.completedAt)} 검사</span>
          <span aria-hidden="true" />
          <span>최신 결과</span>
        </div>
        <div className={styles.heroActions}>
          <Link href={detail.resultHref}>전체 리포트 보기</Link>
          <Link href="/assessments/nu-core-full?from=my-profile&returnTo=%2Fmy%2Fprofile">
            검사 다시 하기
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeading
          description="다섯 영역을 한눈에 볼 수 있어요. 중심에서 멀수록 해당 방향의 점수가 높아요."
          eyebrow="전체 모습"
          title="코드 지도"
        />
        <div className={styles.radarWrap}>
          <TraitRadarChart
            ariaLabel="내 코드 지도"
            axes={domainAxes}
            centerLabel={detail.code}
          />
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeading
          description="선택된 문자를 강조하고, 반대 방향과의 비율도 함께 보여드려요."
          eyebrow="5개 축"
          title="코드 한 자리씩 보기"
        />
        <div className={styles.axisList}>
          {axisRows.map(({ position, domain, symbol }) => (
            <AxisRow
              domain={domain}
              key={position.domainId}
              position={position}
              symbol={domain?.symbol ?? symbol}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeading
          description="세부 문항 응답을 0~100으로 환산했어요. 50은 어느 한쪽으로 치우치지 않은 값이에요."
          eyebrow="자세히 보기"
          title="세부 반응"
        />
        {detail.facets.length > 0 ? (
          <div className={styles.facetList}>
            {detail.facets.map((facet) => (
              <CenteredFacetBar facet={facet} key={facet.facetId} />
            ))}
          </div>
        ) : (
          <p className={styles.inlineEmpty}>
            이전 결과에는 세부 반응 점수가 저장되지 않았어요. 새 코어 검사를
            완료하면 이곳에서 확인할 수 있어요.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <SectionHeading
          actionHref="/assessments"
          actionLabel="검사 둘러보기"
          description="최근 완료한 주제 검사와 점수를 다시 확인할 수 있어요."
          eyebrow="나의 기록"
          title="최근 검사 기록"
        />
        {topicResults.length > 0 ? (
          <div className={styles.recordList}>
            {topicResults.slice(0, 3).map((topicResult) => (
              <article
                className={styles.recordRow}
                key={topicResult.localResultId}
              >
                <div>
                  <strong>{topicResult.assessment.title}</strong>
                  <span>
                    {topicResult.assessment.categoryLabel} ·{" "}
                    {formatDate(topicResult.completedAt)}
                  </span>
                </div>
                <p>
                  <small>평균</small>
                  <strong>{getAverageScore(topicResult)}</strong>
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.inlineEmpty}>
            아직 완료한 주제 검사가 없어요. 궁금한 주제를 하나 골라 내 모습을 더
            자세히 살펴보세요.
          </p>
        )}
      </section>

      <p className={styles.trustNote}>
        이 화면은 가장 최근 코어 검사 결과를 이해하기 쉽게 정리한 내용이며,
        의료·임상 진단을 대신하지 않아요.
      </p>
    </div>
  );
}

function SectionHeading({
  actionHref,
  actionLabel,
  description,
  eyebrow,
  title,
}: {
  actionHref?: string;
  actionLabel?: string;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className={styles.sectionHeading}>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {actionHref && actionLabel ? (
        <Link href={actionHref}>
          {actionLabel}
          <ChevronRight aria-hidden="true" size={14} strokeWidth={1.7} />
        </Link>
      ) : null}
      <span>{description}</span>
    </div>
  );
}

function AxisRow({
  domain,
  position,
  symbol,
}: {
  domain?: TraitDomain;
  position: (typeof nextNuangCodeScheme.positions)[number];
  symbol: string | null;
}) {
  const score = domain?.score;
  const hasScore = typeof score === "number";
  const highScore = hasScore ? clampScore(score) : null;
  const lowScore = highScore === null ? null : 100 - highScore;
  const selectedSymbol = symbol ?? null;
  const directionCopy = selectedSymbol
    ? getCandidateDirectionCopy(position.codePosition, selectedSymbol)
    : null;

  return (
    <article className={styles.axisRow} data-testid="trait-axis-row">
      <div className={styles.axisHeader}>
        <div>
          <span>{position.codePosition}</span>
          <strong>{position.label}</strong>
        </div>
        {selectedSymbol ? (
          <b aria-label={`선택된 코드 ${selectedSymbol}`}>{selectedSymbol}</b>
        ) : (
          <b className={styles.axisUnknown}>-</b>
        )}
      </div>
      <p className={styles.axisSummary}>
        {directionCopy?.description ?? "이 영역은 응답이 조금 더 필요해요."}
      </p>
      {highScore !== null && lowScore !== null ? (
        <div
          aria-label={`${position.lowSymbol} ${lowScore}%, ${position.highSymbol} ${highScore}%`}
          className={styles.axisScale}
          role="img"
        >
          <div className={styles.axisTrack}>
            <span style={{ left: `${highScore}%` }} />
          </div>
          <div className={styles.axisLegend}>
            <strong
              className={
                selectedSymbol === position.lowSymbol ? styles.isSelected : ""
              }
            >
              {position.lowSymbol} <span>{lowScore}%</span>
            </strong>
            <strong
              className={
                selectedSymbol === position.highSymbol ? styles.isSelected : ""
              }
            >
              {position.highSymbol} <span>{highScore}%</span>
            </strong>
          </div>
        </div>
      ) : (
        <p className={styles.missingScore}>점수를 계산할 응답이 더 필요해요.</p>
      )}
    </article>
  );
}

function CenteredFacetBar({ facet }: { facet: TraitFacet }) {
  const hasScore = typeof facet.score === "number";
  const bounded = hasScore ? clampScore(facet.score as number) : null;

  return (
    <div
      aria-label={
        bounded === null
          ? `${facet.label} 점수 없음`
          : `${facet.label} ${bounded}점`
      }
      aria-valuemax={bounded === null ? undefined : 100}
      aria-valuemin={bounded === null ? undefined : 0}
      aria-valuenow={bounded ?? undefined}
      className={styles.facetRow}
      role={bounded === null ? undefined : "meter"}
    >
      <div>
        <strong>{facet.label}</strong>
        <span>{bounded === null ? "응답 필요" : bounded}</span>
      </div>
      <div className={styles.facetTrack}>
        <i aria-hidden="true" />
        {bounded !== null ? (
          <b aria-hidden="true" style={{ left: `${bounded}%` }} />
        ) : null}
      </div>
    </div>
  );
}

function TraitDetailLoading() {
  return (
    <div aria-live="polite" className={styles.loading} role="status">
      <div className={styles.loadingCharacter}>
        <NuangCharacter motif="purple" size="sm" />
      </div>
      <strong>내 성향을 정리하고 있어요</strong>
      <span>가장 최근 검사 결과를 불러오는 중이에요.</span>
      <i aria-hidden="true" />
    </div>
  );
}

function TraitDetailEmpty() {
  return (
    <section className={styles.empty}>
      <div className={styles.characterWrap}>
        <NuangCharacter motif="forest" size="md" />
      </div>
      <p>아직 결과가 없어요</p>
      <h1>코어 검사로 내 성향의 기준을 만들어보세요</h1>
      <span>
        검사를 완료하면 대표 코드, 5개 축의 비율과 세부 반응을 이 화면에서
        확인할 수 있어요.
      </span>
      <Link href="/assessments/nu-core-quick?returnTo=%2Fmy%2Fprofile">
        코어 검사 시작하기
      </Link>
    </section>
  );
}

function buildLocalTraitDetail({
  attempt,
  result,
}: {
  attempt: LocalAssessmentAttempt;
  result: CoreScoreResult;
}): TraitDetail {
  return {
    code: result.code ?? "-----",
    completedAt: attempt.completedAt ?? attempt.updatedAt,
    domains: result.domains,
    facets: result.facets,
    profileName: result.profileName ?? "대표 성향 계산 중",
    resultHref: `/results/local/${attempt.id}`,
    sourceLabel:
      attempt.assessmentId === "nu-core-full" ? "정밀 코어" : "빠른 코어",
  };
}

function buildAccountTraitDetail(result: AccountResultSummary): TraitDetail {
  return {
    code: result.profileCode,
    completedAt: result.completedAt,
    domains: result.domains,
    facets: result.facets,
    profileName: result.profileName,
    resultHref: `/results/account/${result.resultReportId}`,
    sourceLabel: result.kind === "full" ? "정밀 코어" : "빠른 코어",
  };
}

function buildLatestScore(attempts: LocalAssessmentAttempt[]) {
  return attempts
    .filter((attempt) => attempt.state === "completed")
    .map((attempt) => {
      const result = calculateLocalAttemptScore(attempt);
      return result ? { attempt, result } : null;
    })
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        Boolean(entry?.result.code) &&
        Boolean(getCandidateProfileDefinition(entry?.result.code ?? "")),
    )
    .sort((a, b) =>
      (b.attempt.completedAt ?? b.attempt.updatedAt).localeCompare(
        a.attempt.completedAt ?? a.attempt.updatedAt,
      ),
    )[0];
}

function buildLatestAccountResult(results: AccountResultSummary[]) {
  return results
    .filter((result) => getCandidateProfileDefinition(result.profileCode))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))[0];
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

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}
