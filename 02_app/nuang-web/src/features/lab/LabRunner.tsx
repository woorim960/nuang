"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  AssessmentBottomSheet,
  AssessmentSheetAction,
  AssessmentSheetActions,
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
import { readCurrentSupabaseUserId } from "@/features/result-persistence/client-result-scope";
import { LabQuestionSurface } from "@/features/lab/LabQuestionSurface";

export function LabRunner({
  assessment,
  releaseId = null,
}: {
  assessment: LabAssessment;
  releaseId?: string | null;
}) {
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

  async function goNext() {
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
    const ownerSupabaseUserId = await readCurrentSupabaseUserId();
    const storedResult = saveLabResult({
      assessmentSnapshot: structuredClone(assessment),
      answers: finalAnswers,
      completedAt: new Date().toISOString(),
      contentVersion: assessment.contentVersion,
      localResultId,
      ...(ownerSupabaseUserId ? { ownerSupabaseUserId } : {}),
      productReleaseId: releaseId ?? undefined,
      result,
      slug: assessment.slug,
    });
    void syncLabResult(storedResult);
    router.push(
      `/labs/${assessment.slug}/result?localResultId=${encodeURIComponent(localResultId)}`,
    );
  }

  return (
    <>
      <LabQuestionSurface
        assessment={assessment}
        current={currentIndex + 1}
        nextDisabled={!canGoNext}
        nextLabel={isLast ? "결과 보기" : "다음"}
        onClose={() => setIsExitOpen(true)}
        onNext={goNext}
        onPrevious={goPrevious}
        onSelect={handleSelect}
        previousDisabled={currentIndex === 0}
        question={currentQuestion}
        selectedId={currentAnswer?.optionId}
        total={assessment.questions.length}
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
    </>
  );
}
