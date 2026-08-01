import { NextResponse } from "next/server";
import {
  adminAdvertisingCampaignActionSchema,
  adminAdvertisingCampaignWriteSchema,
} from "@/features/admin/admin-advertising-contract";
import {
  advertisingAdminActionError,
  manageAdvertisingCampaign,
  upsertAdvertisingCampaign,
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
    adminAdvertisingCampaignActionSchema,
  );
  if (!payload.ok) return failure("변경 내용과 사유를 확인해 주세요.", 422);
  const response = await manageAdvertisingCampaign({
    action: payload.data,
    adminAccountId: context.accountId,
    client: context.client,
  });
  const error = advertisingAdminActionError(response.error);
  if (error) return failure(error.message, error.status);
  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  if (!isSameOriginBrowserRequest(request))
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(
    request,
    adminAdvertisingCampaignWriteSchema,
  );
  if (!payload.ok) return failure("캠페인 정보와 사유를 확인해 주세요.", 422);
  const response = await upsertAdvertisingCampaign({
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
