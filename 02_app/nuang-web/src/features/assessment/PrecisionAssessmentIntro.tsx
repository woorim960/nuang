"use client";

import {
  ArrowRight,
  ChevronLeft,
  Clock3,
  Layers3,
  LockKeyhole,
  MessagesSquare,
  ScanSearch,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AssessmentRunner } from "@/features/assessment/AssessmentRunner";
import { AssessmentLoadingState } from "@/features/assessment/AssessmentLoadingState";
import styles from "@/features/assessment/PrecisionAssessmentIntro.module.css";
import { fullCoreAssessment } from "@/features/assessment/full-core-seed";
import { candidateFullCoreAssessment } from "@/features/assessment/candidate-full-core-seed";
import type { AssessmentDefinition } from "@/features/assessment/types";
import {
  getOrCreateLocalAttempt,
  listLocalAttempts,
  saveLocalAttemptReturnDestination,
} from "@/features/assessment/assessment-storage";
import {
  type LocalPrecisionEntryDecision,
  type PrecisionEntrySource,
  resolveLocalPrecisionEntry,
} from "@/features/assessment/precision-entry";

type PrecisionAssessmentIntroProps = {
  assessment?: AssessmentDefinition;
  backDestination: string;
  entrySource: PrecisionEntrySource;
  forceIntro?: boolean;
  requireQuickPrerequisite?: boolean;
  returnDestination: string | null;
};

type EntrySurface = "error" | "intro" | "loading" | "runner";

const benefits = [
  {
    description: "여러 생활 상황에서 반복해서 나타나는 방향을 함께 살펴봐요.",
    icon: ScanSearch,
    title: "다섯 글자의 의미가 더 분명해져요",
  },
  {
    description:
      "상황에 따라 달라지는 모습과 세부 반응을 더 구체적으로 정리해요.",
    icon: Layers3,
    title: "나를 설명하는 내용이 더 구체적이에요",
  },
  {
    description: "원하는 사람과 공통점과 차이점을 더 자세히 살펴볼 수 있어요.",
    icon: MessagesSquare,
    title: "가족·친구·연인과 비교할 수 있어요",
  },
] as const;

const candidateBenefits = [
  {
    description:
      "여러 생활 상황에서 반복해서 나타나는 방향을 함께 살펴봐요.",
    icon: ScanSearch,
    title: "다섯 글자의 의미가 더 분명해져요",
  },
  {
    description:
      "일상에서 보이는 모습과, 일부 관계 상황의 처음 드는 생각·실제 나타나는 반응을 더 구체적으로 정리해요.",
    icon: Layers3,
    title: "내 생활 속 모습을 더 자세히 알려드려요",
  },
  {
    description:
      "가족·친구·연인과 공통점과 차이점을 더 자세히 살펴볼 수 있어요.",
    icon: MessagesSquare,
    title: "원하는 사람과 성향을 비교할 수 있어요",
  },
] as const;

export function PrecisionAssessmentIntro({
  assessment = fullCoreAssessment,
  backDestination,
  entrySource,
  forceIntro = false,
  requireQuickPrerequisite = true,
  returnDestination,
}: PrecisionAssessmentIntroProps) {
  const router = useRouter();
  const [surface, setSurface] = useState<EntrySurface>("loading");
  const [decision, setDecision] =
    useState<Extract<LocalPrecisionEntryDecision, { action: "show_intro" }>>();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function resolveEntry() {
      setSurface("loading");
      setErrorMessage(null);

      try {
        const attempts = await listLocalAttempts();
        const nextDecision = resolveLocalPrecisionEntry(attempts, {
          assessment,
          requireQuickPrerequisite,
        });

        if (!isMounted) return;

        if (forceIntro) {
          setDecision(
            nextDecision.action === "show_intro"
              ? nextDecision
              : {
                  action: "show_intro",
                  provisionalCode: null,
                  reusableAnswerCount: 0,
                  sourceAttempt: undefined,
                },
          );
          setSurface("intro");
          return;
        }

        if (nextDecision.action === "redirect_report") {
          const updated = await saveLocalAttemptReturnDestination(
            nextDecision.attempt,
            returnDestination,
          );
          if (isMounted) router.replace(`/results/local/${updated.id}`);
          return;
        }

        if (nextDecision.action === "redirect_first_assessment") {
          const params = new URLSearchParams();
          if (returnDestination) params.set("returnTo", returnDestination);
          const suffix = params.size > 0 ? `?${params.toString()}` : "";
          router.replace(`/assessments/nu-core-quick${suffix}`);
          return;
        }

        if (nextDecision.action === "redirect_attempt") {
          await getOrCreateLocalAttempt(
            assessment,
            undefined,
            returnDestination,
          );
          if (!isMounted) return;
          setSurface("runner");
          return;
        }

        setDecision(nextDecision);
        setSurface("intro");
      } catch {
        if (!isMounted) return;
        setSurface("error");
        setErrorMessage(
          "정밀 성향 검사 상태를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.",
        );
      }
    }

    void resolveEntry();

    return () => {
      isMounted = false;
    };
  }, [
    assessment,
    forceIntro,
    reloadKey,
    requireQuickPrerequisite,
    returnDestination,
    router,
  ]);

  const startAssessment = useCallback(async () => {
    if (!decision || isStarting) return;

    setIsStarting(true);
    setErrorMessage(null);

    try {
      await getOrCreateLocalAttempt(
        assessment,
        decision.sourceAttempt,
        returnDestination,
      );
      setSurface("runner");
    } catch {
      setErrorMessage(
        "정밀 성향 검사를 시작하지 못했어요. 화면은 그대로 두었으니 다시 시도해 주세요.",
      );
    } finally {
      setIsStarting(false);
    }
  }, [assessment, decision, isStarting, returnDestination]);

  if (surface === "runner") {
    return (
      <AssessmentRunner
        assessment={assessment}
        returnDestination={returnDestination}
      />
    );
  }

  if (surface === "loading") {
    return <AssessmentLoadingState mode="full" />;
  }

  if (surface === "error") {
    return (
      <main className={styles.statusShell}>
        <div className={styles.statusCard}>
          <p
            aria-live="assertive"
            role="alert"
          >
            {errorMessage}
          </p>
          <button
            className={styles.retryAction}
            onClick={() => setReloadKey((current) => current + 1)}
            type="button"
          >
            다시 확인
          </button>
        </div>
      </main>
    );
  }

  const isCandidateAssessment =
    assessment.assessmentId === "nu-core-beta" ||
    assessment.releaseId === candidateFullCoreAssessment.releaseId;
  const hasQuickResult = Boolean(decision?.provisionalCode);
  const isExampleCode = isCandidateAssessment && !hasQuickResult;
  const codeLetters = decision?.provisionalCode?.split("") ??
    (isExampleCode ? "ENAKQ".split("") : ["", "", "", "", ""]);
  const backLabel = getBackLabel(entrySource);

  return (
    <main className={styles.root}>
      <header className={styles.appBar}>
        <Link
          aria-label={getBackAccessibleLabel(entrySource)}
          className={styles.backLink}
          href={backDestination}
        >
          <ChevronLeft aria-hidden="true" size={18} strokeWidth={2} />
          {backLabel}
        </Link>
        <p className={styles.appBarTitle}>정밀 성향 검사</p>
        <span aria-hidden="true" />
      </header>

      <div className={styles.content}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>
            {isCandidateAssessment
              ? "생활 속 다양한 상황으로 알아보는 내 성향"
              : "내 대표 코드를 찾는 다음 단계"}
          </p>
          <h1>
            {isCandidateAssessment
              ? hasQuickResult
                ? "다섯 글자 속 내 모습을 더 자세히 알아볼까요?"
                : "내 성향을 다섯 글자로 알아볼까요?"
              : "내 성향을 더 자세히 알아볼까요?"}
          </h1>
          <p className={styles.heroDescription}>
            {isCandidateAssessment
              ? hasQuickResult
                ? "방금 확인한 성향을 출발점으로, 더 다양한 생활 상황에서 내 모습을 구체적으로 살펴봐요."
                : "생활 속 여러 상황에 답하면, 지금 나와 가까운 다섯 가지 성향을 코드와 설명으로 보여드려요."
              : hasQuickResult
              ? "방금 확인한 성향을 출발점으로, 더 다양한 생활 상황에서 나의 모습을 살펴봐요."
              : "더 다양한 생활 상황에서 나의 모습을 살펴보고, 다섯 글자 대표 코드와 상세 리포트로 정리해요."}
          </p>

          <div className={styles.journey}>
            <div className={styles.journeyCopy}>
              <p className={styles.journeyLabel}>
                {hasQuickResult
                  ? "방금 확인한 코드"
                  : isExampleCode
                    ? "뉴앙 코드 예시"
                    : "더 자세히 살펴보면"}
              </p>
              <div
                aria-label={
                  hasQuickResult
                    ? `방금 확인한 코드 ${decision?.provisionalCode}`
                    : isExampleCode
                      ? `뉴앙 코드 예시 ${codeLetters.join("")}`
                      : "다섯 자리 대표 코드"
                }
                className={styles.codeRail}
              >
                {codeLetters.map((letter, index) => (
                  <span
                    aria-hidden="true"
                    className={styles.codeLetter}
                    key={`${letter}-${index}`}
                    style={{ "--code-index": index } as CSSProperties}
                  >
                    {letter || "·"}
                  </span>
                ))}
              </div>
              <div className={styles.journeyLine}>
                <ArrowRight
                  aria-hidden="true"
                  color="var(--primary)"
                  size={15}
                />
                <p className={styles.journeyOutcome}>
                  {isCandidateAssessment
                    ? "내 뉴앙 코드와 자세한 성향 리포트"
                    : "내 대표 코드와 상세 리포트"}
                </p>
              </div>
              {hasQuickResult ? (
                <p className={styles.preserveNote}>
                  첫 성향 결과도 내 리포트에서 다시 볼 수 있어요.
                </p>
              ) : null}
            </div>
            <Image
              alt=""
              className={styles.mascot}
              height={512}
              priority
              src="/assets/assessment/nuang-loading-mascot-v2.png"
              width={512}
            />
          </div>
        </section>

        <section className={styles.benefits}>
          <h2 className={styles.sectionTitle}>검사를 마치면</h2>
          <ul className={styles.benefitList}>
            {(isCandidateAssessment ? candidateBenefits : benefits).map(
              (benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <li
                    className={styles.benefitItem}
                    key={benefit.title}
                    style={{ "--benefit-index": index } as CSSProperties}
                  >
                    <span aria-hidden="true" className={styles.benefitIcon}>
                      <Icon size={19} strokeWidth={1.9} />
                    </span>
                    <div>
                      <h3>{benefit.title}</h3>
                      <p>{benefit.description}</p>
                    </div>
                  </li>
                );
              },
            )}
          </ul>
        </section>

        <section aria-label="시작하기 전 안내" className={styles.assurance}>
          {decision && decision.reusableAnswerCount > 0 ? (
            <p className={styles.assuranceRow}>
              <Clock3 aria-hidden="true" size={17} strokeWidth={1.9} />
              <span>첫 성향 검사에서 이미 답한 내용은 다시 묻지 않아요.</span>
            </p>
          ) : null}
          <p className={styles.assuranceRow}>
            <LockKeyhole aria-hidden="true" size={17} strokeWidth={1.9} />
            <span>
              답변 내용은 다른 사람에게 공개되지 않으며, 중간에 멈춰도 이어서 할
              수 있어요.
            </span>
          </p>
        </section>

        <div className={styles.actions}>
          <button
            aria-busy={isStarting}
            className={styles.primaryAction}
            disabled={isStarting}
            onClick={() => void startAssessment()}
            type="button"
          >
            {isStarting
                ? "검사 준비 중"
                : isCandidateAssessment
                ? "정밀 검사 시작하기"
                : "내 대표 코드 알아보기"}
          </button>
          {entrySource === "first-result" ? (
            <button
              className={styles.secondaryAction}
              onClick={() => router.push("/home")}
              type="button"
            >
              나중에 할게요
            </button>
          ) : null}
          {errorMessage ? (
            <p className={styles.error} role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function getBackLabel(entrySource: PrecisionEntrySource) {
  if (entrySource === "first-result") return "결과로";
  if (entrySource === "code-map-gate") return "성향지도로";
  if (entrySource === "compare-gate") return "비교로";
  if (entrySource === "home") return "홈으로";
  return "검사로";
}

function getBackAccessibleLabel(entrySource: PrecisionEntrySource) {
  if (entrySource === "first-result") return "첫 성향 결과로 돌아가기";
  if (entrySource === "code-map-gate") return "성향지도로 돌아가기";
  if (entrySource === "compare-gate") return "비교 화면으로 돌아가기";
  if (entrySource === "home") return "홈으로 돌아가기";
  return "검사 목록으로 돌아가기";
}
