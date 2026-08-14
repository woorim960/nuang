import { z } from "zod";
import type { AccountTraitProfile } from "@/features/assessment/account-trait-profile-contract";
import { reportContentSnapshotSchema } from "@/features/result/unified-core-report/report-content-snapshot-contract";
import { localResultIdSchema } from "@/features/result-persistence/local-result-id-contract";

const accountResultDomainSchema = z.object({
  domainId: z.string().min(1).max(24),
  isBoundary: z.boolean().optional(),
  label: z.string().min(1).max(40),
  score: z.number().min(0).max(100).nullable(),
  status: z.enum(["valid", "partial", "insufficient"]).optional(),
  symbol: z.string().max(8).nullable().optional(),
});

const accountResultFacetSchema = z.object({
  facetId: z.string().min(1).max(24),
  label: z.string().min(1).max(40),
  score: z.number().min(0).max(100).nullable(),
  status: z.enum(["valid", "partial", "insufficient"]).optional(),
  validResponses: z.number().int().min(0).optional(),
});

const accountResultVersionBundleSchema = z.object({
  assessmentReleaseId: z.string().min(1).max(120),
  codeSchemeVersion: z.string().min(1).max(120),
  scoringModelVersion: z.string().min(1).max(120),
  scoringReleaseId: z.string().min(1).max(120),
});

const storedAccountResultSummarySchema = z.object({
  alternativeCodes: z
    .array(z.string().regex(/^[A-Z]{5}$/))
    .max(5)
    .optional(),
  completedAt: z.string().datetime().optional(),
  domains: z.array(accountResultDomainSchema).max(5).default([]),
  facets: z.array(accountResultFacetSchema).max(10).default([]),
  originResultId: z.string().min(6).max(128).optional(),
  reportContentSnapshot: reportContentSnapshotSchema.nullable().optional(),
  responseSnapshotHash: z.string().min(8).max(160).optional(),
  resultCopyVersion: z.string().min(1).max(120).optional(),
  resultEvidenceStatus: z
    .enum(["clear", "near_boundary", "insufficient_evidence"])
    .optional(),
  resultLabel: z.string().min(1).max(80).optional(),
  resultStatus: z.enum(["ready", "insufficient_evidence"]).optional(),
  versionBundle: accountResultVersionBundleSchema.optional(),
});

export type AccountResultVersionBundle = {
  assessmentReleaseId: string | null;
  codeSchemeVersion: string | null;
  scoringModelVersion: string | null;
  scoringReleaseId: string | null;
};

export const accountResultsQuerySchema = z.object({
  resultReportId: z.string().uuid().optional(),
});

export const deleteAccountResultRequestSchema = z
  .object({
    localResultId: localResultIdSchema.optional(),
    resultReportId: z.string().uuid().optional(),
  })
  .refine(
    (value) => Boolean(value.localResultId || value.resultReportId),
    "삭제할 결과 식별자가 필요합니다.",
  );

export type AccountResultSummary = {
  alternativeCodes?: string[];
  assessmentAttemptId: string;
  completedAt: string;
  createdAt: string;
  domains: Array<z.infer<typeof accountResultDomainSchema>>;
  facets: Array<z.infer<typeof accountResultFacetSchema>>;
  kind: "full" | "quick";
  localResultId: string | null;
  originResultId?: string | null;
  profileCode: string;
  profileName: string;
  reportContentSnapshot?: z.infer<typeof reportContentSnapshotSchema> | null;
  responseSnapshotHash?: string | null;
  resultCopyVersion?: string | null;
  resultEvidenceStatus?:
    "clear" | "near_boundary" | "insufficient_evidence" | null;
  resultLabel: string;
  resultReportId: string;
  resultStatus?: "ready" | "insufficient_evidence" | null;
  versionBundle?: AccountResultVersionBundle;
};

export type AccountComparisonReportSummary = {
  accessStatus: "active" | "deleted" | "disabled" | "stale";
  comparisonReportId: string;
  createdAt: string;
  headline: string;
  targetCode: string;
  targetDisplayName: string;
  targetProfileName: string;
  viewerCode: string;
  viewerProfileName: string;
};

export type AccountResultReadFailureCode =
  "account_results_read_failed" | "account_result_attempts_read_failed";

export type DeleteAccountResultResult = {
  deleted: boolean;
  localResultId: string | null;
  resultReportId: string | null;
};

export type DeleteAccountResultFailureCode = "account_result_delete_failed";

export function parseStoredAccountResultSummary(value: unknown) {
  return storedAccountResultSummarySchema.safeParse(value);
}

export function createAccountResultsPayload(
  results: AccountResultSummary[],
  comparisonReports: AccountComparisonReportSummary[] = [],
  currentTraitProfile: AccountTraitProfile | null = null,
) {
  return {
    comparisonReports,
    currentTraitProfile,
    ok: true,
    results,
  } as const;
}

export function createAccountResultsFailurePayload(
  code: AccountResultReadFailureCode,
) {
  return {
    code,
    error: "account_results_read_failed",
    message: "결과를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    ok: false,
    retryable: true,
  } as const;
}

export function createDeleteAccountResultPayload(
  result: DeleteAccountResultResult,
) {
  return {
    ok: true,
    result,
  } as const;
}

export function createDeleteAccountResultFailurePayload(
  code: DeleteAccountResultFailureCode,
) {
  return {
    code,
    error: "result_delete_failed",
    message: "결과를 삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    ok: false,
    retryable: true,
  } as const;
}
