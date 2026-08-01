import { NextResponse } from "next/server";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { adminCoreResultFeedbackActionSchema } from "@/features/result/unified-core-report/core-result-feedback-contract";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(
    request,
    adminCoreResultFeedbackActionSchema,
  );
  if (!payload.ok) return failure("변경할 상태를 확인하지 못했습니다.", 422);

  const response = await context.client.rpc(
    "admin_manage_core_result_feedback",
    {
      target_admin_account_id: context.accountId,
      target_feedback_id: payload.data.feedbackId,
      target_status: payload.data.status,
    },
  );
  if (response.error) {
    const unavailable = ["42883", "PGRST202"].includes(
      response.error.code ?? "",
    );
    return failure(
      unavailable
        ? "결과 문장 품질 운영 기능을 준비해야 합니다. 최신 DB 마이그레이션을 확인해 주세요."
        : "현재 상태에서는 변경할 수 없습니다. 새로고침 후 다시 시도해 주세요.",
      unavailable ? 503 : 409,
    );
  }

  return NextResponse.json({ ok: true });
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
