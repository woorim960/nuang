"use client";

import {
  AssessmentQuestionContent,
  AssessmentQuestionDock,
  AssessmentQuestionGuide,
  AssessmentQuestionHeader,
  AssessmentQuestionPrompt,
  AssessmentQuestionScreen,
  AssessmentScaleResponseOptions,
  AssessmentUnsureControl,
} from "@/features/assessment/AssessmentQuestionControls";
import {
  defaultFreeTopicRecallPrompt,
  type FreeTopicAnswer,
  type FreeTopicAssessment,
  type FreeTopicQuestion,
} from "@/features/assessment/free-topic-assessments";
import type { ResponseValue } from "@/lib/scoring/types";

const frequencyResponseOptions = [
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

export function getFreeTopicResponsePresentation(
  responseScale: FreeTopicAssessment["responseScale"],
) {
  if (responseScale === "need_5") {
    return {
      legend: "그 상황에서 이런 도움이 얼마나 필요했나요?",
      options: needResponseOptions,
    };
  }
  if (responseScale === "helpfulness_5") {
    return {
      legend: "이런 위로는 얼마나 도움이 되었나요?",
      options: helpfulnessResponseOptions,
    };
  }
  return {
    legend: "비슷한 상황에서 나는 얼마나 자주 이렇게 행동했나요?",
    options: frequencyResponseOptions,
  };
}

export function FreeTopicQuestionSurface({
  answer,
  assessment,
  current,
  nextLabel,
  onAnswer,
  onClose,
  onNext,
  onPrevious,
  onUnsureOpen,
  question,
  total,
}: {
  answer?: FreeTopicAnswer;
  assessment: FreeTopicAssessment;
  current: number;
  nextLabel: string;
  onAnswer: (value: ResponseValue) => void;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onUnsureOpen: () => void;
  question: FreeTopicQuestion;
  total: number;
}) {
  const response = getFreeTopicResponsePresentation(assessment.responseScale);

  return (
    <AssessmentQuestionScreen>
      <AssessmentQuestionHeader
        closeLabel="검사 닫기"
        countLabel={`전체 ${total}개 중 ${current}번째 문항`}
        current={current}
        onClose={onClose}
        progressLabel="검사 진행률"
        title={assessment.title}
        total={total}
      />

      <AssessmentQuestionContent>
        {current === 1 ? (
          <AssessmentQuestionGuide>
            {assessment.recallPrompt ?? defaultFreeTopicRecallPrompt}
          </AssessmentQuestionGuide>
        ) : null}
        <AssessmentQuestionPrompt
          contextLabel={question.contextLabel}
          key={question.id}
          text={question.text}
        />
        <AssessmentScaleResponseOptions
          legend={response.legend}
          name={`topic-response-${question.id}`}
          onChange={onAnswer}
          options={response.options}
          selectedValue={answer?.value}
        />
        <AssessmentUnsureControl
          onOpen={onUnsureOpen}
          selectedReason={answer?.unsureReason}
        />
      </AssessmentQuestionContent>

      <AssessmentQuestionDock
        nextDisabled={!answer}
        nextLabel={nextLabel}
        onNext={onNext}
        onPrevious={onPrevious}
        previousDisabled={current === 1}
      />
    </AssessmentQuestionScreen>
  );
}
