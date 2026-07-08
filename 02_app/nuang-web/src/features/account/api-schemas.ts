import { z } from "zod";
import { consentDraftSchema } from "@/features/consent/consent-draft";

export const claimResultRequestSchema = z.object({
  assessmentKind: z.enum(["quick", "full"]),
  consentDraft: consentDraftSchema,
  localResultId: z.string().min(6).max(128),
  resultSummary: z.object({
    completedAt: z.string().datetime(),
    profileCode: z.string().min(1).max(16),
    profileName: z.string().min(1).max(80),
  }),
});

export const createShareLinkRequestSchema = z.object({
  consentDraft: consentDraftSchema,
  resultReportId: z.string().uuid(),
  ttlDays: z.number().int().min(1).max(30).default(30),
  visibility: z.enum(["summary"]).default("summary"),
});

export const revokeShareLinkRequestSchema = z.object({
  shareLinkId: z.string().uuid(),
});
