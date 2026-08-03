import { NextResponse } from "next/server";
import { resolveAdminContext } from "@/features/admin/server-admin-access";
import { marketingPreviewSchema } from "@/features/marketing/marketing-email-contract";
import { renderMarketingEmail } from "@/features/marketing/server-marketing-email-renderer";
import { createMarketingUnsubscribeToken } from "@/features/marketing/server-marketing-unsubscribe-token";
import { readValidatedJson } from "@/lib/api/request";
import { isSameOriginBrowserRequest } from "@/lib/api/request-origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginBrowserRequest(request)) {
    return response(
      { message: "요청 출처를 확인하지 못했습니다.", ok: false },
      403,
    );
  }
  const context = await resolveAdminContext();
  if (!context.ok) {
    return response({ message: "관리자 권한이 필요합니다.", ok: false }, 403);
  }
  const payload = await readValidatedJson(request, marketingPreviewSchema);
  if (!payload.ok) {
    return response(
      { message: "미리보기 내용을 확인해 주세요.", ok: false },
      422,
    );
  }
  try {
    const token = createMarketingUnsubscribeToken(
      "00000000-0000-4000-8000-000000000000",
    );
    const unsubscribeUrl = `/email/unsubscribe?token=${encodeURIComponent(token)}&preview=1`;
    const mail = renderMarketingEmail({
      content: payload.data,
      oneClickUnsubscribeUrl: `/api/marketing/unsubscribe?token=${encodeURIComponent(token)}&preview=1`,
      unsubscribeUrl,
    });
    return response(
      { html: mail.html, ok: true, subject: mail.subject, text: mail.text },
      200,
    );
  } catch {
    return response(
      {
        message:
          "암호화 설정을 확인하지 못해 실제 메일 미리보기를 만들 수 없습니다.",
        ok: false,
      },
      503,
    );
  }
}

function response(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    headers: { "cache-control": "private, no-store" },
    status,
  });
}
