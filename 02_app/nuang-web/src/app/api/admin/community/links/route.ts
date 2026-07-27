import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum([
    "approve_domain",
    "approve_link",
    "block_domain",
    "block_link",
  ]),
  id: z.uuid(),
});

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }

  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure("링크 검토 요청을 확인하지 못했습니다.", 422);

  const { action, id } = parsed.data;
  const result = await context.client.rpc("admin_review_external_link", {
    target_action: action,
    target_admin_account_id: context.accountId,
    target_link_id: id,
  });
  if (result.error) {
    const unavailable = ["42883", "PGRST202"].includes(
      result.error.code ?? "",
    );
    return failure(
      unavailable
        ? "링크 검토 기능을 준비해야 합니다. 최신 DB 마이그레이션을 확인해 주세요."
        : "이미 처리됐거나 현재 상태에서 검토할 수 없는 링크입니다.",
      unavailable ? 503 : 409,
    );
  }

  return NextResponse.json({ ok: true });
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
