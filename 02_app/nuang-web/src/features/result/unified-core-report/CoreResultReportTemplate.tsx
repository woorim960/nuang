"use client";

import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  candidateAxisCopy,
  candidatePublicPairOrder,
  getCandidateDirectionCopy,
} from "@/features/nuang-code/candidate-profile-names";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";
import { ReportShareSheet } from "@/features/share/ReportShareSheet";
import { AssessmentRestartSheet } from "@/features/assessment/AssessmentRestartSheet";
import {
  createFreshLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import { queueAccountAssessmentAttemptSync } from "@/features/assessment/assessment-account-sync";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import { candidateQuickCoreAssessment } from "@/features/assessment/candidate-quick-core-seed";
import {
  buildCoreReportShareContent,
  type ReportShareContent,
} from "@/features/share/report-share-contract";
import {
  assembleCoreResultContent,
  type CoreResultContextGroup,
} from "./core-result-content-assembler";
import { CoreResultSectionFeedback } from "./CoreResultSectionFeedback";
import {
  ReportReadingNavigator,
  type ReportReadingNavigationItem,
} from "./ReportReadingNavigator";
import type { CoreResultReportModel } from "./core-result-report-model";
import {
  getCoreResultSurfacePolicy,
  projectCoreResultModelForSurface,
  type CoreResultReportSurface,
} from "./core-result-surface-policy";
import styles from "./CoreResultReportTemplate.module.css";

export type CoreResultReportAction = {
  href: string;
  label: string;
};

export type CoreResultReportTemplateProps = {
  backHref?: string;
  canonicalShareUrl?: string;
  deleteError?: string | null;
  deletePending?: boolean;
  feedbackResultReportId?: string;
  model: CoreResultReportModel;
  onDelete?: () => void;
  onShareUnavailable?: () => void;
  openShareOnMount?: boolean;
  originalReportKey?: string;
  precisionHref?: string | null;
  primaryAction?: CoreResultReportAction;
  secondaryAction?: CoreResultReportAction;
  shareEnabled?: boolean;
  statusMessage?: string | null;
  surface: CoreResultReportSurface;
};

const axisTabLabels = ["사람", "생각", "관계", "일상", "마음"];

export function CoreResultReportTemplate({
  backHref,
  canonicalShareUrl,
  deleteError,
  deletePending = false,
  feedbackResultReportId,
  model: sourceModel,
  onDelete,
  onShareUnavailable,
  openShareOnMount = false,
  originalReportKey,
  precisionHref,
  primaryAction,
  secondaryAction,
  shareEnabled = false,
  statusMessage,
  surface,
}: CoreResultReportTemplateProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isRestartOpen, setIsRestartOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [hasActiveRestartAttempt, setHasActiveRestartAttempt] = useState(false);
  const [selectedShareContent, setSelectedShareContent] =
    useState<ReportShareContent | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const activeShareButtonRef = useRef<HTMLButtonElement>(null);
  const surfacePolicy = getCoreResultSurfacePolicy(surface);
  const model = projectCoreResultModelForSurface(sourceModel, surface);
  const content = assembleCoreResultContent(model);
  const isOwner = surfacePolicy.isOwner;
  const isPrecision = model.identity.kind === "full";
  const isCandidateMeasurement =
    model.measurement.codeSchemeVersion === nextNuangCodeScheme.version;
  const resolvedFeedbackResultReportId =
    feedbackResultReportId ?? model.identity.accountResultReportId;
  const feedbackSurface =
    surface === "completion" || surface === "my" ? surface : null;
  const canCollectSectionFeedback = Boolean(
    isOwner &&
    resolvedFeedbackResultReportId &&
    feedbackSurface &&
    (surface === "completion" ||
      model.interpretation.contentResolution === "completion_snapshot"),
  );
  const hasCompleteDomains =
    model.result.domains.length === 5 &&
    model.result.domains.every((domain) => domain.score !== null);
  const kindLabel = isPrecision ? "정밀 성향 결과" : "첫 성향 결과";
  const resolvedPrimary =
    primaryAction ??
    getDefaultPrimaryAction({
      code: model.result.code,
      isOwner,
      isPrecision,
      precisionHref,
    });
  const resolvedSecondary =
    secondaryAction ??
    (isOwner ? { href: "/home", label: "다른 검사 둘러보기" } : null);
  const heroSummary = content.heroSummary
    ? formatHeroSummary(content.heroSummary, model.result.code)
    : null;
  const shareContent = buildCoreReportShareContent({
    code: model.result.code,
    highlights: content.overview
      .slice(0, 3)
      .map((item) => `${item.label}: ${item.text}`.slice(0, 120)),
    profileName: model.result.currentProfileName,
    resultLabel: kindLabel,
    summary:
      heroSummary ??
      "이번 답에서 더 자주 나타난 다섯 가지 성향 방향을 정리했어요.",
  });
  const restartAssessment = isPrecision
    ? candidateFullCoreAssessment
    : candidateQuickCoreAssessment;
  const restartHref = isPrecision
    ? "/assessments/nu-core-full?from=home&backTo=%2Fhome&returnTo=%2Fhome"
    : "/assessments/nu-core-quick?returnTo=%2Fhome";
  const navigationItems = useMemo(
    () =>
      buildReportNavigationItems({
        content,
        hasCompleteDomains,
        model,
        surfacePolicy,
      }),
    [content, hasCompleteDomains, model, surfacePolicy],
  );

  useEffect(() => {
    let active = true;
    if (openShareOnMount && shareEnabled) {
      void Promise.resolve().then(() => {
        if (active) {
          activeShareButtonRef.current = shareButtonRef.current;
          setIsShareOpen(true);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [openShareOnMount, shareEnabled]);

  async function openRestartSheet() {
    const attempts = await listLocalAttempts().catch(() => []);
    setHasActiveRestartAttempt(
      attempts.some(
        (attempt) =>
          attempt.assessmentId === restartAssessment.assessmentId &&
          attempt.releaseId === restartAssessment.releaseId &&
          attempt.state === "in_progress",
      ),
    );
    setIsRestartOpen(true);
  }

  async function restartFromBeginning() {
    if (isRestarting) return;
    setIsRestarting(true);

    try {
      const freshAttempt = await createFreshLocalAttempt(
        restartAssessment,
        "/home",
      );
      queueAccountAssessmentAttemptSync(freshAttempt);
      setIsRestartOpen(false);
      window.location.assign(restartHref);
    } finally {
      setIsRestarting(false);
    }
  }

  if (model.completeness.state === "unsupported") {
    return <CoreResultUnavailableState backHref={backHref} />;
  }

  return (
    <main className={styles.root} data-surface={surface}>
      <header className={styles.appBar}>
        {backHref ? (
          <Link
            aria-label="이전 화면으로 돌아가기"
            className={styles.iconButton}
            href={backHref}
          >
            <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        <p>결과 리포트</p>
        {shareEnabled || onShareUnavailable ? (
          <button
            aria-haspopup="dialog"
            aria-label="검사 결과 공유"
            className={styles.iconButton}
            onClick={() => {
              if (shareEnabled) {
                activeShareButtonRef.current = shareButtonRef.current;
                setSelectedShareContent(null);
                setIsShareOpen(true);
              } else onShareUnavailable?.();
            }}
            ref={shareButtonRef}
            type="button"
          >
            <Share2 aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.kindTag}>{kindLabel}</span>
            <p className={styles.kicker}>
              {isOwner ? "내 뉴앙 코드" : "공개된 뉴앙 코드"}
            </p>
            <p
              aria-label={`뉴앙 코드 ${model.result.code}`}
              className={styles.code}
            >
              {model.result.code.split("").map((letter, index) => (
                <span
                  aria-hidden="true"
                  data-code-position={index + 1}
                  key={`${letter}-${index}`}
                >
                  {letter}
                </span>
              ))}
            </p>
            <h1 aria-label={content.profileAccessibleName}>
              {model.result.currentProfileName}
            </h1>
            {heroSummary ? (
              <p className={styles.heroSummary}>{heroSummary}</p>
            ) : null}
            {isOwner ? (
              <p className={styles.completedAt}>
                {formatCompletedDate(model.identity.completedAt)} 검사
              </p>
            ) : null}
          </div>
          <Image
            alt=""
            aria-hidden="true"
            className={styles.heroMascot}
            height={512}
            priority
            src="/assets/assessment/nuang-loading-mascot-v2.png"
            width={512}
          />
        </section>

        {isCandidateMeasurement ? (
          <div className={styles.partialNotice} role="note">
            현재 코어 측정 모형은 검증 중인 후보 버전이에요. 이번 답을
            돌아보기 위한 참고이며, 사람 연구·집단별 공정성 검토·정량 검증을
            마친 확정 판정이 아니에요.
          </div>
        ) : null}

        {model.completeness.state === "partial" && isOwner ? (
          <div className={styles.partialNotice} role="status">
            이번 결과에서 확인할 수 있는 코드 해설을 중심으로 보여드려요.
          </div>
        ) : null}

        {statusMessage ? (
          <div className={styles.syncNotice} role="status">
            {statusMessage}
          </div>
        ) : null}

        <ReportReadingNavigator items={navigationItems} />

        {content.overview.length > 0 ? (
          <ReportSection
            id="report-overview"
            intro="코드 설명과 내 경험을 비교하며 읽어보세요."
            title={
              isPrecision
                ? "이번 답에서 보인 내 모습"
                : "첫 답에서 보인 내 모습"
            }
          >
            <div className={styles.overviewFlow}>
              {content.overview.map((item) => (
                <article key={item.label}>
                  <p>{item.label}</p>
                  <span>{item.text}</span>
                  {isOwner && shareEnabled ? (
                    <button
                      className={styles.sentenceShare}
                      onClick={(event) => {
                        activeShareButtonRef.current = event.currentTarget;
                        setSelectedShareContent(
                          buildCoreReportShareContent({
                            code: model.result.code,
                            highlights: [
                              `${item.label}: ${item.text}`.slice(0, 120),
                            ],
                            profileName: model.result.currentProfileName,
                            resultLabel: `${kindLabel} · 선택한 문장`,
                            summary: item.text,
                          }),
                        );
                        setIsShareOpen(true);
                      }}
                      type="button"
                    >
                      <Share2 aria-hidden="true" size={14} strokeWidth={1.8} />
                      이 문장 공유
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
            {canCollectSectionFeedback ? (
              <SectionFeedback
                model={model}
                resultReportId={resolvedFeedbackResultReportId!}
                sectionId="profile_overview"
                surface={feedbackSurface!}
              />
            ) : null}
          </ReportSection>
        ) : null}

        {content.canonicalInsights.length > 0 && isOwner ? (
          <ReportSection
            id="report-canonical"
            intro="현재 게시 중인 데이터센터 문장만 보여드려요."
            title="내 성향을 더 선명하게 읽으면"
          >
            <ApprovedClaimList claims={content.canonicalInsights} />
          </ReportSection>
        ) : null}

        {content.facetInsights.length > 0 && isOwner ? (
          <ReportSection
            id="report-signals"
            intro="정밀 검사 답변에서 비교적 뚜렷하게 나타난 구체적인 모습이에요."
            title="이번 답에서 특히 눈에 띈 모습"
          >
            <div className={styles.signalList}>
              {content.facetInsights.map((insight) => (
                <article key={insight.facetId}>
                  <div>
                    <h3>{insight.label}</h3>
                    <strong>{insight.score}</strong>
                  </div>
                  <p>{insight.copy}</p>
                </article>
              ))}
            </div>
          </ReportSection>
        ) : null}

        {content.showFiveLetterExplorer &&
          model.result.code.length === 5 &&
          (hasCompleteDomains || !surfacePolicy.showMeasurementDetails) ? (
          <ReportSection
            id="report-code"
            intro={
              content.fiveLettersChapter?.summary ??
              "다섯 자리를 눌러 이번 답이 어떤 모습에 더 가까웠는지 살펴보세요."
            }
            title={isOwner ? "내 뉴앙 코드 풀이" : "뉴앙 코드 풀이"}
          >
            {surfacePolicy.showMeasurementDetails ? (
              <CodeExplorer model={model} />
            ) : (
              <PublicCodeExplorer code={model.result.code} />
            )}
          </ReportSection>
        ) : null}

        {content.corePatternChapter || content.combinedPatternChapter ? (
          <ReportSection
            id="report-pattern"
            intro={formatGuideText(content.combinedPatternChapter?.summary)}
            title="다섯 성향이 함께 움직이는 방식"
          >
            <div className={styles.patternStory}>
              {content.corePatternChapter ? (
                <ChapterNarrative chapter={content.corePatternChapter} />
              ) : null}
              {content.combinedPatternChapter ? (
                <ChapterNarrative chapter={content.combinedPatternChapter} />
              ) : null}
            </div>
          </ReportSection>
        ) : null}

        {content.lifeContextGroups.length > 0 ? (
          <ReportSection
            id="report-life"
            intro="이 코드의 설명을 평소 생활·일·회복 장면에 연결해 살펴보세요."
            title="생활 속의 나"
          >
            <div className={styles.disclosureList}>
              {content.lifeContextGroups.map((group, index) => (
                <ContextDisclosure
                  defaultOpen={index === 0}
                  group={group}
                  key={group.id}
                />
              ))}
            </div>
          </ReportSection>
        ) : null}

        {content.relationshipContextGroup ? (
          <ReportSection
            id="report-relationships"
            intro="가까워지는 방식과 서운한 순간의 반응은 관계마다 조금 다르게 나타날 수 있어요."
            title="사람들과 지낼 때"
          >
            <RelationshipExplorer group={content.relationshipContextGroup} />
          </ReportSection>
        ) : null}

        {content.strengthAndGrowthChapter ? (
          <ReportSection
            id="report-strength"
            intro={formatGuideText(content.strengthAndGrowthChapter.summary)}
            title="잘 작동할 때와 과해질 때"
          >
            <div className={styles.guidanceFlow}>
              {content.strengthAndGrowthChapter.sections.map((section) => (
                <article key={section.title}>
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{formatGuideText(paragraph)}</p>
                  ))}
                </article>
              ))}
            </div>
            {canCollectSectionFeedback ? (
              <SectionFeedback
                model={model}
                resultReportId={resolvedFeedbackResultReportId!}
                sectionId="strength_and_overuse"
                surface={feedbackSurface!}
              />
            ) : null}
          </ReportSection>
        ) : null}

        {content.overuseCosts.length > 0 && isOwner ? (
          <ReportSection
            id="report-overuse"
            intro="강점이 상황에 맞지 않게 오래 이어질 때 생길 수 있는 비용이에요."
            title="이 성향이 과해질 때"
          >
            <ApprovedClaimList claims={content.overuseCosts} />
          </ReportSection>
        ) : null}

        {content.misreadChapter ? (
          <ReportSection
            id="report-conversation"
            intro={formatGuideText(content.misreadChapter.summary)}
            title="오해받기 쉬운 순간과 잘 통하는 말"
          >
            <div className={styles.disclosureList}>
              {content.misreadChapter.sections.map((section) => (
                <details className={styles.disclosure} key={section.title}>
                  <summary>
                    <span>{section.title}</span>
                    <ChevronDown
                      aria-hidden="true"
                      size={19}
                      strokeWidth={1.8}
                    />
                  </summary>
                  <div className={styles.disclosureBody}>
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{formatGuideText(paragraph)}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            {canCollectSectionFeedback ? (
              <SectionFeedback
                model={model}
                resultReportId={resolvedFeedbackResultReportId!}
                sectionId="misread_and_conversation"
                surface={feedbackSurface!}
              />
            ) : null}
          </ReportSection>
        ) : null}

        {content.reflectionQuestion ? (
          <ReportSection
            id="report-reflection"
            intro="정답을 고르기보다 최근의 실제 경험과 비교해 보세요."
            title="이번 결과에서 생각해볼 한 가지"
          >
            <p className={styles.standaloneReflection}>
              {content.reflectionQuestion}
            </p>
          </ReportSection>
        ) : null}

        {content.actionExperiments.length > 0 && isOwner ? (
          <ReportSection
            id="report-actions"
            intro="한 번에 성격을 바꾸기보다, 다음 비슷한 상황에서 작게 시험해 볼 행동이에요."
            title="이번 주에 해볼 작은 실험"
          >
            <ApprovedClaimList claims={content.actionExperiments} ordered />
          </ReportSection>
        ) : null}

        {content.showMapBridge ? (
          <section className={styles.mapBridge} id="report-map">
            <p>더 넓게 이어서 보기</p>
            <h2>{model.result.currentProfileName} 성향지도</h2>
            <span>
              여기까지는 이번 결과에서 먼저 알아두면 좋은 핵심이에요.
              성향지도에서는 친구·연인·가족·일·회복에 관한 더 긴 설명을 이어서
              볼 수 있어요.
            </span>
            <Link href={`/map/${model.result.code}#chapter-13`}>
              남은 이야기 이어서 보기
              <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
            </Link>
          </section>
        ) : null}

        {content.showReadingGuide ? (
          <ReadingGuide
            isPrecision={isPrecision}
            isOwner={isOwner}
            sectionId="report-guide"
          />
        ) : null}

        {content.evidenceChapter?.references?.length ? (
          <EvidenceGuide
            evidenceChapter={content.evidenceChapter}
            sectionId="report-evidence"
          />
        ) : null}

        {!isPrecision && isOwner && precisionHref ? (
          <section className={styles.upgradePanel}>
            <p>내 성향을 한 단계 더 자세히</p>
            <h2>
              정밀 검사에서는 생활 상황에 따라 달라지는 모습까지 살펴봐요.
            </h2>
            <span className={styles.upgradeHint}>
              지금 본 큰 흐름을 바탕으로 이어서 답할 수 있어요.
            </span>
            <Link href={precisionHref}>
              정밀 검사 이어서 하기
              <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
            </Link>
          </section>
        ) : null}

        <section className={styles.actions}>
          <Link className={styles.primaryAction} href={resolvedPrimary.href}>
            {resolvedPrimary.label}
            <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
          </Link>
          {resolvedSecondary ? (
            <Link
              className={styles.secondaryAction}
              href={resolvedSecondary.href}
            >
              {resolvedSecondary.label}
            </Link>
          ) : null}
        </section>

        {isOwner && (onDelete || surface !== "profile") ? (
          <details className={styles.management}>
            <summary>
              <span>결과 관리</span>
              <ChevronDown aria-hidden="true" size={19} strokeWidth={1.8} />
            </summary>
            <div>
              <p>
                다시 검사해도 이 결과는 내 기록에 그대로 남아요. 새 답으로
                새로운 리포트를 만들 수 있어요.
              </p>
              <button
                className={styles.restartButton}
                onClick={() => void openRestartSheet()}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={16} strokeWidth={1.8} />
                {isPrecision
                  ? "정밀 성향 검사 다시하기"
                  : "첫 성향 검사 다시하기"}
              </button>
              {onDelete ? (
                <>
                  <p className={styles.deleteGuide}>
                    삭제하면 이 결과와 연결된 공유 주소를 다시 열 수 없어요.
                  </p>
                  <button
                    aria-busy={deletePending}
                    disabled={deletePending}
                    onClick={onDelete}
                    type="button"
                  >
                    <Trash2 aria-hidden="true" size={16} strokeWidth={1.8} />
                    {deletePending ? "삭제 중" : "이 결과 삭제"}
                  </button>
                </>
              ) : null}
              {deleteError ? <p role="alert">{deleteError}</p> : null}
            </div>
          </details>
        ) : null}
      </div>

      {shareEnabled ? (
        <ReportShareSheet
          canonicalUrl={canonicalShareUrl}
          content={selectedShareContent ?? shareContent}
          initialCommunityNote={
            selectedShareContent
              ? `“${selectedShareContent.summary}”`.slice(0, 120)
              : undefined
          }
          isOpen={isShareOpen}
          onClose={() => {
            setIsShareOpen(false);
            setSelectedShareContent(null);
          }}
          originalReportKey={originalReportKey}
          returnFocusRef={activeShareButtonRef}
        />
      ) : null}

      {isRestartOpen ? (
        <AssessmentRestartSheet
          assessmentLabel={isPrecision ? "정밀 성향 검사" : "첫 성향 검사"}
          hasActiveAttempt={hasActiveRestartAttempt}
          isWorking={isRestarting}
          onClose={() => setIsRestartOpen(false)}
          onRestart={() => void restartFromBeginning()}
          onResume={() => {
            setIsRestartOpen(false);
            window.location.assign(restartHref);
          }}
        />
      ) : null}
    </main>
  );
}

function buildReportNavigationItems({
  content,
  hasCompleteDomains,
  model,
  surfacePolicy,
}: {
  content: ReturnType<typeof assembleCoreResultContent>;
  hasCompleteDomains: boolean;
  model: CoreResultReportModel;
  surfacePolicy: ReturnType<typeof getCoreResultSurfacePolicy>;
}): ReportReadingNavigationItem[] {
  const items: ReportReadingNavigationItem[] = [];
  if (content.overview.length > 0) {
    items.push({ id: "report-overview", label: "요약" });
  }
  if (
    content.showFiveLetterExplorer &&
    model.result.code.length === 5 &&
    (hasCompleteDomains || !surfacePolicy.showMeasurementDetails)
  ) {
    items.push({ id: "report-code", label: "내 코드" });
  } else if (content.combinedPatternChapter) {
    items.push({ id: "report-pattern", label: "내 코드" });
  }
  if (content.lifeContextGroups.length > 0) {
    items.push({ id: "report-life", label: "생활" });
  }
  if (content.relationshipContextGroup || content.misreadChapter) {
    items.push({
      id: content.relationshipContextGroup
        ? "report-relationships"
        : "report-conversation",
      label: "관계",
    });
  }
  if (content.strengthAndGrowthChapter || content.reflectionQuestion) {
    items.push({
      id: content.strengthAndGrowthChapter
        ? "report-strength"
        : "report-reflection",
      label: "성장",
    });
  }
  return items.slice(0, 5);
}

function SectionFeedback({
  model,
  resultReportId,
  sectionId,
  surface,
}: {
  model: CoreResultReportModel;
  resultReportId: string;
  sectionId: string;
  surface: "completion" | "my";
}) {
  const section = model.sections.find(
    (candidate) =>
      candidate.sectionId === sectionId &&
      candidate.availability === "render" &&
      candidate.privacyScope === "owner_only",
  );
  if (!section) return null;

  return (
    <CoreResultSectionFeedback
      resultReportId={resultReportId}
      section={section}
      surface={surface}
    />
  );
}

function ApprovedClaimList({
  claims,
  ordered = false,
}: {
  claims: ReturnType<typeof assembleCoreResultContent>["canonicalInsights"];
  ordered?: boolean;
}) {
  const Tag = ordered ? "ol" : "ul";

  return (
    <Tag className={styles.approvedClaimList}>
      {claims.map((claim) => (
        <li key={`${claim.canonicalVariantId}-${claim.version}`}>
          {claim.text}
        </li>
      ))}
    </Tag>
  );
}

function ReportSection({
  children,
  id,
  intro,
  title,
}: {
  children: ReactNode;
  id?: string;
  intro?: string;
  title: string;
}) {
  return (
    <section className={styles.section} id={id}>
      <div className={styles.sectionHeading}>
        <h2>{title}</h2>
        {intro ? <p>{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}

function CodeExplorer({ model }: { model: CoreResultReportModel }) {
  const [selectedPosition, setSelectedPosition] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = useId();
  const selectedAxis = candidateAxisCopy[selectedPosition];
  const selectedDomain = model.result.domains.find(
    (domain) => domain.domainId === selectedAxis.domainId,
  );
  const selectedSymbol = model.result.code[selectedPosition];
  const selectedDirection = getCandidateDirectionCopy(
    selectedPosition + 1,
    selectedSymbol,
  );
  const selectedPair = candidatePublicPairOrder[selectedPosition];
  const definition = nextNuangCodeScheme.positions[selectedPosition];
  const highScore = clampScore(selectedDomain?.score ?? 50);
  const scoreBySymbol: Record<string, number> = {
    [definition.highSymbol]: highScore,
    [definition.lowSymbol]: 100 - highScore,
  };
  const leftScore = scoreBySymbol[selectedPair[0]] ?? 50;
  const rightScore = scoreBySymbol[selectedPair[1]] ?? 50;
  const isTie = leftScore === rightScore;
  const selectAndFocus = useCallback((position: number) => {
    const next =
      (position + candidateAxisCopy.length) % candidateAxisCopy.length;
    setSelectedPosition(next);
    tabRefs.current[next]?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAndFocus(selectedPosition + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAndFocus(selectedPosition - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAndFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAndFocus(candidateAxisCopy.length - 1);
    }
  }

  if (!selectedDomain || !selectedDirection) return null;

  return (
    <div className={styles.explorer}>
      {model.result.boundaryDomainIds.length > 0 ? (
        <p className={styles.boundaryNotice}>
          두 글자가 함께 보이는 항목은 양쪽과 관련된 답을 비슷하게 골랐다는
          뜻이에요.
        </p>
      ) : null}
      <div
        aria-label="뉴앙 코드 자리 선택"
        className={styles.tabs}
        role="tablist"
      >
        {model.result.code.split("").map((letter, index) => {
          const domain = model.result.domains.find(
            (item) => item.domainId === candidateAxisCopy[index].domainId,
          );
          const pair = candidatePublicPairOrder[index];
          const shownCode = domain?.isBoundary
            ? `${pair[0]}/${pair[1]}`
            : letter;
          return (
            <button
              aria-controls={panelId}
              aria-label={`${letter} ${candidateAxisCopy[index].label}`}
              aria-selected={selectedPosition === index}
              id={`${panelId}-tab-${index}`}
              key={`${letter}-${index}`}
              onClick={() => setSelectedPosition(index)}
              onKeyDown={handleKeyDown}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              tabIndex={selectedPosition === index ? 0 : -1}
              type="button"
            >
              <strong>{shownCode}</strong>
              <span>{axisTabLabels[index]}</span>
            </button>
          );
        })}
      </div>

      <div
        aria-labelledby={`${panelId}-tab-${selectedPosition}`}
        className={styles.axisPanel}
        id={panelId}
        role="tabpanel"
        tabIndex={0}
      >
        <p className={styles.axisEyebrow}>{selectedAxis.label}</p>
        <h3>
          {isTie
            ? "이번 답에서는 두 모습이 비슷하게 나타났어요"
            : selectedDomain.isBoundary
              ? `${selectedDirection.publicTypeName}에 조금 더 가까웠어요`
              : `${selectedDirection.publicTypeName}에 더 가까웠어요`}
        </h3>
        <div
          aria-label={`${candidateAxisCopy[selectedPosition].directions[selectedPair[0]].publicTypeName} ${leftScore}, ${candidateAxisCopy[selectedPosition].directions[selectedPair[1]].publicTypeName} ${rightScore}`}
          className={styles.directionScores}
          role="img"
        >
          <div aria-hidden="true" className={styles.directionLabels}>
            <span>
              <strong>{selectedPair[0]}</strong>
              <small>
                {
                  candidateAxisCopy[selectedPosition].directions[
                    selectedPair[0]
                  ].publicTypeName
                }
              </small>
              <b>{leftScore}</b>
            </span>
            <span>
              <strong>{selectedPair[1]}</strong>
              <small>
                {
                  candidateAxisCopy[selectedPosition].directions[
                    selectedPair[1]
                  ].publicTypeName
                }
              </small>
              <b>{rightScore}</b>
            </span>
          </div>
          <div aria-hidden="true" className={styles.directionTrack}>
            <span style={{ width: `${leftScore}%` }} />
            <span style={{ width: `${rightScore}%` }} />
          </div>
        </div>
        {!isTie && !selectedDomain.isBoundary ? (
          <p className={styles.axisDescription}>
            {selectedDirection.description}
          </p>
        ) : (
          <p className={styles.axisDescription}>
            양쪽과 관련된 답을 비슷한 정도로 골랐어요. 어느 한쪽만 나의
            모습이라고 보기는 어려워요.
          </p>
        )}
        <p className={styles.axisGuardrail}>{selectedAxis.guardrail}</p>
        <p className={styles.scoreNote}>
          숫자는 두 모습 중 이번 답이 어느 쪽에 더 가까웠는지 비교하기 위한
          값이에요. 확률·사람들 사이의 순위·능력 점수가 아니에요.
        </p>
      </div>
    </div>
  );
}

function PublicCodeExplorer({ code }: { code: string }) {
  const [selectedPosition, setSelectedPosition] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = useId();
  const selectedAxis = candidateAxisCopy[selectedPosition];
  const selectedSymbol = code[selectedPosition];
  const selectedDirection = getCandidateDirectionCopy(
    selectedPosition + 1,
    selectedSymbol,
  );

  const selectAndFocus = useCallback((position: number) => {
    const next =
      (position + candidateAxisCopy.length) % candidateAxisCopy.length;
    setSelectedPosition(next);
    tabRefs.current[next]?.focus();
  }, []);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAndFocus(selectedPosition + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAndFocus(selectedPosition - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAndFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAndFocus(candidateAxisCopy.length - 1);
    }
  }

  if (!selectedDirection) return null;

  return (
    <div className={styles.explorer}>
      <div
        aria-label="뉴앙 코드 자리 선택"
        className={styles.tabs}
        role="tablist"
      >
        {code.split("").map((letter, index) => (
          <button
            aria-controls={panelId}
            aria-label={`${letter} ${candidateAxisCopy[index].label}`}
            aria-selected={selectedPosition === index}
            id={`${panelId}-public-tab-${index}`}
            key={`${letter}-${index}`}
            onClick={() => setSelectedPosition(index)}
            onKeyDown={handleKeyDown}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={selectedPosition === index ? 0 : -1}
            type="button"
          >
            <strong>{letter}</strong>
            <span>{axisTabLabels[index]}</span>
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`${panelId}-public-tab-${selectedPosition}`}
        className={styles.axisPanel}
        id={panelId}
        role="tabpanel"
        tabIndex={0}
      >
        <p className={styles.axisEyebrow}>{selectedAxis.label}</p>
        <h3>
          {selectedSymbol} · {selectedDirection.publicTypeName}
        </h3>
        <p className={styles.axisDescription}>
          {selectedDirection.description}
        </p>
        <p className={styles.axisGuardrail}>{selectedAxis.guardrail}</p>
      </div>
    </div>
  );
}

function ChapterNarrative({
  chapter,
}: {
  chapter: CoreResultContentBundleChapter;
}) {
  return (
    <article className={styles.patternChapter}>
      <h3>{formatGuideText(chapter.title)}</h3>
      <p className={styles.chapterSummary}>
        {formatGuideText(chapter.summary)}
      </p>
      {chapter.sections.map((section) => (
        <div key={section.title}>
          <h4>{section.title}</h4>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{formatGuideText(paragraph)}</p>
          ))}
        </div>
      ))}
    </article>
  );
}

type CoreResultContentBundleChapter = NonNullable<
  ReturnType<typeof assembleCoreResultContent>["combinedPatternChapter"]
>;

function ContextDisclosure({
  defaultOpen = false,
  group,
}: {
  defaultOpen?: boolean;
  group: CoreResultContextGroup;
}) {
  return (
    <details className={styles.disclosure} open={defaultOpen}>
      <summary>
        <span>
          <strong>{group.label}</strong>
          <small>{formatGuideText(group.summary)}</small>
        </span>
        <ChevronDown aria-hidden="true" size={19} strokeWidth={1.8} />
      </summary>
      <div className={styles.disclosureBody}>
        {group.chapters.map((chapter) => (
          <div className={styles.chapter} key={chapter.id}>
            {group.chapters.length > 1 ? <h3>{chapter.label}</h3> : null}
            <p className={styles.chapterSummary}>
              {formatGuideText(chapter.summary)}
            </p>
            {chapter.sections.map((section) => (
              <article key={section.title}>
                <h4>{section.title}</h4>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{formatGuideText(paragraph)}</p>
                ))}
              </article>
            ))}
            <p className={styles.reflectionQuestion}>{chapter.checkQuestion}</p>
          </div>
        ))}
      </div>
    </details>
  );
}

function RelationshipExplorer({ group }: { group: CoreResultContextGroup }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const panelId = useId();
  const selectedChapter = group.chapters[selectedIndex] ?? group.chapters[0];

  const selectAndFocus = useCallback(
    (index: number) => {
      const next = (index + group.chapters.length) % group.chapters.length;
      setSelectedIndex(next);
      tabRefs.current[next]?.focus();
    },
    [group.chapters.length],
  );

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectAndFocus(selectedIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectAndFocus(selectedIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectAndFocus(0);
    } else if (event.key === "End") {
      event.preventDefault();
      selectAndFocus(group.chapters.length - 1);
    }
  }

  if (!selectedChapter) return null;

  return (
    <div className={styles.relationshipExplorer}>
      <div
        aria-label="관계 장면 선택"
        className={styles.relationshipTabs}
        role="tablist"
      >
        {group.chapters.map((chapter, index) => (
          <button
            aria-controls={panelId}
            aria-selected={selectedIndex === index}
            id={`${panelId}-tab-${index}`}
            key={chapter.id}
            onClick={() => setSelectedIndex(index)}
            onKeyDown={handleKeyDown}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={selectedIndex === index ? 0 : -1}
            type="button"
          >
            {chapter.label}
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`${panelId}-tab-${selectedIndex}`}
        className={styles.relationshipPanel}
        id={panelId}
        role="tabpanel"
        tabIndex={0}
      >
        <h3>{formatGuideText(selectedChapter.title)}</h3>
        <p className={styles.chapterSummary}>
          {formatGuideText(selectedChapter.summary)}
        </p>
        {selectedChapter.sections.map((section) => (
          <article key={section.title}>
            <h4>{section.title}</h4>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{formatGuideText(paragraph)}</p>
            ))}
          </article>
        ))}
        <p className={styles.reflectionQuestion}>
          {selectedChapter.checkQuestion}
        </p>
      </div>
    </div>
  );
}

function ReadingGuide({
  isPrecision,
  isOwner,
  sectionId,
}: {
  isPrecision: boolean;
  isOwner: boolean;
  sectionId: string;
}) {
  return (
    <details className={styles.readingGuide} id={sectionId}>
      <summary>
        <span>결과를 이해하는 방법</span>
        <ChevronDown aria-hidden="true" size={19} strokeWidth={1.8} />
      </summary>
      <div>
        {isOwner ? (
          <>
            <p>
              뉴앙은 답변을 다섯 가지 생활 주제로 나눠 살펴봐요. 사람들과 있을
              때의 에너지, 무엇에 먼저 관심이 가는지, 관계에서 먼저 살피는 것,
              일을 시작하고 이어가는 방식, 걱정과 감정이 커지는 속도예요.
            </p>
            <p>
              각 항목은 서로 다른 두 모습 중 이번 답이 어느 쪽에 더 가까웠는지
              보여줘요. 한쪽 숫자가 높다고 더 좋은 성향이거나 능력이 뛰어나다는
              뜻은 아니에요.
            </p>
            <p>
              두 쪽이 비슷하게 나왔다면 양쪽과 관련된 답을 비슷한 정도로
              골랐다는 뜻이에요. 어느 한쪽이 뚜렷하지 않은 것도 자연스러운
              결과예요.
            </p>
            <p>
              이 리포트는 나의 모든 모습을 단정하는 결론이 아니라, 이번 답이
              어느 모습에 더 가까웠는지 이해하기 쉽게 정리한 내용이에요.
            </p>
            <p>
              {isPrecision
                ? "정밀 성향 검사는 큰 흐름과 함께 생활 속에서 구체적으로 나타난 모습도 살펴봐요."
                : "첫 성향 검사는 나의 큰 흐름을 보여줘요. 정밀 검사에서는 같은 흐름이 생활 상황에 따라 어떻게 나타나는지 더 자세히 살펴봐요."}
            </p>
          </>
        ) : (
          <p>
            이 화면은 공유된 뉴앙 코드의 기본 설명만 보여줘요. 개인의 답변
            내용과 점수는 결과를 만든 사람만 볼 수 있어요.
          </p>
        )}
      </div>
    </details>
  );
}

function EvidenceGuide({
  evidenceChapter,
  sectionId,
}: {
  evidenceChapter: NonNullable<
    ReturnType<typeof assembleCoreResultContent>["evidenceChapter"]
  >;
  sectionId: string;
}) {
  return (
    <details className={styles.readingGuide} id={sectionId}>
      <summary>
        <span>뉴앙은 무엇을 참고했나요?</span>
        <ChevronDown aria-hidden="true" size={19} strokeWidth={1.8} />
      </summary>
      <div>
        <p>{evidenceChapter.summary}</p>
        <div className={styles.references}>
          {evidenceChapter.references?.map((reference) => (
            <a
              href={reference.href}
              key={reference.href}
              rel="noreferrer"
              target="_blank"
            >
              <strong>{reference.title}</strong>
              <span>{reference.description}</span>
            </a>
          ))}
        </div>
      </div>
    </details>
  );
}

export function CoreResultUnavailableState({
  backHref,
}: {
  backHref?: string;
}) {
  return (
    <main className={styles.stateRoot}>
      <header className={styles.appBar}>
        {backHref ? (
          <Link
            aria-label="이전 화면으로 돌아가기"
            className={styles.iconButton}
            href={backHref}
          >
            <ArrowLeft aria-hidden="true" size={21} strokeWidth={1.8} />
          </Link>
        ) : (
          <span aria-hidden="true" />
        )}
        <p>결과 리포트</p>
        <span aria-hidden="true" />
      </header>
      <section className={styles.stateBody}>
        <Image
          alt=""
          aria-hidden="true"
          height={180}
          src="/assets/assessment/nuang-loading-mascot-v2.png"
          width={180}
        />
        <h1>이 결과는 지금 화면에서 온전히 열기 어려워요</h1>
        <p>
          완료 당시 형식과 현재 리포트가 달라 일부 정보를 안전하게 불러올 수
          없어요.
        </p>
        <Link className={styles.statePrimaryAction} href="/home">
          새 검사 시작하기
        </Link>
        {backHref ? (
          <Link className={styles.stateSecondaryAction} href={backHref}>
            이전 화면으로 돌아가기
          </Link>
        ) : null}
      </section>
    </main>
  );
}

function getDefaultPrimaryAction({
  code,
  isOwner,
  isPrecision,
  precisionHref,
}: {
  code: string;
  isOwner: boolean;
  isPrecision: boolean;
  precisionHref?: string | null;
}): CoreResultReportAction {
  if (!isOwner) return { href: "/home", label: "나도 검사해 보기" };
  if (!isPrecision && precisionHref) {
    return { href: precisionHref, label: "정밀 검사로 더 알아보기" };
  }
  return { href: `/map/${code}`, label: "내 성향지도 이어서 보기" };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatCompletedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 알 수 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * 가이드 원문과 완료 시점 snapshot은 그대로 보존하면서, 고객 화면에서만
 * 편집 과정의 중복 방지 접두어와 이어 붙은 문장을 자연스럽게 정리합니다.
 */
export function formatGuideText(value?: string | null) {
  if (!value) return undefined;

  return value
    .replace(/[가-힣A-Z0-9· ]{1,24}의 ‘[^’]+’ 장면에서는\s+/g, "")
    .replace(/다섯 방향/g, "다섯 가지 성향")
    .replace(/다섯 경향/g, "다섯 가지 성향")
    .replace(/요 (?=[가-힣A-Z‘“])/g, "요. ")
    .replace(/요$/, "요.")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 완료 시점의 가이드 원문은 바꾸지 않고, 결과 상단에서만 코드나 편집용
 * 설명을 덜어 내 한국어 사용자가 바로 이해할 수 있는 문장으로 보여 줍니다.
 */
export function formatHeroSummary(value: string, code: string) {
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const customerFacingText = value
    .replace(new RegExp(`^\\s*${escapedCode}\\s*(?:은|는)\\s*`), "")
    .replace(
      /\s*이런 흐름이 함께 나타나\s*[\u2018'][^\u2019']+[\u2019'](?:이)?라는 별칭으로 설명해요\.?\s*$/,
      "",
    )
    .replace(/별칭/g, "이름");

  return formatGuideText(customerFacingText);
}
