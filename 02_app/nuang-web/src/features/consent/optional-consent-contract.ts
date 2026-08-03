import { z } from "zod";

export const optionalConsentVersions = {
  analytics: "NUANG-ANALYTICS-PREFERENCE-2026-08-03",
  marketing: "NUANG-MARKETING-PREFERENCE-2026-07-27",
} as const;

export const optionalConsentPreferenceNames = [
  "analytics",
  "marketing",
] as const;

export type OptionalConsentPreferenceName =
  (typeof optionalConsentPreferenceNames)[number];

export type OptionalConsentPreference = {
  enabled: boolean;
  updatedAt: string | null;
  version: string;
};

export type OptionalConsentPreferences = Record<
  OptionalConsentPreferenceName,
  OptionalConsentPreference
>;

export const optionalConsentPreferenceWriteSchema = z
  .object({
    consentVersion: z.string().trim().min(3).max(120),
    enabled: z.boolean(),
    preference: z.enum(optionalConsentPreferenceNames),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.consentVersion !== optionalConsentVersions[value.preference]) {
      context.addIssue({
        code: "custom",
        message: "The consent version does not match the preference.",
        path: ["consentVersion"],
      });
    }
  });

export const productAnalyticsAreas = [
  "home",
  "assessment",
  "result",
  "community",
  "trait_map",
  "my",
  "together",
  "settings",
  "other",
] as const;

export type ProductAnalyticsArea = (typeof productAnalyticsAreas)[number];

export const productAnalyticsEventSchema = z
  .object({
    area: z.enum(productAnalyticsAreas),
    eventName: z.literal("screen_view"),
  })
  .strict();

export type ProductAnalyticsEventInput = z.infer<
  typeof productAnalyticsEventSchema
>;
