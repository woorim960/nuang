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
import { readClientAccountResults } from "@/features/account/client-account-results";
import { readJsonResponse } from "@/features/account/response-json";
import { buildLocalExportPayload } from "@/features/account/local-export";
import {
  deleteLocalAttempt,
  listLocalAttempts,
} from "@/features/assessment/assessment-storage";
import {
  deleteFreeTopicResultEverywhere,
  listFreeTopicResultsLocalFirst,
  syncQueuedFreeTopicResults,
  type StoredFreeTopicResult,
} from "@/features/assessment/free-topic-storage";
import { calculateLocalAttemptScore } from "@/features/assessment/local-attempt-score";
import type { LocalAssessmentAttempt } from "@/features/assessment/types";
import { synchronizeAccountAssessmentAttempts } from "@/features/assessment/assessment-account-sync";
import { canPromoteCoreResultToRepresentative } from "@/features/assessment/legacy-core-containment-policy";
import { labAssessments } from "@/features/lab/lab-assessments";
import {
  deleteLabResultEverywhere,
  getLabExpiresAt,
  listLabResultsLocalFirst,
  type StoredLabResult,
} from "@/features/lab/lab-storage";
import { getCandidateProfileDefinition } from "@/features/nuang-code/candidate-profile-names";
import {
  buildAccountCoreResultHref,
  buildLocalCoreResultHref,
} from "@/features/result/unified-core-report/core-result-route-contract";
import {
  readCurrentSupabaseUserId,
  verifyStableResultAuthScope,
} from "@/features/result-persistence/client-result-scope";
import styles from "./LocalResultManager.module.css";

type ResultEntry =
  | {
      accountResultId?: string;
      code?: string;
      completedAt?: string;
      expiresAt?: string;
      href: string;
      id: string;
      isExploratoryBeta: boolean;
      kind: "core";
      state: "completed" | "in_progress";
      storage: "account" | "both" | "device";
      subtitle: string;
      title: string;
    }
  | {
      accountResultId?: undefined;
      completedAt: string;
      href: string;
      id: string;
      kind: "topic";
      state: "completed";
      storage: "account" | "device";
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
      storage: "account" | "device";
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
  const [topicResults, setTopicResults] = useState<StoredFreeTopicResult[]>([]);
  const [accountResults, setAccountResults] = useState<AccountResultSummary[]>(
    [],
  );
  const [comparisonReports, setComparisonReports] = useState<
    AccountComparisonReportSummary[]
  >([]);
  const [loaded, setLoaded] = useState(false);
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
      await synchronizeAccountAssessmentAttempts();
      const [
        nextCoreAttempts,
        nextAccountResults,
        nextTopicResults,
        nextLabResults,
      ] = await Promise.all([
        listLocalAttempts(),
        listAccountReportData(),
        listFreeTopicResultsLocalFirst(),
        listLabResultsLocalFirst(
          labAssessments.map((assessment) => assessment.slug),
        ),
      ]);

      if (!isMounted) return;
      setCoreAttempts(nextCoreAttempts);
      setLabResults(nextLabResults);
      setTopicResults(nextTopicResults);
      setAccountResults(nextAccountResults.results);
      setComparisonReports(nextAccountResults.comparisonReports);
      setLoaded(true);

      void syncQueuedFreeTopicResults()
        .then(() => listFreeTopicResultsLocalFirst())
        .then((syncedTopicResults) => {
          if (isMounted) setTopicResults(syncedTopicResults);
        });
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
          ? buildLocalCoreResultHref({
              backHref: "/my/reports/history",
              localResultId: attempt.id,
            })
          : `/assessments/${attempt.assessmentId}`,
        id: attempt.id,
        isExploratoryBeta: !canPromoteCoreResultToRepresentative({
          assessmentReleaseId:
            accountResult?.versionBundle?.assessmentReleaseId ??
            attempt.resultSnapshot?.assessmentReleaseId ??
            attempt.releaseId,
        }),
        kind: "core",
        state: attempt.state,
        storage:
          accountResult || attempt.accountSync?.accountId ? "both" : "device",
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
          href: buildAccountCoreResultHref({
            backHref: "/my/reports/history",
            resultReportId: result.resultReportId,
          }),
          id: result.resultReportId,
          isExploratoryBeta: !canPromoteCoreResultToRepresentative({
            assessmentReleaseId: result.versionBundle?.assessmentReleaseId,
          }),
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
    ...topicResults.map((result): ResultEntry => ({
      completedAt: result.completedAt,
      href: `/assessments/topics/${result.assessment.slug}/result/${result.localResultId}`,
      id: result.localResultId,
      kind: "topic",
      state: "completed",
      storage: result.sync.status === "synced" ? "account" : "device",
      subtitle: result.reportSnapshot.headline,
      title: result.assessment.title,
    })),
    ...labResults.map((result): ResultEntry => ({
      completedAt: result.completedAt,
      expiresAt: getLabExpiresAt(result),
      href: `/labs/${result.slug}/result?localResultId=${encodeURIComponent(result.localResultId)}`,
      id: result.localResultId,
      kind: "lab",
      state: "completed",
      storage: result.sync?.status === "synced" ? "account" : "device",
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

      if (entry.kind === "topic") {
        const serverDelete = await deleteFreeTopicResultEverywhere(entry.id);

        if (serverDelete === "error") {
          setDeleteMessage(
            "검사 결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
          );
          return;
        }

        setTopicResults((results) =>
          results.filter((result) => result.localResultId !== entry.id),
        );
        return;
      }

      if (entry.kind === "core") {
        if (entry.storage !== "device") {
          const serverDelete = await deleteAccountResult({
            localResultId: entry.storage === "account" ? undefined : entry.id,
            resultReportId: entry.accountResultId,
          });

          if (serverDelete !== "deleted") {
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

      const labDelete = await deleteLabResultEverywhere(entry.id);
      if (labDelete === "error") {
        setDeleteMessage(
          "검사 결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        );
        return;
      }
      setLabResults((results) =>
        results.filter((result) => result.localResultId !== entry.id),
      );
    } finally {
      setDeletingEntryId(null);
    }
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  function handleExport() {
    const payload = buildLocalExportPayload({
      accountResults,
      comparisonReports,
      coreAttempts,
      exportedAt: new Date().toISOString(),
      labResults,
      topicResults,
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.download = `nuang-data-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.href = url;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const latestAssessmentEntry = entries.find(
    (entry): entry is Exclude<ResultEntry, { kind: "comparison" }> =>
      entry.kind !== "comparison" && entry.state === "completed",
  );
  const inProgressEntries = entries.filter(
    (entry) => entry.kind === "core" && entry.state === "in_progress",
  );
  const previousAssessmentEntries = entries.filter(
    (entry) =>
      entry.kind !== "comparison" &&
      entry.state === "completed" &&
      !(
        entry.kind === latestAssessmentEntry?.kind &&
        entry.id === latestAssessmentEntry.id
      ),
  );
  const comparisonEntries = entries.filter(
    (entry) => entry.kind === "comparison",
  );

  return (
    <section className={styles.manager}>
      {!loaded ? <ReportLoading /> : null}

      {loaded && entries.length === 0 ? <ReportEmpty /> : null}

      {loaded && latestAssessmentEntry ? (
        <LatestReport
          deleting={deletingEntryId === latestAssessmentEntry.id}
          entry={latestAssessmentEntry}
          onDelete={handleDelete}
        />
      ) : null}

      {loaded && inProgressEntries.length > 0 ? (
        <ReportGroup
          entries={inProgressEntries}
          onDelete={handleDelete}
          deletingEntryId={deletingEntryId}
          title="이어 하던 검사"
          tone="progress"
        />
      ) : null}

      {loaded && previousAssessmentEntries.length > 0 ? (
        <ReportGroup
          collapsedLimit={5}
          entries={previousAssessmentEntries}
          expanded={expandedGroups.includes("previous-assessments")}
          groupId="previous-assessments"
          onDelete={handleDelete}
          onToggle={toggleGroup}
          deletingEntryId={deletingEntryId}
          title="지난 검사 결과"
          tone="assessment"
        />
      ) : null}

      {loaded ? (
        <ReportGroup
          actionHref="/feed/search?intent=compare"
          actionLabel="비교 시작하기"
          emptyCopy="아직 저장된 비교 리포트가 없어요."
          entries={comparisonEntries}
          onDelete={handleDelete}
          deletingEntryId={deletingEntryId}
          title="관계 비교"
          tone="comparison"
        />
      ) : null}

      {deleteMessage ? (
        <p className={styles.deleteMessage} role="alert">
          {deleteMessage}
        </p>
      ) : null}

      {loaded ? (
        <section className={styles.exportSection}>
          <div>
            <strong>내 데이터 파일</strong>
            <p>
              현재 볼 수 있는 검사·비교 기록을 JSON 파일로 저장해요. 문항 응답이
              포함될 수 있으니 공유에 주의해 주세요.
            </p>
          </div>
          <button onClick={handleExport} type="button">
            <Download aria-hidden="true" size={17} strokeWidth={1.7} />
            내보내기
          </button>
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
  entry: Exclude<ResultEntry, { kind: "comparison" }>;
  onDelete: (entry: ResultEntry) => Promise<void>;
}) {
  return (
    <section className={styles.latestSection} data-kind={entry.kind}>
      <div className={styles.latestHeading}>
        <h2>최근 검사 결과</h2>
        <span>{formatEntryDate(entry)}</span>
      </div>
      <div className={styles.latestIdentity}>
        {entry.kind === "core" && entry.code ? (
          <strong>{entry.code}</strong>
        ) : entry.kind === "topic" ? (
          <FlaskConical aria-hidden="true" size={26} strokeWidth={1.55} />
        ) : (
          <FlaskConical aria-hidden="true" size={26} strokeWidth={1.55} />
        )}
        <div>
          {entry.kind === "core" && entry.isExploratoryBeta ? (
            <span className={styles.betaLabel}>탐색적 베타 결과</span>
          ) : null}
          <p>{entry.title}</p>
          <h3>{entry.subtitle}</h3>
          {entry.kind === "core" && entry.isExploratoryBeta ? (
            <small className={styles.betaNote}>
              참고용 · 대표 코드로 사용되지 않음 · 공유 불가
            </small>
          ) : null}
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
  emptyCopy,
  entries,
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
  emptyCopy?: string;
  entries: ResultEntry[];
  expanded?: boolean;
  groupId?: string;
  onDelete: (entry: ResultEntry) => Promise<void>;
  onToggle?: (groupId: string) => void;
  title: string;
  tone: "assessment" | "comparison" | "progress";
}) {
  const canCollapse = Boolean(
    collapsedLimit && groupId && onToggle && entries.length > collapsedLimit,
  );
  const visibleEntries =
    canCollapse && !expanded ? entries.slice(0, collapsedLimit) : entries;

  return (
    <section className={styles.reportGroup} data-tone={tone}>
      <div className={styles.groupHeading}>
        <h2>{title}</h2>
        <span>{entries.length}개</span>
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
            {entry.kind === "core" && entry.isExploratoryBeta ? (
              <em className={styles.betaLabel}>탐색적 베타</em>
            ) : null}
          </div>
          <p>{entry.subtitle}</p>
          {entry.kind === "core" && entry.isExploratoryBeta ? (
            <small className={styles.betaNote}>참고용 · 공유 불가</small>
          ) : null}
          <span>{formatEntryDate(entry)}</span>
        </div>
        <div className={styles.rowEnd}>
          {getEntryStatusLabel(entry) ? (
            <span data-alert={getEntryStatusLabel(entry) === "확인 필요"}>
              {getEntryStatusLabel(entry)}
            </span>
          ) : null}
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
      <h2>첫 성향 리포트를 만들어보세요</h2>
      <Link href="/home">
        검사 둘러보기
        <ChevronRight aria-hidden="true" size={15} strokeWidth={1.7} />
      </Link>
    </section>
  );
}

function getSortDate(entry: ResultEntry) {
  if (entry.state === "completed") return entry.completedAt ?? "";
  return entry.kind === "core" ? (entry.completedAt ?? "") : "";
}

function formatEntryDate(entry: ResultEntry) {
  const value = getSortDate(entry);
  if (!value) return "날짜 확인 중";

  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getEntryStatusLabel(entry: ResultEntry) {
  if (entry.kind === "comparison") {
    if (entry.comparisonStatus === "active") return "비교";
    return "확인 필요";
  }

  if (entry.state !== "completed") return "진행 중";
  if (entry.kind === "topic" && entry.storage === "device") return "저장 중";
  return "";
}

function getDeleteConfirmMessage(entry: ResultEntry) {
  if (entry.kind === "comparison") {
    return "이 비교 리포트를 삭제할까요? 삭제하면 다시 열 수 없어요.";
  }

  if (entry.kind === "topic" || entry.kind === "lab") {
    return "이 검사 결과를 삭제할까요? 삭제하면 다시 열 수 없어요.";
  }

  return "이 리포트를 삭제할까요? 삭제하면 다시 열 수 없고 공유 주소와 비교 기록도 함께 삭제돼요.";
}

type AccountReportData = {
  comparisonReports: AccountComparisonReportSummary[];
  results: AccountResultSummary[];
};

async function listAccountReportData(): Promise<AccountReportData> {
  const accountRead = await readClientAccountResults();
  if (accountRead.state !== "ready") {
    return { comparisonReports: [], results: [] };
  }

  return {
    comparisonReports: accountRead.comparisonReports,
    results: accountRead.results,
  };
}

async function deleteAccountResult({
  localResultId,
  resultReportId,
}: {
  localResultId?: string;
  resultReportId?: string;
}): Promise<"deleted" | "error" | "no_account"> {
  try {
    const requestUserId = await readCurrentSupabaseUserId();
    if (!requestUserId) return "no_account";
    const response = await fetch("/api/account-results", {
      body: JSON.stringify({ localResultId, resultReportId }),
      headers: {
        "content-type": "application/json",
        "x-nuang-auth-user-id": requestUserId,
      },
      method: "DELETE",
    });

    if (response.status === 401) return "no_account";
    if (!response.ok) return "error";

    const body = await readJsonResponse<{
      authUserId?: string;
      ok?: boolean;
    }>(response);
    const stableUserId = await verifyStableResultAuthScope({
      requestUserId,
      responseUserId: body?.authUserId,
    });
    return body?.ok && stableUserId ? "deleted" : "error";
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
