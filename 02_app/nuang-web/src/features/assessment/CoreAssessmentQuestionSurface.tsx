"use client";

import {
  AssessmentQuestionContent,
  AssessmentQuestionDock,
  AssessmentQuestionGuideButton,
  AssessmentQuestionHeader,
  AssessmentQuestionPrompt,
  AssessmentQuestionScreen,
  AssessmentScaleResponseOptions,
  AssessmentUnsureControl,
  type AssessmentQuestionDirection,
} from "@/features/assessment/AssessmentQuestionControls";
import { responseOptions } from "@/features/assessment/quick-core-seed";
import type {
  AssessmentAnswer,
  AssessmentItem,
  AssessmentUnsureReason,
} from "@/features/assessment/types";
import type { ResponseValue } from "@/lib/scoring/types";
import styles from "./AssessmentQuestionSurface.module.css";

type CoreResponseOption = { label: string; value: ResponseValue };

/**
 * The exact core-question surface used by the customer runner and the studio.
 * The caller owns persistence; this component only owns the shared presentation.
 */
export function CoreAssessmentQuestionSurface({
  answer,
  countLabel,
  current,
  currentItem,
  disabled = false,
  embedded = false,
  error,
  guideLabel,
  isAdaptiveQuestion,
  nextDisabled,
  nextLabel,
  onAnswer,
  onClose,
  onGuideOpen,
  onNext,
  onPrevious,
  onUnsureOpen,
  options = responseOptions,
  pendingAnswerNotice,
  previousDisabled,
  questionDirection = "forward",
  title,
  total,
}: {
  answer?: AssessmentAnswer;
  countLabel: string;
  current: number;
  currentItem: AssessmentItem;
  disabled?: boolean;
  embedded?: boolean;
  error?: string | null;
  guideLabel: string;
  isAdaptiveQuestion: boolean;
  nextDisabled: boolean;
  nextLabel: string;
  onAnswer: (value: ResponseValue) => void;
  onClose: () => void;
  onGuideOpen: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onUnsureOpen: () => void;
  options?: ReadonlyArray<CoreResponseOption>;
  pendingAnswerNotice?: string | null;
  previousDisabled: boolean;
  questionDirection?: AssessmentQuestionDirection;
  title: string;
  total: number;
}) {
  const selectedUnsureReason: AssessmentUnsureReason | undefined =
    answer?.isUnsure ? answer.unsureReason : undefined;

  const content = (
    <>
      <AssessmentQuestionHeader
        closeLabel="검사 닫기"
        countLabel={countLabel}
        current={current}
        onClose={onClose}
        progressLabel="검사 진행률"
        title={title}
        total={total}
      />

      <AssessmentQuestionContent>
        <AssessmentQuestionGuideButton onClick={onGuideOpen}>
          {guideLabel}
        </AssessmentQuestionGuideButton>

        <AssessmentQuestionPrompt
          contextLabel={currentItem.contextLabel}
          direction={questionDirection}
          key={currentItem.itemId}
          text={currentItem.text}
        />

        <AssessmentScaleResponseOptions
          disabled={disabled}
          guide={
            isAdaptiveQuestion
              ? "두 방향 중 조금이라도 더 가까운 쪽을 선택해 주세요."
              : "최근 6개월의 평소 모습을 떠올리며, 비슷한 상황에서 이 모습이 얼마나 자주 나타나는지 하나 선택해 주세요."
          }
          legend={
            isAdaptiveQuestion
              ? "반반보다 조금이라도 더 가까운 쪽은?"
              : "이럴 때 내 모습은?"
          }
          name={`response-${currentItem.itemId}`}
          onChange={onAnswer}
          options={options}
          selectedValue={answer?.isUnsure ? undefined : answer?.value}
        />

        {!isAdaptiveQuestion ? (
          <AssessmentUnsureControl
            disabled={disabled}
            onOpen={onUnsureOpen}
            selectedReason={selectedUnsureReason}
          />
        ) : null}

        {pendingAnswerNotice ? (
          <p className={styles.inlineNotice}>{pendingAnswerNotice}</p>
        ) : null}
        {error ? (
          <p className={styles.inlineError} role="alert">
            {error}
          </p>
        ) : null}
      </AssessmentQuestionContent>

      <AssessmentQuestionDock
        nextDisabled={nextDisabled}
        nextLabel={nextLabel}
        onNext={onNext}
        onPrevious={onPrevious}
        previousDisabled={previousDisabled}
      />
    </>
  );

  return embedded ? (
    content
  ) : (
    <AssessmentQuestionScreen>{content}</AssessmentQuestionScreen>
  );
}
