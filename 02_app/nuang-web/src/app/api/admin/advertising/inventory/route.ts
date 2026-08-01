import { NextResponse } from "next/server";
import { adminAdvertisingInventoryActionSchema } from "@/features/admin/admin-advertising-contract";
import {
  advertisingAdminActionError,
  manageAdvertisingInventory,
} from "@/features/admin/server-admin-advertising-actions";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request))
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(
    request,
    adminAdvertisingInventoryActionSchema,
  );
  if (!payload.ok) {
    return failure("변경할 광고 슬롯과 사유를 확인해 주세요.", 422);
  }
  const response = await manageAdvertisingInventory({
    action: payload.data,
    adminAccountId: context.accountId,
    client: context.client,
  });
  const error = advertisingAdminActionError(response.error);
  if (error) return failure(error.message, error.status);
  return NextResponse.json({ ok: true });
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
