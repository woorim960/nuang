import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";

const actionSchema = z.object({
  feedbackId: z.uuid(),
  status: z.enum(["reviewing", "planned", "resolved", "closed"]),
});

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(request, actionSchema);
  if (!payload.ok) return failure("변경할 상태를 확인하지 못했습니다.", 422);

  const response = await context.client.rpc("admin_manage_product_feedback", {
    target_admin_account_id: context.accountId,
    target_feedback_id: payload.data.feedbackId,
    target_status: payload.data.status,
  });
  if (response.error) {
    const unavailable = ["42883", "PGRST202"].includes(
      response.error.code ?? "",
    );
    return failure(
      unavailable
        ? "고객 의견 운영 기능을 준비해야 합니다. 최신 DB 마이그레이션을 확인해 주세요."
        : "현재 상태에서는 변경할 수 없습니다. 새로고침 후 다시 시도해 주세요.",
      unavailable ? 503 : 409,
    );
  }

  return NextResponse.json({ ok: true });
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
