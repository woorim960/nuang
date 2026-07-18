"use client";

import { ArrowLeft, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { NuangCharacter } from "@/components/character/NuangCharacter";
import { ButtonLink } from "@/components/ui/Button";
import { TraitRadarChart } from "@/components/ui/TraitRadarChart";
import {
  deleteLocalAttempt,
  getLocalAttempt,
} from "@/features/assessment/assessment-storage";
import {
  hasUniformCoreResponses,
  prepareAssessmentCompletion,
} from "@/features/assessment/assessment-completion";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import {
  candidateQuickCoreAssessment,
  isCandidateQuickRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import {
  candidateFullCoreAssessment,
  isCandidateFullRelease,
} from "@/features/assessment/candidate-full-core-seed";
import {
  fullCoreAssessment,
  fullScoringRelease,
} from "@/features/assessment/full-core-seed";
import {
  quickCoreAssessment,
  quickScoringRelease,
} from "@/features/assessment/quick-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { getValidatedLocalResultSnapshot } from "@/features/assessment/assessment-result-snapshot";
import {
  buildPrecisionIntroHref,
  sanitizePrecisionDestination,
} from "@/features/assessment/precision-entry";
import type { ResultAccountStatus } from "@/features/account/result-account-status";
import type {
  CoreScoreResult,
  DomainScore,
  FacetScore,
} from "@/lib/scoring/types";
import {
  getDomainNarrative,
  getFacetInsight,
  getHighestDomains,
  getLowestDomains,
} from "@/features/result/report-copy";
import { shareResultImage } from "@/features/result/share-image";
import {
  CandidateCoreResultView,
  CandidateResponseReviewResultView,
  CandidateResultLoadingState,
  CandidateUndeterminedResultView,
} from "@/features/result/CandidateCoreResultView";
import type { ConsentDraft } from "@/features/consent/consent-draft";
import { isCoreResultUndetermined } from "@/lib/scoring/core";

type LocalResultViewProps = {
  localResultId: string;
};

const motifByPrefix = {
  TV: "flame",
  TC: "sun",
  SV: "water",
  SC: "forest",
} as const;

const domainShortLabel: Record<string, string> = {
  ER: "마음",
  OE: "감각",
  RO: "관계",
  SE: "사람",
  SM: "일상",
};

const facetShortLabel: Record<string, string> = {
  "ER-IR": "감정",
  "ER-WD": "걱정",
  "OE-AS": "감각",
  "OE-IE": "아이디어",
  "RO-EC": "공감",
  "RO-RN": "기준",
  "SE-AI": "표현",
  "SE-RE": "함께",
  "SM-EP": "실행",
  "SM-OS": "정리",
};

export function LocalResultView({ localResultId }: LocalResultViewProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<LocalAssessmentAttempt | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const [shareState, setShareState] = useState<
    "downloaded" | "error" | "idle" | "shared" | "working"
  >("idle");
  const [claimState, setClaimState] = useState<
    | "checking"
    | "error"
    | "idle"
    | "missing_consent"
    | "saved"
    | "saving"
    | "unauthenticated"
  >("checking");
  const [shareLinkState, setShareLinkState] = useState<
    "copied" | "error" | "idle" | "making" | "ready"
  >("idle");
  const [feedShareState, setFeedShareState] = useState<
    "error" | "idle" | "posted" | "posting"
  >("idle");
  const [serverResultReportId, setServerResultReportId] = useState<
    string | null
  >(null);
  const [serverShareUrl, setServerShareUrl] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<"error" | "idle" | "working">(
    "idle",
  );

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

  useEffect(() => {
    if (!attempt) return;
    if (
      attempt.assessmentId === betaCoreAssessment.assessmentId ||
      isCandidateQuickRelease(attempt) ||
      isCandidateFullRelease(attempt)
    ) {
      return;
    }

    let isMounted = true;

    readAccountStatus(localResultId).then((status) => {
      if (!isMounted) return;

      if (!status) {
        setClaimState("idle");
        return;
      }

      setServerResultReportId(status.resultReportId);
      setClaimState("saved");
    });

    return () => {
      isMounted = false;
    };
  }, [attempt, localResultId]);

  const resultSnapshot = useMemo(
    () => (attempt ? getValidatedLocalResultSnapshot(attempt) : null),
    [attempt],
  );
  const result = resultSnapshot?.scoreResult ?? null;
  const candidateAssessment =
    attempt?.assessmentId === betaCoreAssessment.assessmentId
      ? betaCoreAssessment
      : attempt && isCandidateFullRelease(attempt)
        ? candidateFullCoreAssessment
      : attempt && isCandidateQuickRelease(attempt)
        ? candidateQuickCoreAssessment
        : null;
  const isCandidateResult = Boolean(candidateAssessment);
  const needsResponseReview = Boolean(
    attempt &&
    candidateAssessment &&
    hasUniformCoreResponses(candidateAssessment, attempt),
  );
  const shouldWithholdCandidateResult = useMemo(() => {
    if (!attempt || !candidateAssessment || attempt.resultSnapshot) return false;

    try {
      return (
        prepareAssessmentCompletion(candidateAssessment, {
          ...attempt,
          localPersistStatus: "saved",
        }).evidenceStatus === "insufficient_evidence"
      );
    } catch {
      return false;
    }
  }, [attempt, candidateAssessment]);

  useEffect(() => {
    if (
      !attempt ||
      !resultSnapshot ||
      isCandidateResult ||
      !result?.code ||
      !result.profileName ||
      claimState !== "idle"
    ) {
      return;
    }

    const consentDraft = readStoredConsentDraft();

    if (!consentDraft) return;

    let isMounted = true;

    void Promise.resolve().then(async () => {
      if (!isMounted) return;
      setClaimState("saving");

      try {
        const outcome = await claimLocalResult({
          attempt,
          consentDraft,
          result,
          versionBundle: {
            assessmentReleaseId: resultSnapshot.assessmentReleaseId,
            codeSchemeVersion: resultSnapshot.codeSchemeVersion,
            scoringModelVersion: resultSnapshot.scoringModelVersion,
            scoringReleaseId: resultSnapshot.scoringReleaseId,
          },
        });

        if (!isMounted) return;

        if (outcome.state !== "saved") {
          setClaimState(outcome.state);
          return;
        }

        setServerResultReportId(outcome.resultReportId);
        setClaimState("saved");

        if (outcome.restored) {
          const status = await readAccountStatus(attempt.id);

          if (isMounted && status) {
            setServerResultReportId(status.resultReportId);
          }
        }
      } catch {
        if (isMounted) setClaimState("error");
      }
    });

    return () => {
      isMounted = false;
    };
  }, [attempt, claimState, isCandidateResult, result, resultSnapshot]);

  if (isMissing) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
        <MissingResult />
      </main>
    );
  }

  if (!attempt) {
    return <CandidateResultLoadingState />;
  }

  if (needsResponseReview) {
    return <CandidateResponseReviewResultView attempt={attempt} />;
  }

  if (
    shouldWithholdCandidateResult ||
    (isCandidateResult &&
      attempt.resultSnapshot?.scoreResult &&
      isCoreResultUndetermined(attempt.resultSnapshot.scoreResult))
  ) {
    return <CandidateUndeterminedResultView attempt={attempt} />;
  }

  if (!result || !result.code || !result.profileName) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
        <UnavailableVersionedResult assessmentId={attempt.assessmentId} />
      </main>
    );
  }

  if (isCandidateResult) {
    return <CandidateCoreResultView attempt={attempt} result={result} />;
  }

  const code = result.code;
  const domains = result.domains;
  const prefix = code.slice(0, 2) as keyof typeof motifByPrefix;
  const motif = motifByPrefix[prefix] ?? "purple";
  const profileName = result.profileName;
  const assessment =
    attempt.assessmentId === "nu-core-full"
      ? fullCoreAssessment
      : quickCoreAssessment;
  const isFull = attempt.assessmentId === "nu-core-full";
  const returnDestination = sanitizePrecisionDestination(
    attempt.returnDestination,
  );
  const nextAction = getNextResultAction({
    isFull,
    localResultId,
    returnDestination,
  });
  const boundaryDomains = domains.filter((domain) => domain.isBoundary);
  const answeredCount = Object.keys(attempt.responses).length;
  const alternativeNames = result.alternativeCodes
    .map(
      (alternativeCode) =>
        (isFull ? fullScoringRelease : quickScoringRelease).profileNames[
          alternativeCode
        ],
    )
    .filter(Boolean)
    .slice(0, 2);
  const highestDomains = getHighestDomains(domains, 2);
  const lowestDomains = getLowestDomains(domains, 2);
  const domainAxes = domains.map((domain) => ({
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

  async function handleCreateShareLink() {
    const consentDraft = readStoredConsentDraft();

    if (!serverResultReportId || !consentDraft) {
      setShareLinkState("error");
      return;
    }

    try {
      setShareLinkState("making");
      const response = await fetch("/api/share-links", {
        body: JSON.stringify({
          consentDraft,
          resultReportId: serverResultReportId,
          ttlDays: 30,
          visibility: "summary",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const body = await response.json();

      if (!response.ok || !body.ok) {
        setShareLinkState("error");
        return;
      }

      setServerShareUrl(body.shareLink.url);
      try {
        await copyShareUrlToClipboard(body.shareLink.url);
        setShareLinkState("copied");
      } catch {
        setShareLinkState("ready");
      }
    } catch {
      setShareLinkState("error");
    }
  }

  async function handleShareToFeed() {
    if (!serverResultReportId) {
      setFeedShareState("error");
      return;
    }

    try {
      setFeedShareState("posting");
      const response = await fetch("/api/feed", {
        body: JSON.stringify({
          action: "create_post",
          attachments: [
            {
              id: serverResultReportId,
              type: "result_summary",
            },
          ],
          body: `${code} ${profileName} 리포트를 공유했어요.`,
          source: "report_share",
          visibility: "public",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
      } | null;

      if (!response.ok || !payload?.ok) {
        setFeedShareState("error");
        return;
      }

      setFeedShareState("posted");
      router.push("/feed");
      router.refresh();
    } catch {
      setFeedShareState("error");
    }
  }

  async function handleDeleteResult() {
    const confirmed = window.confirm(
      "이 결과를 삭제할까요? 삭제하면 다시 열 수 없고 공유 주소와 비교 기록도 함께 삭제돼요.",
    );

    if (!confirmed) return;

    setDeleteState("working");

    try {
      if (serverResultReportId) {
        const response = await fetch("/api/account-results", {
          body: JSON.stringify({
            localResultId,
            resultReportId: serverResultReportId,
          }),
          headers: {
            "content-type": "application/json",
          },
          method: "DELETE",
        });
        const body = (await response.json()) as { ok?: boolean };

        if (!response.ok || !body.ok) {
          setDeleteState("error");
          return;
        }
      }

      await deleteLocalAttempt(localResultId);
      router.replace("/my");
    } catch {
      setDeleteState("error");
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 pb-12">
      <header className="sticky top-0 z-10 -mx-5 grid h-14 grid-cols-[40px_minmax(0,1fr)_40px] items-center border-b border-line bg-white/95 px-4 backdrop-blur-xl">
        <Link
          aria-label="홈으로 돌아가기"
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface"
          href="/home"
        >
          <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.9} />
        </Link>
        <p className="truncate px-2 text-center text-sm font-bold">
          결과 리포트
        </p>
        <button
          aria-busy={shareState === "working"}
          aria-label="결과 이미지 파일로 저장하거나 기기 공유 시트 열기"
          className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          disabled={shareState === "working"}
          onClick={handleShareImage}
          type="button"
        >
          <Share2 aria-hidden="true" size={20} strokeWidth={1.9} />
        </button>
      </header>

      <section className="border-b border-line pb-6 pt-7">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-muted">
              {assessment.resultLabel}
            </p>
            <p className="mt-2 text-[34px] font-black leading-none tracking-normal text-ink">
              {code}
            </p>
            <h1 className="mt-3 text-2xl font-black leading-8">
              {profileName}
            </h1>
          </div>
          <NuangCharacter motif={motif} size="lg" />
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">
          {isFull
            ? "60문항으로 살펴본 현재의 성향이에요. 점수보다 반복해서 나타나는 방향을 중심으로 읽어보세요."
            : "20문항으로 살펴본 예비 방향이에요. 정밀 코어를 완료하면 세부 설명과 대표 성향이 달라질 수 있어요."}
        </p>
        <p className="mt-3 text-xs leading-5 text-muted">
          {formatCompletedDate(attempt.completedAt ?? attempt.updatedAt)} · 응답{" "}
          {answeredCount}개
        </p>
        {shareState === "shared" && (
          <p
            aria-live="polite"
            className="mt-3 text-xs text-muted"
            role="status"
          >
            이미지 공유 시트를 열었어요.
          </p>
        )}
        {shareState === "downloaded" && (
          <p
            aria-live="polite"
            className="mt-3 text-xs text-muted"
            role="status"
          >
            결과 이미지 파일을 저장했어요.
          </p>
        )}
        {shareState === "error" && (
          <p className="mt-3 text-xs text-muted" role="alert">
            이미지 생성에 실패했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
      </section>

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">핵심 요약</h2>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {highestDomains.map((domain) => {
            const narrative = getDomainNarrative(domain);
            return (
              <div className="py-3" key={domain.domainId}>
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
            {lowestDomains.map((domain) => domain.label).join(", ")} 영역은
            상대적으로 에너지를 덜 쓰는 방향에 가까워요. 부족함이나 순위를
            뜻하지 않습니다.
          </p>
        )}
      </section>

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">
          {isFull ? "코드 지도" : "코드 자리 예비 방향"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          중심에서 멀수록 그 성향을 더 자주 사용하는 편이에요.
        </p>
        <TraitRadarChart
          ariaLabel="코드 지도 그래프"
          axes={domainAxes}
          centerLabel="코드 지도"
        />
      </section>

      {isFull && (
        <section className="border-b border-line py-6">
          <h2 className="text-base font-bold">세부 신호</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            같은 영역 안에서도 어떤 방식이 더 선명한지 보여줘요.
          </p>
          <TraitRadarChart
            ariaLabel="세부 신호 그래프"
            axes={facetAxes}
            centerLabel="세부 신호"
          />
        </section>
      )}

      <section aria-label="결과 활용" className="border-b border-line py-6">
        <h2 className="text-base font-bold">다음으로</h2>
        <p className="mt-1 text-sm leading-6 text-muted">
          {isFull
            ? "성향지도에서 그래프를 다시 보고, 필요한 공개 범위는 설정에서 확인할 수 있어요."
            : "정밀 코어를 이어서 완료하면 세부 신호와 더 안정적인 대표 성향을 볼 수 있어요."}
        </p>
        <Link
          aria-label={nextAction.accessibleLabel}
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#111111] px-4 text-sm font-bold text-white hover:bg-[#2a2a2a]"
          href={nextAction.href}
        >
          {nextAction.label}
        </Link>
        {isFull && (
          <div className="mt-3 flex items-center justify-center gap-5 text-sm font-semibold">
            <Link className="text-muted hover:text-ink" href="/my/reports">
              내 리포트
            </Link>
            <Link
              className="text-muted hover:text-ink"
              href="/my/settings/visibility"
            >
              공개 범위 설정
            </Link>
          </div>
        )}
      </section>

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">공유</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          주소로 공유된 리포트에는 뉴앙 코드와 코드 자리 요약만 담겨요. 직접
          응답과 세부 점수는 다른 사람에게 보이지 않고, 공유 주소는 30일 뒤
          자동으로 만료됩니다.
        </p>
        <div className="mt-4">
          {claimState === "saved" ? (
            <div className="grid gap-2">
              <button
                aria-busy={shareLinkState === "making"}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#111111] px-4 text-sm font-bold text-white hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={shareLinkState === "making"}
                onClick={handleCreateShareLink}
                type="button"
              >
                {shareLinkState === "making"
                  ? "공유 주소 준비 중"
                  : "공유 주소 복사"}
              </button>
              <button
                aria-busy={feedShareState === "posting"}
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg border border-line px-4 text-sm font-bold text-ink hover:bg-[#f7f7f7] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={feedShareState === "posting"}
                onClick={handleShareToFeed}
                type="button"
              >
                {feedShareState === "posting"
                  ? "피드에 공유 중"
                  : "피드에 공유"}
              </button>
            </div>
          ) : claimState === "checking" || claimState === "saving" ? (
            <p
              aria-live="polite"
              className="py-3 text-sm text-muted"
              role="status"
            >
              공유 기능을 준비하고 있어요.
            </p>
          ) : (
            <Link
              className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-[#111111] px-4 text-sm font-bold text-white hover:bg-[#2a2a2a]"
              href={`/login?next=${encodeURIComponent(`/results/local/${localResultId}`)}`}
            >
              로그인하고 공유하기
            </Link>
          )}
          <Link
            className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-muted hover:text-ink"
            href="/my"
          >
            내 결과 관리
          </Link>
        </div>
        {(claimState === "missing_consent" ||
          claimState === "unauthenticated" ||
          claimState === "idle") && (
          <p className="mt-3 text-sm leading-6 text-muted" role="status">
            공유하려면 로그인과 필수 확인을 마쳐 주세요.
          </p>
        )}
        {claimState === "error" && (
          <p className="mt-3 text-sm leading-6 text-muted" role="alert">
            공유 기능을 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
        {serverShareUrl && (
          <p
            className="mt-3 break-all text-sm leading-6 text-muted"
            role="status"
          >
            공유 주소가 준비됐어요. {serverShareUrl}
          </p>
        )}
        {shareLinkState === "copied" && (
          <p className="mt-2 text-sm leading-6 text-muted" role="status">
            공유 주소를 복사했어요. 30일 동안 열 수 있어요.
          </p>
        )}
        {shareLinkState === "ready" && (
          <p className="mt-2 text-sm leading-6 text-muted" role="status">
            공유 주소가 준비됐어요. 위 주소를 길게 눌러 복사할 수 있어요.
          </p>
        )}
        {shareLinkState === "error" && (
          <p className="mt-2 text-sm leading-6 text-muted" role="alert">
            공유를 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
        {feedShareState === "posted" && (
          <p className="mt-2 text-sm leading-6 text-muted" role="status">
            피드에 공유했어요.
          </p>
        )}
        {feedShareState === "error" && (
          <p className="mt-2 text-sm leading-6 text-muted" role="alert">
            피드 공유를 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
      </section>

      <section className="border-b border-line py-6">
        <h2 className="text-base font-bold">
          {isFull ? "생활 속 모습" : "예비 해석"}
        </h2>
        <div className="mt-3 divide-y divide-line border-y border-line">
          {domains.map((domain) => (
            <DomainReportBlock domain={domain} key={domain.domainId} />
          ))}
        </div>
      </section>

      {isFull && (
        <section className="border-b border-line py-6">
          <h2 className="text-base font-bold">세부 설명</h2>
          <div className="mt-3 divide-y divide-line border-y border-line">
            {result.facets.map((facet) => (
              <FacetInsight facet={facet} key={facet.facetId} />
            ))}
          </div>
        </section>
      )}

      {isFull && (
        <section className="border-b border-line py-6">
          <h2 className="text-base font-bold">균형 구간에서 함께 볼 표현</h2>
          {boundaryDomains.length > 0 ? (
            <p className="mt-2 text-sm leading-6 text-muted">
              {boundaryDomains.map((domain) => domain.label).join(", ")} 영역은
              한쪽으로만 고정되지 않고 상황에 따라 다른 모습도 함께 나타날 수
              있어요.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-muted">
              지금 결과에서는 균형 구간에 걸친 영역이 크게 보이지 않아요.
            </p>
          )}
          {alternativeNames.length > 0 && (
            <p className="mt-3 text-sm leading-6 text-muted">
              가까운 다른 표현: {alternativeNames.join(", ")}
            </p>
          )}
        </section>
      )}

      <details className="border-b border-line py-5">
        <summary className="cursor-pointer text-base font-bold">
          읽을 때 기억할 점
        </summary>
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
            대표 성향 이름은 대화를 쉽게 하기 위한 제목이고, 실제 해석은 각 영역
            설명과 균형 구간을 함께 봐야 정확해요.
          </p>
          <p>
            같은 버전 재검사는 30일 뒤를 권장하고, 일상 변화 확인은 90일 이상
            간격을 두고 보는 편이 좋아요.
          </p>
        </div>
      </details>

      <section className="py-5">
        <button
          aria-busy={deleteState === "working"}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
          disabled={deleteState === "working" || claimState === "saving"}
          onClick={handleDeleteResult}
          type="button"
        >
          <Trash2 aria-hidden="true" size={17} />
          {deleteState === "working" ? "삭제 중" : "결과 삭제"}
        </button>
        {deleteState === "error" && (
          <p className="mt-2 text-sm text-danger" role="alert">
            결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.
          </p>
        )}
      </section>
    </main>
  );
}

function getNextResultAction({
  isFull,
  localResultId,
  returnDestination,
}: {
  isFull: boolean;
  localResultId: string;
  returnDestination: string | null;
}) {
  if (!isFull) {
    return {
      accessibleLabel: "정밀 성향 검사 소개 열기",
      href: buildPrecisionIntroHref({
        backDestination: `/results/local/${localResultId}`,
        entrySource: "first-result",
        returnDestination,
      }),
      label: "내 성향 더 자세히 알아보기",
    };
  }

  if (returnDestination?.startsWith("/together")) {
    return {
      accessibleLabel: "원래 보려던 비교 화면으로 이동하기",
      href: returnDestination,
      label: "비교하러 가기",
    };
  }

  if (returnDestination === "/home") {
    return {
      accessibleLabel: "홈으로 돌아가기",
      href: "/home",
      label: "홈으로 돌아가기",
    };
  }

  return {
    accessibleLabel: "성향지도 열기",
    href: returnDestination ?? "/map",
    label: "성향지도 보기",
  };
}

function DomainReportBlock({ domain }: { domain: DomainScore }) {
  const narrative = getDomainNarrative(domain);

  return (
    <details className="group py-4">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-sm font-bold text-muted">{domain.label}</p>
          <h3 className="mt-1 font-bold">{narrative.title}</h3>
        </div>
        {domain.score !== null && (
          <span className="tabular-nums text-sm font-semibold text-primary">
            {Math.round(domain.score)}
          </span>
        )}
      </summary>
      <div className="pt-3">
        <p className="text-sm leading-6 text-muted">{narrative.summary}</p>
        {narrative.strengths.length > 0 && (
          <ul className="mt-3 grid gap-2 border-l border-line pl-3 text-sm leading-6 text-muted">
            {narrative.strengths.slice(0, 2).map((strength) => (
              <li key={strength}>{strength}</li>
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
      </div>
    </details>
  );
}

function FacetInsight({ facet }: { facet: FacetScore }) {
  return (
    <div className="py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold">{facet.label}</p>
        {facet.score !== null && (
          <span className="tabular-nums text-sm font-semibold text-primary">
            {Math.round(facet.score)}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-6 text-muted">
        {getFacetInsight(facet)}
      </p>
    </div>
  );
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

async function readAccountStatus(
  localResultId: string,
): Promise<ResultAccountStatus | null> {
  try {
    const response = await fetch(
      `/api/claim-result?localResultId=${encodeURIComponent(localResultId)}`,
      {
        cache: "no-store",
        method: "GET",
      },
    );

    if (!response.ok) return null;

    const body = (await response.json()) as {
      ok?: boolean;
      result?: ResultAccountStatus | null;
    };

    return body.ok ? (body.result ?? null) : null;
  } catch {
    return null;
  }
}

async function claimLocalResult({
  attempt,
  consentDraft,
  result,
  versionBundle,
}: {
  attempt: LocalAssessmentAttempt;
  consentDraft: ConsentDraft;
  result: CoreScoreResult;
  versionBundle: {
    assessmentReleaseId: string;
    codeSchemeVersion: string;
    scoringModelVersion: string;
    scoringReleaseId: string;
  };
}): Promise<
  | {
      restored: boolean;
      resultReportId: string;
      state: "saved";
    }
  | {
      state: "error" | "unauthenticated";
    }
> {
  const assessment =
    attempt.assessmentId === "nu-core-full"
      ? fullCoreAssessment
      : quickCoreAssessment;
  const response = await fetch("/api/claim-result", {
    body: JSON.stringify({
      assessmentKind: attempt.mode,
      consentDraft,
      localResultId: attempt.id,
      versionBundle,
      resultSummary: {
        completedAt: attempt.completedAt ?? attempt.updatedAt,
        domains: result.domains.slice(0, 5).map((domain) => ({
          domainId: domain.domainId,
          label: domain.label,
          score: domain.score,
          symbol: domain.symbol,
        })),
        facets: result.facets.slice(0, 10).map((facet) => ({
          facetId: facet.facetId,
          label: facet.label,
          score: facet.score,
          status: facet.status,
        })),
        profileCode: result.code,
        profileName: result.profileName,
        resultLabel: assessment.resultLabel,
      },
    }),
    headers: {
      "content-type": "application/json",
    },
    method: "POST",
  });
  const body = (await response.json()) as {
    ok?: boolean;
    result?: {
      restored?: boolean;
      resultReportId?: string;
    };
  };

  if (response.status === 401) {
    return { state: "unauthenticated" };
  }

  if (!response.ok || !body.ok || !body.result?.resultReportId) {
    return { state: "error" };
  }

  return {
    restored: Boolean(body.result.restored),
    resultReportId: body.result.resultReportId,
    state: "saved",
  };
}

function readStoredConsentDraft(): ConsentDraft | null {
  try {
    const raw = localStorage.getItem("nuang-consent-draft");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<ConsentDraft>;

    if (parsed.terms && parsed.privacy) {
      return {
        analytics: Boolean(parsed.analytics),
        marketing: Boolean(parsed.marketing),
        privacy: true,
        terms: true,
      };
    }
  } catch {
    return null;
  }

  return null;
}

async function copyShareUrlToClipboard(shareUrl: string) {
  const writeText = navigator.clipboard?.writeText;

  if (!writeText) {
    throw new Error("clipboard_unavailable");
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    await Promise.race([
      writeText.call(navigator.clipboard, shareUrl),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("clipboard_timeout"));
        }, 1000);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function MissingResult() {
  return (
    <section className="rounded-lg border border-line bg-white p-5">
      <h1 className="text-xl font-black">결과를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        보관 기간이 지났거나 삭제된 결과일 수 있어요.
      </p>
      <ButtonLink className="mt-5 w-full" href="/assessments/nu-core-quick">
        빠른 코어 다시 하기
      </ButtonLink>
    </section>
  );
}

function UnavailableVersionedResult({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const restartHref =
    assessmentId === "nu-core-full"
      ? "/assessments/nu-core-full"
      : "/assessments/nu-core-quick";

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-soft)]">
      <h1 className="text-xl font-black leading-8">
        이 결과는 현재 버전에서 다시 열 수 없어요
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        이전 방식으로 만든 결과를 지금 기준으로 다시 계산하지 않기 위한 보호
        조치예요. 새로 답하면 완료 당시 기준으로 결과가 안전하게 보관돼요.
      </p>
      <ButtonLink className="mt-5 w-full" href={restartHref}>
        새 검사 시작하기
      </ButtonLink>
      <ButtonLink className="mt-3 w-full" href="/home" variant="secondary">
        홈으로 돌아가기
      </ButtonLink>
    </section>
  );
}
