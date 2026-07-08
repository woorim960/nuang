"use client";

import { ChevronRight, Download, FileText, FlaskConical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { buildLocalExportPayload } from "@/features/account/local-export";
import { localRetentionPolicy } from "@/features/account/local-retention-policy";
import {
  deleteLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { labAssessments } from "@/features/lab/lab-assessments";
import {
  deleteLabResult,
  getLabExpiresAt,
  listLabResults,
  type StoredLabResult,
} from "@/features/lab/lab-storage";

type LocalResultEntry =
  | {
      completedAt?: string;
      expiresAt: string;
      href: string;
      id: string;
      kind: "core";
      state: "completed" | "in_progress";
      subtitle: string;
      title: string;
    }
  | {
      completedAt: string;
      expiresAt: string;
      href: string;
      id: string;
      kind: "lab";
      state: "completed";
      subtitle: string;
      title: string;
    };

const coreTitleById: Record<string, string> = {
  "nu-core-full": "정밀 코어",
  "nu-core-quick": "빠른 코어",
};

export function LocalResultManager() {
  const [coreAttempts, setCoreAttempts] = useState<LocalAssessmentAttempt[]>([]);
  const [labResults, setLabResults] = useState<StoredLabResult[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "done" | "error">("idle");

  const labTitleBySlug = useMemo(
    () =>
      Object.fromEntries(
        labAssessments.map((assessment) => [assessment.slug, assessment.title]),
      ),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadResults() {
      const nextCoreAttempts = await listLocalAttempts();
      const nextLabResults = listLabResults(
        labAssessments.map((assessment) => assessment.slug),
      );

      if (!isMounted) return;
      setCoreAttempts(nextCoreAttempts);
      setLabResults(nextLabResults);
      setLoaded(true);
    }

    loadResults();

    return () => {
      isMounted = false;
    };
  }, []);

  const entries: LocalResultEntry[] = [
    ...coreAttempts.map((attempt): LocalResultEntry => {
      const title = coreTitleById[attempt.assessmentId] ?? "코어 검사";
      const completed = attempt.state === "completed";

      return {
        completedAt: attempt.completedAt,
        expiresAt: attempt.expiresAt,
        href: completed
          ? `/results/local/${attempt.id}`
          : `/assessments/${attempt.assessmentId}`,
        id: attempt.id,
        kind: "core",
        state: attempt.state,
        subtitle: completed ? "결과 열람 가능" : "이어하기 가능",
        title,
      };
    }),
    ...labResults.map((result): LocalResultEntry => ({
      completedAt: result.completedAt,
      expiresAt: getLabExpiresAt(result),
      href: `/labs/${result.slug}/result`,
      id: result.slug,
      kind: "lab",
      state: "completed",
      subtitle: result.result.profile.shortTitle,
      title: labTitleBySlug[result.slug] ?? "별난 성향 연구소",
    })),
  ].sort((a, b) =>
    getSortDate(b).localeCompare(getSortDate(a)),
  );

  async function handleDelete(entry: LocalResultEntry) {
    const ok = window.confirm(
      "이 기기에 저장된 결과를 삭제할까요? 삭제하면 이 화면에서 다시 열 수 없어요.",
    );
    if (!ok) return;

    if (entry.kind === "core") {
      await deleteLocalAttempt(entry.id);
      setCoreAttempts((attempts) =>
        attempts.filter((attempt) => attempt.id !== entry.id),
      );
      return;
    }

    deleteLabResult(entry.id);
    setLabResults((results) => results.filter((result) => result.slug !== entry.id));
  }

  function handleExport() {
    try {
      const exportedAt = new Date().toISOString();
      const payload = buildLocalExportPayload({
        coreAttempts,
        exportedAt,
        labResults,
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.download = `nuang-local-data-${exportedAt.slice(0, 10)}.json`;
      anchor.href = url;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportState("done");
    } catch {
      setExportState("error");
    }
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">이 기기의 결과</h2>
        <StatusPill tone="neutral">로컬 {localRetentionPolicy.completedDays}일</StatusPill>
      </div>
      <div className="rounded-lg border border-line bg-white p-3">
        <p className="text-sm font-semibold">계정 연결 전에는 서버로 자동 전송되지 않아요</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          이 화면의 결과와 직접 응답은 이 기기에 보관됩니다. 삭제하면 이 화면과
          로컬 내보내기 파일에서도 제외됩니다.
        </p>
      </div>

      {!loaded && (
        <div
          aria-live="polite"
          className="rounded-lg border border-line bg-white p-4 text-sm text-muted"
          role="status"
        >
          저장된 결과 확인 중
        </div>
      )}

      {loaded && entries.length === 0 && (
        <div className="rounded-lg border border-line bg-white p-4">
          <p className="text-sm font-semibold">아직 저장된 로컬 결과가 없어요</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            검사 결과를 완료하면 이 기기에서 {localRetentionPolicy.completedDays}일
            동안 다시 열 수 있어요.
          </p>
        </div>
      )}

      {entries.map((entry) => (
        <div
          className="flex items-center gap-2 rounded-lg border border-line bg-white p-3"
          key={`${entry.kind}:${entry.id}`}
        >
          <Link
            aria-label={`${entry.title} ${
              entry.state === "completed" ? "결과 열기" : "이어하기"
            }. 만료 ${formatDate(entry.expiresAt)}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1"
            href={entry.href}
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary">
              {entry.kind === "core" ? (
                <FileText aria-hidden="true" size={19} />
              ) : (
                <FlaskConical aria-hidden="true" size={19} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{entry.title}</p>
                <StatusPill tone={entry.state === "completed" ? "success" : "caution"}>
                  {entry.state === "completed" ? "완료" : "진행 중"}
                </StatusPill>
              </div>
              <p className="mt-1 truncate text-sm text-muted">
                {entry.subtitle} · 만료 {formatDate(entry.expiresAt)}
              </p>
            </div>
            <ChevronRight aria-hidden="true" className="shrink-0 text-muted" size={17} />
          </Link>
          <button
            aria-label={`${entry.title} 삭제`}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:border-primary/40 hover:bg-surface-soft hover:text-primary"
            onClick={() => handleDelete(entry)}
            type="button"
          >
            <Trash2 aria-hidden="true" size={17} />
          </button>
        </div>
      ))}

      {loaded && (
        <div className="rounded-lg border border-line bg-white p-3">
          <Button
            aria-label="이 기기의 로컬 데이터 JSON 내보내기"
            className="w-full"
            icon={<Download size={17} />}
            onClick={handleExport}
            variant="secondary"
          >
            로컬 데이터 내보내기
          </Button>
          <p className="mt-2 text-xs leading-5 text-muted">
            이 기기에 저장된 직접 응답과 결과가 JSON 파일로 저장됩니다.
          </p>
          {exportState === "done" && (
            <p
              aria-live="polite"
              className="mt-2 text-xs leading-5 text-muted"
              role="status"
            >
              내보내기 파일을 준비했어요.
            </p>
          )}
          {exportState === "error" && (
            <p className="mt-2 text-xs leading-5 text-muted" role="alert">
              내보내기를 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "알 수 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function getSortDate(entry: LocalResultEntry) {
  return entry.completedAt ?? entry.expiresAt;
}
