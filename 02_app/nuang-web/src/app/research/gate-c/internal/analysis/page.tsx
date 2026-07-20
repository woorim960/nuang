import type { Metadata } from "next";
import { ArrowLeft, ArrowUpRight, Database, RefreshCw } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  readGateCAnalysisDashboard,
  type GateCAnalysisDashboardData,
  type GateCReviewQueueRow,
} from "@/features/research/gate-c/gate-c-analysis-dashboard";
import { gateCFormIds } from "@/features/research/gate-c/gate-c-study-contract";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Gate C 자동 분석 | NUANG",
  robots: { follow: false, index: false },
};

export const dynamic = "force-dynamic";

export default async function GateCAnalysisPage() {
  if (process.env.NODE_ENV !== "development") notFound();

  const serviceClient = createSupabaseServiceClient();
  let data: GateCAnalysisDashboardData | null = null;
  let unavailable = !serviceClient;

  if (serviceClient) {
    try {
      data = await readGateCAnalysisDashboard(serviceClient);
    } catch {
      unavailable = true;
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link
          aria-label="연구 도구로 돌아가기"
          href="/research/gate-c/internal"
        >
          <ArrowLeft aria-hidden="true" size={19} strokeWidth={1.7} />
        </Link>
        <div>
          <p>GATE C · INTERNAL</p>
          <h1>자동 분석 현황</h1>
        </div>
        <Link aria-label="새로고침" href="/research/gate-c/internal/analysis">
          <RefreshCw aria-hidden="true" size={18} strokeWidth={1.7} />
        </Link>
      </header>

      {unavailable || !data ? (
        <section className={styles.unavailable}>
          <Database aria-hidden="true" size={25} strokeWidth={1.6} />
          <h2>분석 저장소를 불러오지 못했어요</h2>
          <p>Supabase 환경과 Gate C 마이그레이션 적용 상태를 확인해 주세요.</p>
        </section>
      ) : (
        <>
          <section className={styles.intro}>
            <div>
              <p className={styles.eyebrow}>제출과 동시에 자동 갱신</p>
              <h2>문항 위험 신호만 모아 봅니다</h2>
              <p>
                참여자 원문이나 개인 정보는 표시하지 않습니다. 자동 권고는 운영
                문항을 바꾸지 않고 검토 순서만 정합니다.
              </p>
            </div>
            <Link href="/research/gate-c" target="_blank">
              공개 참여 폼
              <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.7} />
            </Link>
          </section>

          <section aria-label="세션 요약" className={styles.summaryGrid}>
            <Summary label="시작" value={data.sessionCounts.started} />
            <Summary label="완료" value={data.sessionCounts.completed} />
            <Summary label="분석 포함" value={data.sessionCounts.included} />
            <Summary
              label="이상 신호 제외"
              value={data.sessionCounts.excluded}
            />
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div>
                <p>FORM COVERAGE</p>
                <h2>폼별 완료 기록</h2>
              </div>
              <span>폼마다 8명부터 1차 신호 판정</span>
            </div>
            <div className={styles.coverageList}>
              {gateCFormIds.map((formId) => {
                const count = data.formCompletionCounts[formId];
                return (
                  <div className={styles.coverageRow} key={formId}>
                    <span>{formId.replace("FORM_", "폼 ")}</span>
                    <div aria-hidden="true" className={styles.coverageTrack}>
                      <span
                        style={{
                          width: `${Math.min(100, (count / 8) * 100)}%`,
                        }}
                      />
                    </div>
                    <strong>{count}명</strong>
                  </div>
                );
              })}
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div>
                <p>AUTO REVIEW QUEUE</p>
                <h2>문항 검수 대기열</h2>
              </div>
              <span>
                검토 {data.queueCounts.reviewRequired} · 표본 부족{" "}
                {data.queueCounts.insufficientData}
              </span>
            </div>

            {data.queue.length === 0 ? (
              <div className={styles.emptyState}>
                <p>아직 완료된 참여 기록이 없어요.</p>
                <span>
                  첫 제출이 완료되면 60개 문항의 상태가 자동 생성됩니다.
                </span>
              </div>
            ) : (
              <div className={styles.queueList}>
                {data.queue.map((row) => (
                  <QueueRow key={row.studyItemId} row={row} />
                ))}
              </div>
            )}
          </section>

          <footer className={styles.footer}>
            마지막 분석 · {formatGeneratedAt(data.generatedAt)}
          </footer>
        </>
      )}
    </main>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className={styles.summaryItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function QueueRow({ row }: { row: GateCReviewQueueRow }) {
  const status = statusCopy(row.recommendationStatus);
  return (
    <article className={styles.queueRow}>
      <div className={styles.queueTop}>
        <div>
          <strong>{row.studyItemId}</strong>
          <span>{row.observationCount}개 기록</span>
        </div>
        <span className={styles[status.className]}>{status.label}</span>
      </div>
      <div className={styles.metricGrid}>
        <Metric label="판단 어려움" value={row.metrics.unsureRate} />
        <Metric label="문구 불명확" value={row.metrics.wordingUnclearRate} />
        <Metric label="헷갈림 표시" value={row.metrics.confusionFlagRate} />
        <Metric label="답 변경" value={row.metrics.responseChangeRate} />
      </div>
      {row.reasonCodes.length > 0 ? (
        <p className={styles.reasonCopy}>
          {row.reasonCodes.map(reasonLabel).join(" · ")}
        </p>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{Math.round((value ?? 0) * 100)}%</strong>
    </div>
  );
}

function statusCopy(status: GateCReviewQueueRow["recommendationStatus"]) {
  if (status === "review_required") {
    return { className: "statusReview", label: "검토 필요" } as const;
  }
  if (status === "monitor") {
    return { className: "statusMonitor", label: "관찰 유지" } as const;
  }
  return { className: "statusInsufficient", label: "표본 더 필요" } as const;
}

function reasonLabel(code: string) {
  const labels: Record<string, string> = {
    COMPREHENSION_REVIEW: "뜻 이해 점검",
    EXPERIENCE_COVERAGE_REVIEW: "경험 범위 점검",
    NEED_MORE_RESPONSES: "응답 더 필요",
    RESPONSE_PROCESS_REVIEW: "응답 과정 점검",
    WORDING_REVIEW: "문구 점검",
  };
  return labels[code] ?? "추가 점검";
}

function formatGeneratedAt(value: string | null) {
  if (!value) return "아직 분석 전";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
