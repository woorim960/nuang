import { z } from "zod";

export const consentDraftSchema = z.object({
  analytics: z.boolean().default(false),
  marketing: z.boolean().default(false),
  privacy: z.literal(true),
  terms: z.literal(true),
});

export type ConsentDraft = z.infer<typeof consentDraftSchema>;

export function isRequiredConsentComplete(draft: {
  privacy: boolean;
  terms: boolean;
}) {
  return draft.terms && draft.privacy;
}
