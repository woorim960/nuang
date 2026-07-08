"use client";

import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import {
  completeLocalAttempt,
  getLatestCompletedAttempt,
  getOrCreateLocalAttempt,
  saveLocalAnswer,
  saveLocalProgress,
} from "@/features/assessment/assessment-storage";
import { responseOptions } from "@/features/assessment/quick-core-seed";
import { coreResultCopyVersion } from "@/features/result/report-copy";
import type {
  AssessmentDefinition,
  AssessmentAnswer,
  LocalAssessmentAttempt,
} from "@/features/assessment/types";
import type { ResponseValue } from "@/lib/scoring/types";
import { cn } from "@/lib/utils/cn";

export function AssessmentRunner({
  assessment,
}: {
  assessment: AssessmentDefinition;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = useState<LocalAssessmentAttempt | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadAttempt() {
      const reusableQuickAttempt =
        assessment.mode === "full"
          ? await getLatestCompletedAttempt("nu-core-quick")
          : undefined;
      const nextAttempt = await getOrCreateLocalAttempt(
        assessment,
        reusableQuickAttempt?.responses,
      );
      if (isMounted) setAttempt(nextAttempt);
    }

    loadAttempt();

    return () => {
      isMounted = false;
    };
  }, [assessment]);

  const currentItem = useMemo(() => {
    if (!attempt) return null;
    return assessment.items[attempt.currentIndex] ?? null;
  }, [assessment.items, attempt]);

  if (!attempt || !currentItem) {
    return (
      <main className="mx-auto min-h-dvh max-w-[520px] px-5 py-5">
        <div className="rounded-lg border border-line bg-white p-5 text-sm text-muted">
          검사 준비 중
        </div>
      </main>
    );
  }

  const currentAnswer = attempt.responses[currentItem.itemId];
  const answeredCount = Object.keys(attempt.responses).length;
  const progress = Math.round(
    ((attempt.currentIndex + 1) / assessment.items.length) * 100,
  );

  async function handleAnswer(value?: ResponseValue, isUnsure = false) {
    if (!attempt || !currentItem) return;
    setIsSaving(true);

    const answer: AssessmentAnswer = {
      itemId: currentItem.itemId,
      value,
      isUnsure,
      answeredAt: new Date().toISOString(),
    };
    const nextAttempt = await saveLocalAnswer(
      attempt,
      answer,
      attempt.currentIndex,
    );

    setAttempt(nextAttempt);
    setIsSaving(false);
  }

  async function goNext() {
    if (!attempt) return;

    if (attempt.currentIndex === assessment.items.length - 1) {
      const completed = await completeLocalAttempt(attempt, coreResultCopyVersion);
      router.push(`/results/local/${completed.id}`);
      return;
    }

    const nextAttempt = await saveLocalProgress(
      attempt,
      attempt.currentIndex + 1,
    );
    setAttempt(nextAttempt);
  }

  async function goPrevious() {
    if (!attempt || attempt.currentIndex === 0) return;
    const nextAttempt = await saveLocalProgress(
      attempt,
      attempt.currentIndex - 1,
    );
    setAttempt(nextAttempt);
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
          <StatusPill tone="primary">{assessment.title}</StatusPill>
          <span className="text-sm font-semibold text-muted">
            {attempt.currentIndex + 1} / {assessment.items.length}
          </span>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#eceaf4]">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="mt-6 text-sm leading-6 text-muted">
          지난 6개월 정도 여러 상황에서 반복해서 나타난 평소의 내 모습
        </p>
        <h1 className="mt-3 text-2xl font-black leading-9 tracking-normal">
          {currentItem.text}
        </h1>

        <div className="mt-6 grid gap-2">
          {responseOptions.map((option) => {
            const isSelected = currentAnswer?.value === option.value;
            return (
              <button
                className={cn(
                  "min-h-12 rounded-lg border border-line bg-white px-4 text-left text-sm font-semibold transition-colors",
                  isSelected && "border-primary bg-surface-soft text-primary",
                )}
                disabled={isSaving}
                key={option.value}
                onClick={() => handleAnswer(option.value)}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
          <button
            className={cn(
              "min-h-12 rounded-lg border border-dashed border-line bg-[#fbfbfd] px-4 text-left text-sm font-semibold text-muted transition-colors",
              currentAnswer?.isUnsure && "border-primary bg-surface-soft text-primary",
            )}
            disabled={isSaving}
            onClick={() => handleAnswer(undefined, true)}
            type="button"
          >
            판단하기 어렵다
          </button>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button
          disabled={attempt.currentIndex === 0}
          icon={<ChevronLeft size={17} />}
          onClick={goPrevious}
          variant="secondary"
        >
          이전
        </Button>
        <Button
          disabled={!currentAnswer}
          icon={<ChevronRight size={17} />}
          onClick={goNext}
        >
          {attempt.currentIndex === assessment.items.length - 1
            ? "결과 보기"
            : "다음"}
        </Button>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        {answeredCount}개 응답이 이 기기에 저장됨
      </p>
    </main>
  );
}
