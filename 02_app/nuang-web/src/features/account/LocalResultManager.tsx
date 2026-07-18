"use client";

import {
  ChevronRight,
  Download,
  FileText,
  FlaskConical,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  AccountComparisonReportSummary,
  AccountResultSummary,
} from "@/features/account/account-result-contract";
import { buildLocalExportPayload } from "@/features/account/local-export";
import { readJsonResponse } from "@/features/account/response-json";
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
import { cn } from "@/lib/utils/cn";

type ResultEntry =
  | {
      accountResultId?: string;
      completedAt?: string;
      expiresAt?: string;
      href: string;
      id: string;
      kind: "core";
      state: "completed" | "in_progress";
      storage: "account" | "both" | "device";
      subtitle: string;
      title: string;
    }
  | {
      accountResultId?: undefined;
      completedAt: string;
      comparisonStatus: AccountComparisonReportSummary["accessStatus"];
      href: string;
      id: string;
      kind: "comparison";
      state: "completed";
      storage: "account";
      subtitle: string;
      title: string;
    }
  | {
      accountResultId?: undefined;
      completedAt: string;
      expiresAt: string;
      href: string;
      id: string;
      kind: "lab";
      state: "completed";
      storage: "device";
      subtitle: string;
      title: string;
    };

const coreTitleById: Record<string, string> = {
  "nu-core-full": "정밀 코어",
  "nu-core-quick": "빠른 코어",
};

export function LocalResultManager() {
  const [coreAttempts, setCoreAttempts] = useState<LocalAssessmentAttempt[]>(
    [],
  );
  const [labResults, setLabResults] = useState<StoredLabResult[]>([]);
  const [accountResults, setAccountResults] = useState<AccountResultSummary[]>(
    [],
  );
  const [comparisonReports, setComparisonReports] = useState<
    AccountComparisonReportSummary[]
  >([]);
  const [loaded, setLoaded] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "done" | "error">(
    "idle",
  );
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState("");

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
      const [nextCoreAttempts, nextAccountResults] = await Promise.all([
        listLocalAttempts(),
        listAccountReportData(),
      ]);
      const nextLabResults = listLabResults(
        labAssessments.map((assessment) => assessment.slug),
      );

      if (!isMounted) return;
      setCoreAttempts(nextCoreAttempts);
      setLabResults(nextLabResults);
      setAccountResults(nextAccountResults.results);
      setComparisonReports(nextAccountResults.comparisonReports);
      setLoaded(true);
    }

    loadResults();

    return () => {
      isMounted = false;
    };
  }, []);

  const accountResultByLocalId = new Map(
    accountResults.flatMap((result) =>
      result.localResultId ? [[result.localResultId, result] as const] : [],
    ),
  );
  const visibleCoreAttempts = listVisibleCoreAttempts(coreAttempts);
  const localCoreIds = new Set(
    visibleCoreAttempts.map((attempt) => attempt.id),
  );
  const entries: ResultEntry[] = [
    ...visibleCoreAttempts.map((attempt): ResultEntry => {
      const title = coreTitleById[attempt.assessmentId] ?? "코어 검사";
      const completed = attempt.state === "completed";
      const accountResult = accountResultByLocalId.get(attempt.id);

      return {
        accountResultId: accountResult?.resultReportId,
        completedAt: attempt.completedAt,
        expiresAt: attempt.expiresAt,
        href: completed
          ? `/results/local/${attempt.id}`
          : `/assessments/${attempt.assessmentId}`,
        id: attempt.id,
        kind: "core",
        state: attempt.state,
        storage: accountResult ? "both" : "device",
        subtitle:
          accountResult?.profileName ??
          (completed ? "결과 열람 가능" : "이어하기 가능"),
        title,
      };
    }),
    ...accountResults
      .filter(
        (result) =>
          !result.localResultId || !localCoreIds.has(result.localResultId),
      )
      .map((result): ResultEntry => ({
        accountResultId: result.resultReportId,
        completedAt: result.completedAt,
        href: `/results/account/${result.resultReportId}`,
        id: result.resultReportId,
        kind: "core",
        state: "completed",
        storage: "account",
        subtitle: result.profileName,
        title: result.kind === "full" ? "정밀 코어" : "빠른 코어",
      })),
    ...comparisonReports.map((report): ResultEntry => ({
      completedAt: report.createdAt,
      comparisonStatus: report.accessStatus,
      href: `/reports/comparison/${report.comparisonReportId}`,
      id: report.comparisonReportId,
      kind: "comparison",
      state: "completed",
      storage: "account",
      subtitle: `${report.viewerCode}와 ${report.targetCode} · ${report.targetDisplayName}`,
      title: "1:1 비교 리포트",
    })),
    ...labResults.map((result): ResultEntry => ({
      completedAt: result.completedAt,
      expiresAt: getLabExpiresAt(result),
      href: `/labs/${result.slug}/result`,
      id: result.slug,
      kind: "lab",
      state: "completed",
      storage: "device",
      subtitle: result.result.profile.shortTitle,
      title: labTitleBySlug[result.slug] ?? "별난 성향 연구소",
    })),
  ].sort((a, b) => getSortDate(b).localeCompare(getSortDate(a)));

  async function handleDelete(entry: ResultEntry) {
    const ok = window.confirm(getDeleteConfirmMessage(entry));
    if (!ok) return;

    setDeletingEntryId(entry.id);
    setDeleteMessage("");

    try {
      if (entry.kind === "comparison") {
        const serverDelete = await deleteComparisonReport(entry.id);

        if (serverDelete !== "deleted") {
          setDeleteMessage(
            "비교 리포트를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          );
          return;
        }

        setComparisonReports((reports) =>
          reports.filter((report) => report.comparisonReportId !== entry.id),
        );
        return;
      }

      if (entry.kind === "core") {
        if (entry.state === "completed") {
          const serverDelete = await deleteAccountResult({
            localResultId: entry.storage === "account" ? undefined : entry.id,
            resultReportId: entry.accountResultId,
          });

          if (serverDelete === "error") {
            setDeleteMessage(
              "결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
            );
            return;
          }
        }

        if (entry.storage !== "account") {
          await deleteLocalAttempt(entry.id);
          setCoreAttempts((attempts) =>
            attempts.filter((attempt) => attempt.id !== entry.id),
          );
        }
        setAccountResults((results) =>
          results.filter(
            (result) =>
              result.resultReportId !== entry.accountResultId &&
              result.localResultId !== entry.id,
          ),
        );
        return;
      }

      deleteLabResult(entry.id);
      setLabResults((results) =>
        results.filter((result) => result.slug !== entry.id),
      );
    } finally {
      setDeletingEntryId(null);
    }
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
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold">리포트 목록</h2>
        <span className="text-xs font-semibold text-muted">
          {loaded ? `${entries.length}개` : "확인 중"}
        </span>
      </div>
      <div className="mt-3 border-y border-line py-3">
        <p className="text-sm font-semibold">
          완료한 검사와 진행 중인 검사를 모아봤어요
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">
          리포트를 삭제하면 연결된 공유 주소와 비교 기록도 함께 정리됩니다.
        </p>
      </div>

      {!loaded && (
        <p aria-live="polite" className="py-5 text-sm text-muted" role="status">
          결과 확인 중
        </p>
      )}

      {loaded && entries.length === 0 && (
        <div className="border-b border-line py-5">
          <p className="text-sm font-semibold">아직 결과가 없어요</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            검사를 시작하면 진행 상태와 완료 결과를 여기에서 다시 볼 수 있어요.
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div>
          {entries.map((entry) => (
            <div
              className="flex min-h-16 items-center gap-2 border-b border-line py-3"
              key={`${entry.kind}:${entry.id}`}
            >
              <Link
                aria-label={`${entry.title} ${
                  entry.state === "completed" ? "결과 열기" : "이어하기"
                }`}
                className="flex min-w-0 flex-1 items-center gap-3"
                data-account-result-id={entry.accountResultId}
                href={entry.href}
              >
                {entry.kind === "core" ? (
                  <FileText
                    aria-hidden="true"
                    className="shrink-0 text-muted"
                    size={19}
                  />
                ) : entry.kind === "comparison" ? (
                  <UsersRound
                    aria-hidden="true"
                    className="shrink-0 text-muted"
                    size={19}
                  />
                ) : (
                  <FlaskConical
                    aria-hidden="true"
                    className="shrink-0 text-muted"
                    size={19}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {entry.title}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 text-xs font-semibold",
                        entry.state === "completed" &&
                          getEntryStatusLabel(entry) !== "확인 필요"
                          ? "text-muted"
                          : "text-caution",
                      )}
                    >
                      {getEntryStatusLabel(entry)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {entry.subtitle}
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  className="shrink-0 text-muted"
                  size={17}
                />
              </Link>
              <button
                aria-busy={deletingEntryId === entry.id}
                aria-label={`${entry.title} 삭제`}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                disabled={deletingEntryId !== null}
                onClick={() => handleDelete(entry)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={17} />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteMessage && (
        <p
          className="border-b border-line py-3 text-sm text-danger"
          role="alert"
        >
          {deleteMessage}
        </p>
      )}

      {loaded && (
        <div className="border-b border-line py-4">
          <button
            aria-label="내 데이터 JSON 내려받기"
            className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-ink"
            onClick={handleExport}
            type="button"
          >
            <Download aria-hidden="true" size={17} />내 데이터 내려받기
          </button>
          <p className="mt-1 text-xs leading-5 text-muted">
            검사 응답과 결과를 JSON 파일로 내려받습니다.
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

function getSortDate(entry: ResultEntry) {
  return (
    entry.completedAt ?? ("expiresAt" in entry ? entry.expiresAt : "") ?? ""
  );
}

function getEntryStatusLabel(entry: ResultEntry) {
  if (entry.kind === "comparison") {
    if (entry.comparisonStatus === "active") return "비교";
    return "확인 필요";
  }

  return entry.state === "completed" ? "완료" : "진행 중";
}

function getDeleteConfirmMessage(entry: ResultEntry) {
  if (entry.kind === "comparison") {
    return "이 비교 리포트를 삭제할까요? 삭제하면 다시 열 수 없어요.";
  }

  return "이 리포트를 삭제할까요? 삭제하면 다시 열 수 없고 공유 주소와 비교 기록도 함께 삭제돼요.";
}

type AccountReportData = {
  comparisonReports: AccountComparisonReportSummary[];
  results: AccountResultSummary[];
};

async function listAccountReportData(): Promise<AccountReportData> {
  try {
    const response = await fetch("/api/account-results", {
      cache: "no-store",
      method: "GET",
    });

    if (!response.ok) return { comparisonReports: [], results: [] };

    const body = await readJsonResponse<{
      comparisonReports?: AccountComparisonReportSummary[];
      ok?: boolean;
      results?: AccountResultSummary[];
    }>(response);

    return body?.ok && Array.isArray(body.results)
      ? {
          comparisonReports: Array.isArray(body.comparisonReports)
            ? body.comparisonReports
            : [],
          results: body.results,
        }
      : { comparisonReports: [], results: [] };
  } catch {
    return { comparisonReports: [], results: [] };
  }
}

async function deleteAccountResult({
  localResultId,
  resultReportId,
}: {
  localResultId?: string;
  resultReportId?: string;
}): Promise<"deleted" | "error" | "no_account"> {
  try {
    const response = await fetch("/api/account-results", {
      body: JSON.stringify({ localResultId, resultReportId }),
      headers: {
        "content-type": "application/json",
      },
      method: "DELETE",
    });

    if (response.status === 401) return "no_account";
    if (!response.ok) return "error";

    const body = await readJsonResponse<{ ok?: boolean }>(response);
    return body?.ok ? "deleted" : "error";
  } catch {
    return "error";
  }
}

async function deleteComparisonReport(
  comparisonReportId: string,
): Promise<"deleted" | "error" | "no_account"> {
  try {
    const response = await fetch("/api/public-comparison-report", {
      body: JSON.stringify({ comparisonReportId }),
      headers: {
        "content-type": "application/json",
      },
      method: "DELETE",
    });

    if (response.status === 401) return "no_account";
    if (!response.ok) return "error";

    const body = await readJsonResponse<{ ok?: boolean }>(response);
    return body?.ok ? "deleted" : "error";
  } catch {
    return "error";
  }
}

function listVisibleCoreAttempts(attempts: LocalAssessmentAttempt[]) {
  const latestInProgressByAssessment = new Map<
    string,
    LocalAssessmentAttempt
  >();

  attempts.forEach((attempt) => {
    if (attempt.state !== "in_progress") return;

    const current = latestInProgressByAssessment.get(attempt.assessmentId);

    if (!current || attempt.updatedAt > current.updatedAt) {
      latestInProgressByAssessment.set(attempt.assessmentId, attempt);
    }
  });

  return attempts.filter(
    (attempt) =>
      attempt.state === "completed" ||
      latestInProgressByAssessment.get(attempt.assessmentId)?.id === attempt.id,
  );
}
