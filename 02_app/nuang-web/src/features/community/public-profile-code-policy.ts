export const publicProfileCodePolicyVersion = "public-profile-code.v0.1";

export const publicProfileCodePrefix = "NUANG";
export const publicProfileCodeBodyMinLength = 5;
export const publicProfileCodeBodyMaxLength = 8;
export const publicProfileCodeGeneratedBodyLength = 6;
export const publicProfileCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const publicProfileCodeBodyPattern =
  /^(?=.*[2-9])[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5,8}$/;
export const publicProfileCodePattern =
  /^NUANG-(?=.*[2-9])[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5,8}$/;
export const profileTypeCodeBodyPattern = /^[A-Z]{5}$/;

export const reservedPublicProfileCodeBodies = [
  "ADMIN",
  "AUTH",
  "HELP",
  "LEGAL",
  "LOGIN",
  "NUANG",
  "PUBLIC",
  "RESULT",
  "SHARE",
  "SUPPORT",
  "TERMS",
] as const;

export type PublicProfileCodeValidationFailureCode =
  | "missing_public_profile_prefix"
  | "invalid_public_profile_code_shape"
  | "reserved_public_profile_code"
  | "profile_type_code_conflict";

export type PublicProfileCodeIssueFailureCode =
  | "invalid_requested_public_profile_code"
  | "reserved_requested_public_profile_code"
  | "public_profile_code_conflict"
  | "public_profile_code_claim_failed"
  | "public_profile_code_audit_failed";

export type PublicProfileCodeIssueStepId =
  | "normalize_requested_or_generated_code"
  | "reject_reserved_or_profile_type_code"
  | "claim_unique_public_profile_code"
  | "attach_code_to_public_snapshot"
  | "record_public_profile_code_audit_event";

export const publicProfileCodeIssueSteps = [
  {
    id: "normalize_requested_or_generated_code",
    operation: "uppercase_and_validate_prefix",
    table: "profile.profile_public_code",
  },
  {
    id: "reject_reserved_or_profile_type_code",
    operation: "reject_reserved_words_and_result_type_codes",
    table: "profile.profile_public_code_policy",
  },
  {
    id: "claim_unique_public_profile_code",
    operation: "insert_unique_code_or_retry_candidate",
    table: "profile.profile_public_code",
  },
  {
    id: "attach_code_to_public_snapshot",
    operation: "link_code_to_current_public_snapshot",
    table: "profile.profile_public_snapshot",
  },
  {
    id: "record_public_profile_code_audit_event",
    operation: "insert_public_code_issue_event",
    table: "audit.visibility_audit_event",
  },
] as const satisfies ReadonlyArray<{
  id: PublicProfileCodeIssueStepId;
  operation: string;
  table: string;
}>;

export const publicProfileCodeIssueFailures: Record<
  PublicProfileCodeIssueFailureCode,
  {
    httpStatus: 400 | 409 | 500;
    message: string;
    retryable: boolean;
    step: PublicProfileCodeIssueStepId;
  }
> = {
  invalid_requested_public_profile_code: {
    httpStatus: 400,
    message: "공개 프로필 코드는 NUANG- 뒤에 5~8자의 영문/숫자로 만들어 주세요.",
    retryable: false,
    step: "normalize_requested_or_generated_code",
  },
  reserved_requested_public_profile_code: {
    httpStatus: 400,
    message: "이 공개 프로필 코드는 사용할 수 없어요.",
    retryable: false,
    step: "reject_reserved_or_profile_type_code",
  },
  public_profile_code_conflict: {
    httpStatus: 409,
    message: "이미 사용 중인 공개 프로필 코드예요.",
    retryable: false,
    step: "claim_unique_public_profile_code",
  },
  public_profile_code_claim_failed: {
    httpStatus: 500,
    message: "공개 프로필 코드를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "claim_unique_public_profile_code",
  },
  public_profile_code_audit_failed: {
    httpStatus: 500,
    message: "공개 프로필 코드 발급 기록을 남기지 못했어요.",
    retryable: true,
    step: "record_public_profile_code_audit_event",
  },
};

export type PublicProfileCodeValidationResult =
  | {
      body: string;
      code: string;
      ok: true;
      policyVersion: typeof publicProfileCodePolicyVersion;
    }
  | {
      code: PublicProfileCodeValidationFailureCode;
      message: string;
      ok: false;
      policyVersion: typeof publicProfileCodePolicyVersion;
    };

export function normalizePublicProfileCodeCandidate(candidate: string) {
  return decodeURIComponent(candidate).trim().toUpperCase();
}

export function validatePublicProfileCode(candidate: string): PublicProfileCodeValidationResult {
  const normalized = normalizePublicProfileCodeCandidate(candidate);

  if (!normalized.startsWith(`${publicProfileCodePrefix}-`)) {
    return createValidationFailure(
      "missing_public_profile_prefix",
      "공개 프로필 코드는 NUANG-으로 시작해야 해요.",
    );
  }

  const body = normalized.slice(publicProfileCodePrefix.length + 1);

  if (
    body.length < publicProfileCodeBodyMinLength ||
    body.length > publicProfileCodeBodyMaxLength
  ) {
    return createValidationFailure(
      "invalid_public_profile_code_shape",
      "공개 프로필 코드는 NUANG- 뒤에 5~8자를 사용해 주세요.",
    );
  }

  if (isReservedPublicProfileCodeBody(body)) {
    return createValidationFailure(
      "reserved_public_profile_code",
      "예약된 공개 프로필 코드는 사용할 수 없어요.",
    );
  }

  if (profileTypeCodeBodyPattern.test(body)) {
    return createValidationFailure(
      "profile_type_code_conflict",
      "성향 타입 코드와 같은 공개 프로필 코드는 사용할 수 없어요.",
    );
  }

  if (!publicProfileCodeBodyPattern.test(body)) {
    return createValidationFailure(
      "invalid_public_profile_code_shape",
      "읽기 어려운 글자나 숫자 없는 코드는 사용할 수 없어요.",
    );
  }

  return {
    body,
    code: normalized,
    ok: true,
    policyVersion: publicProfileCodePolicyVersion,
  };
}

export function isReservedPublicProfileCodeBody(body: string) {
  const normalized = normalizePublicProfileCodeCandidate(body);

  return reservedPublicProfileCodeBodies.some((reservedBody) => reservedBody === normalized);
}

export function createPublicProfileCodeIssueFailurePayload(
  code: PublicProfileCodeIssueFailureCode,
) {
  const failure = publicProfileCodeIssueFailures[code];

  return {
    ok: false,
    error: "public_profile_code_issue_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
  } as const;
}

function createValidationFailure(
  code: PublicProfileCodeValidationFailureCode,
  message: string,
): PublicProfileCodeValidationResult {
  return {
    code,
    message,
    ok: false,
    policyVersion: publicProfileCodePolicyVersion,
  };
}
