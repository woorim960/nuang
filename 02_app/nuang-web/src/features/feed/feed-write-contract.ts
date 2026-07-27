import type { FeedWriteRequest } from "@/features/feed/feed-contract";

export type FeedWriteStepId =
  | "ensure_account"
  | "validate_target"
  | "insert_feed_post"
  | "insert_feed_comment"
  | "insert_feed_reaction"
  | "insert_feed_bookmark"
  | "insert_feed_preference"
  | "insert_feed_report"
  | "insert_feed_poll"
  | "insert_feed_poll_vote"
  | "upload_feed_media"
  | "remove_feed_reaction"
  | "remove_feed_bookmark";

export type FeedWriteFailureCode =
  | "account_link_missing"
  | "feed_schema_permission_missing"
  | "feed_schema_not_available"
  | "feed_target_invalid"
  | "feed_target_not_supported"
  | "feed_response_closed"
  | "feed_rate_limited"
  | "feed_duplicate_content"
  | "feed_external_link_blocked"
  | "feed_already_reported"
  | "feed_post_insert_failed"
  | "feed_comment_insert_failed"
  | "feed_reaction_write_failed"
  | "feed_bookmark_write_failed"
  | "feed_preference_write_failed"
  | "feed_report_write_failed"
  | "feed_poll_write_failed"
  | "feed_poll_vote_write_failed"
  | "feed_media_upload_failed"
  | "feed_reaction_remove_failed"
  | "feed_bookmark_remove_failed";

export type FeedWriteSuccessInput = {
  action: FeedWriteRequest["action"];
  id: string;
  moderationStatus?: "pending_review" | "published" | "limited" | "removed";
  targetType?: string;
};

export const feedWriteFailures: Record<
  FeedWriteFailureCode,
  {
    httpStatus: 400 | 403 | 409 | 429 | 500;
    message: string;
    retryable: boolean;
    step: FeedWriteStepId;
  }
> = {
  account_link_missing: {
    httpStatus: 403,
    message: "계정 연결을 확인할 수 없어 피드 액션을 저장하지 못했어요.",
    retryable: true,
    step: "ensure_account",
  },
  feed_schema_permission_missing: {
    httpStatus: 500,
    message: "피드 저장소 권한이 아직 API에 적용되지 않았어요.",
    retryable: true,
    step: "validate_target",
  },
  feed_schema_not_available: {
    httpStatus: 500,
    message: "피드 저장소가 아직 API에서 열리지 않았어요.",
    retryable: true,
    step: "validate_target",
  },
  feed_target_invalid: {
    httpStatus: 400,
    message: "저장할 피드 대상을 확인하지 못했어요.",
    retryable: false,
    step: "validate_target",
  },
  feed_target_not_supported: {
    httpStatus: 400,
    message: "이 피드 대상에는 아직 해당 액션을 지원하지 않아요.",
    retryable: false,
    step: "validate_target",
  },
  feed_response_closed: {
    httpStatus: 400,
    message: "응답이 마감된 콘텐츠예요. 기존 결과와 답변은 계속 볼 수 있어요.",
    retryable: false,
    step: "validate_target",
  },
  feed_rate_limited: {
    httpStatus: 429,
    message: "짧은 시간에 요청이 많았어요. 잠시 쉬었다가 다시 시도해 주세요.",
    retryable: true,
    step: "validate_target",
  },
  feed_duplicate_content: {
    httpStatus: 409,
    message: "같은 내용을 방금 등록했어요. 이미 올라간 내용을 확인해 주세요.",
    retryable: false,
    step: "validate_target",
  },
  feed_external_link_blocked: {
    httpStatus: 400,
    message: "안전이 확인되지 않은 링크가 포함되어 있어 등록할 수 없어요.",
    retryable: false,
    step: "validate_target",
  },
  feed_already_reported: {
    httpStatus: 409,
    message: "이미 신고한 내용이에요. 운영팀에서 확인하고 있어요.",
    retryable: false,
    step: "insert_feed_report",
  },
  feed_post_insert_failed: {
    httpStatus: 500,
    message: "피드 글을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_feed_post",
  },
  feed_comment_insert_failed: {
    httpStatus: 500,
    message: "댓글을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_feed_comment",
  },
  feed_reaction_write_failed: {
    httpStatus: 500,
    message: "반응을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_feed_reaction",
  },
  feed_bookmark_write_failed: {
    httpStatus: 500,
    message: "저장을 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_feed_bookmark",
  },
  feed_preference_write_failed: {
    httpStatus: 500,
    message: "피드 선호를 반영하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_feed_preference",
  },
  feed_report_write_failed: {
    httpStatus: 500,
    message: "신고를 접수하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_feed_report",
  },
  feed_poll_write_failed: {
    httpStatus: 500,
    message: "밸런스 게임을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_feed_poll",
  },
  feed_poll_vote_write_failed: {
    httpStatus: 500,
    message: "투표를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "insert_feed_poll_vote",
  },
  feed_media_upload_failed: {
    httpStatus: 500,
    message: "사진을 올리지 못했어요. 사진 상태를 확인하고 다시 시도해 주세요.",
    retryable: true,
    step: "upload_feed_media",
  },
  feed_reaction_remove_failed: {
    httpStatus: 500,
    message: "반응 취소를 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "remove_feed_reaction",
  },
  feed_bookmark_remove_failed: {
    httpStatus: 500,
    message: "저장 취소를 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
    retryable: true,
    step: "remove_feed_bookmark",
  },
};

export function createFeedWriteFailurePayload(code: FeedWriteFailureCode) {
  const failure = feedWriteFailures[code];

  return {
    ok: false,
    error: "feed_write_failed",
    code,
    message: failure.message,
    retryable: failure.retryable,
    step: failure.step,
  } as const;
}

export function createFeedWriteSuccessPayload(input: FeedWriteSuccessInput) {
  return {
    ok: true,
    feedWrite: {
      action: input.action,
      id: input.id,
      moderationStatus: input.moderationStatus ?? null,
      targetType: input.targetType ?? null,
    },
  } as const;
}
