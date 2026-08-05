import {
  Activity,
  CheckCircle2,
  CircleGauge,
  Repeat2,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  type AdminProductAnalyticsSnapshot,
  adminProductAnalyticsWindows,
  parseAdminProductAnalyticsWindow,
  readAdminProductAnalytics,
} from "@/features/admin/server-admin-product-analytics";
import type { ProductAnalyticsArea } from "@/features/consent/optional-consent-contract";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "제품 분석 | NUANG 운영 센터",
};

export const dynamic = "force-dynamic";

const areaLabels: Record<ProductAnalyticsArea, string> = {
  assessment: "검사",
  community: "커뮤니티",
  home: "홈",
  my: "마이",
  other: "기타",
  result: "결과",
  settings: "설정",
  together: "함께하기",
  trait_map: "성향지도",
};

export default async function AdminProductAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const [context, query] = await Promise.all([
    resolveAdminContext(),
    searchParams,
  ]);
  if (!context.ok) return null;

  const windowDays = parseAdminProductAnalyticsWindow(query.days);
  const result = await readAdminProductAnalytics({
    accountId: context.accountId,
    client: context.client,
    windowDays,
  });

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>베타 사용자 가치 검증</p>
          <h1>제품 분석</h1>
        </div>
        <span className={shared.headerAction}>
          <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.7} />
          선택 동의 집계
        </span>
      </header>

      <nav aria-label="분석 기간" className={styles.filters}>
        {adminProductAnalyticsWindows.map((days) => (
          <Link
            aria-current={windowDays === days ? "page" : undefined}
            data-active={windowDays === days}
            href={`/admin/analytics?days=${days}`}
            key={days}
          >
            {days}일
          </Link>
        ))}
      </nav>

      <section className={styles.scopeNote}>
        <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.7} />
        <p>
          분석 선택 동의가 활성화된 로그인 사용자의 정규화된 영역과 기존
          완료·공유·비교 사실만 집계합니다. 답변, 결과 내용, 경로, 사용자
          식별자는 이 화면에 제공하지 않습니다. 품질 의견은 사용자가 직접
          제출한 기존 운영 신호의 종류별 건수만 별도로 합산합니다.
        </p>
      </section>

      {!result.available ? (
        <section className={shared.panel}>
          <div className={shared.error}>
            <strong>제품 분석 집계에 연결하지 못했습니다</strong>
            <p>
              최신 product analytics operations 마이그레이션을 확인한 뒤 다시
              불러와 주세요. 서비스 이용 데이터 수집은 사용자 기능을 방해하지
              않고 조용히 중단됩니다.
            </p>
          </div>
        </section>
      ) : (
        <AnalyticsContent snapshot={result.snapshot} />
      )}
    </main>
  );
}

function AnalyticsContent({
  snapshot,
}: {
  snapshot: AdminProductAnalyticsSnapshot;
}) {
  const { summary } = snapshot;
  const viewsPerUser = summary.activeAccounts
    ? summary.totalScreenViews / summary.activeAccounts
    : null;

  return (
    <>
      <section className={styles.metricGrid} aria-label="핵심 이용 지표">
        <MetricCard
          detail={`동의 활성 ${formatCount(summary.eligibleAccounts)}명 중 관찰`}
          icon={Users}
          label={`${snapshot.windowDays}일 활성 사용자`}
          value={formatCount(summary.activeAccounts)}
        />
        <MetricCard
          detail={`마지막 수집 ${formatOptionalDateTime(summary.lastEventAt)}`}
          icon={Activity}
          label="화면 조회"
          value={formatCount(summary.totalScreenViews)}
        />
        <MetricCard
          detail={formatRate(summary.repeatAccounts, summary.activeAccounts)}
          icon={Repeat2}
          label="반복 사용자"
          value={formatCount(summary.repeatAccounts)}
        />
        <MetricCard
          detail="중복 제거된 정규화 영역 기준"
          icon={CircleGauge}
          label="사용자당 조회"
          value={viewsPerUser === null ? "—" : viewsPerUser.toFixed(1)}
        />
      </section>

      {summary.activeAccounts === 0 ? (
        <section className={shared.panel}>
          <div className={shared.empty}>
            <strong>선택한 기간에 수집된 이용 데이터가 없습니다</strong>
            <p>
              정상적인 0건 상태입니다. 분석 동의 사용자 활동이 생기면 일별
              추이와 영역 분포가 표시됩니다.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2>일별 이용 추이</h2>
              <span>화면 조회 · 고유 사용자</span>
            </div>
            <DailyChart snapshot={snapshot} />
          </section>

          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2>제품 영역 분포</h2>
              <span>원본 경로를 저장하지 않는 정규화 집계</span>
            </div>
            <AreaBreakdown snapshot={snapshot} />
          </section>
        </>
      )}

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>가치 확인 지표</h2>
          <span>canonical 완료·공유·비교 사실 우선</span>
        </div>
        <div className={styles.valueGrid}>
          <ValueMetric
            denominator={summary.newEligibleAccounts}
            description="계정 생성 24시간 안에 첫 검사 완료"
            label="활성화"
            numerator={summary.activatedAccounts}
          />
          <ValueMetric
            denominator={summary.assessmentViewers}
            description={`${formatCount(summary.completedAttempts)}회 완료`}
            label="검사 완료"
            numerator={summary.completedAccounts}
          />
          <ValueMetric
            denominator={summary.completedAccounts}
            description="기간 내 결과 영역 고유 사용자"
            label="결과 도달"
            numerator={summary.resultViewers}
          />
          <ValueMetric
            denominator={summary.completedAccounts}
            description="기간 내 1회 이상 공유 링크 생성"
            label="공유"
            numerator={summary.sharedAccounts}
          />
          <ValueMetric
            denominator={summary.completedAccounts}
            description="기간 내 1회 이상 관계 비교 생성"
            label="비교"
            numerator={summary.comparedAccounts}
          />
          <ValueMetric
            denominator={summary.resultFeedbackCount}
            description="도움 평가가 아닌 결과 문장 적합도 대용 신호"
            label="결과 문장 적합"
            numerator={summary.resultFitCount}
          />
        </div>
      </section>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>품질·불편 신호</h2>
          <span>자동 오류율 계측 전 사용자 제출 건수</span>
        </div>
        <div className={styles.qualityRows}>
          <QualityRow
            label="결과 문장 의견"
            values={[
              ["비슷함", summary.resultFitCount],
              ["상황 차이", summary.resultDependsCount],
              ["불일치", summary.resultNotFitCount],
            ]}
          />
          <QualityRow
            label="제품 의견"
            values={[
              ["오류", summary.bugFeedbackCount],
              ["사용성", summary.usabilityFeedbackCount],
              ["아이디어", summary.ideaFeedbackCount],
            ]}
          />
        </div>
      </section>

      <section className={styles.instrumentationNote}>
        <CheckCircle2 aria-hidden="true" size={18} strokeWidth={1.7} />
        <div>
          <strong>현재 계측 범위</strong>
          <p>
            화면 조회와 기존 저장 사실을 사용합니다. 검사 시작·진행 이탈,
            결과 도움 질문, 공유 의도 대비 성공, 자동 오류율은 기획의 Phase
            1 이벤트가 적용된 뒤 활성화합니다.
          </p>
        </div>
        <span>
          원시 이벤트 {snapshot.retentionDays}일 · 집계 {formatDateTime(snapshot.generatedAt)}
        </span>
      </section>
    </>
  );
}

function MetricCard({
  detail,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <article>
      <span>
        <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </article>
  );
}

function DailyChart({ snapshot }: { snapshot: AdminProductAnalyticsSnapshot }) {
  const maxViews = Math.max(...snapshot.daily.map((item) => item.views), 1);
  return (
    <div className={styles.dailyChart} role="list">
      {snapshot.daily.map((item, index) => (
        <div
          aria-label={`${formatDay(item.day)} 화면 조회 ${item.views}회, 사용자 ${item.uniqueAccounts}명`}
          key={item.day}
          role="listitem"
        >
          <span
            aria-hidden="true"
            style={
              {
                "--analytics-bar-height": `${Math.max(
                  (item.views / maxViews) * 100,
                  item.views > 0 ? 4 : 0,
                )}%`,
              } as CSSProperties
            }
          />
          {shouldShowDayLabel(index, snapshot.daily.length) ? (
            <small>{formatDay(item.day)}</small>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function AreaBreakdown({
  snapshot,
}: {
  snapshot: AdminProductAnalyticsSnapshot;
}) {
  const maxViews = Math.max(...snapshot.areas.map((item) => item.views), 1);
  return (
    <div className={styles.areaRows}>
      {snapshot.areas.map((item) => (
        <div key={item.area}>
          <span>{areaLabels[item.area]}</span>
          <div>
            <i
              aria-hidden="true"
              style={
                {
                  "--analytics-area-width": `${(item.views / maxViews) * 100}%`,
                } as CSSProperties
              }
            />
          </div>
          <strong>{formatCount(item.views)}</strong>
          <small>{formatCount(item.uniqueAccounts)}명</small>
        </div>
      ))}
    </div>
  );
}

function ValueMetric({
  denominator,
  description,
  label,
  numerator,
}: {
  denominator: number;
  description: string;
  label: string;
  numerator: number;
}) {
  return (
    <article>
      <span>{label}</span>
      <strong>{formatRate(numerator, denominator)}</strong>
      <p>
        {formatCount(numerator)}/{formatCount(denominator)}명 · {description}
      </p>
    </article>
  );
}

function QualityRow({
  label,
  values,
}: {
  label: string;
  values: Array<[string, number]>;
}) {
  return (
    <div>
      <strong>{label}</strong>
      <dl>
        {values.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{formatCount(value)}건</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatRate(numerator: number, denominator: number) {
  if (denominator <= 0) return "표본 수집 중";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function formatOptionalDateTime(value: string | null) {
  return value ? formatDateTime(value) : "없음";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function shouldShowDayLabel(index: number, length: number) {
  if (length <= 7) return true;
  const interval = length <= 30 ? 6 : 14;
  return index === 0 || index === length - 1 || index % interval === 0;
}
