import { z } from "zod";
import { consentDraftSchema } from "@/features/consent/consent-draft";

const domainSummarySchema = z.object({
  domainId: z.string().min(1).max(24),
  label: z.string().min(1).max(40),
  score: z.number().min(0).max(100).nullable(),
  symbol: z.string().min(1).max(8).nullable(),
});

const facetSummarySchema = z.object({
  facetId: z.string().min(1).max(24),
  label: z.string().min(1).max(40),
  score: z.number().min(0).max(100).nullable(),
  status: z.enum(["valid", "partial", "insufficient"]).optional(),
});

export const claimResultRequestSchema = z.object({
  assessmentKind: z.enum(["quick", "full"]),
  consentDraft: consentDraftSchema,
  localResultId: z.string().min(6).max(128),
  versionBundle: z.object({
    assessmentReleaseId: z.string().min(1).max(120),
    codeSchemeVersion: z.string().min(1).max(120),
    scoringModelVersion: z.string().min(1).max(120),
    scoringReleaseId: z.string().min(1).max(120),
  }),
  resultSummary: z.object({
    completedAt: z.string().datetime(),
    domains: z.array(domainSummarySchema).max(5).optional(),
    facets: z.array(facetSummarySchema).max(10).optional(),
    profileCode: z.string().min(1).max(16),
    profileName: z.string().min(1).max(80),
    resultLabel: z.string().min(1).max(80).optional(),
  }),
});

export const resultAccountStatusQuerySchema = z.object({
  localResultId: z.string().min(6).max(128),
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
