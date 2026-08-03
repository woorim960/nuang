import { RefreshCw, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  normalizeAdminConsentFilters,
  readAdminConsentDashboard,
  type AdminConsentDashboard,
  type AdminConsentMetric,
  type AdminConsentStatusFilter,
  type AdminConsentTypeFilter,
} from "@/features/admin/server-admin-consents";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "동의 관리 | NUANG",
};

export default async function AdminConsentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string }>;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) return null;

  const params = await searchParams;
  const filters = normalizeAdminConsentFilters(params);
  const dashboard = await readAdminConsentDashboard({
    client: context.client,
    filters,
  });
  const refreshHref = createFilterHref(filters.type, filters.status);

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>회원 선택과 서비스 사용 원칙</p>
          <h1>동의 관리</h1>
        </div>
        <a className={shared.headerAction} href={refreshHref}>
          <RefreshCw aria-hidden="true" size={15} strokeWidth={1.8} />
          새로고침
        </a>
      </header>

      <section aria-label="동의 운영 원칙" className={styles.readOnlyNotice}>
        <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.7} />
        <div>
          <strong>회원이 직접 선택한 상태만 조회합니다</strong>
          <p>
            운영자가 동의를 대신 켜거나 원문 연락처를 내보내는 기능은 제공하지
            않습니다.
          </p>
        </div>
        <time dateTime={dashboard.generatedAt}>
          {formatDateTime(dashboard.generatedAt)} 집계
        </time>
      </section>

      <section aria-label="동의 현황" className={styles.metricGrid}>
        <MetricCard
          description="현재 동의 상태가 저장된 회원"
          metric={dashboard.metrics.currentAccounts}
          title="동의 상태 회원"
          unit="명"
        />
        <MetricCard
          description="동의 상태 회원을 기준으로 계산"
          metric={dashboard.metrics.analyticsOptIn}
          title="이용 데이터 동의율"
          unit="%"
        />
        <MetricCard
          description="동의 상태 회원을 기준으로 계산"
          metric={dashboard.metrics.marketingOptIn}
          title="소식 알림 동의율"
          unit="%"
        />
        <MetricCard
          description="소식 동의자 중 활성 계정·인증 이메일 보유"
          metric={dashboard.metrics.marketingReady}
          title="이메일 발송 준비"
          unit="명"
        />
        <MetricCard
          description="이용 데이터·소식 동의 변경 합계"
          metric={dashboard.metrics.changes7d}
          title="최근 7일 변경"
          unit="건"
        />
        <MetricCard
          description={
            dashboard.analyticsEventsAvailable
              ? "동의 회원의 최소 화면 이용 이벤트"
              : "분석 이벤트 저장소 연결 후 집계됩니다"
          }
          metric={dashboard.metrics.analyticsEvents24h}
          title="최근 24시간 이용 이벤트"
          unit="건"
        />
      </section>

      <section className={`${shared.panel} ${styles.changesPanel}`}>
        <div className={styles.changeHeader}>
          <div>
            <h2>최근 동의 변경</h2>
            <p>최대 100건 · 개인 연락처와 전체 계정 ID는 표시하지 않습니다.</p>
          </div>
          <span>{dashboard.recentChanges.items.length}건</span>
        </div>

        <ConsentFilters filters={dashboard.filters} />

        {!dashboard.recentChanges.available ? (
          <div className={shared.error}>
            <strong>최근 변경 기록을 불러오지 못했습니다</strong>
            <p>동의 원장 연결을 확인한 뒤 다시 시도해 주세요.</p>
          </div>
        ) : dashboard.recentChanges.items.length === 0 ? (
          <div className={shared.empty}>
            <ShieldCheck aria-hidden="true" size={22} strokeWidth={1.7} />
            <strong>조건에 맞는 변경 기록이 없습니다</strong>
            <p>필터를 바꾸거나 회원의 첫 동의 변경 이후 다시 확인해 주세요.</p>
          </div>
        ) : (
          <div className={styles.changeList}>
            <div aria-hidden="true" className={styles.tableHead}>
              <span>변경 시각</span>
              <span>회원 참조</span>
              <span>구분</span>
              <span>상태</span>
              <span>변경 경로</span>
              <span>버전</span>
            </div>
            {dashboard.recentChanges.items.map((item, index) => (
              <article key={`${item.accountRef}-${item.recordedAt}-${index}`}>
                <time dateTime={item.recordedAt}>
                  {formatDateTime(item.recordedAt)}
                </time>
                <div data-cell="account">
                  <span>회원 참조</span>
                  <code>{item.accountRef}</code>
                </div>
                <div data-cell="type">
                  <span>구분</span>
                  <strong>{consentTypeLabel(item.type)}</strong>
                </div>
                <div data-cell="status">
                  <span>상태</span>
                  <em
                    className={shared.status}
                    data-tone={
                      item.status === "granted" ? "success" : "warning"
                    }
                  >
                    {item.status === "granted" ? "동의" : "철회"}
                  </em>
                </div>
                <div data-cell="source">
                  <span>변경 경로</span>
                  <p>{consentSourceLabel(item.source)}</p>
                </div>
                <div data-cell="version">
                  <span>버전</span>
                  <code>{item.consentVersion}</code>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  description,
  metric,
  title,
  unit,
}: {
  description: string;
  metric: AdminConsentMetric;
  title: string;
  unit: string;
}) {
  const emptyCopy =
    metric.state === "empty"
      ? "아직 집계할 데이터가 없습니다"
      : "현재 집계할 수 없습니다";

  return (
    <article className={styles.metricCard} data-state={metric.state}>
      <header>
        <h2>{title}</h2>
        <span aria-hidden="true" />
      </header>
      {metric.state === "ready" ? (
        <p className={styles.metricValue}>
          {formatMetricValue(metric.value)}
          <small>{unit}</small>
        </p>
      ) : (
        <p className={styles.metricEmpty}>{emptyCopy}</p>
      )}
      <footer>
        <span>{description}</span>
        {metric.denominator !== null && metric.denominator > 0 ? (
          <small>기준 {metric.denominator.toLocaleString("ko-KR")}명</small>
        ) : null}
      </footer>
    </article>
  );
}

function ConsentFilters({
  filters,
}: {
  filters: AdminConsentDashboard["filters"];
}) {
  const typeFilters: readonly [AdminConsentTypeFilter, string][] = [
    ["all", "전체 구분"],
    ["analytics", "이용 데이터"],
    ["marketing", "소식 알림"],
  ];
  const statusFilters: readonly [AdminConsentStatusFilter, string][] = [
    ["all", "전체 상태"],
    ["granted", "동의"],
    ["revoked", "철회"],
  ];

  return (
    <nav aria-label="동의 변경 필터" className={styles.filters}>
      <div>
        <span>구분</span>
        <div>
          {typeFilters.map(([value, label]) => (
            <Link
              aria-current={filters.type === value ? "page" : undefined}
              href={createFilterHref(value, filters.status)}
              key={value}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div>
        <span>상태</span>
        <div>
          {statusFilters.map(([value, label]) => (
            <Link
              aria-current={filters.status === value ? "page" : undefined}
              href={createFilterHref(filters.type, value)}
              key={value}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

function createFilterHref(
  type: AdminConsentTypeFilter,
  status: AdminConsentStatusFilter,
) {
  const params = new URLSearchParams();
  if (type !== "all") params.set("type", type);
  if (status !== "all") params.set("status", status);
  const query = params.toString();
  return query ? `/admin/consents?${query}` : "/admin/consents";
}

function formatMetricValue(value: number | null) {
  return value === null
    ? "—"
    : value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function consentTypeLabel(type: "analytics" | "marketing") {
  return type === "analytics" ? "이용 데이터" : "소식 알림";
}

function consentSourceLabel(
  source: AdminConsentDashboard["recentChanges"]["items"][number]["source"],
) {
  return {
    account_gate: "로그인 첫 설정",
    account_merge: "계정 연결",
    legacy_backfill: "기존 상태 이관",
    my_settings: "마이 설정",
    other: "기타 경로",
  }[source];
}
