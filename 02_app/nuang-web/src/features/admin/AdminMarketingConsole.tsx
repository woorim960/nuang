"use client";

import {
  Activity,
  AlertTriangle,
  Ban,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Database,
  Edit3,
  MailCheck,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Server,
  ShieldCheck,
  TestTube2,
  Webhook,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type {
  AdminMarketingCampaign,
  AdminMarketingDashboard,
} from "./admin-marketing-contract";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import styles from "./AdminMarketingConsole.module.css";

type ComposerState = {
  body: string;
  campaignId: string | null;
  ctaLabel: string;
  ctaUrl: string;
  eyebrow: string;
  heading: string;
  internalName: string;
  subject: string;
};

type PendingAction = {
  action: "approve" | "cancel" | "pause" | "queue" | "resume";
  campaign: AdminMarketingCampaign;
} | null;

const emptyComposer: ComposerState = {
  body: "",
  campaignId: null,
  ctaLabel: "",
  ctaUrl: "",
  eyebrow: "NUANG NEWS",
  heading: "",
  internalName: "",
  subject: "",
};

const statusLabels: Record<AdminMarketingCampaign["status"], string> = {
  approved: "승인 완료",
  cancelled: "취소",
  completed: "발송 완료",
  draft: "작성 중",
  failed: "확인 필요",
  paused: "일시중지",
  queued: "발송 대기",
  sending: "발송 중",
};

export function AdminMarketingConsole({
  adminEmail,
  data,
}: {
  adminEmail: string;
  data: AdminMarketingDashboard;
}) {
  const router = useRouter();
  const [composer, setComposer] = useState<ComposerState>(emptyComposer);
  const [scheduleByCampaign, setScheduleByCampaign] = useState<
    Record<string, string>
  >({});
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [campaignQuery, setCampaignQuery] = useState("");
  const [operationReason, setOperationReason] = useState("");
  const [renderedPreview, setRenderedPreview] = useState<{
    contentKey: string;
    html: string;
    subject: string;
    text: string;
  } | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "mobile",
  );
  const preview = useMemo(() => normalizePreview(composer), [composer]);
  const previewContentKey = previewKey(composer);
  const filteredCampaigns = useMemo(() => {
    const query = campaignQuery.trim().toLocaleLowerCase("ko-KR");
    if (!query) return data.campaigns;
    return data.campaigns.filter((campaign) =>
      `${campaign.internalName} ${campaign.subject} ${statusLabels[campaign.status]}`
        .toLocaleLowerCase("ko-KR")
        .includes(query),
    );
  }, [campaignQuery, data.campaigns]);

  useEffect(() => {
    if (!isDirty(composer)) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [composer]);

  async function saveCampaign(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await apiRequest("PUT", {
      body: composer.body,
      campaignId: composer.campaignId,
      ctaLabel: composer.ctaLabel.trim() || null,
      ctaUrl: composer.ctaUrl.trim() || null,
      eyebrow: composer.eyebrow,
      heading: composer.heading,
      internalName: composer.internalName,
      subject: composer.subject,
    });
    finishRequest(result, "캠페인 초안을 저장했어요.");
    if (result.ok && result.campaignId) {
      setComposer((current) => ({
        ...current,
        campaignId: result.campaignId ?? current.campaignId,
      }));
    }
  }

  async function sendTest() {
    if (!composer.campaignId) {
      setError(true);
      setMessage("먼저 초안을 저장한 뒤 저장된 내용으로 테스트해 주세요.");
      return;
    }
    setPending(true);
    setMessage("");
    const result = await apiRequest("PATCH", {
      campaignId: composer.campaignId,
      testRecipient: adminEmail,
    });
    finishRequest(result, `${adminEmail}로 테스트 메일을 보냈어요.`);
  }

  async function renderActualPreview() {
    setPending(true);
    setMessage("");
    const result = await previewRequest({
      body: composer.body,
      ctaLabel: composer.ctaLabel.trim() || null,
      ctaUrl: composer.ctaUrl.trim() || null,
      eyebrow: composer.eyebrow,
      heading: composer.heading,
      subject: composer.subject,
    });
    setPending(false);
    if (!result.ok || !result.html || !result.subject || !result.text) {
      setError(true);
      setMessage(result.message || "실제 미리보기를 만들지 못했습니다.");
      return;
    }
    setRenderedPreview({
      contentKey: previewContentKey,
      html: result.html,
      subject: result.subject,
      text: result.text,
    });
  }

  async function runAction() {
    if (!pendingAction) return;
    setPending(true);
    const action = pendingAction.action;
    const result = await apiRequest("POST", {
      action,
      campaignId: pendingAction.campaign.campaignId,
      scheduledAt:
        action === "queue" &&
        scheduleByCampaign[pendingAction.campaign.campaignId]
          ? new Date(
              scheduleByCampaign[pendingAction.campaign.campaignId],
            ).toISOString()
          : null,
    });
    finishRequest(result, actionSuccessMessage(action));
    if (result.ok) {
      setPendingAction(null);
      setScheduleByCampaign((current) => {
        const next = { ...current };
        if (pendingAction) delete next[pendingAction.campaign.campaignId];
        return next;
      });
    }
  }

  function finishRequest(
    result: { campaignId?: string; message?: string; ok: boolean },
    success: string,
  ) {
    setPending(false);
    setError(!result.ok);
    setMessage(result.ok ? success : result.message || "처리하지 못했어요.");
    if (result.ok) router.refresh();
  }

  function editCampaign(campaign: AdminMarketingCampaign) {
    setComposer({
      body: campaign.body,
      campaignId: campaign.campaignId,
      ctaLabel: campaign.ctaLabel ?? "",
      ctaUrl: campaign.ctaUrl ?? "",
      eyebrow: campaign.eyebrow,
      heading: campaign.heading,
      internalName: campaign.internalName,
      subject: campaign.subject,
    });
    document.getElementById("marketing-composer")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function runOperation(
    body:
      | { action: "drain_now"; reason: string }
      | {
          action: "retry_failed";
          campaignId: string;
          reason: string;
        }
      | { action: "set_emergency_pause"; paused: boolean; reason: string },
    success: string,
  ) {
    if (body.reason.trim().length < 5) {
      setError(true);
      setMessage("운영 기록에 남길 사유를 5자 이상 입력해 주세요.");
      return;
    }
    setPending(true);
    setMessage("");
    const result = await operationsRequest(body);
    finishRequest(result, success);
    if (result.ok) setOperationReason("");
  }

  const deliveryReady =
    data.readiness.ready &&
    data.audienceAvailable &&
    !data.operations.channelControl.paused;

  if (!data.databaseAvailable) {
    return (
      <section className={styles.unavailable}>
        <AlertTriangle aria-hidden="true" size={22} />
        <div>
          <strong>마케팅 이메일 데이터 연결이 필요합니다</strong>
          <p>
            202608030004 운영 제어 마이그레이션까지 적용하면 검증된 테스트, 긴급
            중지, 실패 복구와 발송 상태 진단이 열립니다. 적용 전에는 실제 메일이
            발송되지 않습니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={styles.readiness} data-ready={deliveryReady}>
        <div className={styles.readinessTitle}>
          {deliveryReady ? (
            <CheckCircle2 aria-hidden="true" size={20} />
          ) : (
            <ShieldCheck aria-hidden="true" size={20} />
          )}
          <div>
            <strong>
              {deliveryReady
                ? "이메일 발송 준비와 운영 제어가 정상입니다"
                : data.operations.channelControl.paused
                  ? "운영자가 이메일 송출을 긴급 중지했습니다"
                  : "실제 발송은 안전하게 잠겨 있습니다"}
            </strong>
            <p>
              초안과 실제 렌더 미리보기는 언제든 사용할 수 있습니다. 대상 확정과
              재개는 모든 Gate가 정상일 때만 열립니다.
            </p>
          </div>
        </div>
        <div className={styles.checks}>
          {data.readiness.checks.map((check) => (
            <span data-ok={check.ok} key={check.key}>
              {check.ok ? "완료" : "확인"} · {check.label}
            </span>
          ))}
        </div>
      </section>

      <section
        className={styles.controlPlane}
        data-paused={data.operations.channelControl.paused}
      >
        <div className={styles.controlSummary}>
          <span>
            {data.operations.channelControl.paused ? (
              <Ban aria-hidden="true" size={19} />
            ) : (
              <Activity aria-hidden="true" size={19} />
            )}
          </span>
          <div>
            <strong>
              {data.operations.channelControl.paused
                ? "전체 마케팅 이메일 중지"
                : "DB 긴급 제어 정상"}
            </strong>
            <p>
              {data.operations.channelControl.reason ??
                "환경 Gate와 캠페인 상태가 허용한 메일만 처리합니다."}
            </p>
          </div>
        </div>
        <label className={styles.controlReason}>
          <span>변경 사유</span>
          <input
            maxLength={500}
            onChange={(event) => setOperationReason(event.target.value)}
            placeholder="장애·점검·재개 사유를 기록해 주세요"
            value={operationReason}
          />
        </label>
        <div className={styles.controlActions}>
          <button
            disabled={pending || operationReason.trim().length < 5}
            onClick={() =>
              void runOperation(
                { action: "drain_now", reason: operationReason },
                "안전 Gate 안에서 대기열 진단과 수동 처리를 실행했습니다.",
              )
            }
            type="button"
          >
            <RefreshCw aria-hidden="true" size={15} />
            진단 실행
          </button>
          <button
            data-danger={!data.operations.channelControl.paused}
            disabled={pending || operationReason.trim().length < 5}
            onClick={() =>
              void runOperation(
                {
                  action: "set_emergency_pause",
                  paused: !data.operations.channelControl.paused,
                  reason: operationReason,
                },
                data.operations.channelControl.paused
                  ? "DB 긴급 중지를 해제했습니다. 환경 Gate는 별도로 유지됩니다."
                  : "새로운 이메일 발송을 즉시 중지했습니다.",
              )
            }
            type="button"
          >
            {data.operations.channelControl.paused
              ? "점검 후 재개"
              : "긴급 중지"}
          </button>
        </div>
      </section>

      <OperationsHealth data={data} />

      <section aria-label="마케팅 이메일 현황" className={styles.metricGrid}>
        <Metric
          icon={MailCheck}
          label="현재 발송 가능"
          value={data.audienceAvailable ? data.audienceCount : "연결 확인"}
          unit={data.audienceAvailable ? "명" : ""}
        />
        <Metric
          icon={Clock3}
          label="대기·전달 지연"
          value={data.totals.queued + data.totals.retry + data.totals.delayed}
          unit="건"
        />
        <Metric
          icon={CheckCircle2}
          label="전달 확인"
          value={data.totals.delivered}
          unit="건"
        />
        <Metric
          icon={AlertTriangle}
          label="반송·신고"
          value={data.totals.bounced + data.totals.complained}
          unit="건"
          warning
        />
      </section>

      {message ? (
        <div
          className={styles.message}
          data-error={error}
          role={error ? "alert" : "status"}
        >
          {message}
        </div>
      ) : null}

      <section className={styles.workspace}>
        <form
          className={styles.composer}
          id="marketing-composer"
          onSubmit={saveCampaign}
        >
          <header>
            <div>
              <p>STRUCTURED CAMPAIGN</p>
              <h2>
                {composer.campaignId ? "캠페인 수정" : "새 이메일 캠페인"}
              </h2>
            </div>
            {composer.campaignId ? (
              <button
                className={styles.textButton}
                onClick={() => setComposer(emptyComposer)}
                type="button"
              >
                새 초안
              </button>
            ) : null}
          </header>
          <Field label="운영용 이름" hint="회원에게 보이지 않습니다">
            <input
              required
              maxLength={100}
              value={composer.internalName}
              onChange={(event) =>
                setComposer({ ...composer, internalName: event.target.value })
              }
            />
          </Field>
          <Field label="이메일 제목" hint="(광고)는 발송 시 자동으로 붙습니다">
            <input
              required
              maxLength={90}
              value={composer.subject}
              onChange={(event) =>
                setComposer({ ...composer, subject: event.target.value })
              }
            />
          </Field>
          <div className={styles.twoColumns}>
            <Field label="상단 짧은 문구">
              <input
                required
                maxLength={50}
                value={composer.eyebrow}
                onChange={(event) =>
                  setComposer({ ...composer, eyebrow: event.target.value })
                }
              />
            </Field>
            <Field label="본문 제목">
              <input
                required
                maxLength={100}
                value={composer.heading}
                onChange={(event) =>
                  setComposer({ ...composer, heading: event.target.value })
                }
              />
            </Field>
          </div>
          <Field label="본문" hint="일반 텍스트와 줄바꿈만 사용합니다">
            <textarea
              required
              minLength={10}
              maxLength={4000}
              rows={8}
              value={composer.body}
              onChange={(event) =>
                setComposer({ ...composer, body: event.target.value })
              }
            />
          </Field>
          <div className={styles.twoColumns}>
            <Field label="버튼 문구" hint="선택">
              <input
                maxLength={40}
                value={composer.ctaLabel}
                onChange={(event) =>
                  setComposer({ ...composer, ctaLabel: event.target.value })
                }
              />
            </Field>
            <Field label="버튼 주소" hint="nuang.app 주소만 허용">
              <input
                inputMode="url"
                placeholder="https://nuang.app/..."
                value={composer.ctaUrl}
                onChange={(event) =>
                  setComposer({ ...composer, ctaUrl: event.target.value })
                }
              />
            </Field>
          </div>
          <div className={styles.formActions}>
            <button
              className={styles.secondaryButton}
              disabled={pending || !isTestReady(composer)}
              onClick={() => void renderActualPreview()}
              type="button"
            >
              <ClipboardCheck aria-hidden="true" size={16} />
              실제 렌더 확인
            </button>
            <button
              className={styles.secondaryButton}
              disabled={
                pending || !isTestReady(composer) || !composer.campaignId
              }
              onClick={() => void sendTest()}
              type="button"
            >
              <TestTube2 aria-hidden="true" size={16} />
              운영자 테스트
            </button>
            <button
              className={styles.primaryButton}
              disabled={pending}
              type="submit"
            >
              <Save aria-hidden="true" size={16} />
              초안 저장
            </button>
          </div>
          <p className={styles.formFootnote}>
            저장된 정확한 버전으로 테스트한 뒤에만 승인이 열립니다. 내용을
            수정하면 테스트 기록이 자동으로 무효화됩니다.
          </p>
        </form>

        <aside className={styles.preview}>
          <header>
            <span>실제 발송 템플릿</span>
            <div className={styles.previewModes}>
              <button
                data-active={previewMode === "mobile"}
                onClick={() => setPreviewMode("mobile")}
                type="button"
              >
                모바일
              </button>
              <button
                data-active={previewMode === "desktop"}
                onClick={() => setPreviewMode("desktop")}
                type="button"
              >
                데스크톱
              </button>
            </div>
          </header>
          {renderedPreview?.contentKey === previewContentKey ? (
            <>
              <div className={styles.inboxLine}>
                <strong>뉴앙</strong>
                <span>{renderedPreview.subject}</span>
              </div>
              <div className={styles.previewFrameWrap} data-mode={previewMode}>
                <iframe
                  sandbox=""
                  srcDoc={renderedPreview.html}
                  title="실제 마케팅 이메일 HTML 미리보기"
                />
              </div>
              <details className={styles.textPreview}>
                <summary>텍스트 메일도 확인</summary>
                <pre>{renderedPreview.text}</pre>
              </details>
            </>
          ) : (
            <div className={styles.previewPlaceholder}>
              <Database aria-hidden="true" size={22} />
              <strong>{preview.subject}</strong>
              <p>
                내용을 입력한 뒤 ‘실제 렌더 확인’을 누르면 서버가 자동 표기와
                수신거부까지 포함한 동일한 HTML을 만들어 보여줍니다.
              </p>
            </div>
          )}
        </aside>
      </section>

      <section className={styles.campaignSection}>
        <header>
          <div>
            <p>DELIVERY OPERATIONS</p>
            <h2>캠페인 운영</h2>
          </div>
          <label className={styles.campaignSearch}>
            <span>캠페인 검색</span>
            <input
              onChange={(event) => setCampaignQuery(event.target.value)}
              placeholder="이름·제목·상태"
              value={campaignQuery}
            />
          </label>
        </header>
        {data.campaigns.length === 0 ? (
          <div className={styles.empty}>
            <Send aria-hidden="true" size={22} />
            <strong>아직 만든 캠페인이 없습니다</strong>
            <p>위에서 첫 초안을 만들고 운영자 테스트부터 확인해 주세요.</p>
          </div>
        ) : (
          <div className={styles.campaignList}>
            {filteredCampaigns.map((campaign) => (
              <article key={campaign.campaignId}>
                <div className={styles.campaignSummary}>
                  <div>
                    <span
                      className={styles.status}
                      data-status={campaign.status}
                    >
                      {statusLabels[campaign.status]}
                    </span>
                    <h3>{campaign.internalName}</h3>
                    <p>{campaign.subject}</p>
                    <small
                      className={styles.testProof}
                      data-ready={Boolean(campaign.lastTestedAt)}
                    >
                      {campaign.lastTestedAt
                        ? `현재 버전 테스트 ${testStatusLabel(campaign.currentTestStatus)} · ${formatDateTime(campaign.lastTestedAt)}`
                        : "현재 버전 테스트 필요"}
                    </small>
                  </div>
                  <time dateTime={campaign.updatedAt}>
                    {formatDateTime(campaign.updatedAt)}
                  </time>
                </div>
                <div className={styles.campaignCounts}>
                  <span>
                    대상 <strong>{campaign.audienceCount}</strong>
                  </span>
                  <span>
                    전달 <strong>{campaign.counts.delivered ?? 0}</strong>
                  </span>
                  <span>
                    발송{" "}
                    <strong>
                      {(campaign.counts.sent ?? 0) +
                        (campaign.counts.delivered ?? 0)}
                    </strong>
                  </span>
                  <span>
                    실패 <strong>{campaign.counts.failed ?? 0}</strong>
                  </span>
                  <span>
                    재시도 <strong>{campaign.counts.retry ?? 0}</strong>
                  </span>
                  <span>
                    차단·제외{" "}
                    <strong>
                      {(campaign.counts.suppressed ?? 0) +
                        (campaign.counts.skipped ?? 0) +
                        (campaign.counts.unsubscribed ?? 0)}
                    </strong>
                  </span>
                </div>
                <div className={styles.campaignActions}>
                  {campaign.status === "draft" ? (
                    <>
                      <button
                        onClick={() => editCampaign(campaign)}
                        type="button"
                      >
                        <Edit3 aria-hidden="true" size={15} />
                        수정
                      </button>
                      <button
                        data-primary
                        disabled={!campaign.lastTestedAt}
                        onClick={() =>
                          setPendingAction({ action: "approve", campaign })
                        }
                        type="button"
                      >
                        <ShieldCheck aria-hidden="true" size={15} />
                        {campaign.lastTestedAt ? "승인" : "테스트 필요"}
                      </button>
                    </>
                  ) : null}
                  {campaign.status === "approved" ? (
                    <>
                      <label className={styles.inlineSchedule}>
                        <span>예약 시각</span>
                        <input
                          aria-label="발송 예약 시각"
                          min={toLocalDateTime(new Date())}
                          onChange={(event) =>
                            setScheduleByCampaign((current) => ({
                              ...current,
                              [campaign.campaignId]: event.target.value,
                            }))
                          }
                          type="datetime-local"
                          value={scheduleByCampaign[campaign.campaignId] ?? ""}
                        />
                      </label>
                      <button
                        data-primary
                        disabled={!deliveryReady}
                        onClick={() =>
                          setPendingAction({ action: "queue", campaign })
                        }
                        type="button"
                      >
                        <Send aria-hidden="true" size={15} />
                        {scheduleByCampaign[campaign.campaignId]
                          ? "예약 확정"
                          : "바로 대기"}
                      </button>
                    </>
                  ) : null}
                  {["queued", "sending"].includes(campaign.status) ? (
                    <button
                      onClick={() =>
                        setPendingAction({ action: "pause", campaign })
                      }
                      type="button"
                    >
                      <Pause aria-hidden="true" size={15} />
                      일시중지
                    </button>
                  ) : null}
                  {campaign.status === "paused" ? (
                    <button
                      data-primary
                      disabled={!deliveryReady}
                      onClick={() =>
                        setPendingAction({ action: "resume", campaign })
                      }
                      type="button"
                    >
                      <Play aria-hidden="true" size={15} />
                      재개
                    </button>
                  ) : null}
                  {campaign.status === "failed" ? (
                    <button
                      data-primary
                      disabled={
                        pending ||
                        operationReason.trim().length < 5 ||
                        !deliveryReady
                      }
                      onClick={() =>
                        void runOperation(
                          {
                            action: "retry_failed",
                            campaignId: campaign.campaignId,
                            reason: operationReason,
                          },
                          "공급자 접수 기록이 없는 실패 건만 재시도 대기열에 넣었습니다.",
                        )
                      }
                      type="button"
                    >
                      <RotateCcw aria-hidden="true" size={15} />
                      실패 건 재시도
                    </button>
                  ) : null}
                  {!["completed", "cancelled"].includes(campaign.status) ? (
                    <button
                      data-danger
                      onClick={() =>
                        setPendingAction({ action: "cancel", campaign })
                      }
                      type="button"
                    >
                      <XCircle aria-hidden="true" size={15} />
                      취소
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {filteredCampaigns.length === 0 ? (
              <div className={styles.filterEmpty}>
                조건에 맞는 캠페인이 없습니다. 검색어를 지워 다시 확인해 주세요.
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className={styles.operationsDetail}>
        <div>
          <header>
            <p>DELIVERY SIGNALS</p>
            <h2>최근 전달 상태</h2>
          </header>
          {data.recentEvents.length ? (
            <ul>
              {data.recentEvents.slice(0, 12).map((event, index) => (
                <li key={`${event.eventType}-${event.occurredAt}-${index}`}>
                  <span data-event={event.eventType} />
                  <div>
                    <strong>{eventLabel(event.eventType)}</strong>
                    <time dateTime={event.occurredAt}>
                      {formatDateTime(event.occurredAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.detailEmpty}>
              첫 테스트 메일의 전달 이벤트를 기다리고 있습니다.
            </p>
          )}
        </div>
        <div>
          <header>
            <p>AUDITED CHANGES</p>
            <h2>최근 운영 기록</h2>
          </header>
          {data.recentOperations.length ? (
            <ul>
              {data.recentOperations.slice(0, 12).map((operation, index) => (
                <li key={`${operation.action}-${operation.createdAt}-${index}`}>
                  <span />
                  <div>
                    <strong>{operationLabel(operation.action)}</strong>
                    <time dateTime={operation.createdAt}>
                      {formatDateTime(operation.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.detailEmpty}>
              아직 기록된 캠페인 작업이 없습니다.
            </p>
          )}
        </div>
        <div className={styles.runbook}>
          <header>
            <p>OPERATOR RUNBOOK</p>
            <h2>문제가 생겼을 때</h2>
          </header>
          <ol>
            <li>
              <strong>오발송 위험</strong>
              <span>
                상단 긴급 중지 → 영향 캠페인 일시중지 → 운영 기록 확인
              </span>
            </li>
            <li>
              <strong>Worker 5분 이상 지연</strong>
              <span>
                발송 Gate 확인 → 사유 입력 → 진단 실행 → 교착·실패 수 확인
              </span>
            </li>
            <li>
              <strong>반송·신고 증가</strong>
              <span>
                긴급 중지 → 공급자 위험 차단 수 확인 → 해당 캠페인 취소
              </span>
            </li>
            <li>
              <strong>일부 실패</strong>
              <span>공급자 접수 기록이 없는 실패만 사유를 남기고 재시도</span>
            </li>
            <li>
              <strong>수신거부 문의</strong>
              <span>
                동의 관리에서 현재 상태 확인 → 이메일 링크 재안내 → 임의 동의
                변경 금지
              </span>
            </li>
          </ol>
        </div>
      </section>

      <AdminConfirmDialog
        confirmLabel={
          pendingAction ? actionConfirmLabel(pendingAction.action) : "확인"
        }
        description={
          pendingAction
            ? actionDescription(
                pendingAction.action,
                pendingAction.action === "queue"
                  ? data.audienceCount
                  : pendingAction.campaign.audienceCount,
                pendingAction.action === "queue"
                  ? scheduleByCampaign[pendingAction.campaign.campaignId]
                  : undefined,
              )
            : ""
        }
        onCancel={() => !pending && setPendingAction(null)}
        onConfirm={() => void runAction()}
        open={pendingAction !== null}
        pending={pending}
        title={
          pendingAction ? pendingAction.campaign.internalName : "캠페인 확인"
        }
        tone={pendingAction?.action === "cancel" ? "danger" : "brand"}
      />
    </>
  );
}

function OperationsHealth({ data }: { data: AdminMarketingDashboard }) {
  const worker = data.operations.worker;
  const generatedAt = new Date(data.generatedAt).getTime();
  const workerHealthy =
    (worker.status === "succeeded" &&
      Boolean(worker.finishedAt) &&
      generatedAt - new Date(worker.finishedAt as string).getTime() <
        5 * 60_000) ||
    (!data.readiness.enabled && worker.status === "locked");
  const webhookHealthy =
    data.operations.webhook.unmatched24h === 0 &&
    Boolean(data.operations.webhook.lastReceivedAt);
  const queueHealthy =
    data.operations.queue.failed === 0 && data.operations.queue.stale === 0;

  return (
    <section aria-label="이메일 운영 상태" className={styles.operationsGrid}>
      <HealthCard
        detail={
          worker.finishedAt
            ? `마지막 완료 ${formatRelativeTime(worker.finishedAt, data.generatedAt)}`
            : "첫 실행 기록 대기"
        }
        icon={Server}
        label="Worker·Cron"
        ok={workerHealthy}
        value={worker.status ? workerStatusLabel(worker.status) : "기록 없음"}
      />
      <HealthCard
        detail={`교착 ${data.operations.queue.stale} · 재시도 ${data.operations.queue.retry}`}
        icon={Clock3}
        label="발송 대기열"
        ok={queueHealthy}
        value={`${data.operations.queue.queued + data.operations.queue.sending}건 처리 중`}
      />
      <HealthCard
        detail={
          data.operations.webhook.lastReceivedAt
            ? `마지막 수신 ${formatRelativeTime(data.operations.webhook.lastReceivedAt, data.generatedAt)}`
            : "테스트 전달 이벤트 대기"
        }
        icon={Webhook}
        label="Resend Webhook"
        ok={webhookHealthy}
        value={
          data.operations.webhook.unmatched24h > 0
            ? `미매칭 ${data.operations.webhook.unmatched24h}건`
            : "미매칭 없음"
        }
      />
      <HealthCard
        detail={`30일 내 예정 ${data.operations.confirmations.dueWithin30Days} · 실패 ${data.operations.confirmations.failed}`}
        icon={ClipboardCheck}
        label="2년 동의 확인"
        ok={data.operations.confirmations.failed === 0}
        value={`${data.operations.confirmations.sent}건 발송·전달`}
      />
      <HealthCard
        detail={`사용자 철회 ${data.operations.suppressions.memberUnsubscribed}`}
        icon={ShieldCheck}
        label="수신 차단"
        ok
        value={`공급자 위험 ${data.operations.suppressions.providerRisk}건`}
      />
      <HealthCard
        detail={`최근 상태 이벤트 ${data.recentEvents.length}건`}
        icon={Activity}
        label="데이터 기준"
        ok={data.audienceAvailable}
        value={formatDateTime(data.generatedAt)}
      />
    </section>
  );
}

function HealthCard({
  detail,
  icon: Icon,
  label,
  ok,
  value,
}: {
  detail: string;
  icon: typeof Activity;
  label: string;
  ok: boolean;
  value: string;
}) {
  return (
    <article className={styles.healthCard} data-ok={ok}>
      <div>
        <Icon aria-hidden="true" size={17} />
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

function Field({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <label className={styles.field}>
      <span>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </span>
      {children}
    </label>
  );
}

function Metric({
  icon: Icon,
  label,
  unit,
  value,
  warning = false,
}: {
  icon: typeof MailCheck;
  label: string;
  unit: string;
  value: number | string;
  warning?: boolean;
}) {
  return (
    <article className={styles.metric} data-warning={warning}>
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
      <strong>
        {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
        <small>{unit}</small>
      </strong>
    </article>
  );
}

async function apiRequest(method: "PATCH" | "POST" | "PUT", body: unknown) {
  const response = await fetch("/api/admin/marketing/campaigns", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method,
  }).catch(() => null);
  const payload = (await response?.json().catch(() => null)) as {
    data?: { campaignId?: unknown };
    message?: unknown;
    ok?: unknown;
  } | null;
  return {
    campaignId:
      typeof payload?.data?.campaignId === "string"
        ? payload.data.campaignId
        : undefined,
    message: typeof payload?.message === "string" ? payload.message : undefined,
    ok: Boolean(response?.ok && payload?.ok === true),
  };
}

async function operationsRequest(body: unknown) {
  const response = await fetch("/api/admin/marketing/operations", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  }).catch(() => null);
  const payload = (await response?.json().catch(() => null)) as {
    message?: unknown;
    ok?: unknown;
  } | null;
  return {
    message: typeof payload?.message === "string" ? payload.message : undefined,
    ok: Boolean(response?.ok && payload?.ok !== false),
  };
}

async function previewRequest(body: unknown) {
  const response = await fetch("/api/admin/marketing/preview", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  }).catch(() => null);
  const payload = (await response?.json().catch(() => null)) as {
    html?: unknown;
    message?: unknown;
    ok?: unknown;
    subject?: unknown;
    text?: unknown;
  } | null;
  return {
    html: typeof payload?.html === "string" ? payload.html : undefined,
    message: typeof payload?.message === "string" ? payload.message : undefined,
    ok: Boolean(response?.ok && payload?.ok === true),
    subject: typeof payload?.subject === "string" ? payload.subject : undefined,
    text: typeof payload?.text === "string" ? payload.text : undefined,
  };
}

function normalizePreview(composer: ComposerState) {
  return {
    body:
      composer.body ||
      "본문을 입력하면 실제 이메일의 흐름을 바로 확인할 수 있습니다.",
    ctaLabel: composer.ctaLabel,
    eyebrow: composer.eyebrow || "NUANG NEWS",
    heading: composer.heading || "이메일 본문 제목",
    subject: `(광고) ${composer.subject || "이메일 제목"}`,
  };
}

function previewKey(composer: ComposerState) {
  return JSON.stringify([
    composer.body,
    composer.ctaLabel,
    composer.ctaUrl,
    composer.eyebrow,
    composer.heading,
    composer.subject,
  ]);
}

function isTestReady(value: ComposerState) {
  return (
    value.subject.trim().length >= 2 &&
    value.heading.trim().length >= 2 &&
    value.body.trim().length >= 10
  );
}

function isDirty(value: ComposerState) {
  return Boolean(
    value.campaignId ||
    value.internalName.trim() ||
    value.subject.trim() ||
    value.heading.trim() ||
    value.body.trim() ||
    value.ctaLabel.trim() ||
    value.ctaUrl.trim(),
  );
}

function actionConfirmLabel(action: NonNullable<PendingAction>["action"]) {
  return {
    approve: "검토 승인",
    cancel: "캠페인 취소",
    pause: "발송 중지",
    queue: "대상 확정",
    resume: "발송 재개",
  }[action];
}

function actionDescription(
  action: NonNullable<PendingAction>["action"],
  count: number,
  scheduledAt?: string,
) {
  return {
    approve:
      "내용과 미리보기를 확인했다는 기록을 남깁니다. 승인 뒤 내용을 수정하면 다시 검토해야 합니다.",
    cancel:
      "아직 발송되지 않은 대상은 취소됩니다. 이미 Resend에 접수된 메일은 회수할 수 없습니다.",
    pause:
      "새로운 발송 처리를 중지합니다. 이미 접수된 메일은 계속 전달될 수 있습니다.",
    queue: scheduledAt
      ? `최신 동의·인증 상태를 다시 확인해 ${count.toLocaleString("ko-KR")}명에게 ${formatDateTime(new Date(scheduledAt).toISOString())} 예약 발송을 준비합니다.`
      : `최신 동의·인증 상태를 다시 확인해 현재 예상 ${count.toLocaleString("ko-KR")}명을 발송 대기열에 등록합니다.`,
    resume:
      "중지된 대기열의 발송을 다시 시작합니다. 발송 직전에 대상 자격을 다시 확인합니다.",
  }[action];
}

function actionSuccessMessage(action: NonNullable<PendingAction>["action"]) {
  return {
    approve: "캠페인을 승인했어요.",
    cancel: "캠페인을 취소했어요.",
    pause: "새 발송을 일시중지했어요.",
    queue: "대상을 확정하고 발송 대기열에 넣었어요.",
    resume: "캠페인 발송을 재개했어요.",
  }[action];
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function toLocalDateTime(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatRelativeTime(value: string, reference: string) {
  const milliseconds =
    new Date(reference).getTime() - new Date(value).getTime();
  if (!Number.isFinite(milliseconds)) return "시각 확인 필요";
  const minutes = Math.max(0, Math.floor(milliseconds / 60_000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}시간 전` : formatDateTime(value);
}

function testStatusLabel(value: string | null) {
  return (
    {
      bounced: "반송",
      complained: "신고",
      delivered: "전달 확인",
      delivery_delayed: "전달 지연",
      failed: "실패",
      sent: "발송 확인",
      suppressed: "차단",
    }[value ?? ""] ?? "발송 확인"
  );
}

function workerStatusLabel(value: string) {
  return (
    {
      degraded: "일부 확인 필요",
      failed: "실행 실패",
      locked: "발송 잠금",
      running: "처리 중",
      succeeded: "정상 완료",
    }[value] ?? value
  );
}

function eventLabel(value: string) {
  return (
    {
      "email.bounced": "영구 반송",
      "email.complained": "스팸 신고",
      "email.delivered": "메일 서버 전달",
      "email.delivery_delayed": "전달 지연",
      "email.failed": "공급자 발송 실패",
      "email.sent": "공급자 접수",
      "email.suppressed": "공급자 차단",
    }[value] ?? value
  );
}

function operationLabel(value: string) {
  return (
    {
      marketing_campaign_approve: "캠페인 승인",
      marketing_campaign_cancel: "캠페인 취소",
      marketing_campaign_created: "캠페인 생성",
      marketing_campaign_failures_requeued: "실패 건 재시도",
      marketing_campaign_pause: "캠페인 일시중지",
      marketing_campaign_queue: "대상 확정·예약",
      marketing_campaign_resume: "캠페인 재개",
      marketing_campaign_test_sent: "저장 버전 테스트",
      marketing_campaign_updated: "캠페인 수정",
      marketing_channel_emergency_paused: "전체 이메일 긴급 중지",
      marketing_channel_emergency_resumed: "전체 이메일 재개",
      marketing_worker_manual_drain_requested: "수동 진단 실행",
    }[value] ?? value.replaceAll("_", " ")
  );
}
