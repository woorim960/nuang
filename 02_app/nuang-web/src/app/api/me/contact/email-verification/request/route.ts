import { NextResponse } from "next/server";
import { requirePrivateContactContext } from "@/features/account/server-contact-context";
import { requestPrivateEmailVerification } from "@/features/account/server-email-verification";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("cross_site_request", "요청을 확인하지 못했어요.", 403);
  }

  const context = await requirePrivateContactContext();
  if (!context.ok) return context.response;
  const result = await requestPrivateEmailVerification({
    accountId: context.accountId,
    client: context.client,
  });

  if (result.ok) {
    return NextResponse.json(
      { ok: true, verification: result.data },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  switch (result.code) {
    case "email_missing":
      return failure(result.code, "먼저 이메일을 등록해 주세요.", 409);
    case "email_already_verified":
      return failure(result.code, "이미 인증된 이메일이에요.", 409);
    case "verification_resend_limited":
      return NextResponse.json(
        {
          code: result.code,
          message: `${result.retryAfterSeconds}초 뒤에 다시 받을 수 있어요.`,
          ok: false,
          retryAfterSeconds: result.retryAfterSeconds,
        },
        {
          headers: { "cache-control": "private, no-store" },
          status: 429,
        },
      );
    case "verification_hourly_limited":
      return failure(
        result.code,
        "인증번호 요청이 많았어요. 한 시간 뒤 다시 시도해 주세요.",
        429,
      );
    case "email_delivery_not_configured":
      return failure(
        result.code,
        "이메일 발송 준비가 아직 완료되지 않았어요.",
        503,
      );
    case "email_delivery_failed":
      return failure(
        result.code,
        "인증 메일을 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        503,
      );
    default:
      return failure(
        result.code,
        "이메일 인증을 시작하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
        503,
      );
  }
}

function failure(code: string, message: string, status: number) {
  return NextResponse.json(
    { code, message, ok: false },
    {
      headers: { "cache-control": "private, no-store" },
      status,
    },
  );
}
