export type ResultAccountStatus = {
  activeShareLinkCount: number;
  activeShareLinks: Array<{
    expiresAt: string;
    id: string;
  }>;
  assessmentAttemptId: string;
  claimedAt: string;
  latestShareExpiresAt: string | null;
  profileCode: string;
  profileName: string;
  resultReportId: string;
};

export type ResultAccountStatusReadFailureCode =
  | "account_status_read_failed"
  | "result_report_status_read_failed"
  | "share_link_status_read_failed";

export function createResultAccountStatusPayload(
  result: ResultAccountStatus | null,
) {
  return {
    ok: true,
    result,
  } as const;
}

export function createResultAccountStatusFailurePayload(
  code: ResultAccountStatusReadFailureCode,
) {
  return {
    code,
    error: "result_account_status_read_failed",
    message: "결과 상태를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    ok: false,
    retryable: true,
  } as const;
}
