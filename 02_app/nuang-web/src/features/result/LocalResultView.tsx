"use client";

import { ArrowLeft, ListChecks, MapPinned, Share2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { StatusPill } from "@/components/ui/StatusPill";
import { getLocalAttempt } from "@/features/assessment/assessment-storage";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import {
  quickCoreAssessment,
  quickScoringRelease,
} from "@/features/assessment/quick-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { calculateCoreScore } from "@/lib/scoring/core";
import type { DomainScore, FacetScore, ItemResponse } from "@/lib/scoring/types";
import {
  coreResultCopyVersion,
  getDomainNarrative,
  getFacetInsight,
  getHighestDomains,
  getLowestDomains,
} from "@/features/result/report-copy";
import { shareResultImage } from "@/features/result/share-image";
import { createApiClosedPayload } from "@/lib/api/closed-state-data";

type LocalResultViewProps = {
  localResultId: string;
};

const motifByPrefix = {
  TV: "flame",
  TC: "sun",
  SV: "water",
  SC: "forest",
} as const;

const toneByDomain = {
  SE: "flame",
  ER: "water",
  SM: "forest",
  RO: "primary",
  OE: "sun",
} as const;

export function LocalResultView({ localResultId }: LocalResultViewProps) {
  const [attempt, setAttempt] = useState<LocalAssessmentAttempt | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const [shareState, setShareState] = useState<
    "downloaded" | "error" | "idle" | "shared" | "working"
  >("idle");

  useEffect(() => {
    let isMounted = true;

    getLocalAttempt(localResultId).then((nextAttempt) => {
      if (!isMounted) return;
      if (!nextAttempt) {
        setIsMissing(true);
        return;
      }
      setAttempt(nextAttempt);
    });

    return () => {
      isMounted = false;
    };
  }, [localResultId]);

  const result = useMemo(() => {
    if (!attempt) return null;
    const scoringRelease =
      attempt.assessmentId === "nu-core-full"
        ? fullScoringRelease
        : quickScoringRelease;
    const responses: ItemResponse[] = Object.values(attempt.responses).map(
      (response) => ({
        itemId: response.itemId,
        value: response.value,
        isUnsure: response.isUnsure,
      }),
    );

    return calculateCoreScore(scoringRelease, responses);
  }, [attempt]);

  if (isMissing) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
        <MissingResult />
      </main>
    );
  }

  if (!attempt || !result) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
        <div
          aria-live="polite"
          className="rounded-lg border border-line bg-white p-5 text-sm text-muted"
          role="status"
        >
          결과 불러오는 중
        </div>
      </main>
    );
  }

  const code = result.code ?? "-----";
  const domains = result.domains;
  const prefix = code.slice(0, 2) as keyof typeof motifByPrefix;
  const motif = motifByPrefix[prefix] ?? "purple";
  const profileName = result.profileName ?? "예비 결과를 계산할 수 없어요";
  const assessment =
    attempt.assessmentId === "nu-core-full" ? fullCoreAssessment : quickCoreAssessment;
  const isFull = attempt.assessmentId === "nu-core-full";
  const boundaryDomains = domains.filter((domain) => domain.isBoundary);
  const resultCopyVersion = attempt.resultCopyVersion ?? coreResultCopyVersion;
  const accountSaveClosedState = createApiClosedPayload(
    "result_claim_db_write_pending",
  );
  const answeredCount = Object.keys(attempt.responses).length;
  const alternativeNames = result.alternativeCodes
    .map((alternativeCode) => quickScoringRelease.profileNames[alternativeCode])
    .filter(Boolean)
    .slice(0, 2);
  const highestDomains = getHighestDomains(domains, 2);
  const lowestDomains = getLowestDomains(domains, 2);

  async function handleShareImage() {
    try {
      setShareState("working");
      const outcome = await shareResultImage({
        code,
        domains,
        motif,
        profileName,
        resultLabel: assessment.resultLabel,
      });
      setShareState(outcome);
    } catch {
      setShareState("error");
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
      <Link
        aria-label="홈으로 돌아가기"
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-muted"
        href="/home"
      >
        <ArrowLeft size={18} />
        홈
      </Link>

      <section className="mt-6 rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="primary">{assessment.resultLabel}</StatusPill>
              <StatusPill tone="neutral">
                문구 v{toDisplayVersion(resultCopyVersion)}
              </StatusPill>
            </div>
            <h1 className="mt-3 text-2xl font-black leading-8">{profileName}</h1>
            <p className="mt-2 text-sm font-semibold text-muted">{code}</p>
          </div>
          <NuangCharacter motif={motif} size="lg" />
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">
          {isFull
            ? "60문항으로 확인한 현재 성향 결과예요. 이후 성향지도 저장은 계정 연결 뒤 이어집니다."
            : "20문항으로 확인한 예비 결과예요. 정밀 코어를 완료하면 세부 설명과 대표 성향이 달라질 수 있어요."}
        </p>
        <p className="mt-3 text-xs leading-5 text-muted">
          검사일 {formatCompletedDate(attempt.completedAt ?? attempt.updatedAt)} · 응답{" "}
          {answeredCount}개 · 로컬 저장 결과
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <ButtonLink
            className="w-full px-3"
            href="/my"
            variant="secondary"
          >
            로컬 관리
          </ButtonLink>
          <Button
            aria-busy={shareState === "working"}
            aria-label="결과 이미지 파일로 저장하거나 기기 공유 시트 열기"
            className="w-full px-3"
            disabled={shareState === "working"}
            icon={<Share2 size={17} />}
            onClick={handleShareImage}
          >
            {shareState === "working" ? "생성 중" : "이미지 저장"}
          </Button>
        </div>
        <p className="mt-2 text-xs leading-5 text-muted">
          서버 공유 링크를 만들지 않고, 이 기기에 결과 이미지만 생성합니다.
        </p>
        {shareState === "shared" && (
          <p
            aria-live="polite"
            className="mt-3 text-center text-xs text-muted"
            role="status"
          >
            이미지 공유 시트를 열었어요.
          </p>
        )}
        {shareState === "downloaded" && (
          <p
            aria-live="polite"
            className="mt-3 text-center text-xs text-muted"
            role="status"
          >
            결과 이미지 파일을 저장했어요.
          </p>
        )}
        {shareState === "error" && (
          <p className="mt-3 text-center text-xs text-muted" role="alert">
            이미지 생성에 실패했어요. 잠시 뒤 다시 시도해주세요.
          </p>
        )}
      </section>

      <section
        aria-label="결과 활용"
        className="mt-5 rounded-lg border border-line bg-white p-4"
      >
        <StatusPill tone="primary">다음 행동</StatusPill>
        <h2 className="mt-3 text-base font-bold">결과를 어디에 쓸까요</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {isFull
            ? "성향지도와 함께 탭에서 이 결과를 바로 읽고, 공개 범위는 마이 탭에서 확인해요."
            : "예비 결과로 방향을 먼저 보고, 정밀 코어를 완료하면 성향지도와 대표 성향이 더 안정됩니다."}
        </p>
        <div className="mt-4 grid gap-2">
          <ButtonLink
            aria-label="성향지도 열기"
            className="w-full justify-start"
            href="/map"
            icon={<MapPinned aria-hidden="true" size={17} />}
            variant="secondary"
          >
            성향지도 열기
          </ButtonLink>
          <ButtonLink
            aria-label="함께 탭에서 피드와 비교 흐름 보기"
            className="w-full justify-start"
            href="/together"
            icon={<UsersRound aria-hidden="true" size={17} />}
            variant="secondary"
          >
            함께에서 읽기
          </ButtonLink>
          <ButtonLink
            aria-label={isFull ? "공개 범위 확인하기" : "정밀 코어로 확장하기"}
            className="w-full justify-start"
            href={isFull ? "/my" : "/assessments/nu-core-full"}
            icon={<ListChecks aria-hidden="true" size={17} />}
            variant="secondary"
          >
            {isFull ? "공개 범위 확인" : "정밀 코어로 확장"}
          </ButtonLink>
        </div>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="success">로컬 저장됨</StatusPill>
          <StatusPill tone="neutral">계정 저장 준비 중</StatusPill>
        </div>
        <h2 className="mt-3 text-base font-bold">저장 상태</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          이 결과는 이 기기에 30일 동안 보관돼요. 다른 기기에서 이어 보거나
          장기 보관하려면 계정 저장 기능이 필요합니다.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          만료일은 {formatCompletedDate(attempt.expiresAt)}입니다. 같은 검사를
          다시 할 때는 30일 뒤를 권장하고, 생활 변화 확인은 90일 이상 간격을
          두고 보는 편이 좋아요.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          {accountSaveClosedState.safeFallback}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">
          <span className="font-semibold text-foreground">다음 단계 </span>
          {accountSaveClosedState.display.nextStep}
        </p>
        <ButtonLink className="mt-4 w-full" href="/my" variant="secondary">
          로컬 결과 관리
        </ButtonLink>
      </section>

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">요약</h2>
        <div className="mt-3 grid gap-3">
          {highestDomains.map((domain) => {
            const narrative = getDomainNarrative(domain);
            return (
              <div
                className="rounded-lg bg-surface-soft p-3"
                key={domain.domainId}
              >
                <p className="text-sm font-bold">{narrative.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {narrative.summary}
                </p>
              </div>
            );
          })}
        </div>
        {lowestDomains.length > 0 && (
          <p className="mt-3 text-sm leading-6 text-muted">
            상대적으로 낮게 나온 축은{" "}
            <span className="font-semibold text-foreground">
              {lowestDomains.map((domain) => domain.label).join(", ")}
            </span>
            입니다. 낮다는 말은 부족함이 아니라 에너지를 덜 쓰는 방향에
            가깝다는 뜻이에요.
          </p>
        )}
      </section>

      <section className="mt-5 grid gap-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">
          {isFull ? "5개 영역" : "5개 영역 예비 방향"}
        </h2>
        {domains.map((domain) => (
          <DomainScoreBar domain={domain} key={domain.domainId} />
        ))}
      </section>

      {isFull && (
        <section className="mt-5 grid gap-4 rounded-lg border border-line bg-white p-4">
          <h2 className="text-base font-bold">10개 세부 성향</h2>
          {result.facets.map((facet) => (
            <FacetScoreBar
              facet={facet}
              key={facet.facetId}
              tone={facetTone(facet.facetId, assessment.items)}
            />
          ))}
        </section>
      )}

      <section className="mt-5 grid gap-4 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">
          {isFull ? "생활 속 모습" : "예비 해석"}
        </h2>
        {domains.map((domain) => (
          <DomainReportBlock domain={domain} key={domain.domainId} />
        ))}
      </section>

      {isFull && (
        <section className="mt-5 grid gap-3 rounded-lg border border-line bg-white p-4">
          <h2 className="text-base font-bold">세부 설명</h2>
          {result.facets.map((facet) => (
            <FacetInsight facet={facet} key={facet.facetId} />
          ))}
        </section>
      )}

      {isFull && (
        <section className="mt-5 rounded-lg border border-line bg-white p-4">
          <h2 className="text-base font-bold">경계와 가까운 대안</h2>
          {boundaryDomains.length > 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted">
              {boundaryDomains.map((domain) => domain.label).join(", ")} 영역은
              경계에 가까워 상황에 따라 다른 모습도 함께 나타날 수 있어요.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted">
              지금 결과에서는 경계 구간에 걸친 영역이 크게 보이지 않아요.
            </p>
          )}
          {alternativeNames.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {alternativeNames.map((name) => (
                <StatusPill key={name} tone="neutral">
                  {name}
                </StatusPill>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="mt-5 rounded-lg border border-line bg-white p-4">
        <h2 className="text-base font-bold">읽을 때 기억할 점</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-muted">
          <p>
            이 결과는 자기보고 응답을 바탕으로 한 성향 요약이며 진단이나 능력
            판정이 아니에요.
          </p>
          <p>
            점수는 뉴앙 내부 변환 점수입니다. 아직 또래 대비 백분위나 순위를
            의미하지 않아요.
          </p>
          <p>
            대표 성향 이름은 대화를 쉽게 하기 위한 제목이고, 실제 해석은 각
            영역 설명과 경계 구간을 함께 봐야 정확해요.
          </p>
          <p>
            같은 버전 재검사는 30일 뒤를 권장하고, 일상 변화 확인은 90일 이상
            간격을 두고 보는 편이 좋아요.
          </p>
          <p>
            결과 문구는 {resultCopyVersion} 기준이며, 공개 전까지 내부 QA를
            계속 거칩니다.
          </p>
        </div>
      </section>

      {!isFull && (
        <section className="mt-5 rounded-lg border border-line bg-white p-4">
          <h2 className="text-base font-bold">다음 단계</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            정밀 코어 40문항을 더 답하면 10개 세부 성향과 경계 구간을 더 차분히
            볼 수 있어요.
          </p>
          <ButtonLink className="mt-4 w-full" href="/assessments/nu-core-full">
            정밀 코어로 이어가기
          </ButtonLink>
        </section>
      )}
    </main>
  );
}

function DomainReportBlock({ domain }: { domain: DomainScore }) {
  const narrative = getDomainNarrative(domain);

  return (
    <article className="rounded-lg border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-muted">{domain.label}</p>
          <h3 className="mt-1 font-bold">{narrative.title}</h3>
        </div>
        {domain.score !== null && (
          <span className="tabular-nums text-sm font-semibold text-primary">
            {Math.round(domain.score)}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{narrative.summary}</p>
      {narrative.strengths.length > 0 && (
        <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted">
          {narrative.strengths.slice(0, 2).map((strength) => (
            <li className="rounded-lg bg-surface-soft px-3 py-2" key={strength}>
              {strength}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid gap-2 text-sm leading-6">
        <p>
          <span className="font-semibold text-foreground">살펴볼 점 </span>
          <span className="text-muted">{narrative.watch}</span>
        </p>
        <p>
          <span className="font-semibold text-foreground">관계 팁 </span>
          <span className="text-muted">{narrative.relation}</span>
        </p>
        <p>
          <span className="font-semibold text-foreground">작은 실험 </span>
          <span className="text-muted">{narrative.action}</span>
        </p>
      </div>
    </article>
  );
}

function FacetInsight({ facet }: { facet: FacetScore }) {
  return (
    <div className="rounded-lg bg-surface-soft p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold">{facet.label}</p>
        {facet.score !== null && (
          <span className="tabular-nums text-sm font-semibold text-primary">
            {Math.round(facet.score)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-6 text-muted">{getFacetInsight(facet)}</p>
    </div>
  );
}

function DomainScoreBar({ domain }: { domain: DomainScore }) {
  const tone =
    toneByDomain[domain.domainId as keyof typeof toneByDomain] ?? "primary";

  if (domain.score === null) {
    return (
      <div className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
        {domain.label}: 응답이 더 필요해요
      </div>
    );
  }

  return (
    <ScoreBar
      label={domain.label}
      tone={tone}
      value={Math.round(domain.score)}
    />
  );
}

function FacetScoreBar({
  facet,
  tone,
}: {
  facet: FacetScore;
  tone: "primary" | "flame" | "sun" | "water" | "forest";
}) {
  if (facet.score === null) {
    return (
      <div className="rounded-lg border border-dashed border-line p-3 text-sm text-muted">
        {facet.label}: 응답이 더 필요해요
      </div>
    );
  }

  return <ScoreBar label={facet.label} tone={tone} value={Math.round(facet.score)} />;
}

function facetTone(
  facetId: string,
  items: Array<{ facetId: string; domainId: string }>,
): "primary" | "flame" | "sun" | "water" | "forest" {
  const domainId = items.find((item) => item.facetId === facetId)?.domainId;
  return toneByDomain[domainId as keyof typeof toneByDomain] ?? "primary";
}

function formatCompletedDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "알 수 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function toDisplayVersion(value: string) {
  const match = value.match(/v(\d+\.\d+)$/);
  return match?.[1] ?? value;
}

function MissingResult() {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h1 className="text-xl font-black">로컬 결과를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        이 기기의 저장 기간이 지났거나 기록이 삭제됐을 수 있어요.
      </p>
      <ButtonLink className="mt-5 w-full" href="/assessments/nu-core-quick">
        빠른 코어 다시 하기
      </ButtonLink>
    </section>
  );
}
