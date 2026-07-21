"use client";

import { ArrowRight, ChevronDown, Share2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { AssessmentCompletionState } from "@/features/assessment/AssessmentCompletionState";
import {
  getAdaptiveItemsForDomains,
  getDisplayedTieDomainIds,
} from "@/features/assessment/assessment-adaptive";
import { prepareAssessmentCompletion } from "@/features/assessment/assessment-completion";
import {
  beginLocalAdaptiveFollowUp,
  reopenLocalAttemptForReview,
  startLocalAdaptiveFollowUp,
} from "@/features/assessment/assessment-storage";
import { betaCoreAssessment } from "@/features/assessment/beta-core-seed";
import {
  candidateQuickCoreAssessment,
  isCandidateQuickRelease,
} from "@/features/assessment/candidate-quick-core-seed";
import {
  candidateFullCoreAssessment,
  isCandidateFullRelease,
} from "@/features/assessment/candidate-full-core-seed";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import {
  candidateAxisCopy,
  candidatePublicPairOrder,
  getCandidateDirectionCopy,
  getCandidateProfileDefinition,
} from "@/features/nuang-code/candidate-profile-names";
import { nextNuangCodeScheme } from "@/features/nuang-code/next-code-scheme";
import { buildPrecisionIntroHref } from "@/features/assessment/precision-entry";
import type { CoreScoreResult } from "@/lib/scoring/types";
import {
  CandidateResultShareSheet,
  type CandidateShareAccountController,
} from "@/features/result/CandidateResultShareSheet";
import { TraitMapResultBridge } from "@/features/result/TraitMapResultBridge";
import styles from "@/features/result/CandidateCoreResultView.module.css";

type CandidateCoreResultViewProps = {
  attempt: LocalAssessmentAttempt;
  result: CoreScoreResult;
  shareAccount?: CandidateShareAccountController;
};

const candidateAxisTabLabels = ["사람", "생각", "관계", "일상", "마음"];

export function CandidateCoreResultView({
  attempt,
  result,
  shareAccount,
}: CandidateCoreResultViewProps) {
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [isTrustOpen, setIsTrustOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const closeShare = useCallback(() => setIsShareOpen(false), []);
  const detailId = useId();
  const trustId = useId();
  const profile = getCandidateProfileDefinition(result.code ?? "");
  const orderedDomains = candidateAxisCopy.map((axis) =>
    result.domains.find((domain) => domain.domainId === axis.domainId),
  );
  const selectedAxis = candidateAxisCopy[selectedPosition];
  const selectedDomain = orderedDomains[selectedPosition];
  const selectedSymbol = result.code?.[selectedPosition] ?? "";
  const selectedDirection = getCandidateDirectionCopy(
    selectedPosition + 1,
    selectedSymbol,
  );
  const boundaryPairLabels = orderedDomains.flatMap((domain, index) => {
    if (!domain?.isBoundary) return [];
    return [candidatePublicPairOrder[index].join("/")];
  });
  const hasBoundary = boundaryPairLabels.length > 0;
  const selectedDefinition = nextNuangCodeScheme.positions[selectedPosition];
  const selectedPair = candidatePublicPairOrder[selectedPosition];
  const selectedHighPercentage = clampPercentage(
    Math.round(selectedDomain?.score ?? 50),
  );
  const selectedPercentageBySymbol: Record<string, number> = {
    [selectedDefinition.highSymbol]: selectedHighPercentage,
    [selectedDefinition.lowSymbol]: 100 - selectedHighPercentage,
  };
  const selectedLeftSymbol = selectedPair[0];
  const selectedRightSymbol = selectedPair[1];
  const selectedLeftPercentage =
    selectedPercentageBySymbol[selectedLeftSymbol] ?? 50;
  const selectedRightPercentage =
    selectedPercentageBySymbol[selectedRightSymbol] ?? 50;
  const isDisplayedTie = selectedLeftPercentage === selectedRightPercentage;
  const closerSymbol = isDisplayedTie
    ? null
    : selectedLeftPercentage > selectedRightPercentage
      ? selectedLeftSymbol
      : selectedRightSymbol;
  const selectedLeftDirection = selectedAxis.directions[selectedLeftSymbol];
  const selectedRightDirection = selectedAxis.directions[selectedRightSymbol];
  const nextPosition = (selectedPosition + 1) % candidateAxisCopy.length;
  const isQuickResult = isCandidateQuickRelease(attempt);
  const isShareAvailable = Boolean(
    shareAccount && (isQuickResult || isCandidateFullRelease(attempt)),
  );
  const resultLabel = isQuickResult ? "첫 성향 결과" : "정밀 성향 결과";
  const precisionHref = isQuickResult
    ? buildPrecisionIntroHref({
        backDestination: `/results/local/${attempt.id}`,
        entrySource: "first-result",
        returnDestination: attempt.returnDestination,
      })
    : null;

  if (!result.code || !profile || !selectedDirection || !selectedDomain) {
    return null;
  }

  return (
    <main className={styles.root}>
      <header className={styles.appBar}>
        <span aria-hidden="true" />
        <p>검사 결과</p>
        {isShareAvailable ? (
          <button
            aria-haspopup="dialog"
            className={styles.shareButton}
            onClick={() => setIsShareOpen(true)}
            ref={shareButtonRef}
            type="button"
          >
            <Share2 aria-hidden="true" size={16} strokeWidth={1.9} />
            공유
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroCopy}>
            <span className={styles.statusTag}>
              {isQuickResult ? "첫 성향 결과" : "정밀 성향 결과"}
            </span>
            <p className={styles.kicker}>
              {isQuickResult
                ? "빠른 코어에서 가까웠던 뉴앙 코드"
                : "이번 응답에서 가까운 뉴앙 코드"}
            </p>
            <p aria-label={`뉴앙 코드 ${result.code}`} className={styles.code}>
              {result.code.split("").map((letter, index) => (
                <span
                  aria-hidden="true"
                  key={`${letter}-${index}`}
                  style={{ "--letter-index": index } as CSSProperties}
                >
                  {letter}
                </span>
              ))}
            </p>
            <h1 aria-label={profile.accessibleName} className={styles.name}>
              {profile.displayName}
            </h1>
          </div>
          <Image
            alt="빛나는 핵을 품은 뉴앙 캐릭터"
            className={styles.heroMascot}
            height={512}
            priority
            src="/assets/assessment/nuang-loading-mascot-v2.png"
            width={512}
          />
          <p className={styles.meta}>
            {formatCompletedDate(attempt.completedAt ?? attempt.updatedAt)} 검사
          </p>
        </section>

        <section
          aria-labelledby="candidate-profile-overview"
          className={`${styles.section} ${styles.overviewSection}`}
        >
          <div className={styles.sectionHeading}>
            <div>
              <h2 id="candidate-profile-overview">
                {isQuickResult
                  ? "첫 답에서 보인 내 모습"
                  : "이번 답에서 보인 내 모습"}
              </h2>
            </div>
          </div>
          <div className={styles.overviewCard}>
            <div className={styles.overviewList}>
              {profile.overview.map((item, index) => (
                <article
                  className={styles.overviewItem}
                  key={item.label}
                  style={{ "--overview-index": index } as CSSProperties}
                >
                  <p className={styles.overviewLabel}>{item.label}</p>
                  <p className={styles.overviewText}>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <TraitMapResultBridge
          code={result.code}
          profileName={profile.displayName}
        />

        <section
          aria-labelledby="candidate-code-explorer"
          className={styles.section}
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>내 코드 자세히 보기</p>
              <h2 id="candidate-code-explorer">
                궁금한 글자를 눌러 뜻을 확인해요
              </h2>
            </div>
            <span>{selectedPosition + 1} / 5</span>
          </div>

          {hasBoundary ? (
            <div className={styles.boundaryNotice}>
              <p className={styles.boundaryTitle}>두 글자가 함께 보이는 이유</p>
              <p className={styles.boundaryDescription}>
                {boundaryPairLabels[0]}처럼 두 글자가 함께 보이는 자리는, 두
                글자에 해당하는 답의 점수 차이가 작았다는 뜻이에요. 눌러서
                각각의 뜻을 확인해 보세요.
              </p>
            </div>
          ) : null}

          <div
            aria-label="뉴앙 코드 자리 선택"
            className={styles.tabs}
            role="tablist"
          >
            {result.code.split("").map((letter, index) => {
              const domain = orderedDomains[index];
              const pair = candidatePublicPairOrder[index];
              const definition = nextNuangCodeScheme.positions[index];
              const highPercentage = clampPercentage(
                Math.round(domain?.score ?? 50),
              );
              const percentageBySymbol: Record<string, number> = {
                [definition.highSymbol]: highPercentage,
                [definition.lowSymbol]: 100 - highPercentage,
              };
              const leftPercentage = percentageBySymbol[pair[0]] ?? 50;
              const rightPercentage = percentageBySymbol[pair[1]] ?? 50;
              const isTie = leftPercentage === rightPercentage;
              const tabCloserSymbol = isTie ? null : letter;
              const tabAriaLabel = domain?.isBoundary
                ? `${candidateAxisCopy[index].label}. ${pair[0]} ${leftPercentage}퍼센트, ${pair[1]} ${rightPercentage}퍼센트. ${isTie ? "두 글자의 점수가 같음" : `${tabCloserSymbol}에 조금 더 가까움`}`
                : `${letter} ${candidateAxisCopy[index].label}`;

              return (
                <button
                  aria-controls={detailId}
                  aria-label={tabAriaLabel}
                  aria-selected={selectedPosition === index}
                  className={
                    selectedPosition === index ? styles.activeTab : undefined
                  }
                  id={`${detailId}-tab-${index}`}
                  key={`${letter}-tab-${index}`}
                  onClick={() => setSelectedPosition(index)}
                  role="tab"
                  tabIndex={selectedPosition === index ? 0 : -1}
                  type="button"
                >
                  {domain?.isBoundary ? (
                    <strong aria-hidden="true" className={styles.boundaryCode}>
                      <span
                        className={
                          tabCloserSymbol === pair[0]
                            ? styles.closerTabLetter
                            : isTie
                              ? styles.tieTabLetter
                              : styles.otherTabLetter
                        }
                      >
                        {pair[0]}
                      </span>
                      <i>/</i>
                      <span
                        className={
                          tabCloserSymbol === pair[1]
                            ? styles.closerTabLetter
                            : isTie
                              ? styles.tieTabLetter
                              : styles.otherTabLetter
                        }
                      >
                        {pair[1]}
                      </span>
                    </strong>
                  ) : (
                    <strong
                      aria-hidden="true"
                      className={styles.clearTabLetter}
                    >
                      {letter}
                    </strong>
                  )}
                  <span aria-hidden="true" className={styles.tabLabel}>
                    {candidateAxisTabLabels[index]}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            aria-labelledby={`${detailId}-tab-${selectedPosition}`}
            className={styles.detail}
            id={detailId}
            key={`${selectedPosition}-${selectedSymbol}`}
            role="tabpanel"
            tabIndex={0}
          >
            <div className={styles.detailHeading}>
              <span
                aria-hidden="true"
                className={isDisplayedTie ? styles.tieBadge : undefined}
              >
                {isDisplayedTie
                  ? `${selectedLeftSymbol}/${selectedRightSymbol}`
                  : selectedSymbol}
              </span>
              <div>
                <p>{selectedAxis.label}</p>
                <h3>
                  {isDisplayedTie
                    ? "두 글자의 점수가 같게 나왔어요"
                    : selectedDomain.isBoundary
                      ? `${selectedSymbol} 쪽에 조금 더 가까웠어요`
                      : selectedDirection.detailTitle}
                </h3>
              </div>
            </div>

            <div
              aria-label={`${selectedAxis.label}의 이번 응답 방향 비교. ${selectedLeftSymbol} 방향 ${selectedLeftPercentage}퍼센트, ${selectedRightSymbol} 방향 ${selectedRightPercentage}퍼센트. ${isDisplayedTie ? "두 글자의 점수가 같습니다." : `${closerSymbol} 방향이 더 가깝습니다.`} 성향일 확률이나 검사 정확도가 아닙니다.`}
              className={styles.scoreComparison}
              role="img"
            >
              <p aria-hidden="true" className={styles.scoreEyebrow}>
                이번 응답의 방향 비교
              </p>
              <div aria-hidden="true" className={styles.scoreDirections}>
                <div
                  className={`${styles.scoreDirection} ${closerSymbol === selectedLeftSymbol ? styles.closerDirection : ""}`}
                >
                  <div className={styles.scoreValue}>
                    <strong>{selectedLeftSymbol}</strong>
                    <b>{selectedLeftPercentage}%</b>
                  </div>
                  <p>{selectedLeftDirection.preciseToken}</p>
                  {closerSymbol === selectedLeftSymbol ? (
                    <span>
                      {selectedDomain.isBoundary
                        ? "조금 더 가까움"
                        : "더 가까움"}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`${styles.scoreDirection} ${styles.rightDirection} ${closerSymbol === selectedRightSymbol ? styles.closerDirection : ""}`}
                >
                  <div className={styles.scoreValue}>
                    <strong>{selectedRightSymbol}</strong>
                    <b>{selectedRightPercentage}%</b>
                  </div>
                  <p>{selectedRightDirection.preciseToken}</p>
                  {closerSymbol === selectedRightSymbol ? (
                    <span>
                      {selectedDomain.isBoundary
                        ? "조금 더 가까움"
                        : "더 가까움"}
                    </span>
                  ) : null}
                </div>
              </div>
              <div aria-hidden="true" className={styles.scoreTrack}>
                <span
                  className={`${styles.scoreSegment} ${closerSymbol === selectedLeftSymbol ? styles.closerSegment : ""} ${isDisplayedTie ? styles.tieSegment : ""}`}
                  style={{ width: `${selectedLeftPercentage}%` }}
                />
                <span
                  className={`${styles.scoreSegment} ${closerSymbol === selectedRightSymbol ? styles.closerSegment : ""} ${isDisplayedTie ? styles.tieSegment : ""}`}
                  style={{ width: `${selectedRightPercentage}%` }}
                />
                <i />
              </div>
              <p aria-hidden="true" className={styles.scoreInterpretation}>
                {isDisplayedTie
                  ? "이번 계산에서는 두 글자의 점수가 같아요."
                  : selectedDomain.isBoundary
                    ? `${closerSymbol} 쪽이 조금 더 가깝지만, 두 글자의 점수 차이는 작아요.`
                    : `이번 응답에서는 ${closerSymbol} 쪽 답이 더 많이 나타났어요.`}
              </p>
              <p aria-hidden="true" className={styles.scoreMethod}>
                문항 답을 0~100 기준으로 계산한 비교값이에요. 두 수치는 합계
                100%이며, 성향일 확률이나 검사 정확도를 뜻하지 않아요.
              </p>
            </div>

            <p className={styles.detailDescription}>
              {isDisplayedTie
                ? `이번 응답에서는 ${selectedLeftSymbol}와 ${selectedRightSymbol}에 해당하는 답이 같은 점수로 계산됐어요. 현재 결과만으로 어느 한쪽이 더 가깝다고 보기는 어려워요.`
                : selectedDomain.isBoundary
                  ? `이번 응답에서는 ${selectedDirection.symbol} 방향의 답이 조금 더 많았지만, ${selectedDirection.oppositeSymbol} 방향과 차이가 크지 않았어요. 현재 결과만으로 어느 한쪽이 뚜렷하다고 보기는 어려워요.`
                  : selectedDirection.description}
            </p>
            <p className={styles.guardrail}>{selectedAxis.guardrail}</p>
            <button
              className={styles.nextAxisButton}
              onClick={() => setSelectedPosition(nextPosition)}
              type="button"
            >
              <span>
                {selectedPosition === candidateAxisCopy.length - 1
                  ? "첫 자리 다시 보기"
                  : "다음 자리 보기"}
              </span>
              <strong>{candidateAxisCopy[nextPosition].label}</strong>
              <ArrowRight aria-hidden="true" size={17} strokeWidth={1.9} />
            </button>
          </div>
        </section>

        <section className={styles.trustSection}>
          <button
            aria-controls={trustId}
            aria-expanded={isTrustOpen}
            className={styles.trustButton}
            onClick={() => setIsTrustOpen((current) => !current)}
            type="button"
          >
            <span className={styles.trustTitle}>
              <ShieldCheck aria-hidden="true" size={19} strokeWidth={1.9} />이
              결과는 어떻게 봐야 하나요?
            </span>
            <ChevronDown
              aria-hidden="true"
              className={isTrustOpen ? styles.chevronOpen : undefined}
              size={19}
              strokeWidth={1.9}
            />
          </button>
          <div
            aria-hidden={!isTrustOpen}
            className={`${styles.trustBody} ${isTrustOpen ? styles.trustBodyOpen : ""}`}
            id={trustId}
          >
            <div>
              <p>
                {isQuickResult
                  ? "빠른 코어에서 답한 생활 상황을 다섯 영역으로 나눠, 지금 나와 더 가까웠던 방향을 정리한 첫 결과예요."
                  : "여러 생활 상황에서 답한 내용을 다섯 영역으로 나눠, 각 영역에서 나와 더 가까웠던 방향을 정리한 결과예요."}
              </p>
              <p>
                능력이나 좋고 나쁨, 정신건강을 판단하지 않아요. 상황과 경험이
                달라지면 답과 결과도 달라질 수 있으니, 나를 이해하는 참고 자료로
                봐 주세요.
              </p>
              {isQuickResult ? (
                <p>
                  정밀 검사에서는 더 다양한 상황을 살펴보고, 각 코드가 내
                  생활에서 어떻게 나타나는지 더 구체적으로 알려드려요.
                </p>
              ) : null}
              <Link
                className={styles.codeIntroLink}
                href="/map?view=code-guide"
              >
                뉴앙 코드 소개 보기
                <ArrowRight aria-hidden="true" size={16} strokeWidth={1.9} />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.nextStepSection}>
          <p className={styles.nextStepEyebrow}>
            {isQuickResult ? "첫 결과를 확인했다면" : "결과를 모두 살펴봤다면"}
          </p>
          <h2>
            {isQuickResult
              ? "정밀 검사에서 내 모습을 더 자세히 알아봐요"
              : "뉴앙에서 내 성향을 더 알아가요"}
          </h2>
          <p className={styles.nextStepDescription}>
            {isQuickResult
              ? "더 다양한 생활 상황에 답하면 다섯 글자의 의미와 내 관계·일상에서 보이는 모습을 더 구체적으로 알려드려요."
              : "홈에서 성향 콘텐츠를 둘러보고, 다른 검사도 이어서 만나보세요."}
          </p>
          {precisionHref ? (
            <>
              <Link className={styles.homeAction} href={precisionHref}>
                정밀 검사로 더 알아보기
                <ArrowRight aria-hidden="true" size={18} strokeWidth={1.9} />
              </Link>
              <Link className={styles.secondaryAction} href="/home">
                홈에서 먼저 둘러보기
              </Link>
            </>
          ) : (
            <Link className={styles.homeAction} href="/home">
              홈에서 계속 둘러보기
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.9} />
            </Link>
          )}
        </section>
      </div>
      {shareAccount ? (
        <CandidateResultShareSheet
          account={shareAccount}
          attempt={attempt}
          isOpen={isShareOpen}
          onClose={closeShare}
          result={result}
          resultLabel={resultLabel}
          returnFocusRef={shareButtonRef}
        />
      ) : null}
    </main>
  );
}

export function CandidateUndeterminedResultView({
  attempt,
}: {
  attempt: LocalAssessmentAttempt;
}) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function reviewAnswers() {
    if (isWorking) return;

    setIsWorking(true);
    setActionError(null);

    try {
      const assessment = isCandidateQuickRelease(attempt)
        ? candidateQuickCoreAssessment
        : isCandidateFullRelease(attempt)
          ? candidateFullCoreAssessment
          : betaCoreAssessment;
      const adaptiveDomainIds = attempt.resultSnapshot?.scoreResult
        ? getDisplayedTieDomainIds(attempt.resultSnapshot.scoreResult)
        : prepareAssessmentCompletion(assessment, {
            ...attempt,
            localPersistStatus: "saved",
          }).adaptiveDomainIds;
      const adaptiveItems = getAdaptiveItemsForDomains(
        assessment,
        adaptiveDomainIds,
      );

      if (adaptiveItems.length === 0) {
        throw new Error("ADAPTIVE_ITEMS_UNAVAILABLE");
      }

      const introAttempt = await startLocalAdaptiveFollowUp(
        attempt,
        adaptiveItems.map((item) => item.itemId),
      );
      await beginLocalAdaptiveFollowUp(introAttempt);
      const assessmentHref =
        attempt.assessmentId === "nu-core-beta"
          ? "/assessments/nu-core-full?preview=beta-v1"
          : attempt.assessmentId === "nu-core-quick"
            ? "/assessments/nu-core-quick"
            : "/assessments/nu-core-full";
      router.replace(assessmentHref);
    } catch {
      setActionError("답을 다시 열지 못했어요. 잠시 후 다시 시도해 주세요.");
      setIsWorking(false);
    }
  }

  return (
    <AssessmentCompletionState
      actionError={actionError}
      isWorking={isWorking}
      mode={attempt.mode}
      onLeave={() => router.push("/home")}
      onReviewAnswers={() => void reviewAnswers()}
      onRetry={() => undefined}
      state="undetermined"
      totalItems={attempt.itemIds.length}
    />
  );
}

export function CandidateResponseReviewResultView({
  attempt,
}: {
  attempt: LocalAssessmentAttempt;
}) {
  const router = useRouter();
  const [isWorking, setIsWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function reviewAnswers() {
    if (isWorking) return;

    setIsWorking(true);
    setActionError(null);

    try {
      await reopenLocalAttemptForReview(attempt, 0);
      router.replace(getAssessmentHref(attempt));
    } catch {
      setActionError("답을 다시 열지 못했어요. 잠시 후 다시 시도해 주세요.");
      setIsWorking(false);
    }
  }

  return (
    <AssessmentCompletionState
      actionError={actionError}
      isWorking={isWorking}
      mode={attempt.mode}
      onLeave={() => router.push("/home")}
      onReviewAnswers={() => void reviewAnswers()}
      onRetry={() => undefined}
      state="response-review"
      totalItems={attempt.itemIds.length}
    />
  );
}

export function CandidateResultLoadingState() {
  return (
    <main aria-busy="true" className={styles.loadingRoot}>
      <header className={styles.appBar}>
        <span aria-hidden="true" />
        <p>검사 결과</p>
        <span aria-hidden="true" />
      </header>
      <section className={styles.loadingContent}>
        <div aria-hidden="true" className={styles.loadingVisual}>
          <span className={styles.loadingGlow} />
          <Image
            alt=""
            className={styles.loadingMascot}
            height={512}
            priority
            src="/assets/assessment/nuang-loading-mascot-v2.png"
            width={512}
          />
        </div>
        <div className={styles.loadingCopy}>
          <h1>결과를 이어서 불러오고 있어요</h1>
          <p>준비가 끝나는 대로 바로 보여드릴게요.</p>
          <p aria-live="polite" className={styles.loadingStatus} role="status">
            <span aria-hidden="true" />
            결과 확인 중
          </p>
        </div>
      </section>
    </main>
  );
}

function formatCompletedDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

function getAssessmentHref(attempt: LocalAssessmentAttempt) {
  return attempt.assessmentId === "nu-core-beta"
    ? "/assessments/nu-core-full?preview=beta-v1"
    : attempt.assessmentId === "nu-core-quick"
      ? "/assessments/nu-core-quick"
      : "/assessments/nu-core-full";
}
