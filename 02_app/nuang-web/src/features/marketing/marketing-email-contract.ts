import { z } from "zod";

export const MARKETING_EMAIL_CONSENT_VERSION =
  "NUANG-MARKETING-EMAIL-KO-2026-08-03";
export const MARKETING_EMAIL_TEMPLATE_VERSION =
  "NUANG-MARKETING-EMAIL-TEMPLATE-1";

const nuangUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "nuang.app" || url.hostname.endsWith(".nuang.app"))
    );
  }, "뉴앙 공식 주소만 사용할 수 있습니다.");

const marketingContentFields = {
  body: z.string().trim().min(10).max(4000),
  ctaLabel: z.string().trim().min(2).max(40).nullable(),
  ctaUrl: nuangUrlSchema.nullable(),
  eyebrow: z.string().trim().min(2).max(50),
  heading: z.string().trim().min(2).max(100),
  subject: z.string().trim().min(2).max(90),
} as const;

function requirePairedCta(
  value: { ctaLabel: string | null; ctaUrl: string | null },
  context: z.RefinementCtx,
) {
  if ((value.ctaLabel === null) !== (value.ctaUrl === null)) {
    context.addIssue({
      code: "custom",
      message: "버튼 문구와 주소를 함께 입력해 주세요.",
      path: ["ctaLabel"],
    });
  }
}

export const marketingCampaignWriteSchema = z
  .object({
    ...marketingContentFields,
    campaignId: z.string().uuid().nullable(),
    internalName: z.string().trim().min(2).max(100),
  })
  .strict()
  .superRefine(requirePairedCta);

export const marketingCampaignActionSchema = z
  .object({
    action: z.enum(["approve", "cancel", "pause", "queue", "resume"]),
    campaignId: z.string().uuid(),
    scheduledAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export const marketingTestEmailSchema = z
  .object({
    campaignId: z.string().uuid(),
    testRecipient: z.string().trim().email().max(254),
  })
  .strict();

export const marketingPreviewSchema = z
  .object(marketingContentFields)
  .strict()
  .superRefine(requirePairedCta);

export const marketingOperationsActionSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("set_emergency_pause"),
      paused: z.boolean(),
      reason: z.string().trim().min(5).max(500),
    })
    .strict(),
  z
    .object({
      action: z.literal("retry_failed"),
      campaignId: z.string().uuid(),
      reason: z.string().trim().min(5).max(500),
    })
    .strict(),
  z
    .object({
      action: z.literal("drain_now"),
      reason: z.string().trim().min(5).max(500),
    })
    .strict(),
]);

export type MarketingCampaignWrite = z.infer<
  typeof marketingCampaignWriteSchema
>;
export type MarketingCampaignAction = z.infer<
  typeof marketingCampaignActionSchema
>;
