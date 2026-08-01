import { MessageSquareMore } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminFeedbackActions } from "@/features/admin/AdminFeedbackActions";
import { AdminCoreResultFeedbackActions } from "@/features/admin/AdminCoreResultFeedbackActions";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import {
  readAdminAssessmentQualityQueue,
  readAdminCoreResultFeedback,
  readAdminProductFeedback,
  type AdminProductFeedbackStatus,
} from "@/features/admin/server-admin-feedback";
import {
  productFeedbackAreaLabels,
  productFeedbackKindLabels,
  productFeedbackKinds,
  type ProductFeedbackKind,
} from "@/features/feedback/product-feedback-contract";
import {
  coreResultFeedbackReasonLabels,
  coreResultFeedbackSentimentLabels,
  type CoreResultFeedbackStatus,
} from "@/features/result/unified-core-report/core-result-feedback-contract";
import { getFreeTopicQuestions } from "@/features/assessment/free-topic-assessments";
import shared from "@/features/admin/AdminShared.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "고객 의견 | NUANG 운영 센터",
};

const statuses: Array<{
  label: string;
  value: AdminProductFeedbackStatus | "all";
}> = [
  { label: "전체", value: "all" },
  { label: "접수됨", value: "received" },
  { label: "확인 중", value: "reviewing" },
  { label: "반영 예정", value: "planned" },
  { label: "처리 완료", value: "resolved" },
  { label: "검토 종료", value: "closed" },
];

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; status?: string }>;
}) {
  const context = await resolveAdminContext();
  if (!context.ok) return null;
  const params = await searchParams;
  const status = isStatus(params.status) ? params.status : undefined;
  const kind = isKind(params.kind) ? params.kind : undefined;
  const [data, qualityQueue, coreResultQuality] = await Promise.all([
    readAdminProductFeedback({ client: context.client, kind, status }),
    readAdminAssessmentQualityQueue({ client: context.client }),
    readAdminCoreResultFeedback({ client: context.client }),
  ]);

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>오류 · 불편 · 기능 제안</p>
          <h1>고객 의견</h1>
        </div>
        <span className={shared.headerAction}>
          <MessageSquareMore aria-hidden="true" size={17} strokeWidth={1.7} />
          {data.items.length}건
        </span>
      </header>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>검사 품질 자동 검수</h2>
          <span>문항 이해·수정·결과 적합도 집계</span>
        </div>
        {!qualityQueue.available ? (
          <div className={shared.error}>
            <strong>검사 품질 집계 저장소를 준비해야 합니다</strong>
            <p>
              최신 assessment quality observation 마이그레이션을 적용해 주세요.
            </p>
          </div>
        ) : qualityQueue.items.length === 0 ? (
          <div className={shared.empty}>
            <strong>검수가 필요한 품질 신호가 없습니다</strong>
          </div>
        ) : (
          <div className={styles.list}>
            {qualityQueue.items.map((item) => (
              <article
                key={`${item.assessmentSlug}:${item.instrumentVersion}:${item.signalKey}:${item.priority}`}
              >
                <header>
                  <div>
                    <strong>{item.assessmentSlug}</strong>
                    <span>
                      {qualitySignalLabel(item.assessmentSlug, item.signalKey)}{" "}
                      · {item.instrumentVersion}
                    </span>
                  </div>
                  <em
                    className={shared.status}
                    data-tone={item.priority === "high" ? "warning" : undefined}
                  >
                    {item.priority === "high"
                      ? "우선 검수"
                      : item.priority === "medium"
                        ? "검수 권장"
                        : item.priority === "monitor"
                          ? "표본 관찰"
                          : "관찰"}{" "}
                    · {formatRate(item.observationRate)} ·{" "}
                    {item.observationCount}/{item.sampleCount}건
                  </em>
                </header>
                <dl>
                  <div>
                    <dt>최초</dt>
                    <dd>{formatDateTime(item.firstSeenAt)}</dd>
                  </div>
                  <div>
                    <dt>최근</dt>
                    <dd>{formatDateTime(item.lastSeenAt)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={shared.panel} id="core-result-quality">
        <div className={shared.panelHeader}>
          <h2>결과 리포트 문장 품질</h2>
          <span>완료 시점 문장 버전별 적합도</span>
        </div>
        {!coreResultQuality.available ? (
          <div className={shared.error}>
            <strong>결과 문장 의견 저장소를 준비해야 합니다</strong>
            <p>
              202608010001_core_result_report_feedback 마이그레이션을 적용해
              주세요.
            </p>
          </div>
        ) : coreResultQuality.summaries.length === 0 ? (
          <div className={shared.empty}>
            <strong>아직 모인 결과 문장 의견이 없습니다</strong>
            <p>새 리포트의 핵심 섹션 피드백이 이곳에 버전별로 쌓입니다.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {coreResultQuality.summaries.map((item) => (
              <article
                key={`${item.profileCode}:${item.sectionId}:${item.contentVersion}`}
              >
                <header>
                  <div>
                    <strong>
                      {item.profileCode} ·{" "}
                      {coreResultSectionLabel(item.sectionId)}
                    </strong>
                    <span>
                      {item.reportKind === "full" ? "정밀" : "첫 성향"} ·{" "}
                      {item.contentVersion}
                    </span>
                  </div>
                  <em
                    className={shared.status}
                    data-tone={
                      item.priority === "high"
                        ? "warning"
                        : item.priority === "medium"
                          ? "brand"
                          : undefined
                    }
                  >
                    {coreResultPriorityLabel(item.priority)}
                  </em>
                </header>
                <dl>
                  <div>
                    <dt>표본</dt>
                    <dd>{item.sampleCount}명</dd>
                  </div>
                  <div>
                    <dt>비슷함</dt>
                    <dd>{item.fitCount}</dd>
                  </div>
                  <div>
                    <dt>상황 차이</dt>
                    <dd>{item.dependsCount}</dd>
                  </div>
                  <div>
                    <dt>불일치</dt>
                    <dd>
                      {item.notFitCount} · {formatRate(item.notFitRate)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      {coreResultQuality.available && coreResultQuality.items.length > 0 ? (
        <section className={shared.panel}>
          <div className={shared.panelHeader}>
            <h2>결과 문장 검토 대기열</h2>
            <span>최신순 · 최대 100건</span>
          </div>
          <div className={styles.list}>
            {coreResultQuality.items.map((item) => (
              <article key={item.id}>
                <header>
                  <div>
                    <strong>
                      {item.profileCode} ·{" "}
                      {coreResultSectionLabel(item.sectionId)}
                    </strong>
                    <span>
                      {coreResultFeedbackSentimentLabels[item.sentiment]} ·{" "}
                      {item.contentVersion}
                    </span>
                  </div>
                  <em
                    className={shared.status}
                    data-tone={coreResultStatusTone(item.status)}
                  >
                    {coreResultStatusLabel(item.status)}
                  </em>
                </header>
                <p>
                  {item.reason
                    ? coreResultFeedbackReasonLabels[item.reason]
                    : "추가 이유 없이 응답"}
                </p>
                <dl>
                  <div>
                    <dt>콘텐츠 키</dt>
                    <dd>{item.contentKey}</dd>
                  </div>
                  <div>
                    <dt>접수</dt>
                    <dd>{formatDateTime(item.createdAt)}</dd>
                  </div>
                </dl>
                <AdminCoreResultFeedbackActions
                  feedbackId={item.id}
                  status={item.status}
                />
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <nav aria-label="고객 의견 상태" className={styles.statusTabs}>
        {statuses.map((item) => (
          <Link
            aria-current={(status ?? "all") === item.value ? "page" : undefined}
            data-active={(status ?? "all") === item.value}
            href={feedbackHref({
              kind,
              status: item.value === "all" ? undefined : item.value,
            })}
            key={item.value}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <nav aria-label="고객 의견 종류" className={styles.kindTabs}>
        <Link data-active={!kind} href={feedbackHref({ status })}>
          모든 종류
        </Link>
        {productFeedbackKinds.map((item) => (
          <Link
            data-active={kind === item}
            href={feedbackHref({ kind: item, status })}
            key={item}
          >
            {productFeedbackKindLabels[item]}
          </Link>
        ))}
      </nav>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>접수 목록</h2>
          <span>최신순 · 최대 100건</span>
        </div>
        {!data.available ? (
          <div className={shared.error}>
            <strong>고객 의견 저장소를 준비해야 합니다</strong>
            <p>최신 product feedback 마이그레이션을 적용해 주세요.</p>
          </div>
        ) : data.items.length === 0 ? (
          <div className={shared.empty}>
            <strong>조건에 맞는 의견이 없습니다</strong>
            <p>새 의견이 접수되면 이곳에서 바로 확인할 수 있습니다.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {data.items.map((item) => (
              <article key={item.id}>
                <header>
                  <div>
                    <strong>{productFeedbackKindLabels[item.kind]}</strong>
                    <span>
                      {productFeedbackAreaLabels[item.area]} ·{" "}
                      {item.accountLinked ? "회원" : "비회원"}
                    </span>
                  </div>
                  <em
                    className={shared.status}
                    data-tone={statusTone(item.status)}
                  >
                    {statusLabel(item.status)}
                  </em>
                </header>
                <p>{item.body}</p>
                <dl>
                  <div>
                    <dt>접수</dt>
                    <dd>{formatDateTime(item.createdAt)}</dd>
                  </div>
                  {item.sourcePath ? (
                    <div>
                      <dt>경로</dt>
                      <dd>{item.sourcePath}</dd>
                    </div>
                  ) : null}
                  {item.technicalContext.viewportWidth ? (
                    <div>
                      <dt>화면</dt>
                      <dd>
                        {item.technicalContext.viewportWidth} ×{" "}
                        {item.technicalContext.viewportHeight ?? "-"}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                <AdminFeedbackActions
                  feedbackId={item.id}
                  status={item.status}
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function feedbackHref({
  kind,
  status,
}: {
  kind?: ProductFeedbackKind;
  status?: AdminProductFeedbackStatus;
}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (kind) params.set("kind", kind);
  const query = params.toString();
  return `/admin/feedback${query ? `?${query}` : ""}`;
}

function isKind(value: string | undefined): value is ProductFeedbackKind {
  return productFeedbackKinds.includes(value as ProductFeedbackKind);
}

function isStatus(
  value: string | undefined,
): value is AdminProductFeedbackStatus {
  return ["received", "reviewing", "planned", "resolved", "closed"].includes(
    value ?? "",
  );
}

function statusLabel(status: AdminProductFeedbackStatus) {
  return statuses.find((item) => item.value === status)?.label ?? "접수됨";
}

function statusTone(status: AdminProductFeedbackStatus) {
  if (status === "resolved") return "success";
  if (status === "reviewing") return "warning";
  if (status === "planned") return "brand";
  return undefined;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function qualitySignalLabel(assessmentSlug: string, signalKey: string) {
  if (signalKey.startsWith("result:fit_")) {
    const fit = signalKey.slice("result:fit_".length);
    if (fit === "low") return "결과 적합도 · 조금 다름";
    if (fit === "middle") return "결과 적합도 · 대체로 맞음";
    if (fit === "high") return "결과 적합도 · 잘 맞음";
  }

  const [questionId, signal] = signalKey.split(":");
  const question = getFreeTopicQuestions(assessmentSlug).find(
    (item) => item.id === questionId,
  );
  const signalLabel =
    signal === "wording_unclear"
      ? "문구가 어려움"
      : signal === "no_experience"
        ? "비슷한 경험 없음"
        : signal === "context_varies"
          ? "맥락에 따라 다름"
          : signal === "prefer_not_to_answer"
            ? "응답하지 않음"
            : signal === "revised_multiple"
              ? "답을 여러 번 수정"
              : signal === "dwell_over_30s"
                ? "30초 넘게 고민"
                : "정상 완료";

  return `${question?.contextLabel ?? questionId} · ${signalLabel}`;
}

function formatRate(value: number) {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value * 1_000) / 10}%`;
}

function coreResultSectionLabel(sectionId: string) {
  if (sectionId === "profile_overview") return "핵심 모습";
  if (sectionId === "strength_and_overuse") return "강점과 과사용";
  if (sectionId === "misread_and_conversation") return "오해와 대화";
  if (sectionId.startsWith("approved_canonical_summary"))
    return "승인 핵심 문장";
  if (sectionId.startsWith("approved_overuse_cost")) return "승인 과사용 비용";
  if (sectionId.startsWith("action_experiment")) return "작은 행동 실험";
  return sectionId;
}

function coreResultPriorityLabel(
  priority: "collecting" | "normal" | "medium" | "high",
) {
  if (priority === "high") return "우선 검토";
  if (priority === "medium") return "검토 권장";
  if (priority === "normal") return "정상 관찰";
  return "표본 수집 중";
}

function coreResultStatusLabel(status: CoreResultFeedbackStatus) {
  if (status === "reviewing") return "검토 중";
  if (status === "incorporated") return "개선 반영";
  if (status === "dismissed") return "근거 부족";
  return "접수됨";
}

function coreResultStatusTone(status: CoreResultFeedbackStatus) {
  if (status === "incorporated") return "success";
  if (status === "reviewing") return "warning";
  return undefined;
}
