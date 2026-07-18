"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import runnerStyles from "@/features/assessment/AssessmentRunner.module.css";
import type {
  M05ParticipantSession,
  M05ResponseChoice,
  M05ResponseRecord,
  M05ScaleValue,
  M05UnsureReason,
} from "@/features/research/m05/m05-participant-contract";
import { m05ParticipantDefinition } from "@/features/research/m05/m05-participant-fixture";
import { cn } from "@/lib/utils/cn";
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

const unsureReasons: Array<{
  id: M05UnsureReason;
  label: string;
}> = [
  { id: "NO_EXPERIENCE", label: "비슷한 경험이 거의 없어요" },
  { id: "CONTEXT_VARIES", label: "상황에 따라 많이 달라져요" },
  { id: "WORDING_UNCLEAR", label: "질문의 뜻이 분명하지 않아요" },
  { id: "PREFER_NOT_TO_ANSWER", label: "이 질문에는 답하고 싶지 않아요" },
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
  const selectedUnsureReason =
    currentChoice?.kind === "unsure"
      ? unsureReasons.find((reason) => reason.id === currentChoice.reason)
      : undefined;
  const progress = Math.round(
    ((currentIndex + 1) / m05ParticipantDefinition.items.length) * 100,
  );

  useEffect(() => {
    questionShownAtRef.current = Date.now();
  }, [currentIndex]);

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
      <main className={runnerStyles.runner}>
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
      </main>
    );
  }

  return (
    <main className={runnerStyles.runner}>
      <header className={runnerStyles.appBar}>
        <button
          aria-label="확인 닫기"
          className={runnerStyles.closeButton}
          onClick={() => setSheet("exit")}
          type="button"
        >
          <X aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <p className={runnerStyles.title}>성향 질문 확인</p>
        <p
          aria-label={`전체 ${m05ParticipantDefinition.items.length}개 중 ${currentIndex + 1}번째 문항`}
          className={runnerStyles.count}
        >
          {currentIndex + 1} / {m05ParticipantDefinition.items.length}
        </p>
      </header>

      <div className={runnerStyles.progressWrap}>
        <div
          aria-label="질문 확인 진행률"
          aria-valuemax={m05ParticipantDefinition.items.length}
          aria-valuemin={1}
          aria-valuenow={currentIndex + 1}
          className={runnerStyles.progress}
          role="progressbar"
        >
          <span
            className={runnerStyles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <section className={runnerStyles.mainContent}>
        <button
          className={runnerStyles.helpButton}
          onClick={() => setSheet("help")}
          type="button"
        >
          <CircleHelp aria-hidden="true" size={16} strokeWidth={1.8} />
          답하는 기준 · 최근 6개월의 평소 모습
        </button>

        <div
          aria-atomic="true"
          aria-live="polite"
          className={cn(
            runnerStyles.questionRegion,
            runnerStyles.questionForward,
          )}
          key={currentItem.opaqueItemId}
        >
          <p className={runnerStyles.context}>{currentItem.contextLabel}</p>
          <h1 className={runnerStyles.question}>{currentItem.promptText}</h1>
        </div>

        <fieldset
          aria-label="응답 선택"
          className={runnerStyles.responses}
          role="radiogroup"
        >
          <legend className={runnerStyles.legend}>이럴 때 내 모습은?</legend>
          <div className={runnerStyles.options}>
            {responseOptions.map((option) => {
              const selected =
                currentResponse?.currentChoice.kind === "scale" &&
                currentResponse.currentChoice.value === option.value;

              return (
                <label
                  className={cn(
                    runnerStyles.option,
                    selected && runnerStyles.optionSelected,
                  )}
                  key={option.value}
                >
                  <input
                    checked={selected}
                    className={runnerStyles.radio}
                    name={`response-${currentItem.opaqueItemId}`}
                    onChange={() =>
                      choose({ kind: "scale", value: option.value })
                    }
                    type="radio"
                    value={option.value}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className={runnerStyles.unsureSlot}>
          {currentResponse?.currentChoice.kind === "unsure" ? (
            <div className={runnerStyles.unsureSummary}>
              <p>
                <strong>답하기 어려움</strong> · {selectedUnsureReason?.label}
              </p>
              <button
                aria-label={selectedUnsureReason?.label}
                className={runnerStyles.changeButton}
                onClick={() => setSheet("unsure")}
                type="button"
              >
                변경
                <ChevronRight aria-hidden="true" size={17} />
              </button>
            </div>
          ) : (
            <button
              className={runnerStyles.unsureButton}
              onClick={() => setSheet("unsure")}
              type="button"
            >
              이 상황은 답하기 어려워요
            </button>
          )}
        </div>
      </section>

      <footer className={runnerStyles.dock}>
        <button
          aria-label="이전 질문"
          className={runnerStyles.previousButton}
          disabled={currentIndex === 0}
          onClick={goPrevious}
          type="button"
        >
          <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <button
          className={runnerStyles.nextButton}
          disabled={!currentResponse}
          onClick={goNext}
          type="button"
        >
          {currentIndex === m05ParticipantDefinition.items.length - 1
            ? "응답 마치기"
            : "다음"}
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
        </button>
      </footer>

      {sheet === "help" ? (
        <BottomSheet
          copy="특별히 잘됐거나 힘들었던 한 번보다, 비슷한 상황에서 반복해서 나타난 평소 모습을 기준으로 답해 주세요."
          onClose={() => setSheet(null)}
          title="어떤 모습을 떠올리면 될까요?"
        >
          <p className={runnerStyles.sheetNote}>
            비슷한 경험이 거의 없다면 ‘이 상황은 답하기 어려워요’를 선택해도
            괜찮아요.
          </p>
          <div className={runnerStyles.sheetActions}>
            <button
              className={runnerStyles.sheetAction}
              onClick={() => setSheet(null)}
              type="button"
            >
              이해했어요
            </button>
          </div>
        </BottomSheet>
      ) : null}

      {sheet === "unsure" ? (
        <BottomSheet
          copy="가장 가까운 이유 하나를 골라주세요."
          onClose={() => setSheet(null)}
          title="왜 답하기 어려운가요?"
        >
          <div className={runnerStyles.sheetReasons}>
            {unsureReasons.map((reason) => (
              <button
                aria-pressed={
                  currentResponse?.currentChoice.kind === "unsure" &&
                  currentResponse.currentChoice.reason === reason.id
                }
                className={cn(
                  runnerStyles.sheetReason,
                  currentResponse?.currentChoice.kind === "unsure" &&
                    currentResponse.currentChoice.reason === reason.id &&
                    runnerStyles.sheetReasonSelected,
                )}
                key={reason.id}
                onClick={() => {
                  choose({ kind: "unsure", reason: reason.id });
                  setSheet(null);
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={runnerStyles.reasonRadio}
                  data-checked={
                    currentResponse?.currentChoice.kind === "unsure" &&
                    currentResponse.currentChoice.reason === reason.id
                  }
                />
                <span>{reason.label}</span>
              </button>
            ))}
          </div>
          <p className={runnerStyles.sheetNote}>
            비슷한 상황은 떠오르지만 내 반응이 어느 한쪽에 가깝지 않다면
            ‘반반이에요’를 선택해 주세요.
          </p>
        </BottomSheet>
      ) : null}

      {sheet === "exit" ? (
        <BottomSheet
          copy="이 화면의 답은 따로 저장하지 않아 나가면 사라져요."
          onClose={() => setSheet(null)}
          title="질문 확인을 그만할까요?"
        >
          <div className={runnerStyles.sheetActions}>
            <button
              className={runnerStyles.sheetAction}
              onClick={() => setSheet(null)}
              type="button"
            >
              계속 확인하기
            </button>
            <button
              className={cn(
                runnerStyles.sheetAction,
                runnerStyles.sheetActionSecondary,
              )}
              onClick={leavePreview}
              type="button"
            >
              정밀 검사로 돌아가기
            </button>
          </div>
        </BottomSheet>
      ) : null}
    </main>
  );
}

function BottomSheet({
  children,
  copy,
  onClose,
  title,
}: {
  children: ReactNode;
  copy?: string;
  onClose: () => void;
  title: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={runnerStyles.layer} role="presentation">
      <button
        aria-label="닫기"
        className={runnerStyles.backdropButton}
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby="m05-sheet-title"
        aria-modal="true"
        className={runnerStyles.sheet}
        role="dialog"
      >
        <div className={runnerStyles.sheetHeader}>
          <div>
            <h2 className={runnerStyles.sheetTitle} id="m05-sheet-title">
              {title}
            </h2>
            {copy ? <p className={runnerStyles.sheetCopy}>{copy}</p> : null}
          </div>
          <button
            aria-label="닫기"
            className={runnerStyles.sheetClose}
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>
        </div>
        <div className={runnerStyles.sheetBody}>{children}</div>
      </section>
    </div>
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
