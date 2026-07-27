import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  FlaskConical,
  MessagesSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { AdminOverviewData } from "./server-admin-overview";
import { adminActionLabel } from "./admin-operation-copy";
import styles from "./AdminDashboard.module.css";

export function AdminDashboard({ data }: { data: AdminOverviewData }) {
  const urgentCount =
    (data.counts.queuedReports ?? 0) +
    (data.counts.pendingPosts ?? 0) +
    (data.counts.researchReviews ?? 0);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>OPERATIONS OVERVIEW</p>
          <h1>운영 개요</h1>
        </div>
        <span data-alert={urgentCount > 0}>
          {urgentCount > 0 ? (
            <CircleAlert aria-hidden="true" size={18} strokeWidth={1.8} />
          ) : (
            <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.8} />
          )}
          {urgentCount > 0 ? `${urgentCount}건 처리 필요` : "대기 업무 없음"}
        </span>
      </header>

      <section className={`${styles.section} ${styles.prioritySection}`}>
        <div className={styles.sectionTitle}>
          <div>
            <p>WORK QUEUE</p>
            <h2>먼저 처리할 업무</h2>
          </div>
          <span>
            {urgentCount > 0 ? `${urgentCount}건 대기` : "모두 처리됨"}
          </span>
        </div>
        <div className={styles.taskList}>
          <Task
            count={data.counts.queuedReports}
            href="/admin/community?view=reports"
            label="프로필 신고 검토"
            tone="warning"
          />
          <Task
            count={data.counts.pendingPosts}
            href="/admin/community?view=posts"
            label="게시물 상태 확인"
            tone="community"
          />
          <Task
            count={data.counts.researchReviews}
            href="/admin/research"
            label="검사 문항 검토"
            tone="research"
          />
          <Task
            count={data.counts.contentReleases}
            href="/admin/content"
            label="성향지도 콘텐츠 현황"
            tone="content"
          />
        </div>
      </section>

      <section aria-label="핵심 지표" className={styles.metricGrid}>
        <Metric
          href="/admin/members"
          icon={Users}
          label="활성 회원"
          value={formatCount(data.counts.activeMembers)}
        />
        <Metric
          href="/admin/community"
          icon={MessagesSquare}
          label="커뮤니티 대기"
          value={formatCount(
            nullableSum(data.counts.pendingPosts, data.counts.queuedReports),
          )}
        />
        <Metric
          href="/admin/research"
          icon={FlaskConical}
          label="완료된 연구"
          value={formatCount(data.counts.completedResearch)}
        />
        <Metric
          href="/admin/events"
          icon={CalendarDays}
          label="이벤트 응모"
          value={formatCount(data.counts.eventEntries)}
        />
      </section>

      <section className={styles.splitGrid}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <div>
              <p>EVENT</p>
              <h2>이벤트 진행 상태</h2>
            </div>
            <Link href="/admin/events">
              열기
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.7} />
            </Link>
          </div>
          <div className={styles.eventSummary}>
            <span>
              <ClipboardCheck aria-hidden="true" size={21} strokeWidth={1.7} />
            </span>
            <div>
              <strong>
                {data.event.drawCompleted
                  ? "추첨이 완료됐어요"
                  : `${data.event.winnerCount}명 추첨 예정`}
              </strong>
              <p>
                {data.event.drawCompleted
                  ? "당첨자 연락 상태를 확인하세요."
                  : "발표일 전까지 응모를 자동으로 모읍니다."}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <div>
              <p>ACTIVITY</p>
              <h2>최근 관리자 활동</h2>
            </div>
            <Link href="/admin/audit">
              전체
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.7} />
            </Link>
          </div>
          {data.audit.length > 0 ? (
            <div className={styles.auditList}>
              {data.audit.slice(0, 3).map((item) => (
                <div key={item.id}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{adminActionLabel(item.action)}</strong>
                    <small>{formatDateTime(item.createdAt)}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.empty}>아직 기록된 관리자 조치가 없습니다.</p>
          )}
        </div>
      </section>

      {data.unavailableModules.length > 0 ? (
        <aside className={styles.dataNotice}>
          <CircleAlert aria-hidden="true" size={18} strokeWidth={1.8} />
          <p>
            {data.unavailableModules.join(" · ")} 정보를 불러오지 못했습니다.
            연결 상태를 확인해 주세요.
          </p>
        </aside>
      ) : null}
    </main>
  );
}

function Metric({
  href,
  icon: Icon,
  label,
  value,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Link className={styles.metric} href={href}>
      <span>
        <Icon aria-hidden="true" size={18} strokeWidth={1.7} />
      </span>
      <small>{label}</small>
      <strong>{value}</strong>
    </Link>
  );
}

function Task({
  count,
  href,
  label,
  tone,
}: {
  count: number | null;
  href: string;
  label: string;
  tone: string;
}) {
  return (
    <Link data-tone={tone} href={href}>
      <span aria-hidden="true" />
      <strong>{label}</strong>
      <em>{count === null ? "확인 필요" : `${count}건`}</em>
      <ArrowRight aria-hidden="true" size={17} strokeWidth={1.7} />
    </Link>
  );
}

function nullableSum(...values: Array<number | null>) {
  return values.some((value) => value === null)
    ? null
    : values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function formatCount(value: number | null) {
  return value === null ? "—" : value.toLocaleString("ko-KR");
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
