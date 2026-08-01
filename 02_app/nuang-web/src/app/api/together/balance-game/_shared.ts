import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { communityFeedCacheTag } from "@/features/feed/server-read";
import {
  BALANCE_PARTICIPANT_TOKEN_HEADER,
  type BalanceApiError,
} from "@/features/together-balance/api-contract";
import {
  createBalanceErrorPayload,
  getBalanceErrorStatus,
} from "@/features/together-balance/server";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export function readBalanceParticipantToken(request: Request) {
  return request.headers.get(BALANCE_PARTICIPANT_TOKEN_HEADER)?.trim() ?? "";
}

export function rejectCrossOriginBalanceMutation(request: Request) {
  if (isSameOriginBrowserRequest(request)) return null;
  const payload: BalanceApiError = {
    code: "invalid_request_origin",
    message: "요청 출처를 확인하지 못했어요.",
    ok: false,
    retryable: false,
  };
  return NextResponse.json(payload, { status: 403 });
}

export function handleBalanceRouteError(error: unknown) {
  return NextResponse.json(createBalanceErrorPayload(error), {
    status: getBalanceErrorStatus(error),
  });
}

export function revalidateBalanceFeed() {
  revalidateTag(communityFeedCacheTag, { expire: 0 });
}
