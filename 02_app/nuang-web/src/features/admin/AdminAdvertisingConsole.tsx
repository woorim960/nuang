/* eslint-disable @next/next/no-img-element */
"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Inbox,
  Megaphone,
  PanelTop,
  ShieldAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  advertisingAdminTabs,
  advertisingInquiryStatuses,
  type AdminAdvertisingCampaign,
  type AdminAdvertisingCreative,
  type AdminAdvertisingData,
  type AdminAdvertisingInquiry,
  type AdminAdvertisingInventory,
  type AdminAdvertisingKillSwitch,
  type AdvertisingAdminTab,
  type AdvertisingCampaignStatus,
  type AdvertisingCreativeReviewStatus,
  type AdvertisingInquiryStatus,
} from "./admin-advertising-contract";
import { AdminConfirmDialog } from "./AdminConfirmDialog";
import styles from "./AdminAdvertisingConsole.module.css";

const tabLabels: Record<AdvertisingAdminTab, string> = {
  campaigns: "캠페인",
  creatives: "소재 검수",
  inquiries: "문의",
  inventory: "인벤토리",
  performance: "성과·품질",
  settings: "설정",
};

const inquiryStatusLabels: Record<AdvertisingInquiryStatus, string> = {
  closed: "종료",
  contacted: "연락 완료",
  contracted: "계약",
  negotiating: "협의 중",
  proposal_sent: "제안 전달",
  received: "접수",
  rejected: "거절",
  reviewing: "검토 중",
  spam: "스팸",
  spam_review: "스팸 검토",
};

const campaignStatusLabels: Record<AdvertisingCampaignStatus, string> = {
  active: "송출 중",
  approved: "승인",
  draft: "초안",
  ended: "종료",
  paused: "중지",
  policy_review: "정책 검수",
  scheduled: "예약",
};

const creativeStatusLabels: Record<AdvertisingCreativeReviewStatus, string> = {
  approved: "승인",
  changes_requested: "수정 요청",
  expired: "만료",
  pending: "검수 대기",
  rejected: "거절",
};

type SensitiveInquiryDetail = {
  contactEmail: string | null;
  contactName: string | null;
  contactPhone: string | null;
  details: string | null;
  promotedOffering: string | null;
};

export function AdminAdvertisingConsole({
  data,
}: {
  data: AdminAdvertisingData;
}) {
  const [activeTab, setActiveTab] = useState<AdvertisingAdminTab>("inquiries");
  const stats = useMemo(() => buildStats(data), [data]);
  const availableModules = [
    data.inquiries,
    data.campaigns,
    data.inventory,
    data.creatives,
    data.metrics,
    data.killSwitches,
  ].filter((module) => module.available).length;
  const globalSwitch = data.killSwitches.items.find(
    (item) => item.scope === "global" && item.key === "advertising",
  );

  return (
    <>
      {globalSwitch ? (
        <section
          className={styles.safetyBar}
          data-suspended={globalSwitch.suspended}
        >
          <div>
            <ShieldAlert aria-hidden="true" size={19} strokeWidth={1.7} />
            <span>
              <strong>
                {globalSwitch.suspended
                  ? "전체 광고 송출 중지"
                  : "전체 광고 송출 제어 정상"}
              </strong>
              <small>
                {globalSwitch.reason ??
                  "공급자·슬롯별 안전 설정과 승인 상태를 함께 적용합니다."}
              </small>
            </span>
          </div>
          <KillSwitchForm
            endpoint="/api/admin/advertising/kill-switch"
            item={globalSwitch}
          />
        </section>
      ) : null}
      <section
        className={styles.overview}
        aria-labelledby="advertising-overview-title"
      >
        <div className={styles.overviewHeading}>
          <div>
            <p>지금 해야 할 일</p>
            <h2 id="advertising-overview-title">
              {!data.inquiries.available
                ? "광고 운영 데이터 연결을 확인해 주세요"
                : stats.actionCount === 0
                  ? "긴급하게 처리할 광고 업무가 없습니다"
                  : `${stats.actionCount}건을 우선 확인해 주세요`}
            </h2>
          </div>
          <span data-complete={availableModules === 6}>
            데이터 연결 {availableModules}/6
          </span>
        </div>
        <div className={styles.statGrid}>
          {stats.items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => setActiveTab(item.tab)}
                type="button"
              >
                <Icon aria-hidden="true" size={17} strokeWidth={1.7} />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </button>
            );
          })}
        </div>
        <p className={styles.generatedAt}>
          데이터 기준 {formatDateTime(data.generatedAt)}
        </p>
      </section>

      <section className={styles.console}>
        <div aria-label="광고·제휴 업무" className={styles.tabs} role="tablist">
          {advertisingAdminTabs.map((tab) => (
            <button
              aria-controls={`advertising-panel-${tab}`}
              aria-selected={activeTab === tab}
              data-active={activeTab === tab}
              id={`advertising-tab-${tab}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              onKeyDown={(event) => {
                const current = advertisingAdminTabs.indexOf(tab);
                const target =
                  event.key === "ArrowRight"
                    ? (current + 1) % advertisingAdminTabs.length
                    : event.key === "ArrowLeft"
                      ? (current - 1 + advertisingAdminTabs.length) %
                        advertisingAdminTabs.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? advertisingAdminTabs.length - 1
                          : null;
                if (target === null) return;
                event.preventDefault();
                const next = advertisingAdminTabs[target];
                setActiveTab(next);
                requestAnimationFrame(() =>
                  document.getElementById(`advertising-tab-${next}`)?.focus(),
                );
              }}
              role="tab"
              type="button"
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
        <div
          aria-labelledby={`advertising-tab-${activeTab}`}
          className={styles.tabPanel}
          id={`advertising-panel-${activeTab}`}
          role="tabpanel"
          tabIndex={0}
        >
          {activeTab === "inquiries" ? <InquiryPanel data={data} /> : null}
          {activeTab === "campaigns" ? <CampaignPanel data={data} /> : null}
          {activeTab === "inventory" ? <InventoryPanel data={data} /> : null}
          {activeTab === "creatives" ? <CreativePanel data={data} /> : null}
          {activeTab === "performance" ? (
            <PerformancePanel data={data} />
          ) : null}
          {activeTab === "settings" ? <SettingsPanel data={data} /> : null}
        </div>
      </section>
    </>
  );
}

function InquiryPanel({ data }: { data: AdminAdvertisingData }) {
  if (!data.inquiries.available)
    return <Unavailable message={data.inquiries.message} />;
  if (data.inquiries.items.length === 0) {
    return (
      <Empty
        title="접수된 광고 문의가 없습니다"
        detail="새 문의가 들어오면 접수번호와 응답 기한을 이곳에서 확인할 수 있습니다."
      />
    );
  }
  return (
    <Panel
      title="광고 문의 큐"
      description="미응답과 SLA 초과를 먼저 정렬했습니다."
    >
      <DataScope
        shown={data.inquiries.items.length}
        total={data.inquiries.totalCount}
        truncated={data.inquiries.truncated}
      />
      <AdvertisingMailHealth data={data} />
      <div className={styles.list}>
        {[...data.inquiries.items].sort(sortInquiries).map((item) => (
          <InquiryRow item={item} key={item.id} />
        ))}
      </div>
    </Panel>
  );
}

function InquiryRow({ item }: { item: AdminAdvertisingInquiry }) {
  const router = useRouter();
  const [status, setStatus] = useState<AdvertisingInquiryStatus>(item.status);
  const [priority, setPriority] = useState(item.priority);
  const [nextActionAt, setNextActionAt] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sensitiveConfirmOpen, setSensitiveConfirmOpen] = useState(false);
  const [sensitivePending, setSensitivePending] = useState(false);
  const [sensitiveMessage, setSensitiveMessage] = useState("");
  const [mailRetryReason, setMailRetryReason] = useState("");
  const [mailRetryPending, setMailRetryPending] = useState(false);
  const [mailRetryMessage, setMailRetryMessage] = useState("");
  const [sensitiveDetail, setSensitiveDetail] =
    useState<SensitiveInquiryDetail | null>(null);
  const overdue = isOverdue(item.firstResponseDueAt, item.status);

  async function performUpdate() {
    setPending(true);
    setMessage("");
    const outcome = await postAdminAction("/api/admin/advertising/inquiries", {
      inquiryId: item.id,
      nextActionAt: nextActionAt ? new Date(nextActionAt).toISOString() : null,
      priority,
      reason,
      status,
    });
    setPending(false);
    setConfirmOpen(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const terminal = ["contracted", "rejected", "closed", "spam"].includes(
      status,
    );
    if (!terminal && !nextActionAt) {
      setMessage("다음 조치일을 입력해 주세요.");
      return;
    }
    if (terminal) {
      setConfirmOpen(true);
      return;
    }
    void performUpdate();
  }

  async function loadSensitiveDetail() {
    setSensitivePending(true);
    setSensitiveMessage("");
    try {
      const response = await fetch(
        `/api/admin/advertising/inquiries/${item.id}/detail`,
        { cache: "no-store" },
      );
      const payload = (await response.json().catch(() => null)) as {
        detail?: SensitiveInquiryDetail;
        message?: string;
        ok?: boolean;
      } | null;
      if (!response.ok || !payload?.ok || !payload.detail) {
        setSensitiveMessage(
          payload?.message ?? "상세 정보를 불러오지 못했습니다.",
        );
      } else {
        setSensitiveDetail(payload.detail);
      }
    } catch {
      setSensitiveMessage("연결이 불안정합니다. 잠시 뒤 다시 시도해 주세요.");
    }
    setSensitivePending(false);
    setSensitiveConfirmOpen(false);
  }

  async function retryFailedMail() {
    if (mailRetryReason.trim().length < 5) {
      setMailRetryMessage("재시도 사유를 5자 이상 입력해 주세요.");
      return;
    }
    setMailRetryPending(true);
    setMailRetryMessage("");
    const outcome = await postAdminAction(
      "/api/admin/advertising/mail-operations",
      { inquiryId: item.id, reason: mailRetryReason },
    );
    setMailRetryPending(false);
    setMailRetryMessage(outcome.message);
    if (outcome.ok) {
      setMailRetryReason("");
      router.refresh();
    }
  }

  return (
    <article className={styles.row} data-overdue={overdue}>
      <div className={styles.rowMain}>
        <div>
          <span className={styles.reference}>{item.publicReference}</span>
          <h3>{item.companyName}</h3>
          <p>
            {inquiryTypeLabel(item.inquiryType)} ·{" "}
            {budgetBandLabel(item.budgetBand)}
          </p>
        </div>
        <Status tone={overdue ? "danger" : statusTone(item.status)}>
          {inquiryStatusLabels[item.status]}
        </Status>
      </div>
      <dl className={styles.metaGrid}>
        <Meta label="접수" value={formatDateTime(item.createdAt)} />
        <Meta
          label="첫 응답 기한"
          value={
            item.firstResponseDueAt
              ? formatDateTime(item.firstResponseDueAt)
              : "미설정"
          }
        />
        <Meta
          label="희망 일정"
          value={formatRange(item.desiredStart, item.desiredEnd)}
        />
        <Meta label="메일" value={mailStatusLabel(item.mailStatus)} />
        <Meta
          label="담당"
          value={
            item.assignedToCurrentAdmin
              ? "내가 담당"
              : "미지정 또는 다른 담당자"
          }
        />
        <Meta
          label="다음 조치"
          value={
            item.nextActionAt ? formatDateTime(item.nextActionAt) : "미설정"
          }
        />
      </dl>
      {item.mailStatus === "failed" ? (
        <section className={styles.mailRecovery}>
          <div>
            <strong>문의 확인 메일 점검 필요</strong>
            <p>
              {item.mailRetryableCount > 0
                ? `공급자에 접수되지 않은 ${item.mailRetryableCount}건만 안전하게 다시 처리할 수 있습니다.`
                : "반송·신고 또는 공급자 접수 이력이 있어 자동 재전송하지 않습니다."}
            </p>
          </div>
          {item.mailRetryableCount > 0 ? (
            <div>
              <input
                aria-label="문의 메일 재시도 사유"
                maxLength={500}
                onChange={(event) => setMailRetryReason(event.target.value)}
                placeholder="확인한 원인과 재시도 사유"
                value={mailRetryReason}
              />
              <button
                disabled={mailRetryPending || mailRetryReason.trim().length < 5}
                onClick={() => void retryFailedMail()}
                type="button"
              >
                {mailRetryPending ? "처리 중" : "안전 재시도"}
              </button>
            </div>
          ) : null}
          {mailRetryMessage ? (
            <p aria-live="polite">{mailRetryMessage}</p>
          ) : null}
        </section>
      ) : null}
      <details className={styles.inquiryDetails}>
        <summary>제출 내용과 동의 기록</summary>
        <dl>
          <Meta
            label="연락 이메일"
            value={item.contactEmailMasked ?? "마스킹 정보 없음"}
          />
          <Meta label="웹사이트" value={item.websiteHost ?? "미입력"} />
          <Meta
            label="캠페인 목적"
            value={campaignObjectiveLabel(item.campaignObjective)}
          />
          <Meta
            label="희망 위치"
            value={preferredPlacementLabel(item.preferredPlacement)}
          />
          <Meta label="대상 설명" value={item.targetAudience} />
          <Meta
            label="소재 준비"
            value={creativeReadinessLabel(item.creativeReadiness)}
          />
          <Meta
            label="일정 방식"
            value={scheduleModeLabel(item.scheduleMode)}
          />
          <Meta
            label="개인정보 동의"
            value={formatDateTime(item.privacyConsentedAt)}
          />
          <Meta
            label="위험 신호"
            value={item.riskFlags.length ? item.riskFlags.join(" · ") : "없음"}
          />
        </dl>
        <p>
          연락처와 문의 원문은 열람할 때마다 관리자·시각·대상이 운영 기록에
          남습니다.
        </p>
        {sensitiveDetail ? (
          <div className={styles.sensitiveDetail}>
            <dl>
              <Meta
                label="담당자 이름"
                value={sensitiveDetail.contactName ?? "미입력"}
              />
              <Meta
                label="이메일"
                value={sensitiveDetail.contactEmail ?? "미입력"}
              />
              <Meta
                label="전화번호"
                value={sensitiveDetail.contactPhone ?? "미입력"}
              />
            </dl>
            <section>
              <strong>홍보 대상</strong>
              <p>{sensitiveDetail.promotedOffering ?? "미입력"}</p>
            </section>
            <section>
              <strong>문의 내용</strong>
              <p>{sensitiveDetail.details ?? "미입력"}</p>
            </section>
          </div>
        ) : (
          <button
            className={styles.sensitiveButton}
            disabled={sensitivePending}
            onClick={() => setSensitiveConfirmOpen(true)}
            type="button"
          >
            {sensitivePending ? "불러오는 중" : "연락처·문의 내용 보기"}
          </button>
        )}
        {sensitiveMessage ? <p aria-live="polite">{sensitiveMessage}</p> : null}
      </details>
      <details className={styles.actionDetails}>
        <summary>상태·담당 업무 변경</summary>
        <form className={styles.actionForm} onSubmit={submit}>
          <label>
            상태
            <select
              onChange={(event) =>
                setStatus(event.target.value as AdvertisingInquiryStatus)
              }
              value={status}
            >
              {advertisingInquiryStatuses.map((value) => (
                <option key={value} value={value}>
                  {inquiryStatusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            우선순위
            <select
              onChange={(event) =>
                setPriority(event.target.value as typeof priority)
              }
              value={priority}
            >
              <option value="low">낮음</option>
              <option value="normal">보통</option>
              <option value="high">높음</option>
              <option value="urgent">긴급</option>
            </select>
          </label>
          <label>
            다음 조치일
            <input
              onChange={(event) => setNextActionAt(event.target.value)}
              type="datetime-local"
              value={nextActionAt}
            />
          </label>
          <label className={styles.reason}>
            변경 사유
            <textarea
              maxLength={500}
              minLength={2}
              onChange={(event) => setReason(event.target.value)}
              required
              value={reason}
            />
          </label>
          <button disabled={pending} type="submit">
            {pending ? "저장 중" : "내 담당으로 저장"}
          </button>
          {message ? (
            <p aria-live="polite" data-success={message === "변경했습니다."}>
              {message}
            </p>
          ) : null}
        </form>
      </details>
      <AdminConfirmDialog
        confirmLabel={`${inquiryStatusLabels[status]}로 변경`}
        description={`${item.companyName} 문의를 ${inquiryStatusLabels[status]} 상태로 변경합니다. 변경 사유와 처리 기록은 운영 기록에 남습니다.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void performUpdate()}
        open={confirmOpen}
        pending={pending}
        title="문의 상태 변경을 확인해 주세요"
        tone={status === "contracted" ? "brand" : "danger"}
      />
      <AdminConfirmDialog
        confirmLabel="기록을 남기고 보기"
        description={`${item.companyName} 문의의 연락처와 원문을 복호화해 봅니다. 관리자 계정과 열람 시각이 운영 기록에 남습니다.`}
        onCancel={() => setSensitiveConfirmOpen(false)}
        onConfirm={() => void loadSensitiveDetail()}
        open={sensitiveConfirmOpen}
        pending={sensitivePending}
        title="민감정보를 열람할까요?"
        tone="brand"
      />
    </article>
  );
}

function AdvertisingMailHealth({ data }: { data: AdminAdvertisingData }) {
  if (!data.mailOperations.available) {
    return (
      <div className={styles.mailHealth} data-warning>
        <AlertTriangle aria-hidden="true" size={17} />
        <div>
          <strong>문의 메일 운영 상태 연결 필요</strong>
          <span>{data.mailOperations.message}</span>
        </div>
      </div>
    );
  }
  const unhealthy =
    data.mailOperations.queue.dead > 0 ||
    data.mailOperations.queue.stale > 0 ||
    data.mailOperations.worker.status === "failed" ||
    data.mailOperations.worker.status === "degraded";
  return (
    <div className={styles.mailHealth} data-warning={unhealthy}>
      {unhealthy ? (
        <AlertTriangle aria-hidden="true" size={17} />
      ) : (
        <CheckCircle2 aria-hidden="true" size={17} />
      )}
      <div>
        <strong>
          {data.mailOperations.worker.status
            ? `문의 메일 작업 ${workerLabel(data.mailOperations.worker.status)}`
            : "첫 문의 메일 작업을 기다리고 있습니다"}
        </strong>
        <span>
          대기 {data.mailOperations.queue.pending} · 재시도{" "}
          {data.mailOperations.queue.retry} · 실패{" "}
          {data.mailOperations.queue.dead}
          {data.mailOperations.worker.finishedAt
            ? ` · 마지막 ${formatDateTime(data.mailOperations.worker.finishedAt)}`
            : ""}
        </span>
      </div>
    </div>
  );
}

function CampaignPanel({ data }: { data: AdminAdvertisingData }) {
  if (!data.campaigns.available)
    return <Unavailable message={data.campaigns.message} />;
  return (
    <Panel
      title="캠페인"
      description="정책 승인, 일정, 소재 연결 상태를 함께 확인합니다."
    >
      <DataScope
        shown={data.campaigns.items.length}
        total={data.campaigns.totalCount}
        truncated={data.campaigns.truncated}
      />
      <CampaignCreateForm inquiries={data.inquiries.items} />
      {data.campaigns.items.length === 0 ? (
        <Empty
          title="등록된 캠페인이 없습니다"
          detail="계약 또는 내부 운영 계획을 확인한 뒤 위에서 첫 캠페인을 등록해 주세요."
        />
      ) : (
        <div className={styles.list}>
          {data.campaigns.items.map((item) => (
            <CampaignRow item={item} key={item.id} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function CampaignCreateForm({
  inquiries,
}: {
  inquiries: AdminAdvertisingInquiry[];
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<"adsense" | "coupang" | "direct">(
    "adsense",
  );
  const [placementKeys, setPlacementKeys] = useState<string[]>([
    "HOME_INLINE_01",
  ]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (placementKeys.length === 0) {
      setMessage("하나 이상의 광고 슬롯을 선택해 주세요.");
      return;
    }
    setPending(true);
    setMessage("");
    const outcome = await postAdminAction(
      "/api/admin/advertising/campaigns",
      {
        budgetNote: nullableFormValue(form, "budgetNote"),
        campaignId: null,
        endsAt: isoFormValue(form, "endsAt"),
        inquiryId: nullableFormValue(form, "inquiryId"),
        name: formValue(form, "name"),
        objective: formValue(form, "objective"),
        placementKeys,
        policyVersion: nullableFormValue(form, "policyVersion"),
        provider,
        reason: formValue(form, "reason"),
        startsAt: isoFormValue(form, "startsAt"),
      },
      "PUT",
    );
    setPending(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  function togglePlacement(key: string, checked: boolean) {
    setPlacementKeys((current) =>
      checked
        ? Array.from(new Set([...current, key]))
        : current.filter((value) => value !== key),
    );
  }

  return (
    <details className={styles.createDetails}>
      <summary>새 캠페인 등록</summary>
      <form className={styles.editorForm} onSubmit={submit}>
        <label>
          캠페인명
          <input maxLength={160} minLength={2} name="name" required />
        </label>
        <label>
          공급자
          <select
            onChange={(event) => {
              const nextProvider = event.target.value as typeof provider;
              setProvider(nextProvider);
              if (nextProvider === "adsense") {
                setPlacementKeys(["HOME_INLINE_01"]);
              } else if (nextProvider === "coupang") {
                setPlacementKeys(["FEED_COMMERCE_01"]);
              }
            }}
            value={provider}
          >
            <option value="adsense">Google AdSense</option>
            <option value="coupang">쿠팡 파트너스</option>
            <option value="direct">직접 제휴</option>
          </select>
        </label>
        <label>
          캠페인 목적
          <select defaultValue="awareness" name="objective">
            <option value="awareness">브랜드 인지도</option>
            <option value="traffic">웹사이트 방문</option>
            <option value="engagement">사용자 참여</option>
            <option value="launch">신제품·서비스 출시</option>
            <option value="other">기타</option>
          </select>
        </label>
        <label>
          연결 문의
          <select defaultValue="" name="inquiryId">
            <option value="">연결하지 않음</option>
            {inquiries.map((inquiry) => (
              <option key={inquiry.id} value={inquiry.id}>
                {inquiry.publicReference} · {inquiry.companyName}
              </option>
            ))}
          </select>
        </label>
        <fieldset className={styles.checkboxField}>
          <legend>광고 슬롯</legend>
          <label>
            <input
              checked={placementKeys.includes("HOME_INLINE_01")}
              disabled={provider !== "direct"}
              onChange={(event) =>
                togglePlacement("HOME_INLINE_01", event.target.checked)
              }
              type="checkbox"
            />
            홈 인라인
          </label>
          <label>
            <input
              checked={placementKeys.includes("FEED_COMMERCE_01")}
              disabled={provider !== "direct"}
              onChange={(event) =>
                togglePlacement("FEED_COMMERCE_01", event.target.checked)
              }
              type="checkbox"
            />
            피드 커머스
          </label>
        </fieldset>
        <label>
          시작 시각
          <input name="startsAt" type="datetime-local" />
        </label>
        <label>
          종료 시각
          <input name="endsAt" type="datetime-local" />
        </label>
        <label>
          정책 버전
          <input
            defaultValue="advertising-v1"
            maxLength={80}
            name="policyVersion"
            required
          />
        </label>
        <label className={styles.wideField}>
          계약·예산 메모
          <textarea maxLength={1000} name="budgetNote" />
        </label>
        <label className={styles.wideField}>
          등록 사유
          <textarea maxLength={500} minLength={2} name="reason" required />
        </label>
        <button disabled={pending} type="submit">
          {pending ? "등록 중" : "초안으로 등록"}
        </button>
        {message ? <p aria-live="polite">{message}</p> : null}
      </form>
    </details>
  );
}

function CampaignRow({ item }: { item: AdminAdvertisingCampaign }) {
  const router = useRouter();
  const [status, setStatus] = useState(item.status);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const allowedStatuses = campaignNextStatuses(item.status);

  async function performUpdate() {
    setPending(true);
    const outcome = await postAdminAction("/api/admin/advertising/campaigns", {
      campaignId: item.id,
      reason,
      status,
    });
    setPending(false);
    setConfirmOpen(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (["active", "ended"].includes(status)) {
      setConfirmOpen(true);
      return;
    }
    void performUpdate();
  }
  return (
    <article className={styles.row}>
      <div className={styles.rowMain}>
        <div>
          <span className={styles.reference}>
            {providerLabel(item.provider)}
          </span>
          <h3>{item.name}</h3>
          <p>
            {item.placementKeys.length
              ? item.placementKeys.join(" · ")
              : "연결 슬롯 없음"}
          </p>
        </div>
        <Status tone={statusTone(item.status)}>
          {campaignStatusLabels[item.status]}
        </Status>
      </div>
      <dl className={styles.metaGrid}>
        <Meta label="일정" value={formatRange(item.startsAt, item.endsAt)} />
        <Meta label="소재" value={`${item.creativeCount}개`} />
        <Meta label="목적" value={campaignObjectiveLabel(item.objective)} />
        <Meta label="정책 버전" value={item.policyVersion ?? "미설정"} />
        <Meta
          label="정책 승인"
          value={
            item.policyApprovedAt
              ? formatDateTime(item.policyApprovedAt)
              : "대기"
          }
        />
      </dl>
      {!["active", "ended"].includes(item.status) ? (
        <CampaignEditForm item={item} />
      ) : null}
      {allowedStatuses.length ? (
        <details className={styles.actionDetails}>
          <summary>캠페인 상태 변경</summary>
          <form className={styles.actionForm} onSubmit={submit}>
            <label>
              상태
              <select
                onChange={(event) =>
                  setStatus(event.target.value as AdvertisingCampaignStatus)
                }
                value={status}
              >
                <option value={item.status}>
                  현재 · {campaignStatusLabels[item.status]}
                </option>
                {allowedStatuses.map((value) => (
                  <option key={value} value={value}>
                    {campaignStatusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.reason}>
              변경 사유
              <textarea
                maxLength={500}
                minLength={5}
                onChange={(event) => setReason(event.target.value)}
                required
                value={reason}
              />
            </label>
            <button disabled={pending || status === item.status} type="submit">
              {pending ? "저장 중" : "상태 저장"}
            </button>
            {message ? <p aria-live="polite">{message}</p> : null}
          </form>
        </details>
      ) : null}
      <AdminConfirmDialog
        confirmLabel={`${campaignStatusLabels[status]}으로 변경`}
        description={`${item.name} 캠페인을 ${campaignStatusLabels[status]} 상태로 변경합니다. 연결된 슬롯의 송출 상태와 일정을 다시 확인해 주세요.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void performUpdate()}
        open={confirmOpen}
        pending={pending}
        title="캠페인 상태 변경을 확인해 주세요"
        tone={status === "active" ? "brand" : "danger"}
      />
    </article>
  );
}

function CampaignEditForm({ item }: { item: AdminAdvertisingCampaign }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    const outcome = await postAdminAction(
      "/api/admin/advertising/campaigns",
      {
        budgetNote: nullableFormValue(form, "budgetNote"),
        campaignId: item.id,
        endsAt: isoFormValue(form, "endsAt"),
        inquiryId: item.inquiryId,
        name: formValue(form, "name"),
        objective: formValue(form, "objective"),
        placementKeys: item.placementKeys,
        policyVersion: nullableFormValue(form, "policyVersion"),
        provider: item.provider,
        reason: formValue(form, "reason"),
        startsAt: isoFormValue(form, "startsAt"),
      },
      "PUT",
    );
    setPending(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  return (
    <details className={styles.actionDetails}>
      <summary>캠페인 정보 수정</summary>
      <form
        className={`${styles.editorForm} ${styles.editorFormInRow}`}
        onSubmit={submit}
      >
        <label>
          캠페인명
          <input
            defaultValue={item.name}
            maxLength={160}
            minLength={2}
            name="name"
            required
          />
        </label>
        <label>
          목적
          <select defaultValue={item.objective} name="objective">
            <option value="awareness">브랜드 인지도</option>
            <option value="traffic">웹사이트 방문</option>
            <option value="engagement">사용자 참여</option>
            <option value="launch">신제품·서비스 출시</option>
            <option value="other">기타</option>
          </select>
        </label>
        <label>
          시작 시각
          <input
            defaultValue={toDateTimeLocal(item.startsAt)}
            name="startsAt"
            type="datetime-local"
          />
        </label>
        <label>
          종료 시각
          <input
            defaultValue={toDateTimeLocal(item.endsAt)}
            name="endsAt"
            type="datetime-local"
          />
        </label>
        <label>
          정책 버전
          <input
            defaultValue={item.policyVersion ?? "advertising-v1"}
            maxLength={80}
            name="policyVersion"
            required
          />
        </label>
        <label className={styles.wideField}>
          계약·예산 메모
          <textarea
            defaultValue={item.budgetNote ?? ""}
            maxLength={1000}
            name="budgetNote"
          />
        </label>
        <label className={styles.wideField}>
          수정 사유
          <textarea maxLength={500} minLength={2} name="reason" required />
        </label>
        <button disabled={pending} type="submit">
          {pending ? "저장 중" : "수정 후 정책 재검수"}
        </button>
        {message ? <p aria-live="polite">{message}</p> : null}
      </form>
    </details>
  );
}

function InventoryPanel({ data }: { data: AdminAdvertisingData }) {
  if (!data.inventory.available)
    return <Unavailable message={data.inventory.message} />;
  if (data.inventory.items.length === 0)
    return (
      <Empty
        title="광고 슬롯이 등록되지 않았습니다"
        detail="승인된 슬롯 설정이 저장되면 위치와 빈도 제한을 확인할 수 있습니다."
      />
    );
  return (
    <Panel
      title="광고 인벤토리"
      description="슬롯 위치와 보호 조건을 확인하고 슬롯 단위로 중지합니다."
    >
      <div className={styles.list}>
        {data.inventory.items.map((item) => (
          <InventoryRow item={item} key={item.id} />
        ))}
      </div>
    </Panel>
  );
}

function InventoryRow({ item }: { item: AdminAdvertisingInventory }) {
  return (
    <article className={styles.row}>
      <div className={styles.rowMain}>
        <div>
          <span className={styles.reference}>{item.placementKey}</span>
          <h3>{item.routeContext}</h3>
          <p>{providerLabel(item.provider)}</p>
        </div>
        <Status tone={item.isActive ? "success" : "danger"}>
          {item.isActive ? "활성" : "중지"}
        </Status>
      </div>
      <dl className={styles.metaGrid}>
        <Meta label="선행 콘텐츠" value={`${item.minimumOrganicCount}개`} />
        <Meta
          label="세션 한도"
          value={item.sessionCap === null ? "미설정" : `${item.sessionCap}회`}
        />
        <Meta
          label="24시간 한도"
          value={item.dailyCap === null ? "미설정" : `${item.dailyCap}회`}
        />
        <Meta label="단계적 송출" value={`${item.rolloutPercentage}%`} />
        <Meta
          label="최소 간격"
          value={`${formatNumber(item.minimumIntervalSeconds)}초`}
        />
        <Meta
          label="최근 변경"
          value={item.updatedAt ? formatDateTime(item.updatedAt) : "기록 없음"}
        />
      </dl>
      <InventoryEditor item={item} />
    </article>
  );
}

function InventoryEditor({ item }: { item: AdminAdvertisingInventory }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPayload({
      activeFrom: isoFormValue(form, "activeFrom"),
      activeUntil: isoFormValue(form, "activeUntil"),
      dailyCap: numberFormValue(form, "dailyCap"),
      isActive: form.get("isActive") === "on",
      minimumIntervalSeconds: numberFormValue(form, "minimumIntervalSeconds"),
      minimumOrganicCount: numberFormValue(form, "minimumOrganicCount"),
      placementKey: item.placementKey,
      reason: formValue(form, "reason"),
      rolloutPercentage: numberFormValue(form, "rolloutPercentage"),
      sessionCap: numberFormValue(form, "sessionCap"),
    });
    setConfirmOpen(true);
  }

  async function performUpdate() {
    if (!payload) return;
    setPending(true);
    setMessage("");
    const outcome = await postAdminAction(
      "/api/admin/advertising/inventory",
      payload,
    );
    setPending(false);
    setConfirmOpen(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  return (
    <details className={styles.actionDetails}>
      <summary>슬롯 운영값 변경</summary>
      <form className={styles.editorForm} onSubmit={submit}>
        <label className={styles.toggleField}>
          <input
            defaultChecked={item.isActive}
            name="isActive"
            type="checkbox"
          />
          슬롯 활성화
        </label>
        <label>
          단계적 송출 비율(%)
          <input
            defaultValue={item.rolloutPercentage}
            max={100}
            min={0}
            name="rolloutPercentage"
            required
            type="number"
          />
        </label>
        <label>
          선행 콘텐츠 수
          <input
            defaultValue={item.minimumOrganicCount}
            max={100}
            min={0}
            name="minimumOrganicCount"
            required
            type="number"
          />
        </label>
        <label>
          최소 노출 간격(초)
          <input
            defaultValue={item.minimumIntervalSeconds}
            max={86400}
            min={0}
            name="minimumIntervalSeconds"
            required
            type="number"
          />
        </label>
        <label>
          세션 한도
          <input
            defaultValue={item.sessionCap ?? 0}
            max={10}
            min={0}
            name="sessionCap"
            required
            type="number"
          />
        </label>
        <label>
          24시간 한도
          <input
            defaultValue={item.dailyCap ?? 0}
            max={20}
            min={0}
            name="dailyCap"
            required
            type="number"
          />
        </label>
        <label>
          활성 시작
          <input
            defaultValue={toDateTimeLocal(item.activeFrom)}
            name="activeFrom"
            type="datetime-local"
          />
        </label>
        <label>
          활성 종료
          <input
            defaultValue={toDateTimeLocal(item.activeUntil)}
            name="activeUntil"
            type="datetime-local"
          />
        </label>
        <label className={styles.wideField}>
          변경 사유
          <textarea maxLength={500} minLength={2} name="reason" required />
        </label>
        <button disabled={pending} type="submit">
          {pending ? "저장 중" : "운영값 저장"}
        </button>
        {message ? <p aria-live="polite">{message}</p> : null}
      </form>
      <AdminConfirmDialog
        confirmLabel="슬롯 운영값 저장"
        description={`${item.placementKey} 슬롯의 활성 상태, 노출 빈도와 단계적 송출 비율을 변경합니다. 변경 기록은 운영 기록에 남습니다.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void performUpdate()}
        open={confirmOpen}
        pending={pending}
        title="광고 슬롯 설정을 변경할까요?"
        tone="brand"
      />
    </details>
  );
}

function CreativePanel({ data }: { data: AdminAdvertisingData }) {
  if (!data.creatives.available)
    return <Unavailable message={data.creatives.message} />;
  return (
    <Panel
      title="소재 검수"
      description="쿠팡 링크와 표시 문구는 승인 전에 반드시 실제 화면에서 확인합니다."
    >
      <DataScope
        shown={data.creatives.items.length}
        total={data.creatives.totalCount}
        truncated={data.creatives.truncated}
      />
      <CreativeCreateForm campaigns={data.campaigns.items} />
      {data.creatives.items.length === 0 ? (
        <Empty
          title="검수할 소재가 없습니다"
          detail="캠페인을 만든 뒤 위에서 소재를 등록하면 정책 검수를 시작할 수 있습니다."
        />
      ) : (
        <div className={styles.list}>
          {data.creatives.items.map((item) => (
            <CreativeRow item={item} key={item.id} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function CreativeCreateForm({
  campaigns,
}: {
  campaigns: AdminAdvertisingCampaign[];
}) {
  const router = useRouter();
  const selectableCampaigns = campaigns.filter(
    (campaign) => campaign.provider !== "unknown",
  );
  const [campaignId, setCampaignId] = useState(
    selectableCampaigns[0]?.id ?? "",
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const campaign = selectableCampaigns.find((item) => item.id === campaignId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaign) {
      setMessage("먼저 소재를 연결할 캠페인을 등록해 주세요.");
      return;
    }
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    const outcome = await postAdminAction(
      "/api/admin/advertising/creatives",
      {
        altText: nullableFormValue(form, "altText"),
        campaignId: campaign.id,
        creativeId: null,
        description: nullableFormValue(form, "description"),
        destinationUrl: nullableFormValue(form, "destinationUrl"),
        disclosureText: nullableFormValue(form, "disclosureText"),
        expiresAt: isoFormValue(form, "expiresAt"),
        factCheckedAt: isoFormValue(form, "factCheckedAt"),
        imageUrl: nullableFormValue(form, "imageUrl"),
        provider: campaign.provider,
        reason: formValue(form, "reason"),
        title: formValue(form, "title"),
      },
      "PUT",
    );
    setPending(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  return (
    <details className={styles.createDetails}>
      <summary>새 소재 등록</summary>
      {selectableCampaigns.length === 0 ? (
        <p className={styles.formNotice}>
          소재를 등록하려면 먼저 캠페인 탭에서 캠페인을 만들어 주세요.
        </p>
      ) : (
        <form className={styles.editorForm} onSubmit={submit}>
          <label>
            연결 캠페인
            <select
              onChange={(event) => setCampaignId(event.target.value)}
              value={campaignId}
            >
              {selectableCampaigns.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {providerLabel(item.provider)}
                </option>
              ))}
            </select>
          </label>
          <label>
            소재 제목
            <input maxLength={160} minLength={2} name="title" required />
          </label>
          <label className={styles.wideField}>
            설명
            <textarea maxLength={500} name="description" />
          </label>
          <label className={styles.wideField}>
            이미지 URL
            <input name="imageUrl" placeholder="https://" type="url" />
          </label>
          <label className={styles.wideField}>
            이미지 대체 텍스트
            <input maxLength={300} name="altText" />
          </label>
          <label className={styles.wideField}>
            이동 URL
            <input name="destinationUrl" placeholder="https://" type="url" />
          </label>
          <label className={styles.wideField}>
            광고·제휴 표시 문구
            <textarea
              maxLength={500}
              name="disclosureText"
              placeholder={
                campaign?.provider === "coupang"
                  ? "쿠팡 파트너스 활동으로 일정액의 수수료를 제공받을 수 있습니다."
                  : "광고 또는 제휴 관계를 명확히 표시해 주세요."
              }
            />
          </label>
          <label>
            사실 확인 시각
            <input name="factCheckedAt" type="datetime-local" />
          </label>
          <label>
            소재 만료 시각
            <input name="expiresAt" type="datetime-local" />
          </label>
          <label className={styles.wideField}>
            등록 사유
            <textarea maxLength={500} minLength={2} name="reason" required />
          </label>
          <button disabled={pending} type="submit">
            {pending ? "등록 중" : "검수 대기로 등록"}
          </button>
          {message ? <p aria-live="polite">{message}</p> : null}
        </form>
      )}
    </details>
  );
}

function CreativeRow({ item }: { item: AdminAdvertisingCreative }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] =
    useState<AdvertisingCreativeReviewStatus | null>(null);
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const approvalIssues = creativeApprovalIssues(item);

  async function performUpdate(
    reviewStatus: "approved" | "changes_requested" | "rejected",
  ) {
    setPending(reviewStatus);
    const outcome = await postAdminAction("/api/admin/advertising/creatives", {
      creativeId: item.id,
      reason,
      reviewStatus,
    });
    setPending(null);
    setConfirmOpen(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  function update(reviewStatus: "approved" | "changes_requested" | "rejected") {
    if (reason.trim().length < 2) {
      setMessage("검수 사유를 입력해 주세요.");
      return;
    }
    if (reviewStatus === "approved") {
      setConfirmOpen(true);
      return;
    }
    void performUpdate(reviewStatus);
  }
  return (
    <article className={styles.row}>
      <div className={styles.rowMain}>
        <div>
          <span className={styles.reference}>
            {item.campaignName} · {providerLabel(item.provider)}
          </span>
          <h3>{item.title}</h3>
          <p>{item.destinationHost ?? "목적지 확인 필요"}</p>
        </div>
        <Status tone={statusTone(item.reviewStatus)}>
          {creativeStatusLabels[item.reviewStatus]}
        </Status>
      </div>
      <div className={styles.creativeReviewPreview}>
        <div className={styles.creativeArtwork}>
          {item.imageUrl ? (
            <img
              alt={item.altText ?? "광고 소재 미리보기"}
              loading="lazy"
              src={item.imageUrl}
            />
          ) : (
            <span>이미지 미등록</span>
          )}
        </div>
        <dl>
          <Meta
            label="광고 표시 문구"
            value={item.disclosureText ?? "미등록"}
          />
          <Meta label="대체 텍스트" value={item.altText ?? "미등록"} />
          <Meta label="전체 목적지" value={item.destinationUrl ?? "미등록"} />
          <Meta label="설명" value={item.description ?? "미등록"} />
        </dl>
        {item.destinationUrl ? (
          <a
            href={item.destinationUrl}
            rel="noreferrer noopener"
            target="_blank"
          >
            목적지 새 창에서 검토
          </a>
        ) : null}
      </div>
      {approvalIssues.length ? (
        <div className={styles.approvalBlockers} role="status">
          <strong>승인 전 {approvalIssues.length}개 확인 필요</strong>
          <ul>
            {approvalIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className={styles.approvalReady}>
          이미지·표시 문구·대체 텍스트·목적지·사실 확인 조건을 충족했습니다.
        </div>
      )}
      <dl className={styles.metaGrid}>
        <Meta
          label="사실 확인"
          value={
            item.factCheckedAt ? formatDateTime(item.factCheckedAt) : "미확인"
          }
        />
        <Meta
          label="만료"
          value={item.expiresAt ? formatDateTime(item.expiresAt) : "미설정"}
        />
        <Meta
          label="최근 변경"
          value={item.updatedAt ? formatDateTime(item.updatedAt) : "기록 없음"}
        />
      </dl>
      <CreativeEditForm item={item} />
      <div className={styles.reviewActions}>
        <label>
          검수 사유
          <textarea
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
        </label>
        <div>
          <button
            disabled={Boolean(pending) || approvalIssues.length > 0}
            onClick={() => update("approved")}
            type="button"
          >
            승인
          </button>
          <button
            disabled={Boolean(pending)}
            onClick={() => update("changes_requested")}
            type="button"
          >
            수정 요청
          </button>
          <button
            data-danger
            disabled={Boolean(pending)}
            onClick={() => update("rejected")}
            type="button"
          >
            거절
          </button>
        </div>
        {message ? <p aria-live="polite">{message}</p> : null}
      </div>
      <AdminConfirmDialog
        confirmLabel="소재 승인"
        description={`${item.title} 소재의 이동 링크, 표시 문구, 사용 권한과 사실 확인일을 모두 검토한 경우에만 승인해 주세요.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void performUpdate("approved")}
        open={confirmOpen}
        pending={pending === "approved"}
        title="소재 검수를 완료했나요?"
        tone="brand"
      />
    </article>
  );
}

function CreativeEditForm({ item }: { item: AdminAdvertisingCreative }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage("");
    const outcome = await postAdminAction(
      "/api/admin/advertising/creatives",
      {
        altText: nullableFormValue(form, "altText"),
        campaignId: item.campaignId,
        creativeId: item.id,
        description: nullableFormValue(form, "description"),
        destinationUrl: nullableFormValue(form, "destinationUrl"),
        disclosureText: nullableFormValue(form, "disclosureText"),
        expiresAt: isoFormValue(form, "expiresAt"),
        factCheckedAt: isoFormValue(form, "factCheckedAt"),
        imageUrl: nullableFormValue(form, "imageUrl"),
        provider: item.provider,
        reason: formValue(form, "reason"),
        title: formValue(form, "title"),
      },
      "PUT",
    );
    setPending(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  return (
    <details className={styles.actionDetails}>
      <summary>소재 정보 수정</summary>
      <form
        className={`${styles.editorForm} ${styles.editorFormInRow}`}
        onSubmit={submit}
      >
        <label>
          소재 제목
          <input
            defaultValue={item.title}
            maxLength={160}
            minLength={2}
            name="title"
            required
          />
        </label>
        <label className={styles.wideField}>
          설명
          <textarea
            defaultValue={item.description ?? ""}
            maxLength={500}
            name="description"
          />
        </label>
        <label className={styles.wideField}>
          이미지 URL
          <input
            defaultValue={item.imageUrl ?? ""}
            name="imageUrl"
            type="url"
          />
        </label>
        <label className={styles.wideField}>
          이미지 대체 텍스트
          <input
            defaultValue={item.altText ?? ""}
            maxLength={300}
            name="altText"
          />
        </label>
        <label className={styles.wideField}>
          이동 URL
          <input
            defaultValue={item.destinationUrl ?? ""}
            name="destinationUrl"
            type="url"
          />
        </label>
        <label className={styles.wideField}>
          광고·제휴 표시 문구
          <textarea
            defaultValue={item.disclosureText ?? ""}
            maxLength={500}
            name="disclosureText"
          />
        </label>
        <label>
          사실 확인 시각
          <input
            defaultValue={toDateTimeLocal(item.factCheckedAt)}
            name="factCheckedAt"
            type="datetime-local"
          />
        </label>
        <label>
          소재 만료 시각
          <input
            defaultValue={toDateTimeLocal(item.expiresAt)}
            name="expiresAt"
            type="datetime-local"
          />
        </label>
        <label className={styles.wideField}>
          수정 사유
          <textarea maxLength={500} minLength={2} name="reason" required />
        </label>
        <button disabled={pending} type="submit">
          {pending ? "저장 중" : "수정 후 재검수 요청"}
        </button>
        {message ? <p aria-live="polite">{message}</p> : null}
      </form>
    </details>
  );
}

function PerformancePanel({ data }: { data: AdminAdvertisingData }) {
  if (!data.metrics.available)
    return <Unavailable message={data.metrics.message} />;
  if (data.metrics.items.length === 0)
    return (
      <Empty
        title="연결된 실제 성과 데이터가 없습니다"
        detail="공급자 공식 리포트 또는 집계 데이터가 들어오기 전에는 추정 수익을 표시하지 않습니다."
      />
    );
  const totals = data.metrics.items.reduce(
    (sum, item) => ({
      impressions: sum.impressions + item.impressions,
      viewable: sum.viewable + item.viewableImpressions,
      fill: sum.fill + item.fillCount,
      noFill: sum.noFill + item.noFillCount,
      errors: sum.errors + item.errors,
      hides: sum.hides + item.hideCount,
      feedback: sum.feedback + item.feedbackCount,
    }),
    {
      impressions: 0,
      viewable: 0,
      fill: 0,
      noFill: 0,
      errors: 0,
      hides: 0,
      feedback: 0,
    },
  );
  return (
    <Panel
      title="성과·품질"
      description="실제 집계만 표시하며 보호 지표를 수익보다 먼저 확인합니다."
    >
      <DataScope
        shown={data.metrics.items.length}
        total={data.metrics.totalCount}
        truncated={data.metrics.truncated}
      />
      <div className={styles.metricGrid}>
        <Metric label="노출" value={formatNumber(totals.impressions)} />
        <Metric label="조회 가능 노출" value={formatNumber(totals.viewable)} />
        <Metric
          label="채움 / 미채움"
          value={`${formatNumber(totals.fill)} / ${formatNumber(totals.noFill)}`}
        />
        <Metric label="오류" value={formatNumber(totals.errors)} />
        <Metric label="숨김" value={formatNumber(totals.hides)} />
        <Metric label="불편 의견" value={formatNumber(totals.feedback)} />
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>공급자</th>
              <th>슬롯</th>
              <th>노출</th>
              <th>오류</th>
              <th>수익</th>
            </tr>
          </thead>
          <tbody>
            {data.metrics.items.map((item) => (
              <tr key={`${item.date}-${item.provider}-${item.placementKey}`}>
                <td>{formatDate(item.date)}</td>
                <td>{providerLabel(item.provider)}</td>
                <td>{item.placementKey}</td>
                <td>{formatNumber(item.impressions)}</td>
                <td>{formatNumber(item.errors)}</td>
                <td>
                  {item.revenueAmount === null
                    ? "미연동"
                    : formatCurrency(item.revenueAmount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SettingsPanel({ data }: { data: AdminAdvertisingData }) {
  const readinessItems = data.environmentReadiness.flatMap(
    (group) => group.items,
  );
  const configuredCount = readinessItems.filter(
    (item) => item.configured,
  ).length;

  return (
    <div className={styles.settingsStack}>
      <Panel
        title="환경 설정 준비 상태"
        description="운영 환경의 설정 여부만 확인합니다. 실제 환경변수 값과 식별자는 보안상 표시하지 않습니다."
      >
        <div className={styles.readinessSummary}>
          <div>
            <strong>
              {configuredCount}/{readinessItems.length}
            </strong>
            <span>설정 완료</span>
          </div>
          <p>
            미설정 항목을 채운 뒤 운영 배포를 다시 실행하면 이 화면에
            반영됩니다.
          </p>
        </div>
        <div className={styles.readinessGroups}>
          {data.environmentReadiness.map((group) => {
            const complete = group.items.every((item) => item.configured);
            return (
              <section className={styles.readinessGroup} key={group.key}>
                <header>
                  <h3>{group.title}</h3>
                  <Status tone={complete ? "success" : "warning"}>
                    {complete ? "준비됨" : "확인 필요"}
                  </Status>
                </header>
                <ul>
                  {group.items.map((item) => (
                    <li key={item.key}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </div>
                      <Status tone={item.configured ? "success" : "neutral"}>
                        {item.configured ? "설정됨" : "미설정"}
                      </Status>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </Panel>
      <Panel
        title="송출 안전 설정"
        description="긴급 중지는 즉시 적용되며, 재활성화도 확인과 감사 기록을 거칩니다."
      >
        {!data.killSwitches.available ? (
          <Unavailable message={data.killSwitches.message} />
        ) : data.killSwitches.items.length === 0 ? (
          <Empty
            title="중지 설정이 등록되지 않았습니다"
            detail="전역·공급자·슬롯 중지 설정이 데이터베이스에 준비되면 이곳에서 제어할 수 있습니다."
          />
        ) : (
          <div className={styles.list}>
            {data.killSwitches.items.map((item) => (
              <article className={styles.row} key={`${item.scope}-${item.key}`}>
                <div className={styles.rowMain}>
                  <div>
                    <span className={styles.reference}>
                      {scopeLabel(item.scope)}
                    </span>
                    <h3>{item.key}</h3>
                    <p>{item.reason ?? "최근 사유 없음"}</p>
                  </div>
                  <Status tone={item.suspended ? "danger" : "success"}>
                    {item.suspended ? "중지" : "허용"}
                  </Status>
                </div>
                <KillSwitchForm
                  endpoint="/api/admin/advertising/kill-switch"
                  item={item}
                />
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function KillSwitchForm({
  endpoint,
  item,
}: {
  endpoint: string;
  item: AdminAdvertisingKillSwitch;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const nextSuspended = !item.suspended;

  async function performUpdate() {
    setPending(true);
    const outcome = await postAdminAction(endpoint, {
      key: item.key,
      reason,
      scope: item.scope,
      suspended: nextSuspended,
    });
    setPending(false);
    setConfirmOpen(false);
    setMessage(outcome.message);
    if (outcome.ok) router.refresh();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setConfirmOpen(true);
  }
  return (
    <>
      <form className={styles.killForm} onSubmit={submit}>
        <label>
          변경 사유
          <input
            maxLength={500}
            minLength={2}
            onChange={(event) => setReason(event.target.value)}
            required
            value={reason}
          />
        </label>
        <button data-danger={nextSuspended} disabled={pending} type="submit">
          {pending ? "적용 중" : nextSuspended ? "즉시 중지" : "재활성화"}
        </button>
        {message ? <p aria-live="polite">{message}</p> : null}
      </form>
      <AdminConfirmDialog
        confirmLabel={nextSuspended ? "즉시 중지" : "재활성화"}
        description={`${item.key} 송출을 ${nextSuspended ? "중지" : "재활성화"}합니다. 변경 사유와 처리 기록은 운영 기록에 남습니다.`}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void performUpdate()}
        open={confirmOpen}
        pending={pending}
        title={`송출을 ${nextSuspended ? "중지" : "재활성화"}할까요?`}
        tone={nextSuspended ? "danger" : "brand"}
      />
    </>
  );
}

function Panel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div>
      <header className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      {children}
    </div>
  );
}

function DataScope({
  shown,
  total,
  truncated,
}: {
  shown: number;
  total?: number;
  truncated?: boolean;
}) {
  return (
    <p className={styles.dataScope} data-truncated={Boolean(truncated)}>
      {truncated
        ? `전체 ${formatNumber(total ?? shown)}건 중 최근 ${formatNumber(shown)}건을 표시합니다. 상단 업무 수치는 현재 표시 범위 기준입니다.`
        : `전체 ${formatNumber(total ?? shown)}건 · 최신순`}
    </p>
  );
}
function Unavailable({ message }: { message: string | null }) {
  return (
    <div className={styles.unavailable}>
      <ShieldAlert aria-hidden="true" size={24} strokeWidth={1.7} />
      <strong>광고 운영 기능을 준비해야 합니다</strong>
      <p>
        {message ??
          "최신 데이터베이스 마이그레이션과 연결 상태를 확인해 주세요."}
      </p>
    </div>
  );
}
function Empty({ detail, title }: { detail: string; title: string }) {
  return (
    <div className={styles.empty}>
      <CheckCircle2 aria-hidden="true" size={24} strokeWidth={1.7} />
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}
function Status({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <em className={styles.status} data-tone={tone}>
      {children}
    </em>
  );
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function buildStats(data: AdminAdvertisingData) {
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const newCount = data.inquiries.items.filter(
    (item) => item.status === "received",
  ).length;
  const dueCount = data.inquiries.items.filter(
    (item) =>
      isUnanswered(item.status) &&
      item.firstResponseDueAt &&
      new Date(item.firstResponseDueAt) <= todayEnd,
  ).length;
  const overdueCount = data.inquiries.items.filter((item) =>
    isOverdue(item.firstResponseDueAt, item.status),
  ).length;
  const progressingCount = data.inquiries.items.filter((item) =>
    ["contacted", "proposal_sent", "negotiating"].includes(item.status),
  ).length;
  const mailFailedCount = data.inquiries.items.filter(
    (item) => item.mailStatus === "failed",
  ).length;
  const creativePendingCount = data.creatives.items.filter(
    (item) => item.reviewStatus === "pending",
  ).length;
  const activeSlots = data.inventory.items.filter(
    (item) => item.isActive,
  ).length;
  const value = (available: boolean, count: number) =>
    available ? `${formatNumber(count)}건` : "연결 확인";
  return {
    actionCount:
      newCount + overdueCount + mailFailedCount + creativePendingCount,
    items: [
      {
        icon: Inbox,
        label: "신규 문의",
        tab: "inquiries" as const,
        value: value(data.inquiries.available, newCount),
      },
      {
        icon: Clock3,
        label: "오늘까지 미응답",
        tab: "inquiries" as const,
        value: value(data.inquiries.available, dueCount),
      },
      {
        icon: AlertTriangle,
        label: "SLA 초과",
        tab: "inquiries" as const,
        value: value(data.inquiries.available, overdueCount),
      },
      {
        icon: Megaphone,
        label: "연락·제안 진행",
        tab: "inquiries" as const,
        value: value(data.inquiries.available, progressingCount),
      },
      {
        icon: ShieldAlert,
        label: "메일 실패",
        tab: "inquiries" as const,
        value: value(data.inquiries.available, mailFailedCount),
      },
      {
        icon: CircleDollarSign,
        label: "정책 검수 대기",
        tab: "creatives" as const,
        value: value(data.creatives.available, creativePendingCount),
      },
      {
        icon: PanelTop,
        label: "송출 중 슬롯",
        tab: "inventory" as const,
        value: value(data.inventory.available, activeSlots),
      },
    ],
  };
}

async function postAdminAction(
  path: string,
  body: unknown,
  method: "POST" | "PUT" = "POST",
) {
  try {
    const response = await fetch(path, {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json" },
      method,
    });
    const payload = (await response.json().catch(() => null)) as {
      message?: string;
      ok?: boolean;
    } | null;
    if (!response.ok || !payload?.ok)
      return { message: payload?.message ?? "변경하지 못했습니다.", ok: false };
    return { message: "변경했습니다.", ok: true };
  } catch {
    return {
      message: "연결이 불안정합니다. 잠시 뒤 다시 시도해 주세요.",
      ok: false,
    };
  }
}

function sortInquiries(
  left: AdminAdvertisingInquiry,
  right: AdminAdvertisingInquiry,
) {
  const priority = { urgent: 0, high: 1, normal: 2, low: 3 };
  const overdue =
    Number(isOverdue(right.firstResponseDueAt, right.status)) -
    Number(isOverdue(left.firstResponseDueAt, left.status));
  return (
    overdue ||
    priority[left.priority] - priority[right.priority] ||
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}
function isUnanswered(status: AdvertisingInquiryStatus) {
  return status === "received" || status === "reviewing";
}
function isOverdue(value: string | null, status: AdvertisingInquiryStatus) {
  return Boolean(
    value && isUnanswered(status) && new Date(value).getTime() < Date.now(),
  );
}
function mailStatusLabel(value: AdminAdvertisingInquiry["mailStatus"]) {
  return value === "failed"
    ? "전송 실패"
    : value === "pending"
      ? "전송 대기"
      : value === "sent"
        ? "전송 완료"
        : "연결 확인";
}
function workerLabel(value: string) {
  return (
    {
      degraded: "일부 확인 필요",
      failed: "실패",
      running: "실행 중",
      succeeded: "정상",
    }[value] ?? value
  );
}
function inquiryTypeLabel(value: string) {
  return labelFrom(
    value,
    {
      banner: "배너 광고",
      branded_together_pack: "브랜드 함께하기",
      contextual_affiliate: "문맥형 제휴",
      other: "기타 제휴",
    },
    "문의 유형 미입력",
  );
}
function budgetBandLabel(value: string) {
  return labelFrom(
    value,
    {
      "1m_3m": "100만~300만원",
      "3m_10m": "300만~1,000만원",
      over_10m: "1,000만원 이상",
      under_1m: "100만원 미만",
      undecided: "예산 협의",
    },
    "예산 미입력",
  );
}
function campaignObjectiveLabel(value: string) {
  return labelFrom(
    value,
    {
      awareness: "브랜드 인지도",
      engagement: "사용자 참여",
      launch: "신제품·서비스 출시",
      other: "기타 목적",
      traffic: "웹사이트 방문",
    },
    "목적 미입력",
  );
}

function campaignNextStatuses(
  status: AdvertisingCampaignStatus,
): AdvertisingCampaignStatus[] {
  const transitions: Record<
    AdvertisingCampaignStatus,
    AdvertisingCampaignStatus[]
  > = {
    active: ["paused", "ended"],
    approved: ["scheduled", "policy_review"],
    draft: ["policy_review"],
    ended: [],
    paused: ["policy_review", "ended"],
    policy_review: ["approved", "draft"],
    scheduled: ["active", "paused", "ended", "policy_review"],
  };
  return transitions[status];
}

function creativeApprovalIssues(item: AdminAdvertisingCreative) {
  if (item.provider === "direct")
    return ["직접 광고 송출 기능은 아직 잠겨 있습니다."];
  if (item.provider === "adsense") return [];
  const issues: string[] = [];
  if (!item.imageUrl) issues.push("실제 소재 이미지가 필요합니다.");
  if (!item.destinationUrl) issues.push("검토할 목적지 URL이 필요합니다.");
  if (!item.altText || item.altText.trim().length < 2)
    issues.push("접근성 대체 텍스트가 필요합니다.");
  if (
    !item.disclosureText ||
    !item.disclosureText.includes("일정액의 수수료")
  ) {
    issues.push("쿠팡 파트너스 대가성 표시 문구가 필요합니다.");
  }
  if (!item.factCheckedAt)
    issues.push("상품·문구 사실 확인 시각이 필요합니다.");
  if (item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now())
    issues.push("만료된 소재는 다시 확인해야 합니다.");
  return issues;
}
function preferredPlacementLabel(value: string) {
  return labelFrom(
    value,
    {
      community: "커뮤니티",
      consultation: "위치 협의",
      home: "홈",
      together_future: "함께하기(향후)",
    },
    "희망 위치 미입력",
  );
}
function creativeReadinessLabel(value: string) {
  return labelFrom(
    value,
    {
      in_progress: "제작 중",
      needs_collaboration: "제작 협업 필요",
      ready: "준비 완료",
    },
    "소재 상태 미입력",
  );
}
function scheduleModeLabel(value: string) {
  return labelFrom(
    value,
    { fixed: "희망 일정 지정", flexible: "일정 협의 가능" },
    "일정 방식 미입력",
  );
}
function labelFrom(
  value: string,
  labels: Record<string, string>,
  emptyLabel: string,
) {
  if (!value || value === "미입력") return emptyLabel;
  return labels[value] ?? value;
}
function statusTone(value: string) {
  if (["active", "approved", "contracted", "sent"].includes(value))
    return "success";
  if (["rejected", "spam", "ended", "expired"].includes(value)) return "danger";
  if (
    [
      "received",
      "reviewing",
      "policy_review",
      "pending",
      "changes_requested",
    ].includes(value)
  )
    return "warning";
  return "neutral";
}
function providerLabel(value: string) {
  return value === "adsense"
    ? "Google AdSense"
    : value === "coupang"
      ? "쿠팡 파트너스"
      : value === "direct"
        ? "직접 제휴"
        : "공급자 미설정";
}
function scopeLabel(value: AdminAdvertisingKillSwitch["scope"]) {
  return value === "global" ? "전역" : value === "provider" ? "공급자" : "슬롯";
}
function formValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}
function nullableFormValue(form: FormData, key: string) {
  return formValue(form, key) || null;
}
function numberFormValue(form: FormData, key: string) {
  return Number(formValue(form, key));
}
function isoFormValue(form: FormData, key: string) {
  const value = formValue(form, key);
  return value ? new Date(value).toISOString() : null;
}
function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + 9 * 60 * 60 * 1_000)
    .toISOString()
    .slice(0, 16);
}
function formatNumber(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("ko-KR", {
    currency: "KRW",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}
function formatDate(value: string) {
  const parts = getKoreanDateParts(value);
  return parts ? `${parts.year}. ${parts.month}. ${parts.day}.` : value;
}
function formatDateTime(value: string) {
  const parts = getKoreanDateParts(value);
  if (!parts) return value;
  const period = parts.hour < 12 ? "오전" : "오후";
  const displayHour = parts.hour % 12 || 12;
  return `${parts.year}. ${parts.month}. ${parts.day}. ${period} ${displayHour}:${String(parts.minute).padStart(2, "0")}`;
}
function getKoreanDateParts(value: string) {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  const koreanTime = new Date(instant.getTime() + 9 * 60 * 60 * 1_000);
  return {
    day: koreanTime.getUTCDate(),
    hour: koreanTime.getUTCHours(),
    minute: koreanTime.getUTCMinutes(),
    month: koreanTime.getUTCMonth() + 1,
    year: koreanTime.getUTCFullYear(),
  };
}
function formatRange(start: string | null, end: string | null) {
  if (!start && !end) return "미정";
  return `${start ? formatDate(start) : "시작 미정"} ~ ${end ? formatDate(end) : "종료 미정"}`;
}
