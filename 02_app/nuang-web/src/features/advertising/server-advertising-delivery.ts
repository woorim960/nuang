import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdSenseDeliveryConfig,
  AdvertisingPlacementKey,
  CoupangAffiliateCreative,
} from "./delivery/advertising-delivery-contract";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getAppOrigin } from "@/lib/supabase/env";

type RequestContext = {
  countryCode?: string | null;
  nonce?: string | null;
};

type DeliveryResolution = {
  campaignId?: string;
  code?: string;
  creative?: {
    altText?: string;
    creativeId?: string;
    description?: string;
    destinationUrl?: string;
    disclosure?: string;
    imageUrl?: string;
    title?: string;
  };
  dailyCap?: number;
  enabled?: boolean;
  minimumOrganicCount?: number;
  placementKey?: string;
  provider?: string;
  rolloutPercentage?: number;
  routeContext?: string;
  sessionCap?: number;
};

const eeaAndConsentRequiredCountries = new Set([
  "AT",
  "BE",
  "BG",
  "CH",
  "CY",
  "CZ",
  "DE",
  "DK",
  "EE",
  "ES",
  "FI",
  "FR",
  "GB",
  "GR",
  "HR",
  "HU",
  "IE",
  "IS",
  "IT",
  "LI",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "NO",
  "PL",
  "PT",
  "RO",
  "SE",
  "SI",
  "SK",
]);

export async function readHomeAdSenseDelivery(
  context: RequestContext,
): Promise<AdSenseDeliveryConfig | null> {
  const canonicalOrigin = readCanonicalProductionOrigin();
  const publisherId = normalizePublisherId(process.env.ADSENSE_PUBLISHER_ID);
  const slotId = normalizeNumericId(process.env.ADSENSE_HOME_SLOT_ID);
  if (
    !canonicalOrigin ||
    !publisherId ||
    !slotId ||
    !enabled("ADVERTISING_ENABLED") ||
    !enabled("ADSENSE_ENABLED") ||
    !enabled("ADSENSE_SITE_READY") ||
    !enabled("ADSENSE_PRIVACY_READY") ||
    !enabled("ADSENSE_CSP_REPORT_ONLY_READY") ||
    !passesRegionalConsentGate(context.countryCode)
  ) {
    return null;
  }

  const client = createSupabaseServiceClient();
  if (!client) return null;
  const [delivery, excluded] = await Promise.all([
    resolveDelivery(client, "HOME_INLINE_01"),
    shouldExcludeCurrentViewer(client),
  ]);
  if (
    excluded ||
    !delivery?.enabled ||
    delivery.provider !== "adsense" ||
    delivery.routeContext !== "home_recommended" ||
    !passesDatabaseRollout(delivery.rolloutPercentage)
  ) {
    return null;
  }

  return {
    canonicalOrigin,
    dailyCap: clampCap(delivery.dailyCap, 1),
    enabled: true,
    nonce: context.nonce ?? undefined,
    placementKey: "HOME_INLINE_01",
    publisherId: `ca-${publisherId}`,
    sessionCap: clampCap(delivery.sessionCap, 1),
    slotId,
  };
}

export async function readFeedCoupangDelivery({
  organicPostCount,
}: {
  organicPostCount: number;
}): Promise<CoupangAffiliateCreative | null> {
  if (
    !readCanonicalProductionOrigin() ||
    !enabled("ADVERTISING_ENABLED") ||
    !enabled("COUPANG_PARTNERS_ENABLED") ||
    !enabled("COUPANG_POLICY_READY")
  ) {
    return null;
  }

  const client = createSupabaseServiceClient();
  if (!client) return null;
  const [delivery, excluded] = await Promise.all([
    resolveDelivery(client, "FEED_COMMERCE_01"),
    shouldExcludeCurrentViewer(client),
  ]);
  if (
    excluded ||
    !delivery?.enabled ||
    delivery.provider !== "coupang" ||
    delivery.routeContext !== "feed_recommended" ||
    organicPostCount < (delivery.minimumOrganicCount ?? 8) ||
    !passesDatabaseRollout(delivery.rolloutPercentage)
  ) {
    return null;
  }

  return coerceCoupangCreative(delivery);
}

async function resolveDelivery(
  client: SupabaseClient,
  placementKey: AdvertisingPlacementKey,
): Promise<DeliveryResolution | null> {
  const response = await client.rpc("resolve_advertising_delivery", {
    target_placement_key: placementKey,
  });
  if (response.error || !response.data || typeof response.data !== "object") {
    return null;
  }
  return response.data as DeliveryResolution;
}

async function shouldExcludeCurrentViewer(client: SupabaseClient) {
  const browserClient = await createServerSupabaseClient();
  if (!browserClient) return false;
  const auth = await browserClient.auth.getClaims();
  const userId =
    typeof auth.data?.claims?.sub === "string" ? auth.data.claims.sub : null;
  if (auth.error) return true;
  if (!userId) return false;

  const identityResponse = await client
    .schema("identity")
    .from("auth_identity")
    .select("account_id")
    .eq("supabase_user_id", userId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();
  if (identityResponse.error) return true;
  const accountId = (identityResponse.data as { account_id?: string } | null)
    ?.account_id;
  if (!accountId) return false;

  const [operatorResponse, ageResponse] = await Promise.all([
    client
      .schema("identity")
      .from("operator_account")
      .select("account_id")
      .eq("account_id", accountId)
      .maybeSingle(),
    client
      .schema("consent")
      .from("age_and_consent_status")
      .select("age_band")
      .eq("account_id", accountId)
      .maybeSingle(),
  ]);
  if (operatorResponse.error || ageResponse.error) return true;
  if (operatorResponse.data) return true;
  return (ageResponse.data as { age_band?: string } | null)?.age_band === "14-18";
}

function readCanonicalProductionOrigin() {
  const value = getAppOrigin();
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || isLocalHostname(url.hostname)) return null;
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function passesRegionalConsentGate(countryCode: string | null | undefined) {
  const country = countryCode?.trim().toUpperCase();
  if (!country) return enabled("ADSENSE_EEA_CMP_READY");
  return (
    !eeaAndConsentRequiredCountries.has(country) ||
    enabled("ADSENSE_EEA_CMP_READY")
  );
}

function passesDatabaseRollout(value: number | undefined) {
  if (typeof value !== "number" || value <= 0) return false;
  if (value >= 100) return true;
  return Math.random() * 100 < value;
}

function enabled(key: string) {
  return process.env[key]?.trim().toLowerCase() === "true";
}

function normalizePublisherId(value: string | undefined) {
  const normalized = value?.trim().replace(/^ca-/, "");
  return normalized && /^pub-\d{16}$/.test(normalized) ? normalized : null;
}

function normalizeNumericId(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && /^\d{6,32}$/.test(normalized) ? normalized : null;
}

function isAllowedCoupangUrl(value: string) {
  const allowlist = new Set(
    (process.env.COUPANG_ALLOWED_DESTINATION_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  if (allowlist.size === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowlist.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function coerceCoupangCreative(
  delivery: DeliveryResolution,
): CoupangAffiliateCreative | null {
  const creative = delivery.creative;
  if (
    typeof delivery.campaignId !== "string" ||
    typeof creative?.creativeId !== "string" ||
    typeof creative.title !== "string" ||
    typeof creative.description !== "string" ||
    typeof creative.altText !== "string" ||
    typeof creative.destinationUrl !== "string" ||
    typeof creative.imageUrl !== "string" ||
    typeof creative.disclosure !== "string" ||
    !isAllowedCoupangUrl(creative.destinationUrl) ||
    !isAllowedCoupangImage(creative.imageUrl) ||
    !creative.disclosure.includes("일정액의 수수료")
  ) {
    return null;
  }

  return {
    altText: creative.altText,
    campaignId: delivery.campaignId,
    creativeId: creative.creativeId,
    dailyCap: clampCap(delivery.dailyCap, 2),
    description: creative.description,
    destinationUrl: creative.destinationUrl,
    disclosure: creative.disclosure,
    imageUrl: creative.imageUrl,
    placementKey: "FEED_COMMERCE_01",
    sessionCap: clampCap(delivery.sessionCap, 1),
    title: creative.title,
  };
}

function clampCap(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isInteger(value)) return fallback;
  return Math.min(20, Math.max(0, value));
}

function isAllowedCoupangImage(value: string) {
  const allowlist = new Set(
    (process.env.COUPANG_ALLOWED_IMAGE_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  if (allowlist.size === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && allowlist.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".local")
  );
}
