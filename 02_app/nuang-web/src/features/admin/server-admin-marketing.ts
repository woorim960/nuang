import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { marketingEmailReadiness } from "@/features/marketing/server-marketing-email-config";
import type {
  AdminMarketingCampaign,
  AdminMarketingCampaignStatus,
  AdminMarketingDashboard,
  AdminMarketingOperationsSnapshot,
} from "./admin-marketing-contract";

type Row = Record<string, unknown>;

export async function readAdminMarketingDashboard(
  client: SupabaseClient,
): Promise<AdminMarketingDashboard> {
  const readiness = marketingEmailReadiness();
  const [
    campaignsResult,
    audienceResult,
    eventsResult,
    operationsResult,
    auditResult,
  ] = await Promise.all([
    client
      .schema("consent")
      .from("marketing_campaign_operations_summary")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
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
      .select("campaign_id,event_type,occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(40),
    client.schema("consent").rpc("admin_marketing_operations_snapshot"),
    client
      .schema("audit")
      .from("admin_audit_log")
      .select("action,target_id,created_at")
      .like("action", "marketing_%")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (campaignsResult.error || operationsResult.error) {
    return unavailableDashboard(readiness);
  }

  const campaigns = ((campaignsResult.data ?? []) as Row[])
    .map(normalizeCampaign)
    .filter((row): row is AdminMarketingCampaign => row !== null);

  const operations = normalizeOperationsSnapshot(operationsResult.data);
  return {
    audienceAvailable: !audienceResult.error,
    audienceCount: audienceResult.count ?? 0,
    campaigns,
    databaseAvailable: true,
    generatedAt: new Date().toISOString(),
    operations,
    readiness,
    recentEvents: eventsResult.error
      ? []
      : ((eventsResult.data ?? []) as Row[]).flatMap((row) => {
          const eventType = text(row.event_type);
          const occurredAt = text(row.occurred_at);
          return eventType && occurredAt
            ? [
                {
                  campaignId: text(row.campaign_id),
                  eventType,
                  occurredAt,
                },
              ]
            : [];
        }),
    recentOperations: auditResult.error
      ? []
      : ((auditResult.data ?? []) as Row[]).flatMap((row) => {
          const action = text(row.action);
          const createdAt = text(row.created_at);
          return action && createdAt
            ? [{ action, createdAt, targetId: text(row.target_id) }]
            : [];
        }),
    totals: operations.deliveryTotals,
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
    operations: emptyOperations(),
    readiness,
    recentEvents: [],
    recentOperations: [],
    totals: emptyTotals(),
  };
}

function normalizeCampaign(row: Row): AdminMarketingCampaign | null {
  const status = text(row.status);
  const campaignId = text(row.id);
  const internalName = text(row.internal_name);
  const subject = text(row.subject);
  const eyebrow = text(row.eyebrow);
  const heading = text(row.heading);
  const body = text(row.body);
  const createdAt = text(row.created_at);
  const updatedAt = text(row.updated_at);
  if (
    !campaignId ||
    !internalName ||
    !subject ||
    !eyebrow ||
    !heading ||
    !body ||
    !status ||
    !isCampaignStatus(status) ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }
  return {
    approvedAt: text(row.approved_at),
    audienceCount: number(row.audience_count),
    body,
    campaignId,
    counts: {
      bounced: number(row.bounced_count),
      complained: number(row.complained_count),
      delivered: number(row.delivered_count),
      failed: number(row.failed_count),
      queued: number(row.queued_count),
      retry: number(row.retry_count),
      sending: number(row.sending_count),
      sent: number(row.sent_count),
      skipped: number(row.skipped_count),
      suppressed: number(row.suppressed_count),
      unsubscribed: number(row.unsubscribed_count),
    },
    createdAt,
    ctaLabel: text(row.cta_label),
    ctaUrl: text(row.cta_url),
    currentTestStatus: text(row.current_test_status),
    eyebrow,
    heading,
    internalName,
    lastTestedAt: text(row.last_tested_at),
    oldestPendingAt: text(row.oldest_pending_at),
    scheduledAt: text(row.scheduled_at),
    status,
    subject,
    updatedAt,
  };
}

function normalizeOperationsSnapshot(
  value: unknown,
): AdminMarketingOperationsSnapshot {
  const root = object(value);
  const channel = object(root.channelControl);
  const queue = object(root.queue);
  const deliveryTotals = object(root.deliveryTotals);
  const confirmations = object(root.confirmations);
  const suppressions = object(root.suppressions);
  const webhook = object(root.webhook);
  const worker = object(root.worker);
  return {
    channelControl: {
      paused: channel.paused === true,
      reason: text(channel.reason),
      updatedAt: text(channel.updatedAt),
    },
    confirmations: {
      dueWithin30Days: number(confirmations.dueWithin30Days),
      failed: number(confirmations.failed),
      queued: number(confirmations.queued),
      retry: number(confirmations.retry),
      sent: number(confirmations.sent),
    },
    deliveryTotals: {
      bounced: number(deliveryTotals.bounced),
      complained: number(deliveryTotals.complained),
      delayed: number(deliveryTotals.delayed),
      delivered: number(deliveryTotals.delivered),
      failed: number(deliveryTotals.failed),
      queued: number(deliveryTotals.queued),
      retry: number(deliveryTotals.retry),
      sending: number(deliveryTotals.sending),
      sent: number(deliveryTotals.sent),
      skipped: number(deliveryTotals.skipped),
      suppressed: number(deliveryTotals.suppressed),
      unsubscribed: number(deliveryTotals.unsubscribed),
    },
    queue: {
      failed: number(queue.failed),
      oldestPendingAt: text(queue.oldestPendingAt),
      queued: number(queue.queued),
      retry: number(queue.retry),
      sending: number(queue.sending),
      stale: number(queue.stale),
    },
    suppressions: {
      active: number(suppressions.active),
      memberUnsubscribed: number(suppressions.memberUnsubscribed),
      providerRisk: number(suppressions.providerRisk),
    },
    webhook: {
      lastReceivedAt: text(webhook.lastReceivedAt),
      unmatched24h: number(webhook.unmatched24h),
    },
    worker: {
      claimed: number(worker.claimed),
      completionFailed: number(worker.completionFailed),
      errorCode: text(worker.errorCode),
      failed: number(worker.failed),
      finishedAt: text(worker.finishedAt),
      sent: number(worker.sent),
      startedAt: text(worker.startedAt),
      status: text(worker.status),
    },
  };
}

function isCampaignStatus(
  value: string,
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
  ].includes(value);
}

function emptyTotals() {
  return {
    bounced: 0,
    complained: 0,
    delayed: 0,
    delivered: 0,
    failed: 0,
    queued: 0,
    retry: 0,
    sending: 0,
    sent: 0,
    skipped: 0,
    suppressed: 0,
    unsubscribed: 0,
  };
}

function emptyOperations(): AdminMarketingOperationsSnapshot {
  return {
    channelControl: { paused: true, reason: null, updatedAt: null },
    confirmations: {
      dueWithin30Days: 0,
      failed: 0,
      queued: 0,
      retry: 0,
      sent: 0,
    },
    deliveryTotals: emptyTotals(),
    queue: {
      failed: 0,
      oldestPendingAt: null,
      queued: 0,
      retry: 0,
      sending: 0,
      stale: 0,
    },
    suppressions: { active: 0, memberUnsubscribed: 0, providerRisk: 0 },
    webhook: { lastReceivedAt: null, unmatched24h: 0 },
    worker: {
      claimed: 0,
      completionFailed: 0,
      errorCode: null,
      failed: 0,
      finishedAt: null,
      sent: 0,
      startedAt: null,
      status: null,
    },
  };
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
