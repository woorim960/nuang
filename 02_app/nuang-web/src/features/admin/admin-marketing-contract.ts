import type { MarketingCampaignWrite } from "@/features/marketing/marketing-email-contract";

export type AdminMarketingCampaignStatus =
  | "approved"
  | "cancelled"
  | "completed"
  | "draft"
  | "failed"
  | "paused"
  | "queued"
  | "sending";

export type AdminMarketingCampaign = Omit<
  MarketingCampaignWrite,
  "campaignId"
> & {
  approvedAt: string | null;
  audienceCount: number;
  counts: Record<string, number>;
  campaignId: string;
  currentTestStatus: string | null;
  createdAt: string;
  lastTestedAt: string | null;
  oldestPendingAt: string | null;
  scheduledAt: string | null;
  status: AdminMarketingCampaignStatus;
  updatedAt: string;
};

export type AdminMarketingDashboard = {
  audienceAvailable: boolean;
  audienceCount: number;
  campaigns: AdminMarketingCampaign[];
  databaseAvailable: boolean;
  generatedAt: string;
  operations: AdminMarketingOperationsSnapshot;
  recentEvents: Array<{
    campaignId: string | null;
    eventType: string;
    occurredAt: string;
  }>;
  recentOperations: Array<{
    action: string;
    createdAt: string;
    targetId: string | null;
  }>;
  readiness: {
    checks: Array<{ key: string; label: string; ok: boolean }>;
    enabled: boolean;
    ready: boolean;
  };
  totals: {
    bounced: number;
    complained: number;
    delayed: number;
    delivered: number;
    failed: number;
    queued: number;
    retry: number;
    sent: number;
    sending: number;
    skipped: number;
    suppressed: number;
    unsubscribed: number;
  };
};

export type AdminMarketingOperationsSnapshot = {
  channelControl: {
    paused: boolean;
    reason: string | null;
    updatedAt: string | null;
  };
  confirmations: {
    dueWithin30Days: number;
    failed: number;
    queued: number;
    retry: number;
    sent: number;
  };
  deliveryTotals: AdminMarketingDashboard["totals"];
  queue: {
    failed: number;
    oldestPendingAt: string | null;
    queued: number;
    retry: number;
    sending: number;
    stale: number;
  };
  suppressions: {
    active: number;
    memberUnsubscribed: number;
    providerRisk: number;
  };
  webhook: {
    lastReceivedAt: string | null;
    unmatched24h: number;
  };
  worker: {
    claimed: number;
    completionFailed: number;
    errorCode: string | null;
    failed: number;
    finishedAt: string | null;
    sent: number;
    startedAt: string | null;
    status: string | null;
  };
};
