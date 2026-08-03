import { NextResponse } from "next/server";
import { readMarketingUnsubscribeToken } from "@/features/marketing/server-marketing-unsubscribe-token";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("preview") === "1") {
    return result("테스트 메일에서는 수신 설정이 변경되지 않습니다.", 200);
  }
  const token = await readToken(request, url);
  const payload = token ? readMarketingUnsubscribeToken(token) : null;
  if (!payload) return result("수신거부 링크를 확인해 주세요.", 400);

  const client = createSupabaseServiceClient();
  if (!client) return result("잠시 뒤 다시 시도해 주세요.", 503);
  const response = await client
    .schema("consent")
    .rpc("unsubscribe_marketing_email", {
      target_account_id: payload.accountId,
      target_source: "email_unsubscribe",
    });
  if (response.error) return result("잠시 뒤 다시 시도해 주세요.", 503);
  return result("뉴앙 광고성 이메일 수신을 해제했어요.", 200, true);
}

async function readToken(request: Request, url: URL) {
  const queryToken = url.searchParams.get("token")?.trim();
  if (queryToken) return queryToken;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      token?: unknown;
    } | null;
    return typeof body?.token === "string" ? body.token.trim() : null;
  }
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  return typeof token === "string" ? token.trim() : null;
}

function result(message: string, status: number, unsubscribed = false) {
  return NextResponse.json(
    { message, ok: status < 400, unsubscribed },
    { headers: { "cache-control": "private, no-store" }, status },
  );
}
