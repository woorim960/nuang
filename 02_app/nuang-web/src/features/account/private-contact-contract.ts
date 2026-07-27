import { z } from "zod";

export const privateContactConsentVersion =
  "NUANG-PRIVATE-CONTACT-PHONE-2026-07-27";
export const privateEmailRegistrationVersion =
  "NUANG-PRIVATE-CONTACT-EMAIL-2026-07-27";
export const privateContactMarketingConsentVersion =
  "NUANG-MARKETING-PREFERENCE-2026-07-27";

export const privateContactSources = ["profile", "event_entry"] as const;
export type PrivateContactSource = (typeof privateContactSources)[number];

export const privateMobilePhoneWriteSchema = z.object({
  consentVersion: z.literal(privateContactConsentVersion),
  marketingOptIn: z.boolean().optional(),
  mobilePhone: z.string().trim().min(10).max(20),
  source: z.enum(privateContactSources),
});

export const privateEmailWriteSchema = z.object({
  consentVersion: z.literal(privateEmailRegistrationVersion),
  email: z.string().trim().email().max(254),
  marketingOptIn: z.boolean().optional(),
  source: z.enum(privateContactSources),
});

export const privateMarketingPreferenceWriteSchema = z.object({
  consentVersion: z.literal(privateContactMarketingConsentVersion),
  marketingOptIn: z.boolean(),
  preference: z.literal("marketing"),
});

export const privateContactWriteSchema = z.union([
  privateMobilePhoneWriteSchema,
  privateEmailWriteSchema,
  privateMarketingPreferenceWriteSchema,
]);

export type PrivateContactPayload = {
  emailMasked: string | null;
  emailStatus: "missing" | "unverified" | "verified";
  emailVerifiedAt: string | null;
  hasEmail: boolean;
  hasMobilePhone: boolean;
  marketingOptIn: boolean;
  mobilePhoneMasked: string | null;
  mobilePhoneStatus: "missing" | "unverified" | "verified";
  updatedAt: string | null;
};
