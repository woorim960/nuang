"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  AssessmentBottomSheet,
  AssessmentChoiceResponseOptions,
  AssessmentQuestionContent,
  AssessmentQuestionDock,
  AssessmentQuestionGuide,
  AssessmentQuestionHeader,
  AssessmentQuestionPrompt,
  AssessmentQuestionScreen,
  AssessmentSheetAction,
  AssessmentSheetActions,
  useAssessmentQuestionScroll,
} from "@/features/assessment/AssessmentQuestionControls";
import {
  calculateLabResult,
  type LabAnswer,
  type LabAssessment,
} from "@/features/lab/lab-assessments";
import {
  createLabLocalResultId,
  saveLabResult,
  syncLabResult,
} from "@/features/lab/lab-storage";

export function LabRunner({ assessment }: { assessment: LabAssessment }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, LabAnswer>>({});
  const latestAnswersRef = useRef<Record<string, LabAnswer>>({});
  const completionIdRef = useRef<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExitOpen, setIsExitOpen] = useState(false);

  const currentQuestion = assessment.questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];
  const canGoNext = Boolean(currentAnswer);
  const isLast = currentIndex === assessment.questions.length - 1;

  useAssessmentQuestionScroll(currentQuestion.id);

  function handleSelect(optionId: string) {
    const option = currentQuestion.options.find((item) => item.id === optionId);
    if (!option) return;

    setAnswers((previous) => {
      const nextAnswers = {
        ...previous,
        [currentQuestion.id]: {
          optionId,
          questionId: currentQuestion.id,
          resultId: option.resultId,
        },
      };
      latestAnswersRef.current = nextAnswers;
      return nextAnswers;
    });
  }

  function goPrevious() {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    if (!canGoNext) return;

    if (!isLast) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    if (completionIdRef.current) return;

    const finalAnswers = latestAnswersRef.current;
    const result = calculateLabResult(assessment, finalAnswers);
    const localResultId = createLabLocalResultId();
    completionIdRef.current = localResultId;
    const storedResult = saveLabResult({
      answers: finalAnswers,
      completedAt: new Date().toISOString(),
      contentVersion: assessment.contentVersion,
      localResultId,
      result,
      slug: assessment.slug,
    });
    void syncLabResult(storedResult);
    router.push(
      `/labs/${assessment.slug}/result?localResultId=${encodeURIComponent(localResultId)}`,
    );
  }

  return (
    <AssessmentQuestionScreen>
      <AssessmentQuestionHeader
        closeLabel="검사 닫기"
        countLabel={`전체 ${assessment.questions.length}개 중 ${currentIndex + 1}번째 문항`}
        current={currentIndex + 1}
        onClose={() => setIsExitOpen(true)}
        progressLabel="검사 진행률"
        title={assessment.title}
        total={assessment.questions.length}
      />

      <AssessmentQuestionContent>
        <AssessmentQuestionGuide>
          최근의 평소 모습을 떠올려 주세요
        </AssessmentQuestionGuide>
        <AssessmentQuestionPrompt
          contextLabel={currentQuestion.contextLabel}
          key={currentQuestion.id}
          text={currentQuestion.text}
        />

        <AssessmentChoiceResponseOptions
          choices={currentQuestion.options}
          legend="이럴 때 나는?"
          name={`lab-response-${currentQuestion.id}`}
          onChange={handleSelect}
          selectedId={currentAnswer?.optionId}
        />
      </AssessmentQuestionContent>

      <AssessmentQuestionDock
        nextDisabled={!canGoNext}
        nextLabel={isLast ? "결과 보기" : "다음"}
        onNext={goNext}
        onPrevious={goPrevious}
        previousDisabled={currentIndex === 0}
      />

      {isExitOpen ? (
        <AssessmentBottomSheet
          copy="아직 결과가 만들어지기 전이에요. 나가면 이번 답변은 사라져요."
          onClose={() => setIsExitOpen(false)}
          title="검사를 그만할까요?"
        >
          <AssessmentSheetActions>
            <AssessmentSheetAction onClick={() => setIsExitOpen(false)}>
              계속 답하기
            </AssessmentSheetAction>
            <AssessmentSheetAction
              onClick={() => router.push("/home?view=lab")}
              variant="secondary"
            >
              검사 홈으로 나가기
            </AssessmentSheetAction>
          </AssessmentSheetActions>
        </AssessmentBottomSheet>
      ) : null}
    </AssessmentQuestionScreen>
  );
}
