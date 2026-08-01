"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AssessmentBottomSheet,
  AssessmentQuestionContent,
  AssessmentQuestionDock,
  AssessmentQuestionGuide,
  AssessmentQuestionHeader,
  AssessmentQuestionPrompt,
  AssessmentQuestionScreen,
  AssessmentScaleResponseOptions,
  AssessmentSheetAction,
  AssessmentSheetActions,
  AssessmentUnsureControl,
  AssessmentUnsureSheet,
  useAssessmentQuestionScroll,
} from "@/features/assessment/AssessmentQuestionControls";
import {
  calculateFreeTopicResult,
  defaultFreeTopicRecallPrompt,
  getFreeTopicQuestions,
  type FreeTopicAnswer,
  type FreeTopicAssessment,
} from "@/features/assessment/free-topic-assessments";
import {
  bucketAssessmentDwell,
  bucketAssessmentRevisions,
  enqueueAssessmentQualityObservations,
  flushAssessmentQualityObservationQueue,
} from "@/features/assessment/assessment-quality-client";
import {
  saveFreeTopicResult,
  syncFreeTopicResult,
  syncQueuedFreeTopicResults,
} from "@/features/assessment/free-topic-storage";
import type { ResponseValue } from "@/lib/scoring/types";
import styles from "./FreeTopicRunner.module.css";

const agreementResponseOptions = [
  { label: "거의 하지 않았어요", value: 1 },
  { label: "드물게 했어요", value: 2 },
  { label: "때때로 했어요", value: 3 },
  { label: "자주 했어요", value: 4 },
  { label: "거의 항상 했어요", value: 5 },
] satisfies Array<{ label: string; value: ResponseValue }>;

const helpfulnessResponseOptions = [
  { label: "전혀 도움이 되지 않았어요", value: 1 },
  { label: "별로 도움이 되지 않았어요", value: 2 },
  { label: "보통이었어요", value: 3 },
  { label: "꽤 도움이 됐어요", value: 4 },
  { label: "매우 도움이 됐어요", value: 5 },
] satisfies Array<{ label: string; value: ResponseValue }>;

const needResponseOptions = [
  { label: "전혀 필요하지 않았어요", value: 1 },
  { label: "별로 필요하지 않았어요", value: 2 },
  { label: "어느 정도 필요했어요", value: 3 },
  { label: "꽤 필요했어요", value: 4 },
  { label: "매우 필요했어요", value: 5 },
] satisfies Array<{ label: string; value: ResponseValue }>;

export function FreeTopicRunner({
  assessment,
}: {
  assessment: FreeTopicAssessment;
}) {
  const router = useRouter();
  const questions = getFreeTopicQuestions(assessment.slug);
  const [answers, setAnswers] = useState<Record<string, FreeTopicAnswer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [isUnsureOpen, setIsUnsureOpen] = useState(false);
  const dwellByQuestionId = useRef<Record<string, number>>({});
  const questionEnteredAt = useRef(0);
  const revisionsByQuestionId = useRef<Record<string, number>>({});
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const isLast = currentIndex === questions.length - 1;
  const responseOptions =
    assessment.responseScale === "need_5"
      ? needResponseOptions
      : assessment.responseScale === "helpfulness_5"
        ? helpfulnessResponseOptions
        : agreementResponseOptions;
  const responseLegend =
    assessment.responseScale === "need_5"
      ? "그 상황에서 이런 도움이 얼마나 필요했나요?"
      : assessment.responseScale === "helpfulness_5"
        ? "이런 위로는 얼마나 도움이 되었나요?"
        : "비슷한 상황에서 나는 얼마나 자주 이렇게 행동했나요?";

  useAssessmentQuestionScroll(currentQuestion?.id ?? null);

  useEffect(() => {
    void syncQueuedFreeTopicResults();
    void flushAssessmentQualityObservationQueue();

    function handleOnline() {
      void syncQueuedFreeTopicResults();
      void flushAssessmentQualityObservationQueue();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  useEffect(() => {
    questionEnteredAt.current = performance.now();
  }, [currentQuestion?.id]);

  function selectAnswer(value: ResponseValue) {
    if (!currentQuestion) return;

    if (
      currentAnswer &&
      (currentAnswer.value !== value || currentAnswer.unsureReason)
    ) {
      countRevision(currentQuestion.id);
    }
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: {
        answeredAt: new Date().toISOString(),
        questionId: currentQuestion.id,
        value,
      },
    }));
  }

  function selectUnsure(
    unsureReason: NonNullable<FreeTopicAnswer["unsureReason"]>,
  ) {
    if (!currentQuestion) return;

    if (
      currentAnswer &&
      (currentAnswer.value !== undefined ||
        currentAnswer.unsureReason !== unsureReason)
    ) {
      countRevision(currentQuestion.id);
    }
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: {
        answeredAt: new Date().toISOString(),
        questionId: currentQuestion.id,
        unsureReason,
      },
    }));
    setIsUnsureOpen(false);
  }

  function goNext() {
    if (!currentAnswer) return;
    recordCurrentQuestionDwell();

    if (!isLast) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    const completedAt = new Date().toISOString();
    const result = calculateFreeTopicResult({
      answers,
      assessment,
      observedAt: completedAt,
    });
    const stored = saveFreeTopicResult({
      answers,
      assessment,
      completedAt,
      result,
    });
    void syncFreeTopicResult(stored);
    enqueueAssessmentQualityObservations({
      assessmentSlug: assessment.slug,
      instrumentVersion: stored.instrumentVersion,
      localResultId: stored.localResultId,
      observations: questions.map((question) => {
        const answer = answers[question.id];
        return {
          dwellBucket: bucketAssessmentDwell(
            dwellByQuestionId.current[question.id] ?? 0,
          ),
          kind: "item_experience" as const,
          questionId: question.id,
          response: getQualityResponse(answer),
          revisionBucket: bucketAssessmentRevisions(
            revisionsByQuestionId.current[question.id] ?? 0,
          ),
        };
      }),
    });
    router.push(
      `/assessments/topics/${assessment.slug}/result/${stored.localResultId}`,
    );
  }

  if (!currentQuestion) {
    return (
      <main className={styles.missing}>
        <h1>이 검사는 아직 준비 중이에요</h1>
        <p>문항을 더 꼼꼼하게 다듬은 뒤 공개할게요.</p>
        <Link href="/home?view=self">
          다른 검사 보기
          <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
        </Link>
      </main>
    );
  }

  return (
    <AssessmentQuestionScreen>
      <AssessmentQuestionHeader
        closeLabel="검사 닫기"
        countLabel={`전체 ${questions.length}개 중 ${currentIndex + 1}번째 문항`}
        current={currentIndex + 1}
        onClose={() => setIsExitOpen(true)}
        progressLabel="검사 진행률"
        title={assessment.title}
        total={questions.length}
      />

      <AssessmentQuestionContent>
        {currentIndex === 0 ? (
          <AssessmentQuestionGuide>
            {assessment.recallPrompt ?? defaultFreeTopicRecallPrompt}
          </AssessmentQuestionGuide>
        ) : null}
        <AssessmentQuestionPrompt
          contextLabel={currentQuestion.contextLabel}
          key={currentQuestion.id}
          text={currentQuestion.text}
        />
        <AssessmentScaleResponseOptions
          legend={responseLegend}
          name={`topic-response-${currentQuestion.id}`}
          onChange={selectAnswer}
          options={responseOptions}
          selectedValue={currentAnswer?.value}
        />
        <AssessmentUnsureControl
          onOpen={() => setIsUnsureOpen(true)}
          selectedReason={currentAnswer?.unsureReason}
        />
      </AssessmentQuestionContent>

      <AssessmentQuestionDock
        nextDisabled={!currentAnswer}
        nextLabel={isLast ? "결과 보기" : "다음"}
        onNext={goNext}
        onPrevious={() => {
          recordCurrentQuestionDwell();
          setCurrentIndex((index) => Math.max(0, index - 1));
        }}
        previousDisabled={currentIndex === 0}
      />

      {isExitOpen ? (
        <AssessmentBottomSheet
          copy="나가면 이번 답변은 사라져요."
          onClose={() => setIsExitOpen(false)}
          title="검사를 그만할까요?"
        >
          <AssessmentSheetActions>
            <AssessmentSheetAction onClick={() => setIsExitOpen(false)}>
              계속 답하기
            </AssessmentSheetAction>
            <AssessmentSheetAction
              onClick={() => router.push("/home?view=self")}
              variant="secondary"
            >
              검사 홈으로 나가기
            </AssessmentSheetAction>
          </AssessmentSheetActions>
        </AssessmentBottomSheet>
      ) : null}

      {isUnsureOpen ? (
        <AssessmentUnsureSheet
          note={
            assessment.reportMode === "independent_dimensions"
              ? "이 문항과 같은 상황의 답은 결과 비교에서 함께 제외해요. 중간 점수로 바꾸지 않으니 가장 가까운 이유를 선택해 주세요."
              : "겪어보지 않은 상황은 중간 점수로 계산하지 않아요. 가장 가까운 이유를 선택해 주세요."
          }
          onClose={() => setIsUnsureOpen(false)}
          onSelect={selectUnsure}
          selectedReason={currentAnswer?.unsureReason}
        />
      ) : null}
    </AssessmentQuestionScreen>
  );

  function countRevision(questionId: string) {
    revisionsByQuestionId.current[questionId] =
      (revisionsByQuestionId.current[questionId] ?? 0) + 1;
  }

  function recordCurrentQuestionDwell() {
    if (!currentQuestion || questionEnteredAt.current <= 0) return;
    const elapsed = Math.max(0, performance.now() - questionEnteredAt.current);
    dwellByQuestionId.current[currentQuestion.id] =
      (dwellByQuestionId.current[currentQuestion.id] ?? 0) + elapsed;
    questionEnteredAt.current = performance.now();
  }
}

function getQualityResponse(answer: FreeTopicAnswer | undefined) {
  if (!answer?.unsureReason) return "answered" as const;
  if (answer.unsureReason === "NO_EXPERIENCE") return "no_experience" as const;
  if (answer.unsureReason === "CONTEXT_VARIES")
    return "context_varies" as const;
  if (answer.unsureReason === "WORDING_UNCLEAR")
    return "wording_unclear" as const;
  return "prefer_not_to_answer" as const;
}
