import { z } from "zod";

export const consentIntentCookieName = "nuang-consent-intent";

export const consentDraftSchema = z.object({
  analytics: z.boolean().default(false),
  is14OrOlder: z.literal(true),
  marketing: z.boolean().default(false),
  privacy: z.literal(true),
  terms: z.literal(true),
});

export type ConsentDraft = z.infer<typeof consentDraftSchema>;

export function isRequiredConsentComplete(draft: {
  is14OrOlder: boolean;
  privacy: boolean;
  terms: boolean;
}) {
  return draft.is14OrOlder && draft.terms && draft.privacy;
}
