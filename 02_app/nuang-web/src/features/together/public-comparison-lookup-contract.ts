import { z } from "zod";
import {
  publicComparisonReportContractVersion,
  type PublicComparisonReportPayload,
} from "@/features/together/public-comparison-contract";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";

export const publicComparisonLookupContractVersion =
  "public-comparison-lookup.v0.1";

export const publicComparisonLookupRequestSchema = z.object({
  comparisonReportId: z.string().uuid(),
});

export type PublicComparisonAccessStatus =
  | "active"
  | "stale"
  | "disabled"
  | "deleted";

export type PublicComparisonLookupStepId =
  | "validate_comparison_report_reference"
  | "ensure_viewer_owns_comparison_report"
  | "read_comparison_report"
  | "revalidate_comparison_access_status"
  | "project_public_comparison_report";

export type PublicComparisonLookupFailureCode =
  | "comparison_report_not_found"
  | "comparison_report_not_owned"
  | "comparison_report_stale"
  | "comparison_report_disabled"
  | "comparison_report_deleted"
  | "comparison_report_lookup_failed";

export const publicComparisonLookupSteps = [
  {
    id: "validate_comparison_report_reference",
    operation: "validate_uuid_reference",
    table: "comparison.public_comparison_report",
  },
  {
    id: "ensure_viewer_owns_comparison_report",
    operation: "assert_viewer_owns_report",
    table: "comparison.public_comparison_report",
  },
  {
    id: "read_comparison_report",
    operation: "read_report_payload",
    table: "comparison.public_comparison_report",
  },
  {
    id: "revalidate_comparison_access_status",
    operation: "assert_access_status_active",
    table: "comparison.public_comparison_report",
  },
  {
    id: "project_public_comparison_report",
    operation: "return_safe_report_payload",
    table: "comparison.public_comparison_report",
  },
] as const satisfies ReadonlyArray<{
  id: PublicComparisonLookupStepId;
  operation: string;
  table: string;
}>;

export const publicComparisonLookupFailures: Record<
  PublicComparisonLookupFailureCode,
  {
    accessStatus?: PublicComparisonAccessStatus;
    httpStatus: 403 | 404 | 410 | 423 | 500;
    message: string;
    retryable: boolean;
    step: PublicComparisonLookupStepId;
  }
> = {
  comparison_report_not_found: {
    httpStatus: 404,
    message: "비교 리포트를 찾을 수 없어요.",
    retryable: false,
    step: "read_comparison_report",
  },
  comparison_report_not_owned: {
    httpStatus: 403,
    message: "이 비교 리포트를 볼 권한이 없어요.",
    retryable: false,
    step: "ensure_viewer_owns_comparison_report",
  },
  comparison_report_stale: {
    accessStatus: "stale",
    httpStatus: 423,
    message: "비교 리포트의 공개 범위가 바뀌어 다시 확인이 필요해요.",
    retryable: false,
    step: "revalidate_comparison_access_status",
  },
  comparison_report_disabled: {
    accessStatus: "disabled",
    httpStatus: 410,
    message: "현재 열 수 없는 비교 리포트예요.",
    retryable: false,
    step: "revalidate_comparison_access_status",
  },
  comparison_report_deleted: {
    accessStatus: "deleted",
    httpStatus: 410,
    message: "삭제된 비교 리포트예요.",
    retryable: false,
    step: "revalidate_comparison_access_status",
  },
  comparison_report_lookup_failed: {
    httpStatus: 500,
    message: "비교 리포트를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "read_comparison_report",
  },
};

export type PublicComparisonLookupSuccessPayload = {
  ok: true;
  lookup: {
    accessStatus: "active";
    contractVersion: typeof publicComparisonLookupContractVersion;
    policyVersion: typeof profileVisibilityPolicyVersion;
    report: PublicComparisonReportPayload;
    reportContractVersion: typeof publicComparisonReportContractVersion;
  };
  privacy: {
    includesAccountIdentity: false;
    includesCrisisHelpInteractions: false;
    includesDirectResponses: false;
    includesPrivateInference: false;
    includesRawScorePayload: false;
    includesSensitiveAssessments: false;
  };
};

export function createPublicComparisonLookupFailurePayload(
  code: PublicComparisonLookupFailureCode,
) {
  const failure = publicComparisonLookupFailures[code];

  return {
    ok: false,
    error: "public_comparison_lookup_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
    ...(failure.accessStatus ? { accessStatus: failure.accessStatus } : {}),
  } as const;
}

export function createPublicComparisonLookupSuccessPayload(
  report: PublicComparisonReportPayload,
): PublicComparisonLookupSuccessPayload {
  return {
    ok: true,
    lookup: {
      accessStatus: "active",
      contractVersion: publicComparisonLookupContractVersion,
      policyVersion: profileVisibilityPolicyVersion,
      report,
      reportContractVersion: publicComparisonReportContractVersion,
    },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesPrivateInference: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
  };
}
