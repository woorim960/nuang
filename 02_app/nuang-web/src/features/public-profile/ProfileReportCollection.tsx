"use client";

import { ChevronRight, Compass } from "lucide-react";
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

  async function toggleVisibility(report: OriginalProfileReportSummary) {
    if (pendingKey) return;
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
      {isSelf && items.some((report) => report.type === "core") ? (
        <Link className={styles.latestCoreLink} href="/my/reports">
          <span>
            <small>내 결과 리포트</small>
            <strong>가장 최근 코어 결과 보기</strong>
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
            const isPublic = report.visibility === "profile_public";
            const visibilityStatus = isPublic
              ? "다른 사람이 이 결과를 볼 수 있어요"
              : "나만 볼 수 있어요";

            return (
              <article
                className={styles.report}
                data-kind={report.type}
                key={report.reportKey}
              >
                <Link
                  aria-label={`${report.assessmentTitle}, ${report.resultName} 리포트 보기`}
                  className={styles.reportLink}
                  href={getReportHref({ isSelf, profileId, report })}
                >
                  <span className={styles.copy}>
                    <small>
                      {getProfileReportKindLabel(report.type)} ·{" "}
                      {formatDate(report.completedAt)}
                    </small>
                    <strong>{report.assessmentTitle}</strong>
                    <b>{report.resultName}</b>
                    <p>{report.summary}</p>
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className={styles.chevron}
                    size={18}
                    strokeWidth={1.55}
                  />
                </Link>

                {isSelf ? (
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
