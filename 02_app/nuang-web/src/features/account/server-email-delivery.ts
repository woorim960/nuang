import "server-only";

type VerificationEmailInput = {
  challengeId: string;
  code: string;
  email: string;
};

export async function sendEmailVerificationCode({
  challengeId,
  code,
  email,
}: VerificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_VERIFICATION_FROM?.trim();
  if (!apiKey || !from) {
    return {
      code: "email_delivery_not_configured" as const,
      ok: false as const,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: createVerificationEmailHtml(code),
      subject: `[뉴앙] 이메일 인증번호 ${code}`,
      text: createVerificationEmailText(code),
      to: [email],
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": `nuang-email-verification-${challengeId}`,
    },
    method: "POST",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      code: "email_delivery_failed" as const,
      ok: false as const,
    };
  }

  const payload = (await response.json().catch(() => null)) as {
    id?: unknown;
  } | null;

  return {
    messageId: typeof payload?.id === "string" ? payload.id : null,
    ok: true as const,
  };
}

function createVerificationEmailText(code: string) {
  return [
    "뉴앙 이메일 인증번호",
    "",
    code,
    "",
    "인증번호는 10분 동안 사용할 수 있습니다.",
    "본인이 요청하지 않았다면 이 메일을 무시해 주세요.",
  ].join("\n");
}

function createVerificationEmailHtml(code: string) {
  return `<!doctype html>
<html lang="ko">
  <body style="margin:0;padding:32px 16px;background:#f7f6fb;color:#292733;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <main style="max-width:480px;margin:0 auto;padding:32px;border:1px solid #ebe8f3;border-radius:24px;background:#ffffff">
      <p style="margin:0 0 8px;color:#756f83;font-size:14px">NUANG</p>
      <h1 style="margin:0;font-size:22px;line-height:1.4">이메일 인증번호</h1>
      <p style="margin:14px 0 0;color:#5f596b;font-size:15px;line-height:1.7">아래 번호를 뉴앙 앱에 입력해 주세요.</p>
      <strong style="display:block;margin:24px 0;padding:18px;border-radius:16px;background:#f3f0ff;color:#5e4fd8;font-size:32px;letter-spacing:8px;text-align:center">${code}</strong>
      <p style="margin:0;color:#8a8494;font-size:13px;line-height:1.7">인증번호는 10분 동안 사용할 수 있습니다.<br>본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>
    </main>
  </body>
</html>`;
}
