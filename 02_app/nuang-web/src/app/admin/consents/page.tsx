import {
  BarChart3,
  BellRing,
  ExternalLink,
  RefreshCw,
  Scale,
  ShieldCheck,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
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
        <div className={styles.headerActions}>
          <Link className={shared.headerAction} href="/admin/legal">
            <Scale aria-hidden="true" size={15} strokeWidth={1.8} />
            법률·정책 검토
          </Link>
          <a className={shared.headerAction} href={refreshHref}>
            <RefreshCw aria-hidden="true" size={15} strokeWidth={1.8} />
            새로고침
          </a>
        </div>
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

      <section
        aria-labelledby="consent-impact-guide-title"
        className={`${shared.panel} ${styles.guidePanel}`}
      >
        <div className={styles.guideHeader}>
          <div>
            <span>동의 항목별 실제 차이</span>
            <h2 id="consent-impact-guide-title">
              회원에게 무엇이 달라지는지 먼저 확인하세요
            </h2>
            <p>
              필수 동의는 계정 이용의 근거이고, 두 선택 동의는 서비스 개선
              기록과 광고성 이메일만 각각 허용합니다.
            </p>
          </div>
          <Link href="/my/settings/notifications">
            회원 설정 화면 확인
            <ExternalLink aria-hidden="true" size={14} strokeWidth={1.7} />
          </Link>
        </div>

        <div className={styles.guideGrid}>
          <ConsentImpactCard
            denied="계정 생성과 로그인을 완료할 수 없습니다. 로그인 없이 공개된 화면이나 비회원용 기능만 이용할 수 있습니다."
            enabled="계정 생성·로그인과 계정에 연결되는 결과 저장, 설정, 커뮤니티 참여 같은 회원 기능을 이용할 수 있습니다."
            icon={UserRoundCheck}
            operator="연령 확인, 이용약관과 개인정보 처리방침 버전이 모두 현재 버전인지 확인합니다. 필수 동의를 분석·광고 동의로 해석하면 안 됩니다."
            stable="이 동의만으로 선택형 이용 기록이나 광고성 이메일이 허용되지는 않습니다."
            summary="만 14세 이상 확인, 이용약관, 개인정보 처리방침은 계정을 만들고 운영하기 위한 필수 조건입니다."
            title="가입 필수 동의"
            tone="required"
            type="필수"
          />
          <ConsentImpactCard
            denied="철회 이후에는 새로운 선택형 화면 이용 기록과 서버의 검사 품질 의견을 저장하지 않습니다. 검사와 커뮤니티 등 핵심 서비스는 그대로 이용합니다."
            enabled="방문한 서비스 영역과 이용 시각을 최소 단위로 기록하고, 회원이 남긴 결과 적합도 같은 검사 품질 의견을 서비스 개선에 활용할 수 있습니다."
            icon={BarChart3}
            operator="동의율과 최근 이용 이벤트를 서비스 개선 범위에서만 봅니다. 기존 최소 이용 기록은 처리방침의 보관기간에 따라 관리되고 계정 삭제 시 함께 삭제됩니다."
            stable="검사 답변, 뉴앙코드, 게시글 내용, 검색어와 동적 주소 식별자는 수집 대상이 아닙니다."
            summary="화면과 기능의 전반적인 이용 흐름을 확인해 불편한 구간과 검사 품질을 개선하기 위한 선택 동의입니다."
            title="서비스 개선 이용 데이터"
            tone="analytics"
            type="선택"
          />
          <ConsentImpactCard
            denied="광고성 이메일 대상에서 제외됩니다. 인증, 보안, 계정 변경과 서비스 운영에 꼭 필요한 안내는 계속 받을 수 있고 모든 핵심 서비스도 그대로 이용합니다."
            enabled="새 검사, 함께하기, 이벤트, 혜택과 제휴 소식을 이메일로 받을 수 있습니다. 실제 발송 대상은 활성 계정·현재 동의 버전·인증된 이메일·수신거부 여부를 다시 확인해 정합니다."
            icon={BellRing}
            operator="동의율과 실제 발송 준비 인원은 다릅니다. 캠페인에는 ‘이메일 발송 준비’ 인원만 사용하고 회원 설정이나 이메일 수신거부를 즉시 우선합니다."
            stable="전화·문자·푸시 알림 동의, 개인정보 판매, 성향 기반 맞춤 광고 동의가 아닙니다."
            summary="뉴앙의 새 소식과 혜택을 이메일로 보내기 위한 선택 동의이며, 현재 범위는 광고성 이메일뿐입니다."
            title="광고성 이메일 수신"
            tone="marketing"
            type="선택"
          />
        </div>

        <div className={styles.guideScope}>
          <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.7} />
          <p>
            <strong>아래 지표와 최근 변경 기록의 범위</strong>
            이용 데이터와 광고성 이메일 두 선택 동의만 집계합니다. 가입 필수
            동의의 법률 문구와 버전 승인은 법률·정책 검토에서 관리하고, 운영자는
            이 화면에서 회원 선택을 대신 변경하지 않습니다.
          </p>
          <div>
            <Link href="/admin/legal">법률·정책 검토</Link>
            <Link href="/policies/privacy">개인정보 처리방침</Link>
          </div>
        </div>
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

function ConsentImpactCard({
  denied,
  enabled,
  icon: Icon,
  operator,
  stable,
  summary,
  title,
  tone,
  type,
}: {
  denied: string;
  enabled: string;
  icon: LucideIcon;
  operator: string;
  stable: string;
  summary: string;
  title: string;
  tone: "analytics" | "marketing" | "required";
  type: "선택" | "필수";
}) {
  return (
    <article className={styles.guideCard} data-tone={tone}>
      <header>
        <span aria-hidden="true">
          <Icon size={19} strokeWidth={1.7} />
        </span>
        <div>
          <em>{type}</em>
          <h3>{title}</h3>
        </div>
      </header>
      <p>{summary}</p>
      <dl>
        <div>
          <dt>동의하면</dt>
          <dd>{enabled}</dd>
        </div>
        <div>
          <dt>거부·철회하면</dt>
          <dd>{denied}</dd>
        </div>
        <div>
          <dt>동의와 무관한 것</dt>
          <dd>{stable}</dd>
        </div>
      </dl>
      <footer>
        <strong>운영 확인</strong>
        <p>{operator}</p>
      </footer>
    </article>
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
