"use client";

import {
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  RefreshCw,
  Share2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AssessmentEvidenceSources } from "@/features/assessment/AssessmentEvidenceSources";
import { AssessmentReportRichText } from "@/features/assessment/AssessmentReportRichText";
import { AssessmentResultQualityPrompt } from "@/features/assessment/AssessmentResultQualityPrompt";
import {
  getFreeTopicAssessment,
  getFreeTopicQuestions,
  type FreeTopicAssessment,
  type FreeTopicLongReportBlock,
  type FreeTopicLongReportSection,
  type FreeTopicPersonalizedSummary,
  type FreeTopicResultReport,
} from "@/features/assessment/free-topic-assessments";
import { AssessmentBottomSheet } from "@/features/assessment/AssessmentQuestionControls";
import { getFreeTopicInstrumentVersion } from "@/features/assessment/free-topic-result-version";
import {
  buildFreeTopicLongReportSections,
  buildFreeTopicNuangCodeSection,
  buildFreeTopicPersonalizedSummary,
} from "@/features/assessment/free-topic-long-report";
import {
  loadFreeTopicResultLocalFirst,
  syncFreeTopicResult,
  type StoredFreeTopicResult,
} from "@/features/assessment/free-topic-storage";
import { ReportShareSheet } from "@/features/share/ReportShareSheet";
import { buildTopicReportShareContent } from "@/features/share/report-share-contract";
import styles from "./FreeTopicResultView.module.css";

type ResultLoadState = "error" | "loading" | "missing" | "ready";

export function FreeTopicResultView({
  backHref = "/home?view=self",
  canonicalShareUrl,
  initialResult,
  localResultId,
  readOnly = false,
  shareEnabled = true,
  slug,
}: {
  backHref?: string;
  canonicalShareUrl?: string;
  initialResult?: StoredFreeTopicResult;
  localResultId: string;
  readOnly?: boolean;
  shareEnabled?: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState<StoredFreeTopicResult | null>(
    initialResult ?? null,
  );
  const [loadState, setLoadState] = useState<ResultLoadState>(
    initialResult ? "ready" : "loading",
  );
  const [resolvedRequestKey, setResolvedRequestKey] = useState(
    initialResult ? `${slug}:${localResultId}` : "",
  );
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScoreMeaningOpen, setIsScoreMeaningOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const assessment = getFreeTopicAssessment(slug);
  const currentNuangCode = result?.nuangCodeContext?.code ?? null;

  useEffect(() => {
    if (initialResult) return;

    let isMounted = true;
    const requestKey = `${slug}:${localResultId}`;
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    void Promise.resolve()
      .then(() => {
        const nextResult = loadFreeTopicResultLocalFirst(localResultId);
        return nextResult;
      })
      .then((nextResult) => {
        if (!isMounted) return;

        if (!nextResult) {
          setResolvedRequestKey(requestKey);
          setLoadState("missing");
          return;
        }

        if (nextResult.assessment.slug !== slug) {
          router.replace(
            `/assessments/topics/${nextResult.assessment.slug}/result/${nextResult.localResultId}`,
          );
          return;
        }

        setResult(nextResult);
        setResolvedRequestKey(requestKey);
        setLoadState("ready");

        if (nextResult.sync.status !== "synced") {
          void syncFreeTopicResult(nextResult)
            .then((syncedResult) => {
              if (isMounted) setResult(syncedResult);
            })
            .catch(() => {
              // 로컬 결과는 그대로 보여 주고 서버 동기화만 다음 기회에 다시 시도합니다.
            });
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedRequestKey(requestKey);
          setLoadState("error");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialResult, localResultId, router, slug]);

  if (
    loadState === "loading" ||
    resolvedRequestKey !== `${slug}:${localResultId}`
  ) {
    return (
      <main className={styles.stateRoot}>
        <Image
          alt="결과를 준비하는 뉴앙 캐릭터"
          className={styles.stateMascot}
          height={512}
          priority
          src="/assets/assessment/nuang-loading-mascot-v2.png"
          width={512}
        />
        <p aria-live="polite" role="status">
          답변을 정리하고 있어요
        </p>
        <span aria-hidden="true" className={styles.loadingLine} />
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className={styles.root}>
        <ResultHeader backHref={backHref} />
        <section className={styles.missing}>
          <h1>결과를 불러오지 못했어요</h1>
          <p>인터넷 연결을 확인한 뒤 다시 열어 주세요.</p>
          <button onClick={() => window.location.reload()} type="button">
            다시 불러오기
          </button>
        </section>
      </main>
    );
  }

  if (!assessment || loadState === "missing" || !result) {
    return (
      <main className={styles.root}>
        <ResultHeader backHref={backHref} />
        <section className={styles.missing}>
          <h1>결과를 찾지 못했어요</h1>
          <p>검사를 다시 진행하면 새 결과를 바로 확인할 수 있어요.</p>
          <Link href="/home?view=self">다른 검사 보기</Link>
        </section>
      </main>
    );
  }

  const activeAssessment = assessment;
  const currentQuestions = getFreeTopicQuestions(activeAssessment.slug);
  const questionCount = getCompletedQuestionCount({
    currentQuestionCount: currentQuestions.length,
    result,
  });
  const report = getFreeTopicReportDisplay(
    activeAssessment.slug,
    result.reportSnapshot,
  );
  const rebuiltPersonalizedSummary = buildFreeTopicPersonalizedSummary({
    assessment: activeAssessment,
    questions: currentQuestions,
    scaleStatisticsById: result.result.scaleStatisticsById,
    scoresByQuestionId: result.result.scoresByQuestionId,
    scoresByScaleId: result.result.scoresByScaleId,
    validResponsesByScaleId: result.result.validResponsesByScaleId,
  });
  const personalizedSummary = getPersonalizedSummaryDisplay(
    activeAssessment.slug,
    rebuiltPersonalizedSummary ?? report.personalizedSummary,
  );
  const isIndependentReport =
    activeAssessment.reportMode === "independent_dimensions";
  const isNeedReport =
    isIndependentReport && activeAssessment.responseScale === "need_5";
  const isHelpfulnessReport =
    isIndependentReport && activeAssessment.responseScale === "helpfulness_5";
  const hasIncompleteScale =
    result.instrumentVersion ===
      getFreeTopicInstrumentVersion(activeAssessment.slug) &&
    Boolean(activeAssessment.reportScales?.length) &&
    report.signals.length < (activeAssessment.reportScales?.length ?? 0);
  const signalGroups = report.signals.reduce<
    Array<{ label: string; signals: typeof report.signals }>
  >((groups, signal) => {
    const label = signal.groupLabel ?? "세부 결과";
    const existing = groups.find((group) => group.label === label);

    if (existing) {
      existing.signals.push(signal);
      return groups;
    }

    return [...groups, { label, signals: [signal] }];
  }, []);
  const nuangCodeSection =
    report.nuangCodeSection ??
    (currentNuangCode
      ? buildFreeTopicNuangCodeSection({
          assessment: activeAssessment,
          code: currentNuangCode,
          scoresByScaleId: result.result.scoresByScaleId,
        })
      : null);
  const closePersonSection = personalizedSummary
    ? report.longReportSections.find(
        (section) =>
          section.role === "close_person_script" ||
          section.title === "가까운 사람에게 보여줄 한 문장",
      )
    : null;
  const baseDetailedReportSections = report.longReportSections.filter(
    (section) =>
      !personalizedSummary ||
      (section.title !== "이번 결과 한눈에 보기" &&
        section.role !== "close_person_script" &&
        section.title !== "가까운 사람에게 보여줄 한 문장"),
  );
  const latestDiagnosticSections = buildFreeTopicLongReportSections({
    assessment: activeAssessment,
    questions: currentQuestions,
    scaleStatisticsById: result.result.scaleStatisticsById,
    scoresByQuestionId: result.result.scoresByQuestionId,
    scoresByScaleId: result.result.scoresByScaleId,
    validResponsesByScaleId: result.result.validResponsesByScaleId,
  }).filter((section) =>
    section.claimIds.some((claimId) =>
      /direct-feedback|direct-fit|maintenance-rhythm/.test(claimId),
    ),
  );
  const baseClaimIds = new Set(
    baseDetailedReportSections.flatMap((section) => section.claimIds),
  );
  const detailedReportSections = orderDetailedReportSections([
    ...baseDetailedReportSections,
    ...latestDiagnosticSections.filter((section) =>
      section.claimIds.every((claimId) => !baseClaimIds.has(claimId)),
    ),
  ]);
  const shareContent = buildTopicReportShareContent({
    assessmentTitle: activeAssessment.title,
    highlights:
      report.signals.length > 0
        ? report.signals
            .slice()
            .sort((left, right) => right.score - left.score)
            .slice(0, 3)
            .map(
              (signal) =>
                `${getIndependentSignalTitle(signal.areaLabel)} ${signal.score}점`,
            )
        : [report.confidenceCopy],
    resultName: personalizedSummary?.title ?? report.headline,
    summary: personalizedSummary?.body ?? report.headline,
  });
  const canShare = Boolean(
    shareEnabled && (canonicalShareUrl || result.serverResultId),
  );

  return (
    <main className={styles.root}>
      <header className={styles.appBar}>
        <Link aria-label="이전 화면으로 돌아가기" href={backHref}>
          <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.75} />
        </Link>
        <p>검사 결과</p>
        {canShare ? (
          <button
            aria-haspopup="dialog"
            aria-label="검사 결과 공유"
            onClick={() => setIsShareOpen(true)}
            ref={shareButtonRef}
            type="button"
          >
            <Share2 aria-hidden="true" size={19} strokeWidth={1.75} />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <p>
            {assessment.categoryLabel} · {report.confidenceLabel}
          </p>
          <h1>{assessment.title}</h1>
          <span>
            {personalizedSummary
              ? `${activeAssessment.recallPeriodLabel ?? "최근 4주"} · 4가지 상황 · ${questionCount}개 질문`
              : report.headline}
          </span>
        </section>

        {personalizedSummary ? (
          <section
            aria-labelledby="personalized-comfort-summary"
            className={styles.personalSummary}
          >
            <p>{personalizedSummary.eyebrow}</p>
            <h2 id="personalized-comfort-summary">
              {personalizedSummary.title}
            </h2>
            <span>{personalizedSummary.body}</span>
            <ul>
              {personalizedSummary.steps.map((step) => {
                const [stepTitle, stepLevel] = splitSummaryStepLabel(
                  step.label,
                );
                return (
                  <li key={`${step.label}:${step.text}`}>
                    <div className={styles.summaryStepLabel}>
                      <strong>{stepTitle}</strong>
                      {stepLevel ? <span>{stepLevel}</span> : null}
                    </div>
                    <p>{step.text}</p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {report.signals.length > 0 ? (
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>
                {isNeedReport || isHelpfulnessReport
                  ? "도움별 결과"
                  : isIndependentReport
                    ? "행동별 결과"
                    : "세부 결과"}
              </h2>
              <button onClick={() => setIsScoreMeaningOpen(true)} type="button">
                {isNeedReport
                  ? "점수 보는 법"
                  : isHelpfulnessReport
                    ? "도움 정도 뜻"
                    : "점수 뜻"}
              </button>
            </div>
            <div className={styles.signalList}>
              {signalGroups.map((group) => (
                <div className={styles.signalGroup} key={group.label}>
                  {signalGroups.length > 1 ? (
                    <p className={styles.signalGroupLabel}>{group.label}</p>
                  ) : null}
                  {group.signals.map((signal) => (
                    <article
                      data-tone={
                        activeAssessment.slug === "comfort-style"
                          ? getComfortSignalTone(signal.areaLabel)
                          : "brand"
                      }
                      key={signal.label}
                    >
                      <div>
                        <div>
                          <h3>
                            {isIndependentReport
                              ? getIndependentSignalTitle(signal.areaLabel)
                              : signal.label}
                          </h3>
                          <span>
                            {isIndependentReport
                              ? signal.levelLabel
                              : signal.areaLabel}
                          </span>
                        </div>
                        <strong>
                          {signal.score}
                          <small>점</small>
                        </strong>
                      </div>
                      <span
                        aria-label={`${signal.label} 응답 방향 ${signal.score}`}
                        className={styles.track}
                        role="img"
                      >
                        <i style={{ width: `${signal.score}%` }} />
                      </span>
                      <p>{signal.interpretation}</p>
                    </article>
                  ))}
                </div>
              ))}
            </div>
            {hasIncompleteScale ? (
              <aside className={styles.incompleteNotice}>
                <strong>답할 경험이 적었던 항목은 결과에서 제외했어요.</strong>
                <p>
                  각 행동을 답한 상황이 3개 이상일 때 상세 결과를 보여드려요.
                  답하기 어려웠던 상황은 중간값으로 바꾸지 않았어요.
                </p>
              </aside>
            ) : null}
          </section>
        ) : (
          <section className={styles.emptySection}>
            <h2>아직 해석할 답이 부족해요</h2>
            <p>검사를 다시 완료하면 이곳에 세부 결과가 채워져요.</p>
          </section>
        )}

        {closePersonSection ? (
          <section
            aria-labelledby="comfort-share-script"
            className={styles.shareScript}
          >
            <p>곁에서 돕는 방법</p>
            <h2 id="comfort-share-script">{closePersonSection.title}</h2>
            <AssessmentReportRichText
              labelLayout="wide"
              section={closePersonSection}
            />
          </section>
        ) : null}

        {nuangCodeSection ? (
          <section
            aria-labelledby="comfort-code-insight"
            className={styles.codeInsight}
          >
            <header>
              <p>검사 당시 뉴앙 코드</p>
              <h2 id="comfort-code-insight">{nuangCodeSection.title}</h2>
            </header>
            <AssessmentReportRichText
              labelLayout="wide"
              section={nuangCodeSection}
            />
            <Link
              className={styles.codeDetailLink}
              href={`/map/${currentNuangCode}`}
            >
              내 성향지도에서 더 자세히 보기
            </Link>
          </section>
        ) : null}

        {detailedReportSections.length > 0 ? (
          <section
            aria-label={`${assessment.title} 상세 리포트`}
            className={styles.longReport}
          >
            <header className={styles.longReportHeader}>
              <div>
                <p className={styles.longReportEyebrow}>
                  <BookOpenText aria-hidden="true" size={15} strokeWidth={2} />
                  상세 분석
                </p>
                <h2>결과 더 자세히 보기</h2>
                <span>
                  핵심 해석부터 실제 개선 방법까지, 궁금한 항목을 펼쳐 확인해
                  보세요.
                </span>
              </div>
            </header>
            <div className={styles.reportAccordion}>
              {detailedReportSections.map((section, index) => (
                <DetailedReportAccordionItem
                  initiallyOpen={
                    index === 0 && personalizedSummary !== undefined
                  }
                  index={index}
                  key={section.title}
                  section={section}
                />
              ))}
            </div>
          </section>
        ) : null}

        <AssessmentEvidenceSources slug={activeAssessment.slug} />

        {!readOnly ? (
          <AssessmentResultQualityPrompt
            assessmentSlug={activeAssessment.slug}
            instrumentVersion={result.instrumentVersion}
            localResultId={result.localResultId}
          />
        ) : null}

        <section className={styles.actions}>
          <Link className={styles.primaryAction} href="/home?view=self">
            {readOnly ? "나도 검사해 보기" : "다른 검사 둘러보기"}
          </Link>
          {readOnly ? (
            <Link className={styles.secondaryAction} href={backHref}>
              프로필로 돌아가기
            </Link>
          ) : (
            <Link
              className={styles.secondaryAction}
              href={`/assessments/topics/${assessment.slug}`}
            >
              <RefreshCw aria-hidden="true" size={16} />
              다시 해보기
            </Link>
          )}
        </section>
      </div>

      {isScoreMeaningOpen ? (
        <AssessmentBottomSheet
          copy={
            isNeedReport
              ? "이 점수는 위로를 받는 능력이나 사람 간 순위가 아니에요. 최근 6개월의 힘든 상황에서 각 도움이 얼마나 필요했는지를 0점부터 100점 사이로 정리했어요. 도움의 내용 두 가지와 도움받는 방식 한 가지는 서로 반대가 아니어서 모두 높거나 낮을 수 있어요. 낮은 점수는 반대 도움을 좋아한다는 뜻이 아니에요."
              : isHelpfulnessReport
                ? "도움 정도는 위로를 잘 받는 능력이나 사람 간 순위가 아니에요. 최근 6개월의 장면에서 그 도움이 얼마나 편하게 느껴졌는지를 0점부터 100점 사이로 정리했어요. 세 도움은 서로 반대가 아니어서 모두 높거나 낮을 수 있어요. 낮은 점수는 반대 도움을 좋아한다는 뜻이 아니라, 이번 장면에서 그 도움이 적게 느껴졌다는 뜻이에요."
                : isIndependentReport
                  ? getIndependentScoreMeaning(activeAssessment)
                  : "점수는 능력이나 순위가 아니에요. 50은 두 모습이 비슷한 상태이고, 100에 가까울수록 표시된 방향이, 0에 가까울수록 그 반대 방향이 더 자주 나타났다는 뜻이에요."
          }
          onClose={() => setIsScoreMeaningOpen(false)}
          title={
            isNeedReport
              ? "필요 정도는 이렇게 읽어요"
              : isHelpfulnessReport
                ? "도움 정도는 이렇게 읽어요"
                : "점수는 이렇게 읽어요"
          }
        >
          <button
            className={styles.infoSheetButton}
            onClick={() => setIsScoreMeaningOpen(false)}
            type="button"
          >
            알겠어요
          </button>
        </AssessmentBottomSheet>
      ) : null}
      {canShare ? (
        <ReportShareSheet
          canonicalUrl={canonicalShareUrl}
          content={shareContent}
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          onNavigate={(href) => router.push(href)}
          originalReportKey={
            result.serverResultId ? `topic_${result.serverResultId}` : undefined
          }
          returnFocusRef={shareButtonRef}
        />
      ) : null}
    </main>
  );
}

function DetailedReportAccordionItem({
  index,
  initiallyOpen,
  section,
}: {
  index: number;
  initiallyOpen: boolean;
  section: FreeTopicLongReportSection;
}) {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const presentation = getDetailedReportSectionPresentation(section);

  return (
    <details
      data-tone={presentation.tone}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
      open={isOpen}
    >
      <summary>
        <span className={styles.reportAccordionTitle}>
          <span>
            {String(index + 1).padStart(2, "0")} · {presentation.label}
          </span>
          <h3>{section.title}</h3>
        </span>
        <span aria-hidden="true" className={styles.reportAccordionToggle}>
          <ChevronDown size={18} strokeWidth={1.9} />
        </span>
      </summary>
      <div className={styles.reportAccordionBody}>
        <AssessmentReportRichText section={section} variant="accordion" />
      </div>
    </details>
  );
}

function getCompletedQuestionCount({
  currentQuestionCount,
  result,
}: {
  currentQuestionCount: number;
  result: StoredFreeTopicResult;
}) {
  const answeredQuestionCount = Object.keys(result.answers).length;
  if (answeredQuestionCount > 0) return answeredQuestionCount;
  if (
    result.assessment.slug === "organizing-style" &&
    result.instrumentVersion !==
      "organizing-style-v3-four-dimensions-2026-07-29"
  ) {
    return 12;
  }
  return currentQuestionCount;
}

type DetailedReportTone =
  "action" | "caution" | "context" | "insight" | "overview" | "signal";

function getDetailedReportSectionPresentation(
  section: FreeTopicLongReportSection,
): {
  label: string;
  tone: DetailedReportTone;
} {
  const searchableText = `${section.title} ${section.claimIds.join(" ")}`;

  if (/한눈에|overview/.test(searchableText)) {
    return {
      label: "핵심 요약",
      tone: "overview",
    };
  }

  if (
    /direct-feedback|direct-fit|maintenance-rhythm|강점|약점/.test(
      searchableText,
    )
  ) {
    return {
      label: "핵심 진단",
      tone: "insight",
    };
  }

  if (/scale:|·\s*\d+점/.test(searchableText)) {
    return {
      label: "행동 해석",
      tone: "signal",
    };
  }

  if (/버거울|주의|한계|조건|오해|위험|friction|boundar/.test(searchableText)) {
    return {
      label: "주의할 점",
      tone: "caution",
    };
  }

  if (
    /해볼|써볼|이어 쓰|잇기|하는 법|적용|도와|개선|계획|가이드|말해|script/.test(
      searchableText,
    )
  ) {
    return {
      label: "실행 가이드",
      tone: "action",
    };
  }

  return {
    label: "상황 분석",
    tone: "context",
  };
}

function ResultHeader({ backHref }: { backHref: string }) {
  return (
    <header className={styles.appBar}>
      <Link aria-label="이전 화면으로 돌아가기" href={backHref}>
        <ArrowLeft aria-hidden="true" size={20} strokeWidth={1.75} />
      </Link>
      <p>검사 결과</p>
      <span aria-hidden="true" />
    </header>
  );
}

function getIndependentSignalTitle(areaLabel: string) {
  if (areaLabel === "마음 알아주기") return "마음 알아주기";
  if (areaLabel === "방법 함께 찾기") return "방법 함께 찾기";
  if (areaLabel === "내 속도 지켜주기") return "내 속도 지켜주기";
  if (areaLabel === "정서적 도움") return "마음 알아주기";
  if (areaLabel === "방법을 함께 찾는 도움") return "방법 함께 찾기";
  return areaLabel;
}

function getPersonalizedSummaryDisplay(
  slug: string,
  summary: FreeTopicPersonalizedSummary | undefined,
) {
  if (!summary) return summary;
  if (slug === "focus-switch") {
    return {
      ...summary,
      body: replaceFocusSwitchLegacyCopy(summary.body),
      eyebrow: replaceFocusSwitchLegacyCopy(summary.eyebrow),
      steps: summary.steps.map((step) => ({
        label: replaceFocusSwitchLegacyCopy(step.label),
        text: replaceFocusSwitchLegacyCopy(step.text),
      })),
      title: replaceFocusSwitchLegacyCopy(summary.title),
    };
  }
  if (slug !== "hurt-expression") return summary;

  const historicalTitleMap: Record<string, string> = {
    "두 행동이 비슷하게 드물게 나타났어요":
      "서운한 일을 바로 꺼내기보다 말할 상황을 살피는 편이에요",
    "두 행동이 비슷하게 자주 나타났어요":
      "서운함을 전할 때 필요한 두 가지를 함께 말해요",
    "두 행동이 비슷한 정도로 나타났어요":
      "서운함을 전할 때 필요한 두 가지를 함께 말해요",
    "내 마음 말하기가 가장 자주 나타났어요":
      "무슨 일보다 내가 느낀 마음을 먼저 전해요",
    "내 마음 말하기와 바라는 점 부탁하기가 함께 자주 나타났어요":
      "내 마음과 바라는 변화를 중심으로 말해요",
    "바라는 점 부탁하기가 가장 자주 나타났어요":
      "서운함을 설명하기보다 바라는 변화를 말하는 편이에요",
    "세 행동이 모두 거의 나타나지 않았어요":
      "서운한 일을 바로 꺼내기보다 말할 상황을 살피는 편이에요",
    "세 행동이 모두 거의 항상 나타났어요":
      "서운한 일과 내 마음을 짚고, 바라는 변화까지 말해요",
    "세 행동이 비슷하게 드물게 나타났어요":
      "서운한 일을 바로 꺼내기보다 말할 상황을 살피는 편이에요",
    "세 행동이 비슷하게 자주 나타났어요":
      "서운한 일과 내 마음을 짚고, 바라는 변화까지 말해요",
    "세 행동이 비슷한 정도로 나타났어요":
      "서운한 일·마음·바라는 점을 상황에 맞게 골라 말해요",
    "서운했던 일 말하기가 가장 자주 나타났어요":
      "서운했던 일을 구체적으로 짚어 말하는 편이에요",
    "서운했던 일 말하기와 내 마음 말하기가 함께 자주 나타났어요":
      "무슨 일이 있었고 내가 어땠는지 분명히 말해요",
    "서운했던 일 말하기와 바라는 점 부탁하기가 함께 자주 나타났어요":
      "서운했던 일을 짚고 다음에는 어떻게 해주길 바라는지 말해요",
  };
  const labelMap: Record<string, string> = {
    "내 마음 말하기": "내 마음 전하기",
    "바라는 점 부탁하기": "바라는 변화 말하기",
    "서운했던 일 말하기": "서운한 일 짚기",
  };
  const body = summary.body.includes("말하기과")
    ? "세 행동 모두 상황에 따라 나타나는 정도가 크게 달랐어요. 점수뿐 아니라 어떤 장면에서 달라졌는지도 함께 보면 내 표현 방식을 더 구체적으로 이해할 수 있어요."
    : summary.body;

  return {
    ...summary,
    body,
    steps: summary.steps.map((step) => {
      const [title, level] = splitSummaryStepLabel(step.label);
      return {
        ...step,
        label: [labelMap[title] ?? title, level].filter(Boolean).join(" · "),
      };
    }),
    title: historicalTitleMap[summary.title] ?? summary.title,
  };
}

function getFreeTopicReportDisplay(
  slug: string,
  report: FreeTopicResultReport,
): FreeTopicResultReport {
  if (slug !== "focus-switch") return report;

  const mapBlock = (block: FreeTopicLongReportBlock) => {
    if (block.kind === "paragraph") {
      return {
        ...block,
        text: replaceFocusSwitchLegacyCopy(block.text),
      };
    }
    if (block.kind === "ordered_list") {
      return {
        ...block,
        items: block.items.map(replaceFocusSwitchLegacyCopy),
      };
    }
    return {
      ...block,
      items: block.items.map((item) => ({
        label: replaceFocusSwitchLegacyCopy(item.label),
        text: replaceFocusSwitchLegacyCopy(item.text),
      })),
    };
  };
  const mapSection = (
    section: FreeTopicLongReportSection,
  ): FreeTopicLongReportSection => ({
    ...section,
    blocks: section.blocks?.map(mapBlock),
    body: replaceFocusSwitchLegacyCopy(section.body),
    title: replaceFocusSwitchLegacyCopy(section.title),
  });

  return {
    ...report,
    confidenceCopy: replaceFocusSwitchLegacyCopy(report.confidenceCopy),
    headline: replaceFocusSwitchLegacyCopy(report.headline),
    longReportSections: report.longReportSections.map(mapSection),
    nuangCodeSection: report.nuangCodeSection
      ? mapSection(report.nuangCodeSection)
      : undefined,
    personalizedSummary: getPersonalizedSummaryDisplay(
      slug,
      report.personalizedSummary,
    ),
    signals: report.signals.map((signal) => ({
      ...signal,
      areaLabel: replaceFocusSwitchLegacyCopy(signal.areaLabel),
      interpretation: replaceFocusSwitchLegacyCopy(signal.interpretation),
      label: replaceFocusSwitchLegacyCopy(signal.label),
    })),
  };
}

function replaceFocusSwitchLegacyCopy(value: string) {
  const replacements = [
    [
      "세 전환 행동을 모두 거의 항상 사용했어요",
      "다시 시작할 지점을 남기고, 할 일을 정해 바로 시작해요",
    ],
    [
      "세 전환 행동이 모두 거의 나타나지 않았어요",
      "집중이 끊기면 정해둔 순서보다 그때그때 흐름을 다시 찾아요",
    ],
    [
      "세 전환 행동을 비슷하게 자주 사용했어요",
      "다시 시작할 지점과 할 일을 정한 뒤, 작은 행동으로 이어가요",
    ],
    [
      "세 전환 행동이 비슷하게 드물었어요",
      "집중이 끊기면 미리 정한 방법보다 그때그때 다시 시작해요",
    ],
    [
      "세 전환 행동을 비슷한 정도로 사용했어요",
      "집중이 끊긴 상황에 맞춰 다시 시작할 방법을 골라요",
    ],
    [
      "두 전환 행동을 비슷하게 자주 사용했어요",
      "집중이 끊기면 상황에 맞는 두 가지 방법을 함께 써요",
    ],
    ["이번 집중 전환 한눈에 보기", "집중을 다시 잇는 방식 한눈에 보기"],
    ["세 전환 행동을 이어 쓰는 법", "다시 시작하는 세 가지 방법 잇기"],
    ["전환 방법이 오히려 버거울 때", "다시 시작하는 방법이 오히려 버거울 때"],
    ["세 전환 행동", "다시 시작하는 세 가지 방법"],
    ["어떤 전환에서 달라졌을까?", "어떻게 집중이 끊겼을 때 달라졌을까?"],
    ["다음 10분에 써볼 복귀 순서", "다음 10분에 써볼 다시 시작 순서"],
    [
      "방법보다 전환 조건을 바꿔야 할 때",
      "방법보다 집중이 끊기는 조건을 바꿔야 할 때",
    ],
    [
      "집중이 끊기면 나는 어떻게 돌아올까?",
      "집중이 끊기면 나는 어떻게 다시 시작할까?",
    ],
    ["작은 첫 행동으로 돌아오는 일", "작은 첫 행동을 시작하는 일"],
    ["집중이 완벽하게 돌아왔는지를", "집중할 준비가 완벽해졌는지를"],
    ["집중이 완벽하게 돌아오기를", "집중할 준비가 완벽해지기를"],
    ["집중이 완전히 돌아오기를", "집중할 준비가 완벽해지기를"],
    ["집중이 돌아온 뒤", "완벽하게 집중한 뒤"],
    ["쉬고 돌아온 때", "쉬었다가 다시 시작한 때"],
    ["지금 돌아와야 할 일", "지금 다시 시작할 일"],
    ["돌아올 자리를", "다시 시작할 지점을"],
    ["돌아온 순간", "다시 시작하는 순간"],
    ["돌아온 내가", "나중에 다시 시작할 때 내가"],
    ["돌아왔을 때", "다시 시작할 때"],
    ["돌아온 뒤", "다시 시작할 때"],
    ["돌아올 자리", "다시 시작할 지점"],
    ["돌아올 단서", "다시 시작할 단서"],
    ["돌아올 지점", "다시 시작할 지점"],
    ["돌아올 길", "다시 시작할 지점"],
    ["돌아갈 계획", "다시 시작할 계획"],
    ["여러 전환 상황", "집중이 끊긴 여러 상황"],
    ["전환이 갑작스러웠는지", "일이 갑자기 끊겼는지"],
    ["전환 전에 준비할 수 있었던", "일이 끊기기 전에 준비할 수 있었던"],
    ["끝내지 못한 전환", "끝내지 못한 일"],
    ["전환 상황", "집중이 끊긴 상황"],
    ["전환 장면", "집중이 끊긴 장면"],
    ["전환 행동", "다시 시작하는 방법"],
    ["전환 도구", "다시 시작하는 방법"],
    ["전환 부담", "다시 집중하는 부담"],
    ["전환 비용", "다시 집중할 때 드는 시간과 부담"],
    ["재시작 단서", "다시 시작할 단서"],
    ["재개 단서", "다시 시작할 단서"],
    ["실제 재시작", "실제로 다시 시작하는 일"],
    ["작은 첫 행동으로 재진입해 보세요", "작은 첫 행동부터 시작해 보세요"],
    ["갑작스러운 전환에서도", "갑자기 다른 일로 넘어가도"],
    ["갑작스러운 전환에", "갑자기 다른 일로 넘어갈 때"],
    ["전환할 때", "다른 일로 넘어갈 때"],
    ["집중 전환", "집중을 다시 잇는 방식"],
    ["다시 찾는 비용", "다시 찾는 데 드는 시간"],
    ["복귀 순서", "다시 시작 순서"],
    ["복귀 비용", "다시 집중하는 데 드는 시간과 힘"],
    [
      "세 행동은 서로 반대되는 유형이 아니며",
      "세 가지 방법은 서로 반대되는 유형이 아니며",
    ],
  ] as const;

  return replacements.reduce(
    (copy, [before, after]) => copy.replaceAll(before, after),
    value,
  );
}

function getIndependentScoreMeaning(
  assessment: Pick<FreeTopicAssessment, "recallPeriodLabel" | "slug">,
) {
  const period = assessment.recallPeriodLabel ?? "최근 4주";

  if (assessment.slug === "apology-style") {
    return `점수는 사과의 진정성이나 사람 간 순위가 아니에요. ${period}의 장면에서 책임을 말하고, 상대 경험을 듣고, 다음 행동을 정한 일이 얼마나 자주 나타났는지를 0점부터 100점 사이로 정리했어요. 세 행동은 서로 반대가 아니어서 모두 높거나 낮을 수 있어요.`;
  }
  if (assessment.slug === "hurt-expression") {
    return `점수는 표현 능력이나 사람 간 순위가 아니에요. ${period}의 장면에서 서운한 일을 짚고, 내 마음과 바라는 변화를 말한 일이 얼마나 자주 나타났는지를 0점부터 100점 사이로 정리했어요. 세 행동은 서로 반대가 아니어서 모두 높거나 낮을 수 있어요.`;
  }
  if (assessment.slug === "recharge-routine") {
    return `점수는 회복 능력이나 사람 간 순위가 아니에요. ${period}의 피로 장면에서 조용히 쉬고, 편한 사람과 연결하고, 작은 행동으로 리듬을 바꾼 일이 얼마나 자주 나타났는지를 0점부터 100점 사이로 정리했어요. 세 경로는 서로 반대가 아니어서 모두 높거나 낮을 수 있어요.`;
  }
  if (assessment.slug === "focus-switch") {
    return `점수는 집중 능력이나 사람 간 순위가 아니에요. ${period}에 집중이 끊긴 장면에서 다시 시작할 지점을 남기고, 지금 할 일을 잡고, 작은 첫 행동을 시작한 일이 얼마나 자주 나타났는지를 0점부터 100점 사이로 정리했어요. 세 행동은 서로 반대가 아니어서 모두 높거나 낮을 수 있어요.`;
  }
  if (assessment.slug === "organizing-style") {
    return `점수는 정리 능력이나 사람 간 순위가 아니에요. ${period}의 정리 장면에서 자리와 분류를 정하고, 기억할 것을 남기고, 정리 방식을 다시 맞춘 일이 얼마나 자주 나타났는지를 0점부터 100점 사이로 정리했어요. 세 행동은 서로 반대가 아니어서 모두 높거나 낮을 수 있어요.`;
  }
  return `점수는 능력이나 사람 간 순위가 아니에요. ${period}의 장면에서 각 행동이 얼마나 자주 나타났는지를 0점부터 100점 사이로 정리했어요.`;
}

function splitSummaryStepLabel(label: string) {
  const [title, ...metadata] = label.split(" · ");
  return [title, metadata.join(" · ")] as const;
}

function getComfortSignalTone(areaLabel: string) {
  if (areaLabel === "마음 알아주기") return "emotion";
  if (areaLabel === "방법 함께 찾기") return "solution";
  if (areaLabel === "내 속도 지켜주기") return "pacing";
  if (areaLabel === "정서적 도움") return "emotion";
  if (areaLabel === "방법을 함께 찾는 도움") return "solution";
  if (areaLabel === "내 속도와 선택") return "pacing";
  return "brand";
}

function orderDetailedReportSections(sections: FreeTopicLongReportSection[]) {
  const priority = new Map([
    ["장면별로 달랐던 부분", 0],
    ["나에게 필요한 위로 조합", 1],
    ["사람에 따라 이렇게 말해 보세요", 2],
    ["도움이 어긋날 때 확인할 것", 3],
    ["다음 힘든 날 써볼 한마디", 9],
    ["안전하게 도움을 요청해요", 10],
  ]);

  return [...sections].sort(
    (left, right) =>
      (priority.get(left.title) ?? 5) - (priority.get(right.title) ?? 5),
  );
}
