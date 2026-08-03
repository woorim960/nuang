import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const CONSENT_TYPES = ["analytics", "marketing"] as const;
const CONSENT_STATUSES = ["granted", "revoked"] as const;
const RECENT_CHANGE_LIMIT = 100;

export type AdminConsentType = (typeof CONSENT_TYPES)[number];
export type AdminConsentStatus = (typeof CONSENT_STATUSES)[number];
export type AdminConsentTypeFilter = AdminConsentType | "all";
export type AdminConsentStatusFilter = AdminConsentStatus | "all";

export type AdminConsentFilters = {
  status: AdminConsentStatusFilter;
  type: AdminConsentTypeFilter;
};

export type AdminConsentMetric = {
  denominator: number | null;
  state: "ready" | "empty" | "unavailable";
  value: number | null;
};

export type AdminConsentChange = {
  accountRef: string;
  consentVersion: string;
  recordedAt: string;
  source:
    | "account_gate"
    | "account_merge"
    | "legacy_backfill"
    | "my_settings"
    | "other";
  status: AdminConsentStatus;
  type: AdminConsentType;
};

export type AdminConsentDashboard = {
  analyticsEventsAvailable: boolean;
  filters: AdminConsentFilters;
  generatedAt: string;
  metrics: {
    analyticsEvents24h: AdminConsentMetric;
    analyticsOptIn: AdminConsentMetric;
    changes7d: AdminConsentMetric;
    currentAccounts: AdminConsentMetric;
    marketingOptIn: AdminConsentMetric;
    marketingReady: AdminConsentMetric;
  };
  recentChanges: {
    available: boolean;
    items: AdminConsentChange[];
  };
};

type CountResult = { available: boolean; value: number };

type RawConsentRecord = {
  [key: string]: unknown;
  account_id?: unknown;
  consent_type?: unknown;
  consent_version?: unknown;
  recorded_at?: unknown;
  source?: unknown;
  status?: unknown;
};

export function normalizeAdminConsentFilters(input: {
  status?: string | null;
  type?: string | null;
}): AdminConsentFilters {
  return {
    status: CONSENT_STATUSES.includes(input.status as AdminConsentStatus)
      ? (input.status as AdminConsentStatus)
      : "all",
    type: CONSENT_TYPES.includes(input.type as AdminConsentType)
      ? (input.type as AdminConsentType)
      : "all",
  };
}

export async function readAdminConsentDashboard({
  client,
  filters = { status: "all", type: "all" },
  now = new Date(),
}: {
  client: SupabaseClient;
  filters?: AdminConsentFilters;
  now?: Date;
}): Promise<AdminConsentDashboard> {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1_000);

  const [
    currentAccounts,
    analyticsGranted,
    marketingGranted,
    changes7d,
    events24h,
    recentChanges,
  ] = await Promise.all([
    readCount(
      client
        .schema("consent")
        .from("age_and_consent_status")
        .select("account_id", { count: "exact", head: true }),
    ),
    readCount(
      client
        .schema("consent")
        .from("age_and_consent_status")
        .select("account_id", { count: "exact", head: true })
        .eq("analytics_opt_in", true),
    ),
    readCount(
      client
        .schema("consent")
        .from("age_and_consent_status")
        .select("account_id", { count: "exact", head: true })
        .eq("marketing_opt_in", true),
    ),
    readCount(
      client
        .schema("consent")
        .from("consent_record")
        .select("id", { count: "exact", head: true })
        .in("consent_type", CONSENT_TYPES)
        .gte("recorded_at", sevenDaysAgo.toISOString()),
    ),
    readCount(
      client
        .schema("consent")
        .from("product_analytics_event")
        .select("id", { count: "exact", head: true })
        .gte("occurred_at", oneDayAgo.toISOString()),
    ),
    readRecentChanges(client, filters),
  ]);

  const marketingReady = marketingGranted.available
    ? await readMarketingReadyCount(client)
    : { available: false, value: 0 };

  return createDashboard({
    analyticsGranted,
    changes7d,
    currentAccounts,
    events24h,
    filters,
    generatedAt: now.toISOString(),
    marketingGranted,
    marketingReady,
    recentChanges,
  });
}

async function readCount(
  query: PromiseLike<{ count: number | null; error: unknown }>,
): Promise<CountResult> {
  try {
    const response = await query;
    return response.error
      ? { available: false, value: 0 }
      : { available: true, value: response.count ?? 0 };
  } catch {
    return { available: false, value: 0 };
  }
}

async function readRecentChanges(
  client: SupabaseClient,
  filters: AdminConsentFilters,
): Promise<{ available: boolean; items: AdminConsentChange[] }> {
  try {
    let query = client
      .schema("consent")
      .from("consent_record")
      .select(
        "account_id,consent_type,consent_version,status,source,recorded_at",
      )
      .in("consent_type", CONSENT_TYPES);

    if (filters.type !== "all") query = query.eq("consent_type", filters.type);
    if (filters.status !== "all") query = query.eq("status", filters.status);

    const response = await query
      .order("recorded_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(RECENT_CHANGE_LIMIT);
    if (response.error) return { available: false, items: [] };

    return {
      available: true,
      items: (response.data ?? [])
        .map((row) => sanitizeConsentChange(row as RawConsentRecord))
        .filter((row): row is AdminConsentChange => row !== null),
    };
  } catch {
    return { available: false, items: [] };
  }
}

async function readMarketingReadyCount(
  client: SupabaseClient,
): Promise<CountResult> {
  return readCount(
    client
      .schema("consent")
      .rpc(
        "resolve_marketing_audience",
        { p_channel: "email" },
        { count: "exact", head: true },
      ),
  );
}

function createDashboard({
  analyticsGranted,
  changes7d,
  currentAccounts,
  events24h,
  filters,
  generatedAt,
  marketingGranted,
  marketingReady,
  recentChanges,
}: {
  analyticsGranted: CountResult;
  changes7d: CountResult;
  currentAccounts: CountResult;
  events24h: CountResult;
  filters: AdminConsentFilters;
  generatedAt: string;
  marketingGranted: CountResult;
  marketingReady: CountResult;
  recentChanges: { available: boolean; items: AdminConsentChange[] };
}): AdminConsentDashboard {
  const denominator = currentAccounts.available ? currentAccounts.value : null;

  return {
    analyticsEventsAvailable: events24h.available,
    filters,
    generatedAt,
    metrics: {
      analyticsEvents24h: countMetric(events24h, null),
      analyticsOptIn: rateMetric(analyticsGranted, denominator),
      changes7d: countMetric(changes7d, denominator),
      currentAccounts: countMetric(currentAccounts, denominator),
      marketingOptIn: rateMetric(marketingGranted, denominator),
      marketingReady: countMetric(
        marketingReady,
        marketingGranted.available ? marketingGranted.value : null,
      ),
    },
    recentChanges,
  };
}

function countMetric(
  result: CountResult,
  denominator: number | null,
): AdminConsentMetric {
  if (!result.available)
    return { denominator, state: "unavailable", value: null };
  if (denominator === 0 && result.value === 0) {
    return { denominator, state: "empty", value: null };
  }
  return { denominator, state: "ready", value: result.value };
}

function rateMetric(
  result: CountResult,
  denominator: number | null,
): AdminConsentMetric {
  if (!result.available || denominator === null) {
    return { denominator, state: "unavailable", value: null };
  }
  if (denominator === 0) return { denominator, state: "empty", value: null };
  return {
    denominator,
    state: "ready",
    value: Math.round((result.value / denominator) * 1_000) / 10,
  };
}

export function sanitizeConsentChange(
  row: RawConsentRecord,
): AdminConsentChange | null {
  if (
    !isConsentType(row.consent_type) ||
    !isConsentStatus(row.status) ||
    typeof row.recorded_at !== "string"
  ) {
    return null;
  }

  return {
    accountRef: createAccountReference(row.account_id),
    consentVersion: sanitizeVersion(row.consent_version),
    recordedAt: row.recorded_at,
    source: sanitizeSource(row.source),
    status: row.status,
    type: row.consent_type,
  };
}

function createAccountReference(value: unknown) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)
  ) {
    return "확인 불가";
  }
  return value.slice(0, 8).toUpperCase();
}

function sanitizeVersion(value: unknown) {
  if (typeof value !== "string") return "기록 없음";
  const normalized = value.trim().slice(0, 40);
  return /^[A-Za-z0-9._-]+$/.test(normalized) ? normalized : "기록됨";
}

function sanitizeSource(value: unknown): AdminConsentChange["source"] {
  return value === "account_gate" ||
    value === "account_merge" ||
    value === "legacy_backfill" ||
    value === "my_settings"
    ? value
    : "other";
}

function isConsentType(value: unknown): value is AdminConsentType {
  return CONSENT_TYPES.includes(value as AdminConsentType);
}

function isConsentStatus(value: unknown): value is AdminConsentStatus {
  return CONSENT_STATUSES.includes(value as AdminConsentStatus);
}
