import { NextResponse } from "next/server";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { marketingOperationsActionSchema } from "@/features/marketing/marketing-email-contract";
import { drainMarketingEmailOutbox } from "@/features/marketing/server-marketing-email-outbox";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  }
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(
    request,
    marketingOperationsActionSchema,
  );
  if (!payload.ok) return failure("작업 내용과 사유를 확인해 주세요.", 422);

  if (payload.data.action === "set_emergency_pause") {
    const result = await context.client
      .schema("consent")
      .rpc("admin_set_marketing_channel_control", {
        target_admin_account_id: context.accountId,
        target_paused: payload.data.paused,
        target_reason: payload.data.reason,
      });
    if (result.error)
      return failure("이메일 송출 제어를 변경하지 못했습니다.", 409);
    return NextResponse.json({ data: result.data, ok: true });
  }

  if (payload.data.action === "retry_failed") {
    const result = await context.client
      .schema("consent")
      .rpc("admin_retry_marketing_campaign_failures", {
        target_admin_account_id: context.accountId,
        target_campaign_id: payload.data.campaignId,
        target_reason: payload.data.reason,
      });
    if (result.error) {
      return failure(
        "안전하게 재시도할 수 있는 미발송 실패 건이 없습니다.",
        409,
      );
    }
    return NextResponse.json({ data: result.data, ok: true });
  }

  const audit = await context.client
    .schema("audit")
    .from("admin_audit_log")
    .insert({
      action: "marketing_worker_manual_drain_requested",
      admin_account_id: context.accountId,
      metadata: { reason: payload.data.reason },
      target_table: "consent.marketing_worker_run",
    });
  if (audit.error)
    return failure("운영 기록을 남기지 못해 실행하지 않았습니다.", 503);
  const result = await drainMarketingEmailOutbox({
    limit: 20,
    source: "manual",
  });
  return NextResponse.json(
    result.locked ? { ...result, deliveryLocked: true, ok: true } : result,
    {
      headers: { "cache-control": "private, no-store" },
      status: result.ok || result.locked ? 200 : 503,
    },
  );
}

function failure(message: string, status: number) {
  return NextResponse.json(
    { message, ok: false },
    { headers: { "cache-control": "private, no-store" }, status },
  );
}
