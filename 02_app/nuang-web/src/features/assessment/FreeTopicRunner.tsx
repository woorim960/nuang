"use client";

import { ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  calculateFreeTopicResult,
  getFreeTopicQuestions,
  type FreeTopicAnswer,
  type FreeTopicAssessment,
} from "@/features/assessment/free-topic-assessments";
import {
  saveFreeTopicResult,
  syncFreeTopicResult,
  syncQueuedFreeTopicResults,
} from "@/features/assessment/free-topic-storage";
import type { ResponseValue } from "@/lib/scoring/types";
import { cn } from "@/lib/utils/cn";

const responseOptions = [
  { label: "전혀 아니다", value: 1 },
  { label: "아닌 편", value: 2 },
  { label: "반반", value: 3 },
  { label: "그런 편", value: 4 },
  { label: "매우 그렇다", value: 5 },
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
  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isLast = currentIndex === questions.length - 1;
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  useEffect(() => {
    void syncQueuedFreeTopicResults();

    function handleOnline() {
      void syncQueuedFreeTopicResults();
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);

  function selectAnswer(value: ResponseValue) {
    if (!currentQuestion) return;

    const answeredAt = new Date().toISOString();
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: {
        answeredAt,
        questionId: currentQuestion.id,
        value,
      },
    }));
  }

  function goNext() {
    if (!currentAnswer) return;

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
    router.push(`/assessments/topics/${assessment.slug}/result/${stored.localResultId}`);
  }

  if (!currentQuestion) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 py-5">
        <BackLink />
        <section className="mt-6 border-y border-line py-8">
          <h1 className="text-2xl font-black">곧 열릴 검사예요</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            이 주제는 다음 업데이트에서 더 좋은 문항으로 공개할게요.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] bg-white px-5 py-5">
      <BackLink />

      <section className="mt-5 border-b border-line pb-5">
        <p className="text-xs font-bold text-primary">
          {assessment.categoryLabel} · 무료
        </p>
        <h1 className="mt-3 text-2xl font-black leading-8">{assessment.title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{assessment.caption}</p>
      </section>

      <section className="py-6">
        <div className="flex items-center justify-between text-xs font-bold text-muted">
          <span>
            {currentIndex + 1} / {questions.length}
          </span>
          <span>{progress}%</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden bg-[#efedf5]">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>

        <h2 className="mt-8 text-xl font-black leading-8">{currentQuestion.text}</h2>
        <div className="mt-6 grid gap-2">
          {responseOptions.map((option) => {
            const selected = currentAnswer?.value === option.value;

            return (
              <button
                className={cn(
                  "flex min-h-12 items-center justify-between border border-line px-4 text-left text-sm font-semibold transition-colors",
                  selected && "border-primary bg-surface-soft text-primary",
                )}
                key={option.value}
                onClick={() => selectAnswer(option.value)}
                type="button"
              >
                {option.label}
                {selected && <Check aria-hidden="true" size={17} />}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Button
          disabled={currentIndex === 0}
          icon={<ChevronLeft size={17} />}
          onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          variant="secondary"
        >
          이전
        </Button>
        <Button
          disabled={!currentAnswer}
          icon={<ChevronRight size={17} />}
          onClick={goNext}
        >
          {isLast ? "결과 보기" : "다음"}
        </Button>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-muted">
        결과는 먼저 안전하게 저장되고, 로그인 상태에서는 연결 가능할 때 동기화돼요.
      </p>
    </main>
  );
}

function BackLink() {
  return (
    <Link
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted"
      href="/assessments"
    >
      <ArrowLeft size={18} />
      검사
    </Link>
  );
}
