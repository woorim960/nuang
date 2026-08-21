"use client";

import { ChevronRight, Compass, Eye } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  assessmentExperienceSections,
  type AssessmentExperienceSectionId,
} from "@/features/assessment/assessment-experience-sections";
import {
  getProfileReportKindLabel,
  type OriginalProfileReportSummary,
} from "@/features/public-profile/profile-report-contract";
import { buildAccountCoreResultHref } from "@/features/result/unified-core-report/core-result-route-contract";
import styles from "./ProfileReportCollection.module.css";

type ProfileReportFilter = "all" | AssessmentExperienceSectionId;

const filters: ReadonlyArray<{
  id: ProfileReportFilter;
  label: string;
}> = [{ id: "all", label: "전체" }, ...assessmentExperienceSections];

export function ProfileReportCollection({
  isSelf,
  profileId,
  reports,
}: {
  isSelf: boolean;
  profileId: string;
  reports: OriginalProfileReportSummary[];
}) {
  const [activeFilter, setActiveFilter] = useState<ProfileReportFilter>("all");
  const [items, setItems] = useState(reports);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const visibleReports = useMemo(
    () =>
      activeFilter === "all"
        ? items
        : items.filter(
            (report) => getReportExperienceSection(report) === activeFilter,
          ),
    [activeFilter, items],
  );
  const hasExploratoryCore = items.some(isExploratoryCoreReport);
  const hasValidatedCore = items.some(
    (report) => report.type === "core" && !isExploratoryCoreReport(report),
  );
  const hasVisibilityManagedReport = items.some(
    (report) => !isExploratoryCoreReport(report),
  );

  async function toggleVisibility(report: OriginalProfileReportSummary) {
    if (pendingKey || isExploratoryCoreReport(report)) return;
    const nextVisibility =
      report.visibility === "profile_public" ? "private" : "profile_public";
    setPendingKey(report.reportKey);
    setMessage(null);

    try {
      const response = await fetch("/api/profile-report-visibility", {
        body: JSON.stringify({
          reportKey: report.reportKey,
          visibility: nextVisibility,
        }),
        headers: { "content-type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) throw new Error("visibility_write_failed");
      setItems((current) =>
        current.map((item) =>
          item.reportKey === report.reportKey
            ? { ...item, visibility: nextVisibility }
            : item,
        ),
      );
    } catch {
      setMessage("공개 상태를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setPendingKey(null);
    }
  }

  if (reports.length === 0) {
    return (
      <section className={styles.empty}>
        <span aria-hidden="true">
          <Compass size={23} strokeWidth={1.65} />
        </span>
        <strong>
          {isSelf
            ? "아직 완료한 검사 결과가 없어요"
            : "아직 공개한 검사 결과가 없어요"}
        </strong>
        {isSelf ? <Link href="/home?view=self">검사 둘러보기</Link> : null}
      </section>
    );
  }

  return (
    <section className={styles.collection}>
      {isSelf && hasVisibilityManagedReport ? (
        <div className={styles.visibilityGuide}>
          <Eye aria-hidden="true" size={18} strokeWidth={1.75} />
          <p>
            <strong>
              주제 검사와 별난 연구소 결과는 기본으로 프로필에 공개돼요.
            </strong>
            공개하고 싶지 않은 결과는 아래 스위치를 끄면 바로 비공개로 바뀌어요.
            검사에서 고른 답과 원점수는 공개되지 않아요.
          </p>
        </div>
      ) : null}
      {isSelf && (hasExploratoryCore || hasValidatedCore) ? (
        <Link className={styles.latestCoreLink} href="/my/reports">
          <span>
            <small>
              {hasValidatedCore ? "내 결과 리포트" : "탐색적 베타 기록"}
            </small>
            <strong>
              {hasValidatedCore
                ? "가장 최근 코어 결과 보기"
                : "이전 코어 결과 보기"}
            </strong>
          </span>
          <ChevronRight aria-hidden="true" size={19} strokeWidth={1.65} />
        </Link>
      ) : null}
      <div aria-label="검사 결과 종류" className={styles.filters}>
        {filters.map((filter) => (
          <button
            aria-pressed={activeFilter === filter.id}
            key={filter.id}
            onClick={() => setActiveFilter(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      {message ? (
        <p aria-live="polite" className={styles.message} role="status">
          {message}
        </p>
      ) : null}

      {visibleReports.length > 0 ? (
        <div className={styles.list}>
          {visibleReports.map((report) => {
            const isExploratoryBeta = isExploratoryCoreReport(report);
            const isPublic = report.visibility === "profile_public";
            const visibilityStatus = isPublic
              ? "프로필 방문자와 공유 링크를 받은 사람이 볼 수 있어요"
              : "나만 볼 수 있어요";

            return (
              <article
                className={styles.report}
                data-kind={report.type}
                key={report.reportKey}
              >
                <Link
                  aria-label={`${report.assessmentTitle}, ${report.resultName}${isExploratoryBeta ? ", 탐색적 베타" : ""} 리포트 보기`}
                  className={styles.reportLink}
                  href={getReportHref({ isSelf, profileId, report })}
                >
                  <span className={styles.copy}>
                    <small>
                      {getProfileReportKindLabel(report.type)} ·{" "}
                      {formatDate(report.completedAt)}
                    </small>
                    {isExploratoryBeta ? (
                      <span className={styles.betaLabel}>탐색적 베타</span>
                    ) : null}
                    <strong>{report.assessmentTitle}</strong>
                    <b>{report.resultName}</b>
                    <p>{report.summary}</p>
                    {isExploratoryBeta ? (
                      <span className={styles.betaNote}>
                        참고용 · 대표 코드로 사용되지 않음 · 공개·공유 불가
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className={styles.chevron}
                    size={18}
                    strokeWidth={1.55}
                  />
                </Link>

                {isSelf && !isExploratoryBeta ? (
                  <button
                    aria-busy={pendingKey === report.reportKey}
                    aria-checked={isPublic}
                    aria-label={`${report.assessmentTitle} 리포트를 프로필에 공개`}
                    className={styles.visibility}
                    data-public={isPublic}
                    disabled={pendingKey !== null}
                    onClick={() => void toggleVisibility(report)}
                    role="switch"
                    type="button"
                  >
                    <span className={styles.visibilityCopy}>
                      <strong>프로필 공개</strong>
                      <small>
                        {pendingKey === report.reportKey
                          ? "변경 중..."
                          : visibilityStatus}
                      </small>
                    </span>
                    <span aria-hidden="true" className={styles.switchTrack}>
                      <span />
                    </span>
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.filteredEmpty}>
          <strong>{getFilteredEmptyTitle(activeFilter, isSelf)}</strong>
          {activeFilter === "together" && isSelf ? (
            <Link href="/home?view=together">함께하기 둘러보기</Link>
          ) : (
            <button onClick={() => setActiveFilter("all")} type="button">
              전체 보기
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function getReportExperienceSection(
  report: OriginalProfileReportSummary,
): AssessmentExperienceSectionId {
  return report.type === "lab" ? "lab" : "self";
}

function isExploratoryCoreReport(report: OriginalProfileReportSummary) {
  return report.type === "core" && report.isExploratoryBeta !== false;
}

function getReportHref({
  isSelf,
  profileId,
  report,
}: {
  isSelf: boolean;
  profileId: string;
  report: OriginalProfileReportSummary;
}) {
  if (isSelf && report.type === "core") {
    const resultReportId = report.reportKey.slice("core_".length);
    return buildAccountCoreResultHref({
      backHref: "/my?tab=reports",
      resultReportId,
    });
  }
  return `/feed/profiles/${profileId}/reports/${report.reportKey}`;
}

function getFilteredEmptyTitle(filter: ProfileReportFilter, isSelf: boolean) {
  if (filter === "together") {
    return isSelf
      ? "아직 함께한 검사 결과가 없어요"
      : "공개한 함께하기 결과가 없어요";
  }
  return "이 종류의 결과가 없어요";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "날짜 미상";
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
