import { NextResponse } from "next/server";
import { adminAdvertisingMailRetrySchema } from "@/features/admin/admin-advertising-contract";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { drainAdvertisingMailOutbox } from "@/features/advertising/server-advertising-mail-outbox";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return response("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return response("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(
    request,
    adminAdvertisingMailRetrySchema,
  );
  if (!payload.ok) return response("문의와 재시도 사유를 확인해 주세요.", 422);

  const retry = await context.client.rpc(
    "admin_retry_advertising_inquiry_mail",
    {
      target_admin_account_id: context.accountId,
      target_inquiry_id: payload.data.inquiryId,
      target_reason: payload.data.reason,
    },
  );
  if (retry.error) {
    return response(
      "공급자 접수 기록이 없는 안전한 재시도 대상이 없습니다.",
      409,
    );
  }

  const delivery = await drainAdvertisingMailOutbox({
    inquiryId: payload.data.inquiryId,
    limit: 2,
    source: "manual",
  });
  if (!delivery.ok) {
    return NextResponse.json(
      {
        data: retry.data,
        message:
          "재시도 대기열에는 등록했습니다. 메일 설정 또는 작업 상태를 확인해 주세요.",
        ok: true,
        workerPending: true,
      },
      { headers: noStoreHeaders },
    );
  }
  return NextResponse.json(
    { data: { delivery, retry: retry.data }, ok: true },
    { headers: noStoreHeaders },
  );
}

const noStoreHeaders = { "cache-control": "private, no-store" };

function response(message: string, status: number) {
  return NextResponse.json(
    { message, ok: false },
    { headers: noStoreHeaders, status },
  );
}
