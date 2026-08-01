export const advertisingPlacementKeys = [
  "HOME_INLINE_01",
  "FEED_COMMERCE_01",
] as const;

export type AdvertisingPlacementKey =
  (typeof advertisingPlacementKeys)[number];

export type AdvertisingProvider = "adsense" | "coupang";

export type AdvertisingFeedbackReason =
  | "not_interested"
  | "too_repetitive"
  | "uncomfortable"
  | "seems_wrong";

export type AdSenseDeliveryConfig = {
  canonicalOrigin: string;
  dailyCap: number;
  enabled: boolean;
  nonce?: string;
  placementKey: "HOME_INLINE_01";
  publisherId: string;
  sessionCap: number;
  slotId: string;
};

export type CoupangAffiliateCreative = {
  altText: string;
  campaignId: string;
  creativeId: string;
  dailyCap: number;
  description: string;
  destinationUrl: string;
  disclosure: string;
  imageUrl: string;
  placementKey: "FEED_COMMERCE_01";
  sessionCap: number;
  title: string;
};

export type AdvertisingClientEvent =
  | "ad_slot_eligible"
  | "ad_render_requested"
  | "ad_slot_filled"
  | "ad_slot_no_fill"
  | "ad_slot_error"
  | "ad_slot_viewable"
  | "ad_click_out"
  | "ad_feedback_submitted"
  | "ad_suppressed";
