"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";
import { responseOptions } from "@/features/assessment/quick-core-seed";
import type { AssessmentUnsureReason } from "@/features/assessment/types";
import type { ResponseValue } from "@/lib/scoring/types";
import { cn } from "@/lib/utils/cn";
import styles from "./AssessmentQuestionSurface.module.css";

export type AssessmentQuestionDirection = "backward" | "forward";

export const assessmentUnsureReasons: Array<{
  id: AssessmentUnsureReason;
  label: string;
  description: string;
}> = [
  {
    id: "NO_EXPERIENCE",
    label: "비슷한 경험이 거의 없어요",
    description: "떠올릴 만한 상황이 아직 충분하지 않아요.",
  },
  {
    id: "CONTEXT_VARIES",
    label: "상황에 따라 많이 달라져요",
    description: "한쪽으로 답하기 어려울 만큼 반응이 달라요.",
  },
  {
    id: "WORDING_UNCLEAR",
    label: "질문의 뜻이 분명하지 않아요",
    description: "어떤 모습을 묻는지 확신하기 어려워요.",
  },
  {
    id: "PREFER_NOT_TO_ANSWER",
    label: "이 질문에는 답하고 싶지 않아요",
    description: "답을 건너뛰고 다음 문항으로 이동해요.",
  },
];

export function AssessmentQuestionScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={cn(styles.runner, className)}>{children}</main>;
}

export function AssessmentQuestionContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(styles.mainContent, className)}>{children}</section>
  );
}

export function AssessmentQuestionGuide({
  children,
}: {
  children: ReactNode;
}) {
  return <p className={styles.guide}>{children}</p>;
}

export function AssessmentQuestionPrompt({
  contextLabel,
  direction = "forward",
  headingLevel = 1,
  text,
}: {
  contextLabel?: string | null;
  direction?: AssessmentQuestionDirection;
  headingLevel?: 1 | 2;
  text: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h1";

  return (
    <div
      aria-atomic="true"
      aria-live="polite"
      className={cn(
        styles.questionRegion,
        direction === "backward"
          ? styles.questionBackward
          : styles.questionForward,
      )}
    >
      {contextLabel ? (
        <p className={styles.context}>{contextLabel}</p>
      ) : null}
      <Heading
        className={cn(
          styles.question,
          !contextLabel && styles.questionWithoutContext,
        )}
      >
        {text}
      </Heading>
    </div>
  );
}

export function AssessmentQuestionHeader({
  closeLabel,
  countLabel,
  current,
  onClose,
  progressLabel,
  title,
  total,
}: {
  closeLabel: string;
  countLabel: string;
  current: number;
  onClose: () => void;
  progressLabel: string;
  title: string;
  total: number;
}) {
  const progress = Math.round((current / total) * 100);

  return (
    <>
      <header className={styles.appBar}>
        <button
          aria-label={closeLabel}
          className={styles.closeButton}
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" size={20} strokeWidth={1.8} />
        </button>
        <p className={styles.title}>{title}</p>
        <p aria-label={countLabel} className={styles.count}>
          {current} / {total}
        </p>
      </header>
      <div className={styles.progressWrap}>
        <div
          aria-label={progressLabel}
          aria-valuemax={total}
          aria-valuemin={1}
          aria-valuenow={current}
          className={styles.progress}
          role="progressbar"
        >
          <span
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </>
  );
}

export function useAssessmentQuestionScroll(questionKey: string | null) {
  useEffect(() => {
    if (!questionKey) return;
    window.scrollTo({ behavior: "auto", top: 0 });
  }, [questionKey]);
}

export function AssessmentQuestionGuideButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={styles.helpButton} onClick={onClick} type="button">
      <CircleHelp aria-hidden="true" size={16} strokeWidth={1.8} />
      {children}
    </button>
  );
}

export function AssessmentScaleResponseOptions({
  disabled = false,
  guide,
  legend = "이럴 때 내 모습은?",
  name,
  onChange,
  options = responseOptions,
  selectedValue,
}: {
  disabled?: boolean;
  guide?: string;
  legend?: string;
  name: string;
  onChange: (value: ResponseValue) => void;
  options?: ReadonlyArray<{ label: string; value: ResponseValue }>;
  selectedValue?: ResponseValue;
}) {
  const guideId = useId();

  return (
    <fieldset
      aria-label="응답 선택"
      className={styles.responses}
      role="radiogroup"
    >
      <legend className={styles.legend}>{legend}</legend>
      {guide ? (
        <span className="sr-only" id={guideId}>
          {guide}
        </span>
      ) : null}
      <div
        aria-describedby={guide ? guideId : undefined}
        className={styles.options}
      >
        {options.map((option) => {
          const selected = selectedValue === option.value;
          return (
            <label
              className={cn(
                styles.option,
                selected && styles.optionSelected,
                disabled && styles.optionDisabled,
              )}
              key={option.value}
            >
              <input
                checked={selected}
                className={styles.radio}
                disabled={disabled}
                name={name}
                onChange={() => onChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AssessmentChoiceResponseOptions({
  choices,
  disabled = false,
  legend = "가장 가까운 답은?",
  name,
  onChange,
  selectedId,
}: {
  choices: ReadonlyArray<{ id: string; label: string }>;
  disabled?: boolean;
  legend?: string;
  name: string;
  onChange: (id: string) => void;
  selectedId?: string;
}) {
  return (
    <fieldset
      aria-label="응답 선택"
      className={styles.responses}
      role="radiogroup"
    >
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {choices.map((choice) => {
          const selected = selectedId === choice.id;
          return (
            <label
              className={cn(
                styles.option,
                selected && styles.optionSelected,
                disabled && styles.optionDisabled,
              )}
              key={choice.id}
            >
              <input
                checked={selected}
                className={styles.radio}
                disabled={disabled}
                name={name}
                onChange={() => onChange(choice.id)}
                type="radio"
                value={choice.id}
              />
              <span>{choice.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AssessmentUnsureControl({
  disabled = false,
  onOpen,
  selectedReason,
}: {
  disabled?: boolean;
  onOpen: () => void;
  selectedReason?: AssessmentUnsureReason;
}) {
  const selected = assessmentUnsureReasons.find(
    (reason) => reason.id === selectedReason,
  );

  return (
    <div className={styles.unsureSlot}>
      {selected ? (
        <div className={styles.unsureSummary}>
          <p>
            <strong>{selected.label}</strong>
          </p>
          <button
            aria-label={selected.label}
            className={styles.changeButton}
            disabled={disabled}
            onClick={onOpen}
            type="button"
          >
            변경
            <ChevronRight aria-hidden="true" size={17} />
          </button>
        </div>
      ) : (
        <button
          className={styles.unsureButton}
          disabled={disabled}
          onClick={onOpen}
          type="button"
        >
          이 상황은 답하기 어려워요
        </button>
      )}
    </div>
  );
}

export function AssessmentUnsureSheet({
  note = "두 모습이 실제로 비슷하게 나타난다면 ‘반반이에요’를 선택해 주세요. 경험이 부족하거나 뜻이 모호하다면 답하기 어려운 이유를 알려주세요.",
  onClose,
  onSelect,
  selectedReason,
}: {
  note?: string;
  onClose: () => void;
  onSelect: (reason: AssessmentUnsureReason) => void;
  selectedReason?: AssessmentUnsureReason;
}) {
  return (
    <AssessmentBottomSheet onClose={onClose} title="왜 답하기 어려운가요?">
      <div className={styles.sheetReasons}>
        {assessmentUnsureReasons.map((reason) => (
          <button
            aria-pressed={selectedReason === reason.id}
            className={cn(
              styles.sheetReason,
              selectedReason === reason.id && styles.sheetReasonSelected,
            )}
            key={reason.id}
            onClick={() => onSelect(reason.id)}
            type="button"
          >
            <span
              aria-hidden="true"
              className={styles.reasonRadio}
              data-checked={selectedReason === reason.id}
            />
            <span>{reason.label}</span>
          </button>
        ))}
      </div>
      <p className={styles.sheetNote}>
        {note}
      </p>
    </AssessmentBottomSheet>
  );
}

export function AssessmentQuestionDock({
  nextDisabled,
  nextLabel,
  onNext,
  onPrevious,
  previousDisabled,
}: {
  nextDisabled: boolean;
  nextLabel: string;
  onNext: () => void;
  onPrevious: () => void;
  previousDisabled: boolean;
}) {
  return (
    <footer className={styles.dock}>
      <button
        aria-label="이전 질문"
        className={styles.previousButton}
        disabled={previousDisabled}
        onClick={onPrevious}
        type="button"
      >
        <ChevronLeft aria-hidden="true" size={20} strokeWidth={1.8} />
      </button>
      <button
        className={styles.nextButton}
        disabled={nextDisabled}
        onClick={onNext}
        type="button"
      >
        {nextLabel}
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
      </button>
    </footer>
  );
}

export function AssessmentBottomSheet({
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
  const onCloseRef = useRef(onClose);
  const sheetRef = useRef<HTMLElement>(null);
  const copyId = useId();
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sheetRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className={styles.layer} role="presentation">
      <button
        aria-label="닫기"
        className={styles.backdropButton}
        onClick={onClose}
        type="button"
      />
      <section
        aria-describedby={copy ? copyId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={styles.sheet}
        ref={sheetRef}
        role="dialog"
        tabIndex={-1}
      >
        <div className={styles.sheetHeader}>
          <div>
            <h2 className={styles.sheetTitle} id={titleId}>
              {title}
            </h2>
            {copy ? (
              <p className={styles.sheetCopy} id={copyId}>
                {copy}
              </p>
            ) : null}
          </div>
          <button
            aria-label="닫기"
            className={styles.sheetClose}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={19} strokeWidth={1.8} />
          </button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
      </section>
    </div>
  );
}

export function AssessmentSheetActions({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={styles.sheetActions}>{children}</div>;
}

export function AssessmentSheetNote({ children }: { children: ReactNode }) {
  return <p className={styles.sheetNote}>{children}</p>;
}

export function AssessmentSheetAction({
  children,
  disabled = false,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      className={cn(
        styles.sheetAction,
        variant === "secondary" && styles.sheetActionSecondary,
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function getAssessmentUnsureReasonLabel(
  reason?: AssessmentUnsureReason,
) {
  return assessmentUnsureReasons.find((item) => item.id === reason)?.label;
}
