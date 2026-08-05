import "server-only";
import {
  gateCReviewRewardCampaign,
  type GateCReviewRewardCampaign,
} from "@/features/research/gate-c/gate-c-public-contract";
import type { GateCRewardContactMethod } from "@/features/research/gate-c/gate-c-reward-entry-contract";

const campaignPolicy = {
  announcementAt: new Date("2026-10-01T18:00:00+09:00"),
  campaignId: "gate-c-review-2026-10-01",
  entryRetentionUntil: new Date("2026-11-01T00:00:00+09:00"),
  contactMethod: "mobile_phone" as const satisfies GateCRewardContactMethod,
  drawAt: new Date("2026-10-01T10:00:00+09:00"),
  entryClosesAt: new Date("2026-10-01T00:00:00+09:00"),
  entryClosesLabel: "2026년 9월 30일까지",
} as const;

const seoulDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Seoul",
  year: "numeric",
});

export type GateCRewardCampaignConfiguration = {
  announcementAt: Date;
  campaignId: string;
  entryRetentionUntil: Date;
  contactMethod: GateCRewardContactMethod;
  drawAt: Date;
  entryClosesAt: Date;
  publicCampaign: GateCReviewRewardCampaign;
};

export function readGateCRewardCampaignConfiguration(
  now = new Date(),
): GateCRewardCampaignConfiguration {
  const enabled = isCampaignEntryEnabled();
  const status = now < campaignPolicy.entryClosesAt ? "active" : "closed";
  const publicCampaign: GateCReviewRewardCampaign = enabled
    ? {
        ...gateCReviewRewardCampaign,
        announcementLabel: seoulDateFormatter.format(
          campaignPolicy.announcementAt,
        ),
        contactMethod: campaignPolicy.contactMethod,
        entryEnabled: status === "active",
        periodLabel: campaignPolicy.entryClosesLabel,
        status,
      }
    : gateCReviewRewardCampaign;

  return {
    ...campaignPolicy,
    publicCampaign,
  };
}

export function readGateCReviewRewardCampaign(
  now = new Date(),
): GateCReviewRewardCampaign {
  return readGateCRewardCampaignConfiguration(now).publicCampaign;
}

function isCampaignEntryEnabled() {
  const configured =
    process.env.GATE_C_REVIEW_EVENT_ENTRY_ENABLED?.trim().toLowerCase();
  return configured === "true";
}
