import {
  Activity,
  ArrowRight,
  CalendarDays,
  CircleAlert,
  ClipboardCheck,
  FileText,
  FlaskConical,
  MessageSquareMore,
  MessagesSquare,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { AdminOverviewData } from "./server-admin-overview";
import { adminActionLabel } from "./admin-operation-copy";
import styles from "./AdminDashboard.module.css";

export function AdminDashboard({ data }: { data: AdminOverviewData }) {
  const urgentCount = nullableSum(
    data.counts.queuedReports,
    data.counts.pendingPosts,
    data.counts.qualitySignals,
    data.counts.reportFeedback,
    data.counts.customerFeedback,
    data.counts.researchReviews,
  );
  const hasUnavailableData = data.unavailableModules.length > 0;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>OPERATIONS OVERVIEW</p>
          <h1>운영 개요</h1>
          <span>서비스 상태와 오늘 처리할 업무를 한 화면에서 확인합니다.</span>
        </div>
        <div className={styles.headerStatus} data-alert={hasUnavailableData}>
          {hasUnavailableData ? (
            <CircleAlert aria-hidden="true" size={18} strokeWidth={1.8} />
          ) : (
            <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.8} />
          )}
          <div>
            <strong>{hasUnavailableData ? "일부 연결 확인 필요" : "운영 데이터 정상"}</strong>
            <small>{formatDateTime(data.generatedAt)} 기준</small>
          </div>
        </div>
      </header>

      <section className={`${styles.section} ${styles.prioritySection}`}>
        <div className={styles.sectionTitle}>
          <div>
            <p>INTEGRATED WORK QUEUE</p>
            <h2>통합 작업 큐</h2>
          </div>
          <span>{urgentCount === null ? "일부 확인 필요" : `${urgentCount}건 대기`}</span>
        </div>
        <div className={styles.taskList}>
          <Task
            category="안전"
            count={data.counts.queuedReports}
            description="프로필·게시물 신고를 검토합니다."
            href="/admin/community?view=reports"
            label="커뮤니티 신고"
            tone="danger"
          />
          <Task
            category="커뮤니티"
            count={data.counts.pendingPosts}
            description="검토 대기 중인 게시물 상태를 결정합니다."
            href="/admin/community?view=posts"
            label="게시물 검토"
            tone="warning"
          />
          <Task
            category="검사 품질"
            count={data.counts.qualitySignals}
            description="응답 과정에서 감지된 문항 품질 신호를 확인합니다."
            href="/admin/feedback#assessment-quality"
            label="검사 품질 관찰"
            tone="quality"
          />
          <Task
            category="리포트"
            count={data.counts.reportFeedback}
            description="사용자가 남긴 결과 문장 피드백을 검토합니다."
            href="/admin/feedback#core-result-quality"
            label="결과 리포트 의견"
            tone="quality"
          />
          <Task
            category="고객 의견"
            count={data.counts.customerFeedback}
            description="접수되었거나 검토 중인 서비스 의견을 처리합니다."
            href="/admin/feedback?status=received"
            label="고객 의견 처리"
            tone="customer"
          />
          <Task
            category="연구"
            count={data.counts.researchReviews}
            description="검토가 필요한 검사 문항과 연구 데이터를 확인합니다."
            href="/admin/research"
            label="연구 검토"
            tone="research"
          />
          <Task
            category="콘텐츠"
            count={data.counts.contentReleases}
            description="작성·검수·배포 중인 콘텐츠 릴리스를 관리합니다."
            href="/admin/content"
            label="콘텐츠 릴리스"
            tone="content"
          />
        </div>
      </section>

      <section aria-label="핵심 운영 지표" className={styles.metricGrid}>
        <Metric
          detail="현재 이용 가능"
          href="/admin/members"
          icon={Users}
          label="활성 회원"
          value={formatCount(data.counts.activeMembers)}
        />
        <Metric
          detail="최근 7일 가입"
          href="/admin/members"
          icon={Activity}
          label="신규 회원"
          value={formatCount(data.counts.newMembers)}
        />
        <Metric
          detail="신고·게시물 합계"
          href="/admin/community"
          icon={MessagesSquare}
          label="커뮤니티 대기"
          value={formatCount(nullableSum(data.counts.pendingPosts, data.counts.queuedReports))}
        />
        <Metric
          detail="검사·리포트·고객 의견"
          href="/admin/feedback"
          icon={MessageSquareMore}
          label="품질·의견 대기"
          value={formatCount(
            nullableSum(
              data.counts.qualitySignals,
              data.counts.reportFeedback,
              data.counts.customerFeedback,
            ),
          )}
        />
        <Metric
          detail="완료된 참여 세션"
          href="/admin/research"
          icon={FlaskConical}
          label="완료된 연구"
          value={formatCount(data.counts.completedResearch)}
        />
        <Metric
          detail="현재 캠페인"
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
              <p>EVENT OPERATIONS</p>
              <h2>이벤트 진행 상태</h2>
            </div>
            <Link aria-label="이벤트 운영 열기" href="/admin/events">
              열기
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.7} />
            </Link>
          </div>
          <div className={styles.eventSummary}>
            <span>
              <ClipboardCheck aria-hidden="true" size={20} strokeWidth={1.7} />
            </span>
            <div>
              <strong>
                {data.event.drawCompleted
                  ? "추첨 완료"
                  : `${data.event.winnerCount}명 추첨 예정`}
              </strong>
              <p>
                {data.event.drawCompleted
                  ? "당첨자 연락과 지급 상태 확인이 필요합니다."
                  : "발표 전까지 응모가 자동으로 집계됩니다."}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <div>
              <p>ADMIN ACTIVITY</p>
              <h2>최근 관리자 활동</h2>
            </div>
            <Link href="/admin/audit">
              전체 기록
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.7} />
            </Link>
          </div>
          {data.audit.length > 0 ? (
            <div className={styles.auditList}>
              {data.audit.slice(0, 5).map((item) => (
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
            <p className={styles.empty}>기록된 관리자 조치가 없습니다.</p>
          )}
        </div>
      </section>

      <nav aria-label="운영 제어 바로가기" className={styles.controlStrip}>
        <div>
          <p>OPERATIONS CONTROL</p>
          <strong>운영 상태와 변경 기록을 점검하세요.</strong>
        </div>
        <Link href="/admin/system">
          <Activity aria-hidden="true" size={16} /> 시스템 상태
        </Link>
        <Link href="/admin/audit">
          <FileText aria-hidden="true" size={16} /> 감사 로그
        </Link>
        <Link href="/admin/content?view=guide">
          <ClipboardCheck aria-hidden="true" size={16} /> 운영 가이드
        </Link>
      </nav>

      {hasUnavailableData ? (
        <aside className={styles.dataNotice}>
          <CircleAlert aria-hidden="true" size={18} strokeWidth={1.8} />
          <div>
            <strong>일부 운영 데이터를 불러오지 못했습니다.</strong>
            <span>{data.unavailableModules.join(" · ")} 연결 상태를 확인해 주세요.</span>
          </div>
        </aside>
      ) : null}
    </main>
  );
}

function Metric({
  detail,
  href,
  icon: Icon,
  label,
  value,
}: {
  detail: string;
  href: string;
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <Link className={styles.metric} href={href}>
      <span>
        <Icon aria-hidden="true" size={17} strokeWidth={1.7} />
      </span>
      <div>
        <small>{label}</small>
        <em>{detail}</em>
      </div>
      <strong>{value}</strong>
    </Link>
  );
}

function Task({
  category,
  count,
  description,
  href,
  label,
  tone,
}: {
  category: string;
  count: number | null;
  description: string;
  href: string;
  label: string;
  tone: string;
}) {
  return (
    <Link data-tone={tone} href={href}>
      <span>{category}</span>
      <div>
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
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
