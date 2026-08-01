"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AssessmentBottomSheet,
  AssessmentQuestionContent,
  AssessmentQuestionDock,
  AssessmentQuestionGuideButton,
  AssessmentQuestionHeader,
  AssessmentQuestionPrompt,
  AssessmentQuestionScreen,
  AssessmentScaleResponseOptions,
  AssessmentSheetAction,
  AssessmentSheetActions,
  AssessmentSheetNote,
  AssessmentUnsureControl,
  AssessmentUnsureSheet,
  useAssessmentQuestionScroll,
} from "@/features/assessment/AssessmentQuestionControls";
import type {
  M05ParticipantSession,
  M05ResponseChoice,
  M05ResponseRecord,
  M05ScaleValue,
} from "@/features/research/m05/m05-participant-contract";
import { m05ParticipantDefinition } from "@/features/research/m05/m05-participant-fixture";
import styles from "./M05ParticipantRunner.module.css";

type RunnerSurface = "complete" | "questions";
type SheetType = "exit" | "help" | "unsure" | null;

const responseOptions: Array<{ label: string; value: M05ScaleValue }> = [
  { value: 1, label: "거의 그렇지 않아요" },
  { value: 2, label: "드문 편이에요" },
  { value: 3, label: "반반이에요" },
  { value: 4, label: "자주 그래요" },
  { value: 5, label: "거의 항상 그래요" },
];

export function M05ParticipantRunner({
  onComplete,
}: {
  onComplete?: (session: M05ParticipantSession) => void;
}) {
  const router = useRouter();
  const questionShownAtRef = useRef(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, M05ResponseRecord>>(
    {},
  );
  const [sheet, setSheet] = useState<SheetType>(null);
  const [surface, setSurface] = useState<RunnerSurface>("questions");

  const currentItem = m05ParticipantDefinition.items[currentIndex];
  const currentResponse = currentItem
    ? responses[currentItem.opaqueItemId]
    : undefined;
  const currentChoice = currentResponse?.currentChoice;

  useEffect(() => {
    questionShownAtRef.current = Date.now();
  }, [currentIndex]);
  useAssessmentQuestionScroll(currentItem?.opaqueItemId ?? null);

  function choose(choice: M05ResponseChoice) {
    if (!currentItem) return;

    setResponses((current) => {
      const existing = current[currentItem.opaqueItemId];
      const answeredAt = Date.now();
      const shownAt = questionShownAtRef.current || answeredAt;
      const nextRecord: M05ResponseRecord = existing
        ? {
            ...existing,
            currentChoice: choice,
            responseChanged:
              existing.responseChanged ||
              !isSameChoice(existing.firstChoice, choice),
          }
        : {
            firstChoice: choice,
            currentChoice: choice,
            responseChanged: false,
            firstAnsweredElapsedMs: Math.max(0, answeredAt - shownAt),
          };

      return {
        ...current,
        [currentItem.opaqueItemId]: nextRecord,
      };
    });
  }

  function goPrevious() {
    setCurrentIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (!currentItem || !currentResponse) return;

    if (currentIndex < m05ParticipantDefinition.items.length - 1) {
      setCurrentIndex((current) => current + 1);
      return;
    }

    const session = {
      formId: m05ParticipantDefinition.formId,
      responses,
    };
    setSurface("complete");
    onComplete?.(session);
  }

  function leavePreview() {
    router.push(
      "/assessments/nu-core-full?preview=intro&from=home&backTo=%2Fhome",
    );
  }

  if (surface === "complete") {
    return (
      <AssessmentQuestionScreen>
        <section className={styles.completion}>
          <p className={styles.completionEyebrow}>첫 응답 확인 완료</p>
          <h1 className={styles.completionTitle}>
            5개의 질문을 모두 확인했어요
          </h1>
          <p className={styles.completionCopy}>
            이제 진행자가 어떤 상황을 떠올렸는지 함께 확인할게요.
          </p>
          <p className={styles.completionNote}>
            이 단계에서는 답을 따로 분석하거나 저장하지 않아요. 선택한 답은
            브라우저를 나가면 사라져요.
          </p>
          <div className={styles.completionActions}>
            <button
              className={styles.primaryAction}
              onClick={leavePreview}
              type="button"
            >
              정밀 검사로 돌아가기
            </button>
          </div>
        </section>
      </AssessmentQuestionScreen>
    );
  }

  return (
    <AssessmentQuestionScreen>
      <AssessmentQuestionHeader
        closeLabel="확인 닫기"
        countLabel={`전체 ${m05ParticipantDefinition.items.length}개 중 ${currentIndex + 1}번째 문항`}
        current={currentIndex + 1}
        onClose={() => setSheet("exit")}
        progressLabel="질문 확인 진행률"
        title="성향 질문 확인"
        total={m05ParticipantDefinition.items.length}
      />

      <AssessmentQuestionContent>
        <AssessmentQuestionGuideButton onClick={() => setSheet("help")}>
          답하는 기준 · 최근 6개월의 평소 모습
        </AssessmentQuestionGuideButton>

        <AssessmentQuestionPrompt
          contextLabel={currentItem.contextLabel}
          key={currentItem.opaqueItemId}
          text={currentItem.promptText}
        />

        <AssessmentScaleResponseOptions
          name={`response-${currentItem.opaqueItemId}`}
          onChange={(value) => choose({ kind: "scale", value })}
          options={responseOptions}
          selectedValue={
            currentChoice?.kind === "scale" ? currentChoice.value : undefined
          }
        />

        <AssessmentUnsureControl
          onOpen={() => setSheet("unsure")}
          selectedReason={
            currentChoice?.kind === "unsure" ? currentChoice.reason : undefined
          }
        />
      </AssessmentQuestionContent>

      <AssessmentQuestionDock
        nextDisabled={!currentResponse}
        nextLabel={
          currentIndex === m05ParticipantDefinition.items.length - 1
            ? "응답 마치기"
            : "다음"
        }
        onNext={goNext}
        onPrevious={goPrevious}
        previousDisabled={currentIndex === 0}
      />

      {sheet === "help" ? (
        <AssessmentBottomSheet
          copy="특별히 잘됐거나 힘들었던 한 번보다, 비슷한 상황에서 반복해서 나타난 평소 모습을 기준으로 답해 주세요."
          onClose={() => setSheet(null)}
          title="어떤 모습을 떠올리면 될까요?"
        >
          <AssessmentSheetNote>
            비슷한 경험이 거의 없다면 ‘이 상황은 답하기 어려워요’를 선택해도
            괜찮아요.
          </AssessmentSheetNote>
          <AssessmentSheetActions>
            <AssessmentSheetAction onClick={() => setSheet(null)}>
              이해했어요
            </AssessmentSheetAction>
          </AssessmentSheetActions>
        </AssessmentBottomSheet>
      ) : null}

      {sheet === "unsure" ? (
        <AssessmentUnsureSheet
          onClose={() => setSheet(null)}
          onSelect={(reason) => {
            choose({ kind: "unsure", reason });
            setSheet(null);
          }}
          selectedReason={
            currentChoice?.kind === "unsure" ? currentChoice.reason : undefined
          }
        />
      ) : null}

      {sheet === "exit" ? (
        <AssessmentBottomSheet
          copy="이 화면의 답은 따로 저장하지 않아 나가면 사라져요."
          onClose={() => setSheet(null)}
          title="질문 확인을 그만할까요?"
        >
          <AssessmentSheetActions>
            <AssessmentSheetAction onClick={() => setSheet(null)}>
              계속 확인하기
            </AssessmentSheetAction>
            <AssessmentSheetAction
              onClick={leavePreview}
              variant="secondary"
            >
              정밀 검사로 돌아가기
            </AssessmentSheetAction>
          </AssessmentSheetActions>
        </AssessmentBottomSheet>
      ) : null}
    </AssessmentQuestionScreen>
  );
}

function isSameChoice(left: M05ResponseChoice, right: M05ResponseChoice) {
  if (left.kind !== right.kind) return false;
  return left.kind === "scale"
    ? left.value ===
        (right as Extract<M05ResponseChoice, { kind: "scale" }>).value
    : left.reason ===
        (right as Extract<M05ResponseChoice, { kind: "unsure" }>).reason;
}
