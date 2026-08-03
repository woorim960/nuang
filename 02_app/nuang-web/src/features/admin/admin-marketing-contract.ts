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
  createdAt: string;
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
  recentEvents: Array<{
    eventType: string;
    occurredAt: string;
  }>;
  readiness: {
    checks: Array<{ key: string; label: string; ok: boolean }>;
    enabled: boolean;
    ready: boolean;
  };
  totals: {
    bounced: number;
    complained: number;
    delivered: number;
    failed: number;
    queued: number;
    sent: number;
    unsubscribed: number;
  };
};
