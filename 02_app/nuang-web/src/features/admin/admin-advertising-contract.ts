import { z } from "zod";

export const advertisingAdminTabs = [
  "inquiries",
  "campaigns",
  "inventory",
  "creatives",
  "performance",
  "settings",
] as const;

export type AdvertisingAdminTab = (typeof advertisingAdminTabs)[number];

export const advertisingInquiryStatuses = [
  "received",
  "reviewing",
  "contacted",
  "proposal_sent",
  "negotiating",
  "contracted",
  "rejected",
  "closed",
  "spam_review",
  "spam",
] as const;

export type AdvertisingInquiryStatus =
  (typeof advertisingInquiryStatuses)[number];

export const advertisingCampaignStatuses = [
  "draft",
  "policy_review",
  "approved",
  "scheduled",
  "active",
  "paused",
  "ended",
] as const;

export type AdvertisingCampaignStatus =
  (typeof advertisingCampaignStatuses)[number];

export const advertisingCreativeReviewStatuses = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
  "expired",
] as const;

export type AdvertisingCreativeReviewStatus =
  (typeof advertisingCreativeReviewStatuses)[number];

export type AdvertisingProvider = "adsense" | "coupang" | "direct" | "unknown";

export type AdminAdvertisingModule<T> = {
  available: boolean;
  items: T[];
  message: string | null;
};

export type AdminAdvertisingInquiry = {
  assignedToCurrentAdmin: boolean;
  budgetBand: string;
  campaignObjective: string;
  companyName: string;
  contactEmailMasked: string | null;
  createdAt: string;
  creativeReadiness: string;
  desiredEnd: string | null;
  desiredStart: string | null;
  firstResponseDueAt: string | null;
  id: string;
  inquiryType: string;
  mailStatus: "failed" | "pending" | "sent" | "unknown";
  nextActionAt: string | null;
  preferredPlacement: string;
  priority: "high" | "low" | "normal" | "urgent";
  privacyConsentedAt: string;
  publicReference: string;
  riskFlags: string[];
  scheduleMode: string;
  status: AdvertisingInquiryStatus;
  targetAudience: string;
  websiteHost: string | null;
};

export type AdminAdvertisingCampaign = {
  budgetNote: string | null;
  creativeCount: number;
  endsAt: string | null;
  id: string;
  inquiryId: string | null;
  name: string;
  objective: string;
  placementKeys: string[];
  policyApprovedAt: string | null;
  policyVersion: string | null;
  provider: AdvertisingProvider;
  startsAt: string | null;
  status: AdvertisingCampaignStatus;
};

export type AdminAdvertisingInventory = {
  activeFrom: string | null;
  activeUntil: string | null;
  dailyCap: number | null;
  id: string;
  isActive: boolean;
  minimumIntervalSeconds: number;
  minimumOrganicCount: number;
  placementKey: string;
  provider: AdvertisingProvider;
  routeContext: string;
  rolloutPercentage: number;
  sessionCap: number | null;
  updatedAt: string;
};

export type AdminAdvertisingCreative = {
  altText: string | null;
  campaignName: string;
  campaignId: string;
  description: string | null;
  destinationUrl: string | null;
  destinationHost: string | null;
  disclosureText: string | null;
  expiresAt: string | null;
  factCheckedAt: string | null;
  id: string;
  imageUrl: string | null;
  provider: AdvertisingProvider;
  reviewStatus: AdvertisingCreativeReviewStatus;
  title: string;
  updatedAt: string;
};

export type AdminAdvertisingMetric = {
  clicks: number | null;
  date: string;
  errors: number;
  feedbackCount: number;
  fillCount: number;
  hideCount: number;
  impressions: number;
  noFillCount: number;
  placementKey: string;
  provider: AdvertisingProvider;
  revenueAmount: number | null;
  viewableImpressions: number;
};

export type AdminAdvertisingKillSwitch = {
  key: string;
  reason: string | null;
  scope: "global" | "provider" | "slot";
  suspended: boolean;
  updatedAt: string;
};

export type AdminAdvertisingReadinessItem = {
  configured: boolean;
  description: string;
  key: string;
  label: string;
};

export type AdminAdvertisingReadinessGroup = {
  items: AdminAdvertisingReadinessItem[];
  key: "adsense" | "coupang" | "global" | "inquiry";
  title: string;
};

export type AdminAdvertisingData = {
  campaigns: AdminAdvertisingModule<AdminAdvertisingCampaign>;
  creatives: AdminAdvertisingModule<AdminAdvertisingCreative>;
  environmentReadiness: AdminAdvertisingReadinessGroup[];
  generatedAt: string;
  inquiries: AdminAdvertisingModule<AdminAdvertisingInquiry>;
  inventory: AdminAdvertisingModule<AdminAdvertisingInventory>;
  killSwitches: AdminAdvertisingModule<AdminAdvertisingKillSwitch>;
  metrics: AdminAdvertisingModule<AdminAdvertisingMetric>;
};

const adminReasonSchema = z.string().trim().min(2).max(500);

export const adminAdvertisingInquiryActionSchema = z.object({
  inquiryId: z.string().uuid(),
  nextActionAt: z.string().datetime().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  reason: adminReasonSchema,
  status: z.enum(advertisingInquiryStatuses),
});

export const adminAdvertisingCampaignActionSchema = z.object({
  campaignId: z.string().uuid(),
  reason: adminReasonSchema,
  status: z.enum(advertisingCampaignStatuses),
});

export const adminAdvertisingCreativeActionSchema = z.object({
  creativeId: z.string().uuid(),
  reason: adminReasonSchema,
  reviewStatus: z.enum(["approved", "changes_requested", "rejected"]),
});

export const adminAdvertisingKillSwitchActionSchema = z.object({
  key: z.string().trim().min(1).max(80),
  reason: adminReasonSchema,
  scope: z.enum(["global", "provider", "slot"]),
  suspended: z.boolean(),
});

const nullableDateTimeSchema = z.string().datetime().nullable();
const nullableShortTextSchema = (maximum: number) =>
  z.string().trim().max(maximum).nullable();
const nullableHttpsUrlSchema = z
  .string()
  .url()
  .refine((value) => value.startsWith("https://"))
  .nullable();

export const adminAdvertisingCampaignWriteSchema = z
  .object({
    budgetNote: nullableShortTextSchema(1_000),
    campaignId: z.string().uuid().nullable(),
    endsAt: nullableDateTimeSchema,
    inquiryId: z.string().uuid().nullable(),
    name: z.string().trim().min(2).max(160),
    objective: z.enum([
      "awareness",
      "traffic",
      "engagement",
      "launch",
      "other",
    ]),
    placementKeys: z
      .array(z.enum(["HOME_INLINE_01", "FEED_COMMERCE_01"]))
      .min(1)
      .max(2),
    policyVersion: z.string().trim().min(1).max(80).nullable(),
    provider: z.enum(["adsense", "coupang", "direct"]),
    reason: adminReasonSchema,
    startsAt: nullableDateTimeSchema,
  })
  .refine(
    (value) =>
      !value.startsAt || !value.endsAt || value.endsAt > value.startsAt,
    { message: "종료 시각은 시작 시각 이후여야 합니다.", path: ["endsAt"] },
  );

export const adminAdvertisingCreativeWriteSchema = z
  .object({
    altText: nullableShortTextSchema(300),
    campaignId: z.string().uuid(),
    creativeId: z.string().uuid().nullable(),
    description: nullableShortTextSchema(500),
    destinationUrl: nullableHttpsUrlSchema,
    disclosureText: nullableShortTextSchema(500),
    expiresAt: nullableDateTimeSchema,
    factCheckedAt: nullableDateTimeSchema,
    imageUrl: nullableHttpsUrlSchema,
    provider: z.enum(["adsense", "coupang", "direct"]),
    reason: adminReasonSchema,
    title: z.string().trim().min(2).max(160),
  })
  .refine(
    (value) =>
      !value.factCheckedAt ||
      !value.expiresAt ||
      value.expiresAt > value.factCheckedAt,
    {
      message: "만료 시각은 사실 확인 시각 이후여야 합니다.",
      path: ["expiresAt"],
    },
  );

export const adminAdvertisingInventoryActionSchema = z
  .object({
    activeFrom: nullableDateTimeSchema,
    activeUntil: nullableDateTimeSchema,
    dailyCap: z.number().int().min(0).max(20),
    isActive: z.boolean(),
    minimumIntervalSeconds: z.number().int().min(0).max(86_400),
    minimumOrganicCount: z.number().int().min(0).max(100),
    placementKey: z.enum(["HOME_INLINE_01", "FEED_COMMERCE_01"]),
    reason: adminReasonSchema,
    rolloutPercentage: z.number().int().min(0).max(100),
    sessionCap: z.number().int().min(0).max(10),
  })
  .refine(
    (value) =>
      !value.activeFrom ||
      !value.activeUntil ||
      value.activeUntil > value.activeFrom,
    {
      message: "종료 시각은 시작 시각 이후여야 합니다.",
      path: ["activeUntil"],
    },
  );
