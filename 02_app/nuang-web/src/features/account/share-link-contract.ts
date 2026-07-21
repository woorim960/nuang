export type ShareLinkCreateStepId =
  | "verify_result_report_owner"
  | "build_share_summary"
  | "generate_share_token"
  | "hash_share_token"
  | "insert_share_link"
  | "return_share_url";

export type ShareLinkRevokeStepId =
  | "verify_share_link_owner"
  | "mark_share_link_revoked"
  | "return_revoked_status";

export type ShareLinkFailureCode =
  | "result_report_not_found"
  | "share_scope_not_allowed"
  | "share_summary_build_failed"
  | "share_token_hash_failed"
  | "share_link_insert_failed"
  | "share_link_not_found"
  | "share_link_already_revoked"
  | "share_link_revoke_failed";

export type ShareLinkSuccessInput = {
  expiresAt: string;
  shareLinkId: string;
  shareUrl: string;
};

export type RevokeShareLinkSuccessInput = {
  revokedAt: string;
  shareLinkId: string;
};

export const shareLinkCreateSteps = [
  {
    id: "verify_result_report_owner",
    table: "report.result_report",
    operation: "owner_read",
  },
  {
    id: "build_share_summary",
    table: "report.result_report.share_summary",
    operation: "summary_only_projection",
  },
  {
    id: "generate_share_token",
    table: "runtime_secret",
    operation: "random_token",
  },
  {
    id: "hash_share_token",
    table: "sharing.share_link.token_hash",
    operation: "pepper_hash",
  },
  {
    id: "insert_share_link",
    table: "sharing.share_link",
    operation: "insert_expiring_summary_link",
  },
  {
    id: "return_share_url",
    table: "public_response",
    operation: "return_raw_token_url_once",
  },
] as const satisfies ReadonlyArray<{
  id: ShareLinkCreateStepId;
  operation: string;
  table: string;
}>;

export const shareLinkRevokeSteps = [
  {
    id: "verify_share_link_owner",
    table: "sharing.share_link",
    operation: "owner_read",
  },
  {
    id: "mark_share_link_revoked",
    table: "sharing.share_link",
    operation: "update_status_revoked",
  },
  {
    id: "return_revoked_status",
    table: "public_response",
    operation: "return_revoked_at",
  },
] as const satisfies ReadonlyArray<{
  id: ShareLinkRevokeStepId;
  operation: string;
  table: string;
}>;

export const shareLinkFailures: Record<
  ShareLinkFailureCode,
  {
    httpStatus: 400 | 404 | 409 | 500;
    message: string;
    retryable: boolean;
    step: ShareLinkCreateStepId | ShareLinkRevokeStepId;
  }
> = {
  result_report_not_found: {
    httpStatus: 404,
    message: "공유할 결과를 찾을 수 없어요.",
    retryable: false,
    step: "verify_result_report_owner",
  },
  share_scope_not_allowed: {
    httpStatus: 400,
    message: "이 공유 범위는 아직 지원하지 않아요.",
    retryable: false,
    step: "build_share_summary",
  },
  share_summary_build_failed: {
    httpStatus: 500,
    message: "공유 요약을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "build_share_summary",
  },
  share_token_hash_failed: {
    httpStatus: 500,
    message:
      "공유 링크를 안전하게 준비하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "hash_share_token",
  },
  share_link_insert_failed: {
    httpStatus: 500,
    message: "공유 링크를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_share_link",
  },
  share_link_not_found: {
    httpStatus: 404,
    message: "철회할 공유 링크를 찾을 수 없어요.",
    retryable: false,
    step: "verify_share_link_owner",
  },
  share_link_already_revoked: {
    httpStatus: 409,
    message: "이미 철회된 공유 링크예요.",
    retryable: false,
    step: "mark_share_link_revoked",
  },
  share_link_revoke_failed: {
    httpStatus: 500,
    message: "공유 링크를 철회하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "mark_share_link_revoked",
  },
};

export function createShareLinkFailurePayload(code: ShareLinkFailureCode) {
  const failure = shareLinkFailures[code];

  return {
    ok: false,
    error: "share_link_write_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
  } as const;
}

export function createShareLinkSuccessPayload(input: ShareLinkSuccessInput) {
  return {
    ok: true,
    shareLink: {
      expiresAt: input.expiresAt,
      id: input.shareLinkId,
      url: input.shareUrl,
      visibility: "summary",
    },
  } as const;
}

export function createRevokeShareLinkSuccessPayload(
  input: RevokeShareLinkSuccessInput,
) {
  return {
    ok: true,
    shareLink: {
      id: input.shareLinkId,
      revokedAt: input.revokedAt,
      status: "revoked",
    },
  } as const;
}
