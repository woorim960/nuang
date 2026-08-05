"use client";

import {
  AssessmentChoiceResponseOptions,
  AssessmentQuestionContent,
  AssessmentQuestionDock,
  AssessmentQuestionGuide,
  AssessmentQuestionHeader,
  AssessmentQuestionPrompt,
  AssessmentQuestionScreen,
  useAssessmentQuestionScroll,
} from "@/features/assessment/AssessmentQuestionControls";
import type {
  LabAssessment,
  LabQuestion,
} from "@/features/lab/lab-assessments";

/** Shared customer question screen for an odd-lab assessment. */
export function LabQuestionSurface({
  assessment,
  current,
  nextDisabled,
  nextLabel,
  onClose,
  onNext,
  onPrevious,
  onSelect,
  previousDisabled,
  question,
  selectedId,
  total,
}: {
  assessment: LabAssessment;
  current: number;
  nextDisabled: boolean;
  nextLabel: string;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSelect: (optionId: string) => void;
  previousDisabled: boolean;
  question: LabQuestion;
  selectedId?: string;
  total: number;
}) {
  useAssessmentQuestionScroll(question.id);

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
        <AssessmentQuestionGuide>
          최근의 평소 모습을 떠올려 주세요
        </AssessmentQuestionGuide>
        <AssessmentQuestionPrompt
          contextLabel={question.contextLabel}
          key={question.id}
          text={question.text}
        />

        <AssessmentChoiceResponseOptions
          choices={question.options}
          legend="이럴 때 나는?"
          name={`lab-response-${question.id}`}
          onChange={onSelect}
          selectedId={selectedId}
        />
      </AssessmentQuestionContent>

      <AssessmentQuestionDock
        nextDisabled={nextDisabled}
        nextLabel={nextLabel}
        onNext={onNext}
        onPrevious={onPrevious}
        previousDisabled={previousDisabled}
      />
    </AssessmentQuestionScreen>
  );
}
