import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { marketingEmailReadiness } from "@/features/marketing/server-marketing-email-config";
import type {
  AdminMarketingCampaign,
  AdminMarketingCampaignStatus,
  AdminMarketingDashboard,
} from "./admin-marketing-contract";

type RawCampaign = Record<string, unknown>;
type RawRecipient = Record<string, unknown>;

export async function readAdminMarketingDashboard(
  client: SupabaseClient,
): Promise<AdminMarketingDashboard> {
  const readiness = marketingEmailReadiness();
  const campaignsResult = await client
    .schema("consent")
    .from("marketing_campaign")
    .select(
      "id,internal_name,subject,eyebrow,heading,body,cta_label,cta_url,status,scheduled_at,audience_count,approved_at,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (campaignsResult.error) return unavailableDashboard(readiness);

  const campaignIds = (campaignsResult.data ?? [])
    .map((row) => (typeof row.id === "string" ? row.id : null))
    .filter((value): value is string => Boolean(value));
  const [recipientsResult, audienceResult, eventsResult] = await Promise.all([
    campaignIds.length
      ? client
          .schema("consent")
          .from("marketing_campaign_recipient")
          .select("campaign_id,status")
          .in("campaign_id", campaignIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .schema("consent")
      .rpc(
        "resolve_marketing_audience",
        { p_channel: "email" },
        { count: "exact", head: true },
      ),
    client
      .schema("consent")
      .from("marketing_email_event")
      .select("event_type,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(20),
  ]);
  const countsByCampaign = countRecipientsByCampaign(
    (recipientsResult.data ?? []) as RawRecipient[],
  );
  const campaigns = (campaignsResult.data ?? [])
    .map((row) =>
      normalizeCampaign(
        row as RawCampaign,
        countsByCampaign.get(String(row.id)),
      ),
    )
    .filter((row): row is AdminMarketingCampaign => row !== null);
  const totals = countAll(campaigns);

  return {
    audienceAvailable: !audienceResult.error,
    audienceCount: audienceResult.count ?? 0,
    campaigns,
    databaseAvailable: true,
    generatedAt: new Date().toISOString(),
    readiness,
    recentEvents: eventsResult.error
      ? []
      : (eventsResult.data ?? []).flatMap((row) =>
          typeof row.event_type === "string" &&
          typeof row.occurred_at === "string"
            ? [{ eventType: row.event_type, occurredAt: row.occurred_at }]
            : [],
        ),
    totals,
  };
}

function unavailableDashboard(
  readiness: ReturnType<typeof marketingEmailReadiness>,
): AdminMarketingDashboard {
  return {
    audienceAvailable: false,
    audienceCount: 0,
    campaigns: [],
    databaseAvailable: false,
    generatedAt: new Date().toISOString(),
    readiness,
    recentEvents: [],
    totals: emptyTotals(),
  };
}

function countRecipientsByCampaign(rows: RawRecipient[]) {
  const result = new Map<string, Record<string, number>>();
  for (const row of rows) {
    if (typeof row.campaign_id !== "string" || typeof row.status !== "string")
      continue;
    const counts = result.get(row.campaign_id) ?? {};
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    result.set(row.campaign_id, counts);
  }
  return result;
}

function normalizeCampaign(
  row: RawCampaign,
  counts: Record<string, number> = {},
): AdminMarketingCampaign | null {
  const status = row.status;
  if (
    typeof row.id !== "string" ||
    typeof row.internal_name !== "string" ||
    typeof row.subject !== "string" ||
    typeof row.eyebrow !== "string" ||
    typeof row.heading !== "string" ||
    typeof row.body !== "string" ||
    !isCampaignStatus(status) ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    return null;
  }
  return {
    approvedAt: typeof row.approved_at === "string" ? row.approved_at : null,
    audienceCount:
      typeof row.audience_count === "number" ? row.audience_count : 0,
    body: row.body,
    campaignId: row.id,
    counts,
    createdAt: row.created_at,
    ctaLabel: typeof row.cta_label === "string" ? row.cta_label : null,
    ctaUrl: typeof row.cta_url === "string" ? row.cta_url : null,
    eyebrow: row.eyebrow,
    heading: row.heading,
    internalName: row.internal_name,
    scheduledAt: typeof row.scheduled_at === "string" ? row.scheduled_at : null,
    status,
    subject: row.subject,
    updatedAt: row.updated_at,
  };
}

function isCampaignStatus(
  value: unknown,
): value is AdminMarketingCampaignStatus {
  return [
    "approved",
    "cancelled",
    "completed",
    "draft",
    "failed",
    "paused",
    "queued",
    "sending",
  ].includes(String(value));
}

function countAll(campaigns: AdminMarketingCampaign[]) {
  const totals = emptyTotals();
  for (const campaign of campaigns) {
    for (const key of Object.keys(totals) as Array<keyof typeof totals>) {
      totals[key] += campaign.counts[key] ?? 0;
    }
  }
  return totals;
}

function emptyTotals() {
  return {
    bounced: 0,
    complained: 0,
    delivered: 0,
    failed: 0,
    queued: 0,
    sent: 0,
    unsubscribed: 0,
  };
}
