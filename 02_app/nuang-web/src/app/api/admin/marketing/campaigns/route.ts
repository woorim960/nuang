import { NextResponse } from "next/server";
import {
  marketingCampaignActionSchema,
  marketingCampaignWriteSchema,
  marketingTestEmailSchema,
} from "@/features/marketing/marketing-email-contract";
import { sendMarketingTestEmail } from "@/features/marketing/server-marketing-email-outbox";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  if (!isSameOriginBrowserRequest(request))
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(
    request,
    marketingCampaignWriteSchema,
  );
  if (!payload.ok) return failure("캠페인 내용을 확인해 주세요.", 422);
  const value = payload.data;
  const response = await context.client
    .schema("consent")
    .rpc("admin_upsert_marketing_campaign", {
      target_admin_account_id: context.accountId,
      target_body: value.body,
      target_campaign_id: value.campaignId,
      target_cta_label: value.ctaLabel,
      target_cta_url: value.ctaUrl,
      target_eyebrow: value.eyebrow,
      target_heading: value.heading,
      target_internal_name: value.internalName,
      target_subject: value.subject,
    });
  if (response.error) return databaseFailure(response.error.code);
  return NextResponse.json({ data: response.data, ok: true });
}

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request))
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(
    request,
    marketingCampaignActionSchema,
  );
  if (!payload.ok)
    return failure("캠페인 상태와 예약 시각을 확인해 주세요.", 422);
  const response = await context.client
    .schema("consent")
    .rpc("admin_manage_marketing_campaign", {
      target_action: payload.data.action,
      target_admin_account_id: context.accountId,
      target_campaign_id: payload.data.campaignId,
      target_scheduled_at: payload.data.scheduledAt,
    });
  if (response.error) return databaseFailure(response.error.code, 409);
  return NextResponse.json({ data: response.data, ok: true });
}

export async function PATCH(request: Request) {
  if (!isSameOriginBrowserRequest(request))
    return failure("요청 출처를 확인하지 못했습니다.", 403);
  const context = await resolveAdminContext();
  if (!context.ok) return failure("관리자 권한이 필요합니다.", 403);
  const payload = await readValidatedJson(request, marketingTestEmailSchema);
  if (!payload.ok) return failure("테스트 메일 내용을 확인해 주세요.", 422);
  if (
    payload.data.testRecipient.toLowerCase() !== context.email.toLowerCase()
  ) {
    return failure(
      "현재 로그인한 운영자 이메일로만 테스트할 수 있습니다.",
      403,
    );
  }
  const delivery = await sendMarketingTestEmail({
    content: {
      body: payload.data.body,
      ctaLabel: payload.data.ctaLabel,
      ctaUrl: payload.data.ctaUrl,
      eyebrow: payload.data.eyebrow,
      heading: payload.data.heading,
      subject: payload.data.subject,
    },
    recipient: context.email,
  });
  if (!delivery.ok)
    return failure(
      "테스트 메일을 보내지 못했습니다. 발신 설정을 확인해 주세요.",
      503,
    );
  await context.client
    .schema("audit")
    .from("admin_audit_log")
    .insert({
      action: "marketing_test_email_sent",
      admin_account_id: context.accountId,
      metadata: {
        channel: "email",
        providerMessageId: delivery.messageId ?? null,
      },
      target_table: "consent.marketing_campaign",
    });
  return NextResponse.json({ ok: true });
}

function databaseFailure(code: string | undefined, fallback = 503) {
  const missing = [
    "42P01",
    "42883",
    "PGRST202",
    "PGRST204",
    "PGRST205",
  ].includes(code ?? "");
  return failure(
    missing
      ? "마케팅 이메일 데이터베이스를 먼저 연결해 주세요."
      : "현재 상태에서는 처리할 수 없습니다. 새로고침 후 다시 시도해 주세요.",
    missing ? 503 : fallback,
  );
}

function failure(message: string, status: number) {
  return NextResponse.json({ message, ok: false }, { status });
}
