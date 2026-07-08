export type ClaimResultWriteStepId =
  | "ensure_account"
  | "upsert_age_consent"
  | "record_required_consents"
  | "create_assessment_attempt"
  | "insert_assessment_responses"
  | "create_score_snapshot"
  | "create_result_report";

export type ClaimResultWriteFailureCode =
  | "account_link_missing"
  | "age_or_required_consent_missing"
  | "local_result_already_claimed"
  | "assessment_attempt_write_failed"
  | "assessment_response_write_failed"
  | "score_snapshot_write_failed"
  | "result_report_write_failed";

export type ClaimResultWriteSuccessInput = {
  assessmentAttemptId: string;
  claimedAt: string;
  profileCode: string;
  profileName: string;
  resultReportId: string;
};

export const claimResultWriteSteps = [
  {
    id: "ensure_account",
    table: "identity.account",
    operation: "read_or_create",
  },
  {
    id: "upsert_age_consent",
    table: "consent.age_and_consent_status",
    operation: "upsert",
  },
  {
    id: "record_required_consents",
    table: "consent.consent_record",
    operation: "insert_required_versions",
  },
  {
    id: "create_assessment_attempt",
    table: "assessment.assessment_attempt",
    operation: "insert_idempotent_claim",
  },
  {
    id: "insert_assessment_responses",
    table: "assessment.assessment_response",
    operation: "server_only_insert",
  },
  {
    id: "create_score_snapshot",
    table: "scoring.score_snapshot",
    operation: "insert_score_payload",
  },
  {
    id: "create_result_report",
    table: "report.result_report",
    operation: "insert_report_and_share_summary",
  },
] as const satisfies ReadonlyArray<{
  id: ClaimResultWriteStepId;
  operation: string;
  table: string;
}>;

export const claimResultWriteFailures: Record<
  ClaimResultWriteFailureCode,
  {
    httpStatus: 400 | 403 | 409 | 500;
    message: string;
    retryable: boolean;
    step: ClaimResultWriteStepId;
  }
> = {
  account_link_missing: {
    httpStatus: 403,
    message: "계정 연결을 확인할 수 없어 결과를 저장하지 못했어요.",
    retryable: true,
    step: "ensure_account",
  },
  age_or_required_consent_missing: {
    httpStatus: 400,
    message: "필수 동의가 확인되지 않아 결과를 저장하지 못했어요.",
    retryable: false,
    step: "upsert_age_consent",
  },
  local_result_already_claimed: {
    httpStatus: 409,
    message: "이미 계정에 저장된 결과예요.",
    retryable: false,
    step: "create_assessment_attempt",
  },
  assessment_attempt_write_failed: {
    httpStatus: 500,
    message: "검사 기록을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "create_assessment_attempt",
  },
  assessment_response_write_failed: {
    httpStatus: 500,
    message: "응답 기록을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_assessment_responses",
  },
  score_snapshot_write_failed: {
    httpStatus: 500,
    message: "점수 스냅샷을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "create_score_snapshot",
  },
  result_report_write_failed: {
    httpStatus: 500,
    message: "결과 리포트를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "create_result_report",
  },
};

export function createClaimResultWriteFailurePayload(
  code: ClaimResultWriteFailureCode,
) {
  const failure = claimResultWriteFailures[code];

  return {
    ok: false,
    error: "claim_result_write_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
  } as const;
}

export function createClaimResultWriteSuccessPayload(
  input: ClaimResultWriteSuccessInput,
) {
  return {
    ok: true,
    result: {
      assessmentAttemptId: input.assessmentAttemptId,
      claimedAt: input.claimedAt,
      profileCode: input.profileCode,
      profileName: input.profileName,
      resultReportId: input.resultReportId,
    },
    next: {
      canCreateShareLink: true,
      canOpenMap: true,
    },
  } as const;
}
