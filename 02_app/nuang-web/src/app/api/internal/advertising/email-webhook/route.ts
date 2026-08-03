import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyResendWebhookSignature } from "@/features/advertising/server-resend-webhook";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

const resendWebhookSchema = z.object({
  created_at: z.string().optional(),
  data: z.object({ email_id: z.string().min(1).max(500) }),
  type: z.string().min(1).max(100),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > 100_000) {
    return response({ message: "요청이 너무 큽니다.", ok: false }, 413);
  }
  if (
    !verifyResendWebhookSignature({
      headers: request.headers,
      rawBody,
    })
  ) {
    return response({ message: "서명을 확인할 수 없습니다.", ok: false }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return response({ message: "잘못된 요청입니다.", ok: false }, 400);
  }
  const parsed = resendWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return response({ message: "지원하지 않는 이벤트입니다.", ok: false }, 422);
  }

  const client = createSupabaseServiceClient();
  if (!client) {
    return response({ message: "서버 설정이 필요합니다.", ok: false }, 503);
  }

  const occurredAt =
    parsed.data.created_at && !Number.isNaN(Date.parse(parsed.data.created_at))
      ? parsed.data.created_at
      : new Date().toISOString();
  const eventInput = {
    target_event_type: parsed.data.type,
    target_occurred_at: occurredAt,
    target_provider_message_id: parsed.data.data.email_id,
  };
  const [advertisingResult, marketingResult] = await Promise.all([
    client.rpc("record_advertising_mail_webhook", eventInput),
    client.schema("consent").rpc("record_marketing_email_webhook", eventInput),
  ]);
  if (
    advertisingResult.error ||
    (marketingResult.error &&
      !isMissingMarketingRpc(marketingResult.error.code))
  ) {
    return response(
      { message: "이벤트를 기록하지 못했습니다.", ok: false },
      503,
    );
  }
  return response({ ok: true }, 200);
}

function isMissingMarketingRpc(code: string | undefined) {
  return ["42883", "PGRST202", "PGRST204"].includes(code ?? "");
}

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    headers: { "cache-control": "private, no-store" },
    status,
  });
}
