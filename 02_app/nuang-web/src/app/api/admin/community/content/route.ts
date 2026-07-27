import { NextResponse } from "next/server";
import {
  adminCommunityContentRequestSchema,
  isFutureSchedule,
} from "@/features/admin/admin-community-content-contract";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);

  const parsed = adminCommunityContentRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return failure(
      parsed.error.issues[0]?.message ?? "콘텐츠 입력값을 확인해 주세요.",
      422,
    );
  }
  if (
    parsed.data.action === "schedule" &&
    !isFutureSchedule(parsed.data.scheduledFor)
  ) {
    return failure("예약 시간은 현재보다 1분 이상 뒤로 설정해 주세요.", 422);
  }
  if (
    (parsed.data.action === "create" || parsed.data.action === "update") &&
    parsed.data.responseClosesAt &&
    !isFutureSchedule(parsed.data.responseClosesAt)
  ) {
    return failure(
      "응답 마감 시간은 현재보다 1분 이상 뒤로 설정해 주세요.",
      422,
    );
  }
  if (parsed.data.action === "schedule") {
    const content = await context.client
      .schema("feed")
      .from("official_community_content")
      .select("response_closes_at")
      .eq("id", parsed.data.contentId)
      .maybeSingle();
    if (
      content.data?.response_closes_at &&
      new Date(content.data.response_closes_at).getTime() <=
        new Date(parsed.data.scheduledFor).getTime()
    ) {
      return failure("응답 마감은 게시 예약 시간보다 뒤여야 합니다.", 422);
    }
  }

  const result = await context.client.rpc(
    "admin_manage_community_content_atomic",
    {
      target_admin_account_id: context.accountId,
      target_payload: parsed.data,
    },
  );
  if (result.error) {
    const unavailable = ["42883", "PGRST202"].includes(
      result.error.code ?? "",
    );
    return failure(
      unavailable
        ? "콘텐츠 운영 기능을 준비해야 합니다. 최신 DB 마이그레이션을 확인해 주세요."
        : actionFailureMessage(parsed.data.action),
      unavailable ? 503 : 409,
    );
  }
  const contentId = readContentId(result.data);

  return NextResponse.json({
    contentId,
    ok: true,
  });
}

function readContentId(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = (value as Record<string, unknown>).contentId;
  return typeof id === "string" ? id : null;
}

function actionFailureMessage(action: string) {
  if (action === "update") {
    return "게시 전 콘텐츠만 수정할 수 있습니다. 게시된 콘텐츠는 복제해 새로 작성해 주세요.";
  }
  if (action === "schedule") {
    return "예약 상태와 시간을 확인해 주세요.";
  }
  if (action === "publish") {
    return "게시할 수 없는 상태이거나 피드 데이터 연결에 실패했습니다.";
  }
  if (action === "delete_draft") {
    return "임시저장 상태의 콘텐츠만 완전히 삭제할 수 있습니다.";
  }
  return "콘텐츠 상태를 변경하지 못했습니다.";
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
