import { z } from "zod";

export const gateCRewardEntryConsentVersion = "GATE-C-REWARD-ENTRY-2026-07-24";

export const gateCRewardContactMethods = ["mobile_phone", "email"] as const;
export type GateCRewardContactMethod =
  (typeof gateCRewardContactMethods)[number];

export const gateCRewardEntryStatuses = [
  "entered",
  "winner",
  "not_selected",
  "contacted",
  "invalid",
  "withdrawn",
] as const;

export const gateCRewardEntryRequestSchema = z.object({
  consentAccepted: z.literal(true),
  consentVersion: z.literal(gateCRewardEntryConsentVersion),
  contactMethod: z.enum(gateCRewardContactMethods),
  participantCode: z.string().regex(/^GC-[A-F0-9]{8}$/),
  publicReceiptId: z.uuid(),
  website: z.string().max(0).optional().default(""),
});

export type GateCRewardEntryRequest = z.infer<
  typeof gateCRewardEntryRequestSchema
>;
