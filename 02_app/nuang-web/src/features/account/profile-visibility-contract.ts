import {
  createDefaultProfileVisibilitySettings,
  profileVisibilityPolicyVersion,
} from "@/features/together/profile-visibility-policy";

export type ProfileVisibilityWriteStepId =
  | "ensure_account"
  | "verify_age_and_required_consent"
  | "validate_visibility_policy_version"
  | "upsert_profile_visibility_settings"
  | "build_public_profile_snapshot"
  | "invalidate_out_of_scope_comparisons"
  | "record_visibility_audit_event";

export type ProfileVisibilityFailureCode =
  | "account_link_missing"
  | "age_or_required_consent_missing"
  | "visibility_policy_version_mismatch"
  | "visibility_scope_not_allowed"
  | "visibility_settings_write_failed"
  | "public_snapshot_build_failed"
  | "comparison_revalidation_failed"
  | "visibility_audit_write_failed";

export type ProfileVisibilitySuccessInput = {
  publicSnapshotId: string;
  savedAt: string;
  settingsId: string;
};

export const profileVisibilityWriteSteps = [
  {
    id: "ensure_account",
    table: "identity.account",
    operation: "read_current_account",
  },
  {
    id: "verify_age_and_required_consent",
    table: "consent.age_and_consent_status",
    operation: "read_required_status",
  },
  {
    id: "validate_visibility_policy_version",
    table: "profile.visibility_policy_release",
    operation: "assert_active_version",
  },
  {
    id: "upsert_profile_visibility_settings",
    table: "profile.profile_visibility_setting",
    operation: "upsert_field_settings",
  },
  {
    id: "build_public_profile_snapshot",
    table: "profile.profile_public_snapshot",
    operation: "summary_only_projection",
  },
  {
    id: "invalidate_out_of_scope_comparisons",
    table: "comparison.comparison_report",
    operation: "revalidate_access_scope",
  },
  {
    id: "record_visibility_audit_event",
    table: "audit.visibility_audit_event",
    operation: "insert_policy_event",
  },
] as const satisfies ReadonlyArray<{
  id: ProfileVisibilityWriteStepId;
  operation: string;
  table: string;
}>;

export const profileVisibilityFailures: Record<
  ProfileVisibilityFailureCode,
  {
    httpStatus: 400 | 403 | 409 | 500;
    message: string;
    retryable: boolean;
    step: ProfileVisibilityWriteStepId;
  }
> = {
  account_link_missing: {
    httpStatus: 403,
    message: "계정 연결을 확인할 수 없어 공개 범위를 저장하지 못했어요.",
    retryable: true,
    step: "ensure_account",
  },
  age_or_required_consent_missing: {
    httpStatus: 400,
    message: "필수 확인이 완료되지 않아 공개 범위를 저장하지 못했어요.",
    retryable: false,
    step: "verify_age_and_required_consent",
  },
  visibility_policy_version_mismatch: {
    httpStatus: 409,
    message: "공개 범위 정책이 바뀌었어요. 화면을 새로고침한 뒤 다시 확인해 주세요.",
    retryable: false,
    step: "validate_visibility_policy_version",
  },
  visibility_scope_not_allowed: {
    httpStatus: 400,
    message: "이 공개 범위는 아직 지원하지 않아요.",
    retryable: false,
    step: "upsert_profile_visibility_settings",
  },
  visibility_settings_write_failed: {
    httpStatus: 500,
    message: "공개 범위를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "upsert_profile_visibility_settings",
  },
  public_snapshot_build_failed: {
    httpStatus: 500,
    message: "공개 프로필 요약을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "build_public_profile_snapshot",
  },
  comparison_revalidation_failed: {
    httpStatus: 500,
    message: "기존 비교 접근 범위를 다시 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "invalidate_out_of_scope_comparisons",
  },
  visibility_audit_write_failed: {
    httpStatus: 500,
    message: "공개 범위 변경 기록을 남기지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "record_visibility_audit_event",
  },
};

export function createProfileVisibilityFailurePayload(
  code: ProfileVisibilityFailureCode,
) {
  const failure = profileVisibilityFailures[code];

  return {
    ok: false,
    error: "profile_visibility_write_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
  } as const;
}

export function createProfileVisibilitySuccessPayload(
  input: ProfileVisibilitySuccessInput,
) {
  return {
    ok: true,
    profileVisibility: {
      policyVersion: profileVisibilityPolicyVersion,
      publicSnapshotId: input.publicSnapshotId,
      savedAt: input.savedAt,
      settings: createDefaultProfileVisibilitySettings(),
      settingsId: input.settingsId,
    },
    privacy: {
      includesAccountIdentity: false,
      includesCrisisHelpInteractions: false,
      includesDirectResponses: false,
      includesRawScorePayload: false,
      includesSensitiveAssessments: false,
    },
  } as const;
}
