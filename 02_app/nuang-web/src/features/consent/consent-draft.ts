import { z } from "zod";

export const ageBands = ["14-18", "19-24", "25-34", "35-44", "45+"] as const;

export const consentDraftSchema = z.object({
  ageBand: z.enum(ageBands).or(z.literal("")).optional(),
  analytics: z.boolean().default(false),
  is14OrOlder: z.literal(true),
  marketing: z.boolean().default(false),
  privacy: z.literal(true),
  terms: z.literal(true),
});

export type AgeBand = (typeof ageBands)[number];
export type ConsentDraft = z.infer<typeof consentDraftSchema>;

export function isRequiredConsentComplete(draft: {
  is14OrOlder: boolean;
  privacy: boolean;
  terms: boolean;
}) {
  return draft.is14OrOlder && draft.terms && draft.privacy;
}
