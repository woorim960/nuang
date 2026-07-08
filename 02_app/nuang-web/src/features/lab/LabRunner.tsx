"use client";

import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  calculateLabResult,
  type LabAnswer,
  type LabAssessment,
} from "@/features/lab/lab-assessments";
import { saveLabResult } from "@/features/lab/lab-storage";
import { cn } from "@/lib/utils/cn";

export function LabRunner({ assessment }: { assessment: LabAssessment }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, LabAnswer>>({});
  const latestAnswersRef = useRef<Record<string, LabAnswer>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = assessment.questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id];
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round(
    ((currentIndex + 1) / assessment.questions.length) * 100,
  );

  const canGoNext = Boolean(currentAnswer);
  const isLast = currentIndex === assessment.questions.length - 1;

  const sensitivityTone = useMemo(
    () => (assessment.sensitivity === "S2" ? "caution" : "neutral"),
    [assessment.sensitivity],
  );

  function handleSelect(optionId: string, resultId: string) {
    setAnswers((previous) => {
      const nextAnswers = {
        ...previous,
        [currentQuestion.id]: {
          optionId,
          questionId: currentQuestion.id,
          resultId,
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

    const finalAnswers = latestAnswersRef.current;
    const result = calculateLabResult(assessment, finalAnswers);
    saveLabResult({
      answers: finalAnswers,
      completedAt: new Date().toISOString(),
      contentVersion: assessment.contentVersion,
      result,
      slug: assessment.slug,
    });
    router.push(`/labs/${assessment.slug}/result`);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
      <Link
        className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-muted"
        href="/assessments"
      >
        <ArrowLeft size={18} />
        검사
      </Link>

      <section className="mt-5 rounded-lg border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <StatusPill tone="primary">별난 성향 연구소</StatusPill>
            <StatusPill tone={sensitivityTone}>{assessment.sensitivity}</StatusPill>
          </div>
          <span className="text-sm font-semibold text-muted">
            {currentIndex + 1} / {assessment.questions.length}
          </span>
        </div>

        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eceaf4]">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-6 text-sm leading-6 text-muted">
          정답 없는 생활 취향 질문이에요. 가장 가까운 쪽을 골라주세요.
        </p>
        <h1 className="mt-3 text-2xl font-black leading-9 tracking-normal">
          {currentQuestion.text}
        </h1>

        <div className="mt-6 grid gap-2">
          {currentQuestion.options.map((option) => {
            const isSelected = currentAnswer?.optionId === option.id;
            return (
              <button
                className={cn(
                  "min-h-12 rounded-lg border border-line bg-white px-4 text-left text-sm font-semibold transition-colors",
                  isSelected && "border-primary bg-surface-soft text-primary",
                )}
                key={option.id}
                onClick={() => handleSelect(option.id, option.resultId)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-3 rounded-lg border border-line bg-white p-3 text-sm leading-6 text-muted">
        {assessment.safetyNote}
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          disabled={currentIndex === 0}
          icon={<ChevronLeft size={17} />}
          onClick={goPrevious}
          variant="secondary"
        >
          이전
        </Button>
        <Button
          disabled={!canGoNext}
          icon={<ChevronRight size={17} />}
          onClick={goNext}
        >
          {isLast ? "결과 보기" : "다음"}
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        {answeredCount}개 응답이 이 기기에 임시 저장됨
      </p>
    </main>
  );
}
