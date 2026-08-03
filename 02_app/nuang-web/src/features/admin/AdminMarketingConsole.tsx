"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Edit3,
  MailCheck,
  Pause,
  Play,
  Save,
  Send,
  ShieldCheck,
  TestTube2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
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
  const [scheduledAt, setScheduledAt] = useState("");
  const [pending, setPending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const preview = useMemo(() => normalizePreview(composer), [composer]);

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
    if (result.ok) setComposer(emptyComposer);
  }

  async function sendTest() {
    setPending(true);
    setMessage("");
    const result = await apiRequest("PATCH", {
      body: composer.body,
      ctaLabel: composer.ctaLabel.trim() || null,
      ctaUrl: composer.ctaUrl.trim() || null,
      eyebrow: composer.eyebrow,
      heading: composer.heading,
      subject: composer.subject,
      testRecipient: adminEmail,
    });
    finishRequest(result, `${adminEmail}로 테스트 메일을 보냈어요.`);
  }

  async function runAction() {
    if (!pendingAction) return;
    setPending(true);
    const action = pendingAction.action;
    const result = await apiRequest("POST", {
      action,
      campaignId: pendingAction.campaign.campaignId,
      scheduledAt:
        action === "queue" && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
    });
    finishRequest(result, actionSuccessMessage(action));
    if (result.ok) {
      setPendingAction(null);
      setScheduledAt("");
    }
  }

  function finishRequest(
    result: { message?: string; ok: boolean },
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

  if (!data.databaseAvailable) {
    return (
      <section className={styles.unavailable}>
        <AlertTriangle aria-hidden="true" size={22} />
        <div>
          <strong>마케팅 이메일 데이터 연결이 필요합니다</strong>
          <p>
            202608030003 마이그레이션을 적용하면 캠페인 작성과 발송 현황이
            열립니다. 적용 전에는 실제 메일이 발송되지 않습니다.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={styles.readiness} data-ready={data.readiness.ready}>
        <div className={styles.readinessTitle}>
          {data.readiness.ready ? (
            <CheckCircle2 aria-hidden="true" size={20} />
          ) : (
            <ShieldCheck aria-hidden="true" size={20} />
          )}
          <div>
            <strong>
              {data.readiness.ready
                ? "이메일 발송 준비가 완료됐습니다"
                : "실제 발송은 안전하게 잠겨 있습니다"}
            </strong>
            <p>
              초안과 테스트는 사용할 수 있고, 모든 Gate가 준비된 뒤 실제 발송을
              엽니다.
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

      <section aria-label="마케팅 이메일 현황" className={styles.metricGrid}>
        <Metric
          icon={MailCheck}
          label="현재 발송 가능"
          value={data.audienceCount}
          unit="명"
        />
        <Metric
          icon={Clock3}
          label="발송 대기"
          value={data.totals.queued}
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
        </form>

        <aside className={styles.preview}>
          <header>
            <span>받은편지함 미리보기</span>
            <small>실제 법정 표기는 서버가 자동 추가</small>
          </header>
          <div className={styles.inboxLine}>
            <strong>뉴앙</strong>
            <span>{preview.subject}</span>
          </div>
          <article>
            <p>{preview.eyebrow}</p>
            <h3>{preview.heading}</h3>
            <div>{preview.body}</div>
            {preview.ctaLabel ? (
              <span className={styles.previewCta}>{preview.ctaLabel}</span>
            ) : null}
          </article>
          <footer>
            발신자·문의 연락처·로그인 없는 수신거부 링크와 이메일 수신거부
            헤더가 자동으로 포함됩니다.
          </footer>
        </aside>
      </section>

      <section className={styles.campaignSection}>
        <header>
          <div>
            <p>DELIVERY OPERATIONS</p>
            <h2>캠페인 운영</h2>
          </div>
          <span>{data.campaigns.length}개</span>
        </header>
        {data.campaigns.length === 0 ? (
          <div className={styles.empty}>
            <Send aria-hidden="true" size={22} />
            <strong>아직 만든 캠페인이 없습니다</strong>
            <p>위에서 첫 초안을 만들고 운영자 테스트부터 확인해 주세요.</p>
          </div>
        ) : (
          <div className={styles.campaignList}>
            {data.campaigns.map((campaign) => (
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
                        onClick={() =>
                          setPendingAction({ action: "approve", campaign })
                        }
                        type="button"
                      >
                        <ShieldCheck aria-hidden="true" size={15} />
                        승인
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
                            setScheduledAt(event.target.value)
                          }
                          type="datetime-local"
                          value={scheduledAt}
                        />
                      </label>
                      <button
                        data-primary
                        onClick={() =>
                          setPendingAction({ action: "queue", campaign })
                        }
                        type="button"
                      >
                        <Send aria-hidden="true" size={15} />
                        {scheduledAt ? "예약 확정" : "바로 대기"}
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
                      onClick={() =>
                        setPendingAction({ action: "resume", campaign })
                      }
                      type="button"
                    >
                      <Play aria-hidden="true" size={15} />
                      재개
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
          </div>
        )}
      </section>

      <AdminConfirmDialog
        confirmLabel={
          pendingAction ? actionConfirmLabel(pendingAction.action) : "확인"
        }
        description={
          pendingAction
            ? actionDescription(
                pendingAction.action,
                pendingAction.campaign.audienceCount,
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
  value: number;
  warning?: boolean;
}) {
  return (
    <article className={styles.metric} data-warning={warning}>
      <Icon aria-hidden="true" size={18} />
      <span>{label}</span>
      <strong>
        {value.toLocaleString("ko-KR")}
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
    message?: unknown;
    ok?: unknown;
  } | null;
  return {
    message: typeof payload?.message === "string" ? payload.message : undefined,
    ok: Boolean(response?.ok && payload?.ok === true),
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

function isTestReady(value: ComposerState) {
  return (
    value.subject.trim().length >= 2 &&
    value.heading.trim().length >= 2 &&
    value.body.trim().length >= 10
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
) {
  return {
    approve:
      "내용과 미리보기를 확인했다는 기록을 남깁니다. 승인 뒤 내용을 수정하면 다시 검토해야 합니다.",
    cancel:
      "아직 발송되지 않은 대상은 취소됩니다. 이미 Resend에 접수된 메일은 회수할 수 없습니다.",
    pause:
      "새로운 발송 처리를 중지합니다. 이미 접수된 메일은 계속 전달될 수 있습니다.",
    queue: `발송 시점의 최신 동의·인증 상태를 기준으로 대상을 확정합니다. 현재 화면의 예상 대상은 ${count.toLocaleString("ko-KR")}명입니다.`,
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
