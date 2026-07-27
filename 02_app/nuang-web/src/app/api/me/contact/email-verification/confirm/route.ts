import { NextResponse } from "next/server";
import { emailVerificationConfirmSchema } from "@/features/account/email-verification-contract";
import { requirePrivateContactContext } from "@/features/account/server-contact-context";
import { confirmPrivateEmailVerification } from "@/features/account/server-email-verification";
import { isAllowedGateCRequest } from "@/features/research/gate-c/gate-c-server-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAllowedGateCRequest(request)) {
    return failure("cross_site_request", "요청을 확인하지 못했어요.", 403);
  }

  const parsed = emailVerificationConfirmSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return failure(
      "verification_code_invalid",
      "6자리 인증번호를 확인해 주세요.",
      422,
    );
  }

  const context = await requirePrivateContactContext();
  if (!context.ok) return context.response;
  const result = await confirmPrivateEmailVerification({
    accountId: context.accountId,
    challengeId: parsed.data.challengeId,
    client: context.client,
    code: parsed.data.code,
  });

  if (result.ok) {
    return NextResponse.json(
      { ok: true, verification: result.data },
      { headers: { "cache-control": "private, no-store" } },
    );
  }

  switch (result.code) {
    case "verification_code_invalid":
      return NextResponse.json(
        {
          attemptsRemaining: result.attemptsRemaining,
          code: result.code,
          message: `인증번호가 맞지 않아요. ${result.attemptsRemaining}번 더 입력할 수 있어요.`,
          ok: false,
        },
        {
          headers: { "cache-control": "private, no-store" },
          status: 422,
        },
      );
    case "verification_locked":
      return failure(
        result.code,
        "입력 횟수를 초과했어요. 새 인증번호를 받아 주세요.",
        423,
      );
    case "verification_expired":
      return failure(
        result.code,
        "인증번호 사용 시간이 지났어요. 새 번호를 받아 주세요.",
        410,
      );
    case "verification_email_changed":
      return failure(
        result.code,
        "이메일이 변경됐어요. 새 인증번호를 받아 주세요.",
        409,
      );
    case "verification_not_found":
    case "verification_unavailable":
      return failure(
        result.code,
        "사용할 수 없는 인증번호예요. 새 번호를 받아 주세요.",
        409,
      );
    default:
      return failure(
        result.code,
        "이메일 인증을 완료하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
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
