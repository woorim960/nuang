import "server-only";

import { readMarketingEmailConfig } from "./server-marketing-email-config";

export type MarketingEmailContent = {
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  eyebrow: string;
  heading: string;
  subject: string;
};

export function renderMarketingEmail({
  content,
  oneClickUnsubscribeUrl,
  unsubscribeUrl,
}: {
  content: MarketingEmailContent;
  oneClickUnsubscribeUrl?: string;
  unsubscribeUrl: string;
}) {
  const config = readMarketingEmailConfig();
  const subject = advertisingSubject(content.subject);
  const bodyLines = content.body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const ctaHtml =
    content.ctaLabel && content.ctaUrl
      ? `<a href="${escapeHtml(content.ctaUrl)}" style="display:inline-block;margin-top:24px;padding:13px 20px;border-radius:12px;background:#5f50d8;color:#fff;text-decoration:none;font-size:15px;font-weight:700">${escapeHtml(content.ctaLabel)}</a>`
      : "";
  const bodyHtml = bodyLines
    .map(
      (line) =>
        `<p style="margin:0 0 12px;color:#504b5c;font-size:15px;line-height:1.75">${escapeHtml(line)}</p>`,
    )
    .join("");

  return {
    headers: {
      "List-Unsubscribe": `<${oneClickUnsubscribeUrl ?? unsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    html: `<!doctype html>
<html lang="ko">
  <body style="margin:0;padding:28px 14px;background:#f6f5f9;color:#282631;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <main style="max-width:560px;margin:0 auto;overflow:hidden;border:1px solid #e8e5ef;border-radius:22px;background:#fff">
      <section style="padding:32px 28px 28px">
        <p style="margin:0 0 9px;color:#7568dc;font-size:12px;font-weight:800;letter-spacing:.08em">${escapeHtml(content.eyebrow)}</p>
        <h1 style="margin:0 0 20px;color:#282631;font-size:25px;line-height:1.4;letter-spacing:-.03em">${escapeHtml(content.heading)}</h1>
        ${bodyHtml}
        ${ctaHtml}
      </section>
      <footer style="padding:22px 28px;border-top:1px solid #ece9f2;background:#faf9fc;color:#77717f;font-size:12px;line-height:1.75">
        <strong style="color:#4f4a58">뉴앙</strong><br>
        문의 <a href="mailto:${escapeHtml(config.contactEmail)}" style="color:#6658c7">${escapeHtml(config.contactEmail)}</a> · ${escapeHtml(config.contactPhone)}<br>
        이 메일은 뉴앙의 광고성 이메일 수신에 동의한 회원에게 발송됐습니다.<br>
        더 이상 받지 않으려면 <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6658c7;font-weight:700">수신거부</a>를 선택해 주세요.
      </footer>
    </main>
  </body>
</html>`,
    subject,
    text: [
      content.eyebrow,
      content.heading,
      "",
      ...bodyLines,
      ...(content.ctaLabel && content.ctaUrl
        ? ["", `${content.ctaLabel}: ${content.ctaUrl}`]
        : []),
      "",
      "뉴앙",
      `문의: ${config.contactEmail} · ${config.contactPhone}`,
      "이 메일은 뉴앙의 광고성 이메일 수신에 동의한 회원에게 발송됐습니다.",
      `수신거부: ${unsubscribeUrl}`,
    ].join("\n"),
  };
}

export function renderMarketingConsentConfirmationEmail({
  consentedAt,
  oneClickUnsubscribeUrl,
  unsubscribeUrl,
}: {
  consentedAt: string;
  oneClickUnsubscribeUrl?: string;
  unsubscribeUrl: string;
}) {
  const date = new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date(consentedAt));
  return renderMarketingEmail({
    content: {
      body: `뉴앙의 광고성 이메일을 받도록 동의한 상태임을 알려드려요.\n최초 또는 최근 동의일은 ${date}입니다.\n계속 받아보려면 별도로 할 일은 없어요. 언제든 뉴앙 설정이나 아래 수신거부에서 변경할 수 있습니다.`,
      ctaLabel: null,
      ctaUrl: null,
      eyebrow: "수신 동의 상태 안내",
      heading: "뉴앙 소식 수신 상태를 알려드려요",
      subject: "광고성 이메일 수신 동의 상태 안내",
    },
    oneClickUnsubscribeUrl,
    unsubscribeUrl,
  });
}

export function advertisingSubject(value: string) {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return clean.startsWith("(광고)") ? clean : `(광고) ${clean}`;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
