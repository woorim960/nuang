import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type OptionalConsentPreferenceName,
  type OptionalConsentPreferences,
  type ProductAnalyticsArea,
  optionalConsentVersions,
} from "@/features/consent/optional-consent-contract";

type PreferenceRow = {
  analytics_consent_updated_at?: string | null;
  analytics_consent_version?: string | null;
  analytics_opt_in?: boolean;
  marketing_consent_updated_at?: string | null;
  marketing_consent_version?: string | null;
  marketing_opt_in?: boolean;
};

export async function readOptionalConsentPreferences({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const response = await client
    .schema("consent")
    .from("age_and_consent_status")
    .select(
      "analytics_opt_in,analytics_consent_version,analytics_consent_updated_at,marketing_opt_in,marketing_consent_version,marketing_consent_updated_at",
    )
    .eq("account_id", accountId)
    .maybeSingle();

  if (response.error || !response.data) {
    return { code: "preference_read_failed" as const, ok: false as const };
  }

  return {
    data: normalizePreferences(response.data as PreferenceRow),
    ok: true as const,
  };
}

export async function saveOptionalConsentPreference({
  accountId,
  client,
  enabled,
  preference,
  source = "my_settings",
}: {
  accountId: string;
  client: SupabaseClient;
  enabled: boolean;
  preference: OptionalConsentPreferenceName;
  source?: "account_gate" | "account_merge" | "my_settings";
}) {
  const response = await client
    .schema("consent")
    .rpc("set_optional_preference", {
      p_account_id: accountId,
      p_consent_type: preference,
      p_consent_version: optionalConsentVersions[preference],
      p_enabled: enabled,
      p_source: source,
    });

  if (response.error || !response.data) {
    return { code: "preference_write_failed" as const, ok: false as const };
  }

  return readOptionalConsentPreferences({ accountId, client });
}

export async function readAnalyticsCollectionPermission({
  accountId,
  client,
}: {
  accountId: string;
  client: SupabaseClient;
}) {
  const [account, preference] = await Promise.all([
    client
      .schema("identity")
      .from("account")
      .select("status")
      .eq("id", accountId)
      .maybeSingle(),
    client
      .schema("consent")
      .from("age_and_consent_status")
      .select("analytics_opt_in,analytics_consent_version")
      .eq("account_id", accountId)
      .maybeSingle(),
  ]);

  if (account.error || preference.error) {
    return {
      code: "analytics_consent_check_failed" as const,
      ok: false as const,
    };
  }

  return {
    allowed:
      account.data?.status === "active" &&
      preference.data?.analytics_opt_in === true &&
      preference.data?.analytics_consent_version ===
        optionalConsentVersions.analytics,
    ok: true as const,
  };
}

export async function recordProductScreenView({
  accountId,
  area,
  client,
}: {
  accountId: string;
  area: ProductAnalyticsArea;
  client: SupabaseClient;
}) {
  const response = await client
    .schema("consent")
    .rpc("record_product_screen_view", {
      p_account_id: accountId,
      p_area: area,
    });

  if (response.error || typeof response.data !== "string") {
    return { code: "analytics_write_failed" as const, ok: false as const };
  }
  if (
    response.data !== "recorded" &&
    response.data !== "duplicate" &&
    response.data !== "not_allowed"
  ) {
    return { code: "analytics_write_failed" as const, ok: false as const };
  }

  return {
    ok: true as const,
    status: response.data,
  };
}

function normalizePreferences(row: PreferenceRow): OptionalConsentPreferences {
  const analyticsVersion = stringOrNull(row.analytics_consent_version);
  const marketingVersion = stringOrNull(row.marketing_consent_version);
  return {
    analytics: {
      enabled:
        row.analytics_opt_in === true &&
        analyticsVersion === optionalConsentVersions.analytics,
      updatedAt: stringOrNull(row.analytics_consent_updated_at),
      version: optionalConsentVersions.analytics,
    },
    marketing: {
      enabled:
        row.marketing_opt_in === true &&
        marketingVersion === optionalConsentVersions.marketing,
      updatedAt: stringOrNull(row.marketing_consent_updated_at),
      version: optionalConsentVersions.marketing,
    },
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}
