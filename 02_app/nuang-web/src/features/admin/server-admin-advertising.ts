import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  advertisingCampaignStatuses,
  advertisingCreativeReviewStatuses,
  advertisingInquiryStatuses,
  type AdminAdvertisingCampaign,
  type AdminAdvertisingCreative,
  type AdminAdvertisingData,
  type AdminAdvertisingInquiry,
  type AdminAdvertisingInventory,
  type AdminAdvertisingKillSwitch,
  type AdminAdvertisingMetric,
  type AdminAdvertisingModule,
  type AdminAdvertisingReadinessGroup,
  type AdvertisingProvider,
} from "./admin-advertising-contract";

type Row = Record<string, unknown>;

type TableRead = {
  available: boolean;
  message: string | null;
  rows: Row[];
};

export async function readAdminAdvertising({
  adminAccountId,
  client,
}: {
  adminAccountId: string;
  client: SupabaseClient;
}): Promise<AdminAdvertisingData> {
  const [
    inquiriesRead,
    outboxRead,
    campaignsRead,
    inventoryRead,
    creativesRead,
    metricsRead,
    killSwitchRead,
  ] = await Promise.all([
    readTable(client, "advertising_inquiry", 300),
    readTable(client, "advertising_mail_outbox", 600),
    readTable(client, "advertising_campaign", 300),
    readTable(client, "advertising_inventory", 100),
    readTable(client, "advertising_creative", 500),
    readTable(client, "advertising_metric_daily", 1000),
    readTable(client, "advertising_kill_switch", 100),
  ]);

  const outboxByInquiry = groupRows(outboxRead.rows, "inquiry_id");
  const creativesByCampaign = groupRows(creativesRead.rows, "campaign_id");
  const campaignNames = new Map(
    campaignsRead.rows.flatMap((row) => {
      const id = text(row.id);
      return id ? [[id, text(row.name) ?? "이름 없는 캠페인"] as const] : [];
    }),
  );

  return {
    campaigns: mapModule(campaignsRead, (row) =>
      mapCampaign(row, creativesByCampaign),
    ),
    creatives: mapModule(creativesRead, (row) =>
      mapCreative(row, campaignNames),
    ),
    environmentReadiness: readAdvertisingEnvironmentReadiness(),
    generatedAt: new Date().toISOString(),
    inquiries: mapModule(inquiriesRead, (row) =>
      mapInquiry(row, adminAccountId, outboxRead.available, outboxByInquiry),
    ),
    inventory: mapModule(inventoryRead, mapInventory),
    killSwitches: mapModule(killSwitchRead, mapKillSwitch),
    metrics: mapModule(metricsRead, mapMetric),
  };
}

export function readAdvertisingEnvironmentReadiness(): AdminAdvertisingReadinessGroup[] {
  const enabled = (key: string) => process.env[key]?.trim() === "true";
  const present = (key: string) => Boolean(process.env[key]?.trim());
  const anyPresent = (...keys: string[]) => keys.some(present);

  return [
    {
      items: [
        readiness(
          "ADVERTISING_ENABLED",
          "광고 전체 송출",
          enabled("ADVERTISING_ENABLED"),
          "전체 공급자의 최상위 송출 스위치",
        ),
      ],
      key: "global",
      title: "전체 송출",
    },
    {
      items: [
        readiness(
          "ADSENSE_ENABLED",
          "AdSense 송출",
          enabled("ADSENSE_ENABLED"),
          "AdSense 공급자 스위치",
        ),
        readiness(
          "ADSENSE_SITE_READY",
          "사이트 심사",
          enabled("ADSENSE_SITE_READY"),
          "사이트 승인과 ads.txt 준비 상태",
        ),
        readiness(
          "ADSENSE_PRIVACY_READY",
          "개인정보 고지",
          enabled("ADSENSE_PRIVACY_READY"),
          "광고 개인정보 고지 준비 상태",
        ),
        readiness(
          "ADSENSE_CSP_REPORT_ONLY_READY",
          "CSP 관찰",
          enabled("ADSENSE_CSP_REPORT_ONLY_READY"),
          "콘텐츠 보안 정책 관찰 준비 상태",
        ),
        readiness(
          "ADSENSE_EEA_CMP_READY",
          "EEA 동의 관리",
          enabled("ADSENSE_EEA_CMP_READY"),
          "EEA 사용자 동의 관리 준비 상태",
        ),
        readiness(
          "ADSENSE_PUBLISHER_ID",
          "게시자 ID",
          present("ADSENSE_PUBLISHER_ID"),
          "실제 식별자는 화면에 표시하지 않음",
        ),
        readiness(
          "ADSENSE_HOME_SLOT_ID",
          "홈 슬롯 ID",
          present("ADSENSE_HOME_SLOT_ID"),
          "실제 식별자는 화면에 표시하지 않음",
        ),
      ],
      key: "adsense",
      title: "Google AdSense",
    },
    {
      items: [
        readiness(
          "COUPANG_PARTNERS_ENABLED",
          "파트너스 송출",
          enabled("COUPANG_PARTNERS_ENABLED"),
          "쿠팡 파트너스 공급자 스위치",
        ),
        readiness(
          "COUPANG_POLICY_READY",
          "운영 정책",
          enabled("COUPANG_POLICY_READY"),
          "파트너스 정책 검토 완료 상태",
        ),
        readiness(
          "COUPANG_ALLOWED_DESTINATION_HOSTS",
          "이동 허용 도메인",
          present("COUPANG_ALLOWED_DESTINATION_HOSTS"),
          "등록된 도메인 값은 화면에 표시하지 않음",
        ),
        readiness(
          "COUPANG_ALLOWED_IMAGE_HOSTS",
          "이미지 허용 도메인",
          present("COUPANG_ALLOWED_IMAGE_HOSTS"),
          "등록된 도메인 값은 화면에 표시하지 않음",
        ),
      ],
      key: "coupang",
      title: "쿠팡 파트너스",
    },
    {
      items: [
        readiness(
          "AD_INQUIRY_NOTIFICATION_EMAILS",
          "문의 수신 이메일",
          anyPresent(
            "AD_INQUIRY_NOTIFICATION_EMAILS",
            "ADMIN_REVIEW_NOTIFICATION_EMAILS",
            "ADMIN_BOOTSTRAP_EMAILS",
          ),
          "운영 수신자 또는 대체 수신자 설정",
        ),
        readiness(
          "AD_INQUIRY_FROM",
          "접수 메일 발신자",
          anyPresent(
            "AD_INQUIRY_FROM",
            "ADMIN_NOTIFICATION_FROM",
            "EMAIL_VERIFICATION_FROM",
          ),
          "광고 문의 전용 또는 공통 발신자 설정",
        ),
        readiness(
          "RESEND_API_KEY",
          "메일 발송 서비스",
          present("RESEND_API_KEY"),
          "메일 공급자 인증 정보",
        ),
        readiness(
          "AD_OUTBOX_CRON_SECRET",
          "Outbox 예약 작업",
          present("AD_OUTBOX_CRON_SECRET"),
          "예약 발송 작업 인증 정보",
        ),
        readiness(
          "AD_RESEND_WEBHOOK_SECRET",
          "메일 상태 Webhook",
          present("AD_RESEND_WEBHOOK_SECRET"),
          "전송·반송 상태 수신 인증 정보",
        ),
        readiness(
          "FIELD_ENCRYPTION_KEY",
          "문의 정보 암호화",
          present("FIELD_ENCRYPTION_KEY"),
          "연락처와 문의 원문 암호화 키",
        ),
        readiness(
          "AD_CONTACT_HASH_PEPPER",
          "중복·악용 방지",
          present("AD_CONTACT_HASH_PEPPER"),
          "문의 중복 및 요청 지문 보호 설정",
        ),
      ],
      key: "inquiry",
      title: "문의 메일·보안",
    },
  ];
}

function readiness(
  key: string,
  label: string,
  configured: boolean,
  description: string,
) {
  return { configured, description, key, label };
}

async function readTable(
  client: SupabaseClient,
  table: string,
  limit: number,
): Promise<TableRead> {
  const response = await client.from(table).select("*").limit(limit);
  if (response.error) {
    return {
      available: false,
      message: isUnavailableError(response.error.code)
        ? "광고 운영 데이터베이스를 준비해야 합니다. 최신 마이그레이션을 적용해 주세요."
        : "이 운영 데이터를 불러오지 못했습니다. 연결 상태를 확인해 주세요.",
      rows: [],
    };
  }
  return {
    available: true,
    message: null,
    rows: (response.data ?? []) as Row[],
  };
}

function mapInquiry(
  row: Row,
  adminAccountId: string,
  outboxAvailable: boolean,
  outboxByInquiry: Map<string, Row[]>,
): AdminAdvertisingInquiry | null {
  const id = text(row.id);
  const publicReference = text(row.public_reference);
  const createdAt = text(row.created_at);
  if (!id || !publicReference || !createdAt) return null;
  const outbox = outboxByInquiry.get(id) ?? [];

  return {
    assignedToCurrentAdmin:
      text(row.assigned_admin_account_id) === adminAccountId,
    budgetBand: text(row.budget_band) ?? "미입력",
    campaignObjective: text(row.campaign_objective) ?? "미입력",
    companyName: text(row.company_name) ?? "회사명 미입력",
    contactEmailMasked: text(row.contact_email_masked),
    createdAt,
    creativeReadiness: text(row.creative_readiness) ?? "미입력",
    desiredEnd: text(row.desired_end_date ?? row.desired_end),
    desiredStart: text(row.desired_start_date ?? row.desired_start),
    firstResponseDueAt: text(row.first_response_due_at),
    id,
    inquiryType: text(row.inquiry_type) ?? "기타 문의",
    mailStatus: resolveMailStatus(outboxAvailable, outbox),
    nextActionAt: text(row.next_action_at),
    preferredPlacement: text(row.preferred_placement) ?? "미입력",
    priority: priority(row.priority),
    privacyConsentedAt: text(row.privacy_consented_at) ?? createdAt,
    publicReference,
    riskFlags: stringArray(row.risk_flags),
    scheduleMode: text(row.schedule_mode) ?? "미입력",
    status: inquiryStatus(row.status),
    targetAudience: text(row.target_audience) ?? "미입력",
    websiteHost: safeHost(text(row.website_url)),
  };
}

function mapCampaign(
  row: Row,
  creativesByCampaign: Map<string, Row[]>,
): AdminAdvertisingCampaign | null {
  const id = text(row.id);
  if (!id) return null;
  return {
    budgetNote: text(row.budget_note),
    creativeCount: creativesByCampaign.get(id)?.length ?? 0,
    endsAt: text(row.ends_at) ?? text(row.end_at),
    id,
    inquiryId: text(row.inquiry_id),
    name: text(row.name) ?? "이름 없는 캠페인",
    objective: text(row.objective) ?? "other",
    placementKeys: stringArray(row.placement_keys ?? row.slot_keys),
    policyApprovedAt: text(row.policy_approved_at),
    policyVersion: text(row.policy_version),
    provider: provider(row.provider),
    startsAt: text(row.starts_at) ?? text(row.start_at),
    status: campaignStatus(row.status),
  };
}

function mapInventory(row: Row): AdminAdvertisingInventory | null {
  const id = text(row.id);
  const placementKey = text(row.placement_key);
  if (!id || !placementKey) return null;
  return {
    activeFrom: text(row.active_from),
    activeUntil: text(row.active_until),
    dailyCap: numberOrNull(row.daily_cap ?? row.daily_frequency_cap),
    id,
    isActive: boolean(row.is_active ?? row.enabled),
    minimumIntervalSeconds: numberOrNull(row.minimum_interval_seconds) ?? 0,
    minimumOrganicCount:
      numberOrNull(row.minimum_organic_count ?? row.minimum_content_count) ?? 0,
    placementKey,
    provider: provider(row.provider),
    routeContext: text(row.route_context) ?? "미설정",
    rolloutPercentage: numberOrNull(row.rollout_percentage) ?? 0,
    sessionCap: numberOrNull(row.session_cap ?? row.session_frequency_cap),
    updatedAt: text(row.updated_at) ?? text(row.created_at) ?? "",
  };
}

function mapCreative(
  row: Row,
  campaignNames: Map<string, string>,
): AdminAdvertisingCreative | null {
  const id = text(row.id);
  if (!id) return null;
  const campaignId = text(row.campaign_id);
  return {
    altText: text(row.alt_text),
    campaignName:
      (campaignId ? campaignNames.get(campaignId) : null) ?? "연결 캠페인 없음",
    campaignId: campaignId ?? "",
    description: text(row.description),
    destinationUrl: text(row.destination_url),
    destinationHost: safeHost(text(row.destination_url)),
    disclosureText: text(row.disclosure_text),
    expiresAt: text(row.expires_at),
    factCheckedAt: text(row.fact_checked_at),
    id,
    imageUrl: text(row.image_url),
    provider: provider(row.provider),
    reviewStatus: creativeStatus(row.review_status ?? row.status),
    title: text(row.title) ?? "제목 없는 소재",
    updatedAt: text(row.updated_at) ?? text(row.created_at) ?? "",
  };
}

function mapMetric(row: Row): AdminAdvertisingMetric | null {
  const date = text(row.metric_date ?? row.date);
  const placementKey = text(row.placement_key);
  if (!date || !placementKey) return null;
  return {
    clicks: numberOrNull(row.clicks),
    date,
    errors: numberOrNull(row.error_count ?? row.errors) ?? 0,
    feedbackCount: numberOrNull(row.feedback_count) ?? 0,
    fillCount: numberOrNull(row.fill_count) ?? 0,
    hideCount: numberOrNull(row.hide_count) ?? 0,
    impressions: numberOrNull(row.impressions) ?? 0,
    noFillCount: numberOrNull(row.no_fill_count) ?? 0,
    placementKey,
    provider: provider(row.provider),
    revenueAmount: numberOrNull(row.revenue_amount),
    viewableImpressions: numberOrNull(row.viewable_impressions) ?? 0,
  };
}

function mapKillSwitch(row: Row): AdminAdvertisingKillSwitch | null {
  const scope = text(row.scope);
  const key = text(row.switch_key ?? row.key);
  if (!key || !["global", "provider", "slot"].includes(scope ?? "")) {
    return null;
  }
  return {
    key,
    reason: text(row.reason),
    scope: scope as AdminAdvertisingKillSwitch["scope"],
    suspended: boolean(row.suspended ?? row.is_suspended),
    updatedAt: text(row.updated_at) ?? text(row.created_at) ?? "",
  };
}

function mapModule<T>(
  read: TableRead,
  mapper: (row: Row) => T | null,
): AdminAdvertisingModule<T> {
  return {
    available: read.available,
    items: read.rows.flatMap((row) => {
      const item = mapper(row);
      return item ? [item] : [];
    }),
    message: read.message,
  };
}

function groupRows(rows: Row[], key: string) {
  const groups = new Map<string, Row[]>();
  rows.forEach((row) => {
    const value = text(row[key]);
    if (!value) return;
    groups.set(value, [...(groups.get(value) ?? []), row]);
  });
  return groups;
}

function resolveMailStatus(
  available: boolean,
  rows: Row[],
): AdminAdvertisingInquiry["mailStatus"] {
  if (!available) return "unknown";
  const statuses = rows.map((row) => text(row.status));
  if (
    statuses.some((value) =>
      ["dead", "bounced", "complained"].includes(value ?? ""),
    )
  ) {
    return "failed";
  }
  if (statuses.length > 0 && statuses.every((value) => value === "sent")) {
    return "sent";
  }
  return statuses.length > 0 ? "pending" : "unknown";
}

function inquiryStatus(value: unknown) {
  const normalized = text(value);
  return advertisingInquiryStatuses.includes(
    normalized as (typeof advertisingInquiryStatuses)[number],
  )
    ? (normalized as (typeof advertisingInquiryStatuses)[number])
    : "received";
}

function campaignStatus(value: unknown) {
  const normalized = text(value);
  return advertisingCampaignStatuses.includes(
    normalized as (typeof advertisingCampaignStatuses)[number],
  )
    ? (normalized as (typeof advertisingCampaignStatuses)[number])
    : "draft";
}

function creativeStatus(value: unknown) {
  const normalized = text(value);
  return advertisingCreativeReviewStatuses.includes(
    normalized as (typeof advertisingCreativeReviewStatuses)[number],
  )
    ? (normalized as (typeof advertisingCreativeReviewStatuses)[number])
    : "pending";
}

function provider(value: unknown): AdvertisingProvider {
  const normalized = text(value)?.toLowerCase();
  if (normalized === "google_adsense" || normalized === "google") {
    return "adsense";
  }
  if (
    normalized === "adsense" ||
    normalized === "coupang" ||
    normalized === "direct"
  ) {
    return normalized;
  }
  return "unknown";
}

function priority(value: unknown): AdminAdvertisingInquiry["priority"] {
  const normalized = text(value);
  return normalized === "high" ||
    normalized === "low" ||
    normalized === "urgent"
    ? normalized
    : "normal";
}

function safeHost(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.flatMap((item) => (typeof item === "string" ? [item] : []))
    : [];
}

function numberOrNull(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

function boolean(value: unknown) {
  return value === true;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isUnavailableError(code: string | undefined) {
  return ["42P01", "42883", "PGRST202", "PGRST204", "PGRST205"].includes(
    code ?? "",
  );
}
