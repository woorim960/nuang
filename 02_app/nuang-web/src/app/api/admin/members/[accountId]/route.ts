import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

const actionSchema = z.object({
  action: z.enum([
    "hide_profile",
    "reactivate_account",
    "restore_profile",
    "suspend_account",
  ]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> },
) {
  if (!isAllowedGateCRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const { accountId } = await params;
  if (!z.uuid().safeParse(accountId).success) {
    return failure("회원 정보를 확인하지 못했습니다.", 422);
  }
  if (accountId === context.accountId) {
    return failure("현재 관리자 계정에는 이 조치를 적용할 수 없습니다.", 409);
  }
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return failure("운영 조치를 확인하지 못했습니다.", 422);

  const action = parsed.data.action;
  const result = await context.client.rpc("admin_apply_member_action", {
    target_account_id: accountId,
    target_action: action,
    target_admin_account_id: context.accountId,
  });
  if (result.error) {
    const unavailable = ["42883", "PGRST202"].includes(
      result.error.code ?? "",
    );
    return failure(
      unavailable
        ? "회원 운영 기능을 준비해야 합니다. 최신 DB 마이그레이션을 확인해 주세요."
        : "현재 상태에서는 이 조치를 적용할 수 없습니다.",
      unavailable ? 503 : 409,
    );
  }

  return NextResponse.json({ ok: true });
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
