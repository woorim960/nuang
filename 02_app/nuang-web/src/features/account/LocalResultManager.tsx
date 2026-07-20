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
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { labAssessments } from "@/features/lab/lab-assessments";
import {
  deleteLabResult,
  getLabExpiresAt,
  listLabResults,
  type StoredLabResult,
} from "@/features/lab/lab-storage";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import styles from "./LocalResultManager.module.css";

type ResultEntry =
  | {
      accountResultId?: string;
      code?: string;
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
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

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
      const localScore = completed ? calculateLocalAttemptScore(attempt) : null;
      const currentAccountProfile = accountResult
        ? getCandidateProfileDefinition(accountResult.profileCode)
        : null;
      const currentLocalProfile = localScore?.code
        ? getCandidateProfileDefinition(localScore.code)
        : null;

      return {
        accountResultId: accountResult?.resultReportId,
        code:
          currentAccountProfile?.code ?? currentLocalProfile?.code ?? undefined,
        completedAt: attempt.completedAt ?? attempt.updatedAt,
        expiresAt: attempt.expiresAt,
        href: completed
          ? `/results/local/${attempt.id}`
          : `/assessments/${attempt.assessmentId}`,
        id: attempt.id,
        kind: "core",
        state: attempt.state,
        storage: accountResult ? "both" : "device",
        subtitle:
          currentAccountProfile?.displayName ??
          currentLocalProfile?.displayName ??
          (completed
            ? "결과를 다시 확인할 수 있어요"
            : "이어서 답할 수 있어요"),
        title,
      };
    }),
    ...accountResults
      .filter(
        (result) =>
          !result.localResultId || !localCoreIds.has(result.localResultId),
      )
      .map((result): ResultEntry => {
        const currentProfile = getCandidateProfileDefinition(
          result.profileCode,
        );

        return {
          accountResultId: result.resultReportId,
          code: currentProfile?.code,
          completedAt: result.completedAt,
          href: `/results/account/${result.resultReportId}`,
          id: result.resultReportId,
          kind: "core",
          state: "completed",
          storage: "account",
          subtitle:
            currentProfile?.displayName ?? "이전에 저장한 코어 검사 결과",
          title: result.kind === "full" ? "정밀 코어" : "빠른 코어",
        };
      }),
    ...comparisonReports.map((report): ResultEntry => {
      const viewerProfile = getCandidateProfileDefinition(report.viewerCode);
      const targetProfile = getCandidateProfileDefinition(report.targetCode);

      return {
        completedAt: report.createdAt,
        comparisonStatus: report.accessStatus,
        href: `/reports/comparison/${report.comparisonReportId}`,
        id: report.comparisonReportId,
        kind: "comparison",
        state: "completed",
        storage: "account",
        subtitle:
          viewerProfile && targetProfile
            ? `${report.viewerCode}와 ${report.targetCode} · ${report.targetDisplayName}`
            : `${report.targetDisplayName}님과 비교한 이전 기록`,
        title: "1:1 비교 리포트",
      };
    }),
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

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  const latestCoreEntry = entries.find(
    (entry): entry is Extract<ResultEntry, { kind: "core" }> =>
      entry.kind === "core" && entry.state === "completed",
  );
  const inProgressEntries = entries.filter(
    (entry) => entry.kind === "core" && entry.state === "in_progress",
  );
  const previousCoreEntries = entries.filter(
    (entry) =>
      entry.kind === "core" &&
      entry.state === "completed" &&
      entry.id !== latestCoreEntry?.id,
  );
  const comparisonEntries = entries.filter(
    (entry) => entry.kind === "comparison",
  );
  const labEntries = entries.filter((entry) => entry.kind === "lab");

  return (
    <section className={styles.manager}>
      {!loaded ? <ReportLoading /> : null}

      {loaded && entries.length === 0 ? <ReportEmpty /> : null}

      {loaded && latestCoreEntry ? (
        <LatestReport
          deleting={deletingEntryId === latestCoreEntry.id}
          entry={latestCoreEntry}
          onDelete={handleDelete}
        />
      ) : null}

      {loaded && inProgressEntries.length > 0 ? (
        <ReportGroup
          description="멈춘 자리부터 바로 이어서 답할 수 있어요."
          entries={inProgressEntries}
          eyebrow="CONTINUE"
          onDelete={handleDelete}
          deletingEntryId={deletingEntryId}
          title="이어 하던 검사"
          tone="progress"
        />
      ) : null}

      {loaded && previousCoreEntries.length > 0 ? (
        <ReportGroup
          collapsedLimit={3}
          description="이전 결과를 열어 지금의 나와 천천히 비교해보세요."
          entries={previousCoreEntries}
          eyebrow="CORE"
          expanded={expandedGroups.includes("previous-core")}
          groupId="previous-core"
          onDelete={handleDelete}
          onToggle={toggleGroup}
          deletingEntryId={deletingEntryId}
          title="이전 코어 검사"
          tone="core"
        />
      ) : null}

      {loaded ? (
        <ReportGroup
          actionHref="/together"
          actionLabel="비교 시작하기"
          description="원하는 사람과 나의 공통점과 차이점을 다시 확인해요."
          emptyCopy="아직 저장된 비교 리포트가 없어요."
          entries={comparisonEntries}
          eyebrow="TOGETHER"
          onDelete={handleDelete}
          deletingEntryId={deletingEntryId}
          title="관계 비교"
          tone="comparison"
        />
      ) : null}

      {loaded ? (
        <ReportGroup
          actionHref="/assessments"
          actionLabel="검사 둘러보기"
          description="일상 속 궁금한 모습을 가볍게 살펴본 기록이에요."
          emptyCopy="아직 저장된 주제 검사 결과가 없어요."
          entries={labEntries}
          eyebrow="TOPIC"
          onDelete={handleDelete}
          deletingEntryId={deletingEntryId}
          title="주제 검사"
          tone="lab"
        />
      ) : null}

      {deleteMessage ? (
        <p className={styles.deleteMessage} role="alert">
          {deleteMessage}
        </p>
      ) : null}

      {loaded ? (
        <section className={styles.dataSection}>
          <div className={styles.dataHeading}>
            <div className={styles.dataIcon}>
              <Download aria-hidden="true" size={17} strokeWidth={1.7} />
            </div>
            <div>
              <h2>내 데이터 보관하기</h2>
              <p>검사 응답과 결과를 파일로 저장해 둘 수 있어요.</p>
            </div>
          </div>
          <button
            aria-label="내 데이터 JSON 내려받기"
            onClick={handleExport}
            type="button"
          >
            내 데이터 내려받기
          </button>
          <p className={styles.deleteGuide}>
            리포트를 삭제하면 연결된 공유 주소와 비교 기록도 함께 정리돼요.
          </p>
          {exportState === "done" ? (
            <p
              aria-live="polite"
              className={styles.exportMessage}
              role="status"
            >
              내보내기 파일을 준비했어요.
            </p>
          ) : null}
          {exportState === "error" ? (
            <p className={styles.exportMessage} role="alert">
              내보내기를 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.
            </p>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}

function LatestReport({
  deleting,
  entry,
  onDelete,
}: {
  deleting: boolean;
  entry: Extract<ResultEntry, { kind: "core" }>;
  onDelete: (entry: ResultEntry) => Promise<void>;
}) {
  return (
    <section className={styles.latestSection}>
      <div className={styles.latestHeading}>
        <div>
          <p>가장 최근 결과</p>
          <h2>현재 내 대표 성향</h2>
        </div>
        <span>{formatEntryDate(entry)}</span>
      </div>
      <div className={styles.latestIdentity}>
        {entry.code ? <strong>{entry.code}</strong> : <strong>NUANG</strong>}
        <div>
          <p>{entry.title}</p>
          <h3>{entry.subtitle}</h3>
        </div>
      </div>
      <div className={styles.latestActions}>
        <Link
          aria-label={`${entry.title} 결과 열기`}
          data-account-result-id={entry.accountResultId}
          href={entry.href}
        >
          리포트 보기
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.7} />
        </Link>
        <button
          aria-busy={deleting}
          aria-label={`${entry.title} 삭제`}
          disabled={deleting}
          onClick={() => onDelete(entry)}
          type="button"
        >
          <Trash2 aria-hidden="true" size={16} strokeWidth={1.6} />
        </button>
      </div>
    </section>
  );
}

function ReportGroup({
  actionHref,
  actionLabel,
  collapsedLimit,
  deletingEntryId,
  description,
  emptyCopy,
  entries,
  eyebrow,
  expanded = false,
  groupId,
  onDelete,
  onToggle,
  title,
  tone,
}: {
  actionHref?: string;
  actionLabel?: string;
  collapsedLimit?: number;
  deletingEntryId: string | null;
  description: string;
  emptyCopy?: string;
  entries: ResultEntry[];
  eyebrow: string;
  expanded?: boolean;
  groupId?: string;
  onDelete: (entry: ResultEntry) => Promise<void>;
  onToggle?: (groupId: string) => void;
  title: string;
  tone: "comparison" | "core" | "lab" | "progress";
}) {
  const canCollapse = Boolean(
    collapsedLimit && groupId && onToggle && entries.length > collapsedLimit,
  );
  const visibleEntries =
    canCollapse && !expanded ? entries.slice(0, collapsedLimit) : entries;

  return (
    <section className={styles.reportGroup} data-tone={tone}>
      <div className={styles.groupHeading}>
        <div>
          <p>{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <span>{entries.length}개</span>
        <small>{description}</small>
      </div>
      {entries.length > 0 ? (
        <>
          <div className={styles.reportList}>
            {visibleEntries.map((entry) => (
              <ReportRow
                deleting={deletingEntryId === entry.id}
                entry={entry}
                key={`${entry.kind}:${entry.id}`}
                onDelete={onDelete}
              />
            ))}
          </div>
          {canCollapse && collapsedLimit && groupId && onToggle ? (
            <button
              aria-expanded={expanded}
              className={styles.expandButton}
              onClick={() => onToggle(groupId)}
              type="button"
            >
              {expanded
                ? "이전 기록 접기"
                : `${entries.length - collapsedLimit}개 더 보기`}
              <ChevronRight
                aria-hidden="true"
                className={expanded ? styles.isExpanded : undefined}
                size={15}
                strokeWidth={1.65}
              />
            </button>
          ) : null}
        </>
      ) : (
        <div className={styles.groupEmpty}>
          <p>{emptyCopy}</p>
          {actionHref && actionLabel ? (
            <Link href={actionHref}>
              {actionLabel}
              <ChevronRight aria-hidden="true" size={14} strokeWidth={1.7} />
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ReportRow({
  deleting,
  entry,
  onDelete,
}: {
  deleting: boolean;
  entry: ResultEntry;
  onDelete: (entry: ResultEntry) => Promise<void>;
}) {
  return (
    <article className={styles.reportRow}>
      <Link
        aria-label={`${entry.title} ${
          entry.state === "completed" ? "결과 열기" : "이어하기"
        }`}
        data-account-result-id={entry.accountResultId}
        href={entry.href}
      >
        <div className={styles.typeIcon}>
          {entry.kind === "core" ? (
            <FileText aria-hidden="true" size={17} strokeWidth={1.7} />
          ) : entry.kind === "comparison" ? (
            <UsersRound aria-hidden="true" size={17} strokeWidth={1.7} />
          ) : (
            <FlaskConical aria-hidden="true" size={17} strokeWidth={1.7} />
          )}
        </div>
        <div className={styles.rowCopy}>
          <div>
            <strong>{entry.title}</strong>
            {entry.kind === "core" && entry.code ? <b>{entry.code}</b> : null}
          </div>
          <p>{entry.subtitle}</p>
          <span>{formatEntryDate(entry)}</span>
        </div>
        <div className={styles.rowEnd}>
          <span data-alert={getEntryStatusLabel(entry) === "확인 필요"}>
            {getEntryStatusLabel(entry)}
          </span>
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.65} />
        </div>
      </Link>
      <button
        aria-busy={deleting}
        aria-label={`${entry.title} 삭제`}
        disabled={deleting}
        onClick={() => onDelete(entry)}
        type="button"
      >
        <Trash2 aria-hidden="true" size={16} strokeWidth={1.55} />
      </button>
    </article>
  );
}

function ReportLoading() {
  return (
    <div aria-live="polite" className={styles.loading} role="status">
      <div />
      <span />
      <span />
      <p>리포트를 정리하고 있어요</p>
    </div>
  );
}

function ReportEmpty() {
  return (
    <section className={styles.empty}>
      <div className={styles.emptyIcon}>
        <FileText aria-hidden="true" size={22} strokeWidth={1.5} />
      </div>
      <p>아직 결과가 없어요</p>
      <h2>첫 성향 리포트를 만들어보세요</h2>
      <span>
        검사를 시작하면 진행 상태와 완료한 결과를 이곳에서 다시 볼 수 있어요.
      </span>
      <Link href="/assessments">
        검사 둘러보기
        <ChevronRight aria-hidden="true" size={15} strokeWidth={1.7} />
      </Link>
    </section>
  );
}

function getSortDate(entry: ResultEntry) {
  return (
    entry.completedAt ?? ("expiresAt" in entry ? entry.expiresAt : "") ?? ""
  );
}

function formatEntryDate(entry: ResultEntry) {
  const value = getSortDate(entry);
  if (!value) return "날짜 확인 중";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
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
  const currentAttempts = attempts.filter((attempt) =>
    Object.hasOwn(coreTitleById, attempt.assessmentId),
  );
  const latestInProgressByAssessment = new Map<
    string,
    LocalAssessmentAttempt
  >();

  currentAttempts.forEach((attempt) => {
    if (attempt.state !== "in_progress") return;

    const current = latestInProgressByAssessment.get(attempt.assessmentId);

    if (!current || attempt.updatedAt > current.updatedAt) {
      latestInProgressByAssessment.set(attempt.assessmentId, attempt);
    }
  });

  return currentAttempts.filter(
    (attempt) =>
      attempt.state === "completed" ||
      latestInProgressByAssessment.get(attempt.assessmentId)?.id === attempt.id,
  );
}
