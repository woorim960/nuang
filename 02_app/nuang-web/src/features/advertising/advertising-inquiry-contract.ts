import { z } from "zod";

export const ADVERTISING_INQUIRY_CONSENT_VERSION = "2026-08-01.v1";

export const advertisingInquiryTypes = [
  "banner",
  "contextual_affiliate",
  "branded_together_pack",
  "other",
] as const;

export const advertisingCampaignObjectives = [
  "awareness",
  "traffic",
  "engagement",
  "launch",
  "other",
] as const;

export const advertisingPreferredPlacements = [
  "home",
  "community",
  "together_future",
  "consultation",
] as const;

export const advertisingBudgetBands = [
  "under_1m",
  "1m_3m",
  "3m_10m",
  "over_10m",
  "undecided",
] as const;

export const advertisingCreativeReadinessValues = [
  "ready",
  "in_progress",
  "needs_collaboration",
] as const;

const optionalTrimmedString = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable().optional(),
  );

const optionalHttpsUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(500)
    .url()
    .refine((value) => new URL(value).protocol === "https:", {
      message: "https 주소만 입력할 수 있어요.",
    })
    .nullable()
    .optional(),
);

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
      message: "올바른 날짜를 입력해 주세요.",
    })
    .nullable()
    .optional(),
);

export const advertisingInquiryWriteSchema = z
  .object({
    budgetBand: z.enum(advertisingBudgetBands),
    campaignObjective: z.enum(advertisingCampaignObjectives),
    companyName: z.string().trim().min(2).max(100),
    consentDocumentVersion: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(
        (value) => value === ADVERTISING_INQUIRY_CONSENT_VERSION,
        "개인정보 동의 내용을 다시 확인해 주세요.",
      ),
    contactName: z.string().trim().min(2).max(50),
    creativeReadiness: z.enum(advertisingCreativeReadinessValues),
    desiredEndDate: optionalDate,
    desiredStartDate: optionalDate,
    details: z.string().trim().min(20).max(3_000),
    formStartedAt: z.iso.datetime({ offset: true }).optional(),
    idempotencyKey: z.uuid(),
    inquiryType: z.enum(advertisingInquiryTypes),
    marketingConsent: z.boolean().default(false),
    phone: optionalTrimmedString(40),
    preferredPlacement: z.enum(advertisingPreferredPlacements),
    privacyConsent: z.literal(true),
    promotedOffering: z.string().trim().min(10).max(300),
    scheduleMode: z.enum(["fixed", "flexible"]),
    sourcePath: z
      .string()
      .trim()
      .max(500)
      .refine(
        (value) => value.startsWith("/") && !value.startsWith("//"),
        "앱 안의 화면 경로만 보낼 수 있어요.",
      )
      .optional(),
    targetAudience: z.string().trim().min(10).max(500),
    website: z.string().max(200).default(""),
    websiteUrl: optionalHttpsUrl,
    workEmail: z
      .string()
      .trim()
      .toLowerCase()
      .max(254)
      .email("업무 이메일을 확인해 주세요."),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.scheduleMode === "fixed") {
      if (!value.desiredStartDate) {
        context.addIssue({
          code: "custom",
          message: "희망 시작일을 입력해 주세요.",
          path: ["desiredStartDate"],
        });
      }
      if (!value.desiredEndDate) {
        context.addIssue({
          code: "custom",
          message: "희망 종료일을 입력해 주세요.",
          path: ["desiredEndDate"],
        });
      }
    }

    if (
      value.desiredStartDate &&
      value.desiredEndDate &&
      value.desiredStartDate > value.desiredEndDate
    ) {
      context.addIssue({
        code: "custom",
        message: "종료일은 시작일 이후여야 해요.",
        path: ["desiredEndDate"],
      });
    }
  });

export type AdvertisingInquiryWriteInput = z.infer<
  typeof advertisingInquiryWriteSchema
>;

export const advertisingInquiryResponseSchema = z.object({
  createdAt: z.iso.datetime({ offset: true }).optional(),
  inquiryId: z.uuid().optional(),
  message: z.string().optional(),
  ok: z.literal(true),
  publicReference: z.string().regex(/^AD-\d{8}-[A-Z2-9]{6}$/),
});

export type AdvertisingInquiryResponse = z.infer<
  typeof advertisingInquiryResponseSchema
>;
