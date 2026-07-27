import {
  ArrowUpRight,
  BookOpenCheck,
  ChevronDown,
  Map,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import type {
  GateCAnalysisDashboardData,
  GateCReviewQueueRow,
} from "@/features/research/gate-c/gate-c-analysis-dashboard";
import {
  traitMapFeedbackAnalysisPolicy,
  type TraitMapSectionFeedbackMetric,
} from "@/features/research/trait-map/trait-map-feedback-analysis";
import { AdminResearchDecisionActions } from "./AdminResearchDecisionActions";
import {
  gateCDecisionKey,
  type ResearchDecision,
  traitMapDecisionKey,
} from "./server-admin-research-decisions";
import shared from "./AdminShared.module.css";
import styles from "./AdminResearchDashboard.module.css";

export function AdminResearchDashboard({
  decisions,
  gateC,
  section,
  traitMap,
}: {
  decisions: {
    available: boolean;
    gateC: ResearchDecision[];
    traitMap: ResearchDecision[];
  };
  gateC: GateCAnalysisDashboardData | null;
  section: "items" | "trait-map";
  traitMap: TraitMapSectionFeedbackMetric[] | null;
}) {
  const gateCReviews = gateC?.queueCounts.reviewRequired ?? 0;
  const traitMapReviews =
    traitMap?.filter((item) => item.recommendationStatus === "review_required")
      .length ?? 0;

  return (
    <main className={shared.page}>
      <header className={shared.pageHeader}>
        <div>
          <p>검사와 성향지도 품질</p>
          <h1>검사 연구</h1>
        </div>
        <Link className={shared.headerAction} href="/admin/research">
          <RefreshCw aria-hidden="true" size={16} strokeWidth={1.7} />
          새로고침
        </Link>
      </header>

      <section aria-label="연구 지표" className={styles.summary}>
        <div>
          <span>완료된 검사</span>
          <strong>{formatCount(gateC?.sessionCounts.completed)}</strong>
        </div>
        <div>
          <span>문항 검토</span>
          <strong>{formatCount(gateC ? gateCReviews : null)}</strong>
        </div>
        <div>
          <span>지도 검토</span>
          <strong>{formatCount(traitMap ? traitMapReviews : null)}</strong>
        </div>
      </section>

      <nav aria-label="연구 운영 구분" className={styles.tabs}>
        <Link
          aria-current={section === "items" ? "page" : undefined}
          data-active={section === "items"}
          href="/admin/research?section=items"
        >
          검사 문항
          <span>{gateCReviews}</span>
        </Link>
        <Link
          aria-current={section === "trait-map" ? "page" : undefined}
          data-active={section === "trait-map"}
          href="/admin/research?section=trait-map"
        >
          성향지도
          <span>{traitMapReviews}</span>
        </Link>
      </nav>

      {section === "items" ? (
        <ItemResearch
          data={gateC}
          decisions={decisions.gateC}
          decisionStoreAvailable={decisions.available}
        />
      ) : (
        <TraitMapResearch
          data={traitMap}
          decisions={decisions.traitMap}
          decisionStoreAvailable={decisions.available}
        />
      )}
    </main>
  );
}

function ItemResearch({
  data,
  decisions,
  decisionStoreAvailable,
}: {
  data: GateCAnalysisDashboardData | null;
  decisions: ResearchDecision[];
  decisionStoreAvailable: boolean;
}) {
  if (!data) {
    return <Unavailable label="검사 문항 분석 저장소" />;
  }

  return (
    <>
      <section className={`${shared.panel} ${styles.operationGuide}`}>
        <header>
          <span className={styles.guideIcon}>
            <BookOpenCheck aria-hidden="true" size={20} strokeWidth={1.7} />
          </span>
          <div>
            <strong>이 화면은 이렇게 사용해요</strong>
            <p>참여자가 어려워한 문항을 찾아 검토 순서를 정하는 화면입니다.</p>
          </div>
          <Link href="/research/gate-c" target="_blank">
            참여 화면
            <ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.7} />
          </Link>
        </header>
        <ol>
          <li>
            <b>1</b>
            <span>
              <strong>‘검토 필요’부터 확인</strong>
              <small>위험 신호가 큰 문항이 위에 표시됩니다.</small>
            </span>
          </li>
          <li>
            <b>2</b>
            <span>
              <strong>상황과 실제 질문 읽기</strong>
              <small>어떤 표현에서 막혔는지 지표와 함께 살펴봅니다.</small>
            </span>
          </li>
          <li>
            <b>3</b>
            <span>
              <strong>권장 조치 판단</strong>
              <small>
                표본이 적으면 유지하고, 반복 신호가 크면 문구를 검토합니다.
              </small>
            </span>
          </li>
        </ol>
        <p className={styles.guideBoundary}>
          자동 분석은 우선순위를 제안합니다. 고객용 문항은 별도 검토와 승인
          후에만 변경됩니다.
        </p>
      </section>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>문항 검토 대기열</h2>
          <span>위험 신호 순</span>
        </div>
        {data.queue.length === 0 ? (
          <div className={shared.empty}>
            <strong>분석할 기록이 아직 없습니다</strong>
            <p>참여가 완료되면 문항별 신호가 자동으로 표시됩니다.</p>
          </div>
        ) : (
          <div className={styles.queue}>
            {data.queue.slice(0, 100).map((row) => (
              <ItemRow
                currentDecision={decisions.find(
                  (decision) => decision.key === gateCDecisionKey(row),
                )}
                decisionStoreAvailable={decisionStoreAvailable}
                key={`${row.protocolVersion}-${row.candidateSetId}-${row.studyItemId}`}
                row={row}
              />
            ))}
          </div>
        )}
      </section>
      <p className={styles.updated}>
        마지막 분석 {formatDateTime(data.generatedAt)}
      </p>
    </>
  );
}

function ItemRow({
  currentDecision,
  decisionStoreAvailable,
  row,
}: {
  currentDecision?: ResearchDecision;
  decisionStoreAvailable: boolean;
  row: GateCReviewQueueRow;
}) {
  const copy = itemStatus(row.recommendationStatus);
  const recommendation = recommendationCopy(row);
  return (
    <article className={styles.row}>
      <header className={styles.itemHeader}>
        <div className={styles.questionCopy}>
          <span className={styles.itemEyebrow}>
            {sourceLabel(row.sourceKind)}
            {row.domainId ? ` · ${domainLabel(row.domainId)}` : ""}
            {` · ${row.observationCount}명 응답`}
          </span>
          {row.contextLabel ? (
            <p className={styles.contextLabel}>{row.contextLabel}</p>
          ) : null}
          <h3>
            {row.promptText ??
              "문항 원문을 연결하지 못했습니다. 연구 정보를 확인해 주세요."}
          </h3>
        </div>
        <em className={shared.status} data-tone={copy.tone}>
          {copy.label}
        </em>
      </header>
      <div className={styles.recommendation} data-tone={copy.tone}>
        <strong>{recommendation.title}</strong>
        <span>{recommendation.description}</span>
      </div>
      <dl className={styles.metrics}>
        <Metric
          hint="상황을 떠올려 답하기 어려웠던 비율"
          label="판단 어려움"
          value={row.metrics.unsureRate}
        />
        <Metric
          hint="질문의 뜻이 분명하지 않았던 비율"
          label="문구 불명확"
          value={row.metrics.wordingUnclearRate}
        />
        <Metric
          hint="답을 고르는 과정에서 헷갈린 비율"
          label="선택 헷갈림"
          value={row.metrics.confusionFlagRate}
        />
        <Metric
          hint="처음 선택한 답을 바꾼 비율"
          label="답 변경"
          value={row.metrics.responseChangeRate}
        />
      </dl>
      <details className={styles.itemDetails}>
        <summary>
          분석 근거와 연구 정보
          <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
        </summary>
        <div>
          <section>
            <strong>검토 신호</strong>
            <p>
              {row.reasonCodes.length > 0
                ? row.reasonCodes.map(reasonLabel).join(" · ")
                : "현재 특별한 위험 신호가 없습니다."}
            </p>
          </section>
          <dl>
            <div>
              <dt>문항 번호</dt>
              <dd>{row.studyItemId}</dd>
            </div>
            <div>
              <dt>세부 측정 영역</dt>
              <dd>{facetLabel(row.facetId)}</dd>
            </div>
            <div>
              <dt>연구 문항 묶음</dt>
              <dd>{humanizeResearchSet(row.candidateSetId)}</dd>
            </div>
            <div>
              <dt>최근 분석</dt>
              <dd>{formatDateTime(row.updatedAt)}</dd>
            </div>
          </dl>
          <code>{row.candidateSetId}</code>
        </div>
      </details>
      <AdminResearchDecisionActions
        available={decisionStoreAvailable}
        current={currentDecision}
        identity={{
          candidateSetId: row.candidateSetId,
          protocolVersion: row.protocolVersion,
          studyItemId: row.studyItemId,
        }}
        scope="gate_c_item"
      />
    </article>
  );
}

function TraitMapResearch({
  data,
  decisions,
  decisionStoreAvailable,
}: {
  data: TraitMapSectionFeedbackMetric[] | null;
  decisions: ResearchDecision[];
  decisionStoreAvailable: boolean;
}) {
  if (!data) {
    return <Unavailable label="성향지도 피드백 저장소" />;
  }

  return (
    <>
      <section className={`${shared.panel} ${styles.guide}`}>
        <span className={styles.guideIcon}>
          <Map aria-hidden="true" size={20} strokeWidth={1.7} />
        </span>
        <div>
          <strong>사용자가 느낀 설명 적합도를 모읍니다</strong>
          <p>
            {traitMapFeedbackAnalysisPolicy.minimumResponses}개 이상 모이고,
            다르다는 응답이{" "}
            {traitMapFeedbackAnalysisPolicy.reviewDifferenceRate * 100}% 이상인
            섹션을 우선 검토합니다.
          </p>
        </div>
      </section>

      <section className={shared.panel}>
        <div className={shared.panelHeader}>
          <h2>성향지도 검토 대기열</h2>
          <span>차이 응답 순</span>
        </div>
        {data.length === 0 ? (
          <div className={shared.empty}>
            <strong>아직 저장된 피드백이 없습니다</strong>
            <p>사용자가 자신의 성향지도에서 답하면 자동으로 집계됩니다.</p>
          </div>
        ) : (
          <div className={styles.queue}>
            {data.slice(0, 100).map((metric) => (
              <article
                className={styles.row}
                key={`${metric.guideVersion}-${metric.chapterId}-${metric.sectionKey}`}
              >
                <header>
                  <div>
                    <strong>{metric.sectionTitle}</strong>
                    <span>
                      {metric.profileCode} · {metric.chapterId} ·{" "}
                      {metric.totalCount}명
                    </span>
                  </div>
                  <em
                    className={shared.status}
                    data-tone={itemStatus(metric.recommendationStatus).tone}
                  >
                    {itemStatus(metric.recommendationStatus).label}
                  </em>
                </header>
                <div className={styles.fitBar} aria-hidden="true">
                  <span style={{ width: `${metric.closeRate * 100}%` }} />
                </div>
                <div className={styles.fitValues}>
                  <span>비슷해요 {Math.round(metric.closeRate * 100)}%</span>
                  <span>달라요 {Math.round(metric.differenceRate * 100)}%</span>
                </div>
                <AdminResearchDecisionActions
                  available={decisionStoreAvailable}
                  current={decisions.find(
                    (decision) =>
                      decision.key === traitMapDecisionKey(metric),
                  )}
                  identity={{
                    chapterId: metric.chapterId,
                    guideVersion: metric.guideVersion,
                    profileCode: metric.profileCode,
                    sectionKey: metric.sectionKey,
                  }}
                  scope="trait_map_section"
                />
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function Metric({
  hint,
  label,
  value,
}: {
  hint: string;
  label: string;
  value?: number;
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{Math.round((value ?? 0) * 100)}%</dd>
      <small>{hint}</small>
    </div>
  );
}

function Unavailable({ label }: { label: string }) {
  return (
    <section className={shared.error}>
      <strong>{label}를 불러오지 못했습니다</strong>
      <p>Supabase 마이그레이션과 서버 연결 상태를 확인해 주세요.</p>
    </section>
  );
}

function itemStatus(
  status: "insufficient_data" | "monitor" | "review_required",
) {
  if (status === "review_required") {
    return { label: "검토 필요", tone: "danger" } as const;
  }
  if (status === "monitor") {
    return { label: "관찰 유지", tone: "success" } as const;
  }
  return { label: "표본 더 필요", tone: "warning" } as const;
}

function sourceLabel(source: GateCReviewQueueRow["sourceKind"]) {
  return (
    {
      candidate: "새 후보 문항",
      full_current: "정밀 코어 검사",
      legacy_fixed: "기존 검증 문항",
      quick_current: "빠른 코어 검사",
    }[source] ?? "문항"
  );
}

function recommendationCopy(row: GateCReviewQueueRow) {
  if (row.recommendationStatus === "review_required") {
    const primaryReason = row.reasonCodes[0]
      ? reasonLabel(row.reasonCodes[0])
      : "응답 신호";
    return {
      description: `${primaryReason} 수치가 높습니다. 질문의 상황과 표현을 우선 살펴보세요.`,
      title: "문구와 응답 과정을 검토해 주세요",
    };
  }
  if (row.recommendationStatus === "insufficient_data") {
    return {
      description:
        "아직 결론을 내리기 이릅니다. 문항을 유지하며 응답을 더 모아주세요.",
      title: "현재 문항을 유지해 주세요",
    };
  }
  return {
    description:
      "현재까지 큰 위험 신호가 없습니다. 새 응답이 쌓이는지만 지켜보면 됩니다.",
    title: "지금은 별도 조치가 필요하지 않아요",
  };
}

function domainLabel(domainId: string) {
  return (
    {
      ER: "걱정과 감정 반응",
      OE: "생각과 탐색",
      RO: "관계에서 관심이 가는 곳",
      SE: "사람 사이 에너지",
      SM: "일상을 꾸리는 방식",
    }[domainId] ?? domainId
  );
}

function facetLabel(facetId: string | null) {
  if (!facetId) return "연결된 정보 없음";
  return (
    {
      "ER-IR": "감정 동요",
      "ER-WD": "걱정과 주저",
      "OE-AE": "감각과 인상",
      "OE-CI": "상상 확장",
      "OE-IE": "지적 탐색",
      "RO-EC": "감정과 원인 중 먼저 향하는 관심",
      "RO-RN": "관계 맥락",
      "SE-AI": "먼저 표현하기",
      "SE-RE": "함께할 때의 에너지",
      "SM-EP": "실행과 지속",
      "SM-OS": "질서와 구조",
      "SM-RL": "생활 리듬",
    }[facetId] ?? facetId
  );
}

function humanizeResearchSet(candidateSetId: string) {
  if (candidateSetId.includes("CANDIDATE-BANK")) return "전체 후보 문항 연구";
  if (candidateSetId.includes("QUICK-FULL-CANDIDATE")) {
    return "빠른·정밀·후보 통합 연구";
  }
  if (candidateSetId.includes("GATE-C")) return "문항 이해도 연구";
  if (candidateSetId.includes("BETA")) return "정밀 코어 기준 문항 연구";
  return "검사 문항 연구";
}

function reasonLabel(code: string) {
  return (
    {
      COMPREHENSION_REVIEW: "뜻 이해 점검",
      EXPERIENCE_COVERAGE_REVIEW: "경험 범위 점검",
      NEED_MORE_RESPONSES: "응답 더 필요",
      RESPONSE_PROCESS_REVIEW: "응답 과정 점검",
      WORDING_REVIEW: "문구 점검",
    }[code] ?? "추가 점검"
  );
}

function formatCount(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("ko-KR");
}

function formatDateTime(value: string | null) {
  if (!value) return "전";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}
