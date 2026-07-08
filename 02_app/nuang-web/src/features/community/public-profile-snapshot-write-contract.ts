import {
  publicProfileSnapshotContractVersion,
  type PublicProfileSnapshotPayload,
} from "@/features/together/public-comparison-contract";
import { profileVisibilityPolicyVersion } from "@/features/together/profile-visibility-policy";

export const publicProfileSnapshotWriteContractVersion =
  "public-profile-snapshot-write.v0.1";

export type PublicProfileSnapshotWriteStepId =
  | "ensure_account_result_report"
  | "read_profile_visibility_settings"
  | "project_public_snapshot_payload"
  | "upsert_profile_public_snapshot"
  | "mark_previous_public_snapshots_stale"
  | "record_visibility_audit_event";

export type PublicProfileSnapshotWriteFailureCode =
  | "result_report_not_found"
  | "visibility_settings_missing"
  | "snapshot_projection_failed"
  | "public_snapshot_write_failed"
  | "previous_snapshot_stale_mark_failed"
  | "visibility_audit_write_failed";

export const publicProfileSnapshotWriteSteps = [
  {
    id: "ensure_account_result_report",
    operation: "read_owned_result_report_summary",
    table: "report.result_report",
  },
  {
    id: "read_profile_visibility_settings",
    operation: "read_current_visibility_settings",
    table: "profile.profile_visibility_setting",
  },
  {
    id: "project_public_snapshot_payload",
    operation: "project_public_fields_only",
    table: "profile.profile_public_snapshot",
  },
  {
    id: "upsert_profile_public_snapshot",
    operation: "insert_active_public_snapshot",
    table: "profile.profile_public_snapshot",
  },
  {
    id: "mark_previous_public_snapshots_stale",
    operation: "mark_older_snapshots_stale",
    table: "profile.profile_public_snapshot",
  },
  {
    id: "record_visibility_audit_event",
    operation: "insert_public_snapshot_created_event",
    table: "audit.visibility_audit_event",
  },
] as const satisfies ReadonlyArray<{
  id: PublicProfileSnapshotWriteStepId;
  operation: string;
  table: string;
}>;

export const publicProfileSnapshotWriteFailures: Record<
  PublicProfileSnapshotWriteFailureCode,
  {
    httpStatus: 400 | 403 | 404 | 409 | 500;
    message: string;
    retryable: boolean;
    step: PublicProfileSnapshotWriteStepId;
  }
> = {
  result_report_not_found: {
    httpStatus: 404,
    message: "공개 프로필을 만들 결과를 찾을 수 없어요.",
    retryable: false,
    step: "ensure_account_result_report",
  },
  visibility_settings_missing: {
    httpStatus: 409,
    message: "공개 범위 설정을 먼저 확인해야 해요.",
    retryable: false,
    step: "read_profile_visibility_settings",
  },
  snapshot_projection_failed: {
    httpStatus: 400,
    message: "공개할 수 있는 프로필 요약을 만들 수 없어요.",
    retryable: false,
    step: "project_public_snapshot_payload",
  },
  public_snapshot_write_failed: {
    httpStatus: 500,
    message: "공개 프로필 스냅샷을 저장하지 못했어요.",
    retryable: true,
    step: "upsert_profile_public_snapshot",
  },
  previous_snapshot_stale_mark_failed: {
    httpStatus: 500,
    message: "이전 공개 프로필 상태를 갱신하지 못했어요.",
    retryable: true,
    step: "mark_previous_public_snapshots_stale",
  },
  visibility_audit_write_failed: {
    httpStatus: 500,
    message: "공개 프로필 생성 기록을 남기지 못했어요.",
    retryable: true,
    step: "record_visibility_audit_event",
  },
};

export type PublicProfileSnapshotWriteSuccessPayload = {
  ok: true;
  snapshot: {
    contractVersion: typeof publicProfileSnapshotWriteContractVersion;
    payload: PublicProfileSnapshotPayload;
    payloadContractVersion: typeof publicProfileSnapshotContractVersion;
    policyVersion: typeof profileVisibilityPolicyVersion;
    status: "active";
  };
  privacy: {
    includesAccountIdentity: false;
    includesCrisisHelpInteractions: false;
    includesDirectResponses: false;
    includesRawScorePayload: false;
    includesSensitiveAssessments: false;
  };
};

export function createPublicProfileSnapshotWriteFailurePayload(
  code: PublicProfileSnapshotWriteFailureCode,
) {
  const failure = publicProfileSnapshotWriteFailures[code];

  return {
    ok: false,
    error: "public_profile_snapshot_write_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
  } as const;
}

export function createPublicProfileSnapshotWriteSuccessPayload(
  payload: PublicProfileSnapshotPayload,
): PublicProfileSnapshotWriteSuccessPayload {
  return {
    ok: true,
    snapshot: {
      contractVersion: publicProfileSnapshotWriteContractVersion,
      payload,
      payloadContractVersion: publicProfileSnapshotContractVersion,
      policyVersion: profileVisibilityPolicyVersion,
      status: "active",
    },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
  };
}
