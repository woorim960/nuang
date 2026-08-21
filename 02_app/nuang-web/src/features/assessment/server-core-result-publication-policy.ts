import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canPublishCoreResult,
  legacyCoreContainmentPolicy,
  type LegacyCorePublicDenyReason,
} from "@/features/assessment/legacy-core-containment-policy";

type ServiceClient = SupabaseClient;
type PublicableReleaseStatus = "active" | "validated";

export type CoreResultPublicationDecision =
  | {
      eligible: true;
      resultReportId: string;
    }
  | {
      eligible: false;
      reason:
        | "policy_lookup_failed"
        | "release_mismatch"
        | "release_not_publicable"
        | "release_trace_missing"
        | "result_not_found"
        | "snapshot_not_publicable"
        | LegacyCorePublicDenyReason;
    };

const publicableReleaseStatuses = new Set<PublicableReleaseStatus>([
  "active",
  "validated",
]);

/**
 * 코어 결과가 공개 프로필·공유·피드·사람 비교로 전파될 수 있는지 판정합니다.
 * 개인 저장과 본인 조회에는 사용하지 않습니다. DB 조회가 불완전하면 fail closed
 * 하며 중앙 exact public allowlist에 없는 모든 release는 허용하지 않습니다.
 */
export async function readCoreResultPublicationDecision({
  client,
  ownerAccountId,
  resultReportId,
}: {
  client: ServiceClient;
  ownerAccountId?: string;
  resultReportId: string;
}): Promise<CoreResultPublicationDecision> {
  let reportQuery = client
    .schema("report")
    .from("result_report")
    .select(
      "id,account_id,report_kind,measurement_release_id,code_scheme_version,scoring_release_id",
    )
    .eq("id", resultReportId)
    .is("deleted_at", null);

  if (ownerAccountId) {
    reportQuery = reportQuery.eq("account_id", ownerAccountId);
  }

  const reportResponse = await reportQuery.maybeSingle();
  if (reportResponse.error) {
    return { eligible: false, reason: "policy_lookup_failed" };
  }
  if (!reportResponse.data) {
    return { eligible: false, reason: "result_not_found" };
  }

  const report = reportResponse.data as {
    code_scheme_version?: unknown;
    id?: unknown;
    measurement_release_id?: unknown;
    report_kind?: unknown;
    scoring_release_id?: unknown;
  };
  if (
    (report.report_kind !== "quick" && report.report_kind !== "full") ||
    typeof report.measurement_release_id !== "string" ||
    typeof report.code_scheme_version !== "string" ||
    typeof report.scoring_release_id !== "string"
  ) {
    return { eligible: false, reason: "release_trace_missing" };
  }

  if (
    !canPublishCoreResult({
      codeSchemeVersion: report.code_scheme_version,
      measurementReleaseId: report.measurement_release_id,
      scoringReleaseId: report.scoring_release_id,
    })
  ) {
    return {
      eligible: false,
      reason: legacyCoreContainmentPolicy.publicDenyReason,
    };
  }

  const [itemReleaseResponse, codeSchemeResponse] = await Promise.all([
    client
      .schema("assessment")
      .from("item_bank_release")
      .select("item_bank_release_id,code_scheme_version,status")
      .eq("item_bank_release_id", report.measurement_release_id)
      .maybeSingle(),
    client
      .schema("scoring")
      .from("code_scheme_release")
      .select("code_scheme_version,status")
      .eq("code_scheme_version", report.code_scheme_version)
      .maybeSingle(),
  ]);

  if (itemReleaseResponse.error || codeSchemeResponse.error) {
    return { eligible: false, reason: "policy_lookup_failed" };
  }
  if (!itemReleaseResponse.data || !codeSchemeResponse.data) {
    return { eligible: false, reason: "release_trace_missing" };
  }

  const itemRelease = itemReleaseResponse.data as {
    code_scheme_version?: unknown;
    status?: unknown;
  };
  const codeScheme = codeSchemeResponse.data as {
    code_scheme_version?: unknown;
    status?: unknown;
  };
  if (
    itemRelease.code_scheme_version !== report.code_scheme_version ||
    codeScheme.code_scheme_version !== report.code_scheme_version
  ) {
    return { eligible: false, reason: "release_mismatch" };
  }
  if (
    !isPublicableReleaseStatus(itemRelease.status) ||
    !isPublicableReleaseStatus(codeScheme.status)
  ) {
    return { eligible: false, reason: "release_not_publicable" };
  }

  return {
    eligible: true,
    resultReportId: String(report.id ?? resultReportId),
  };
}

export async function readPublicSnapshotPublicationDecision({
  client,
  ownerAccountId,
  publicSnapshotId,
}: {
  client: ServiceClient;
  ownerAccountId?: string;
  publicSnapshotId: string;
}): Promise<CoreResultPublicationDecision> {
  let snapshotQuery = client
    .schema("profile")
    .from("profile_public_snapshot")
    .select("account_id,result_report_id,status")
    .eq("id", publicSnapshotId)
    .eq("status", "active")
    .is("deleted_at", null);
  if (ownerAccountId) {
    snapshotQuery = snapshotQuery.eq("account_id", ownerAccountId);
  }
  const snapshotResponse = await snapshotQuery.maybeSingle();
  if (snapshotResponse.error) {
    return { eligible: false, reason: "policy_lookup_failed" };
  }
  const snapshot = snapshotResponse.data as {
    account_id?: unknown;
    result_report_id?: unknown;
  } | null;
  if (
    !snapshot ||
    typeof snapshot.result_report_id !== "string" ||
    typeof snapshot.account_id !== "string"
  ) {
    return { eligible: false, reason: "snapshot_not_publicable" };
  }

  return readCoreResultPublicationDecision({
    client,
    ownerAccountId: snapshot.account_id,
    resultReportId: snapshot.result_report_id,
  });
}

function isPublicableReleaseStatus(
  value: unknown,
): value is PublicableReleaseStatus {
  return (
    typeof value === "string" &&
    publicableReleaseStatuses.has(value as PublicableReleaseStatus)
  );
}
