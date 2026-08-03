import "server-only";

import { getAppOrigin } from "@/lib/supabase/env";

export const marketingEmailDefaults = {
  contactEmail: "woorimprog@gmail.com",
  contactPhone: "010-2515-0939",
  from: "뉴앙 <news@nuang.app>",
  replyTo: "woorimprog@gmail.com",
} as const;

export function readMarketingEmailConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || null;
  const from =
    process.env.MARKETING_EMAIL_FROM?.trim() || marketingEmailDefaults.from;
  const replyTo =
    process.env.MARKETING_EMAIL_REPLY_TO?.trim() ||
    marketingEmailDefaults.replyTo;
  const contactEmail =
    process.env.MARKETING_CONTACT_EMAIL?.trim() ||
    marketingEmailDefaults.contactEmail;
  const contactPhone =
    process.env.MARKETING_CONTACT_PHONE?.trim() ||
    marketingEmailDefaults.contactPhone;
  const enabled = process.env.MARKETING_EMAIL_SEND_ENABLED === "true";
  const origin = getAppOrigin().replace(/\/$/, "");

  return {
    apiKey,
    contactEmail,
    contactPhone,
    enabled,
    from,
    origin,
    ready:
      enabled &&
      Boolean(apiKey) &&
      isEmailAddress(replyTo) &&
      isEmailAddress(contactEmail) &&
      from.includes("@nuang.app") &&
      origin.startsWith("https://"),
    replyTo,
  };
}

export function marketingEmailReadiness() {
  const config = readMarketingEmailConfig();
  return {
    checks: [
      { key: "send-gate", label: "실제 발송 잠금", ok: config.enabled },
      { key: "resend", label: "Resend 발송 키", ok: Boolean(config.apiKey) },
      {
        key: "from",
        label: "nuang.app 발신 주소",
        ok: config.from.includes("@nuang.app"),
      },
      {
        key: "reply",
        label: "답장 이메일",
        ok: isEmailAddress(config.replyTo),
      },
      {
        key: "contact",
        label: "수신자 문의 이메일",
        ok: isEmailAddress(config.contactEmail),
      },
      {
        key: "origin",
        label: "공개 HTTPS 주소",
        ok: config.origin.startsWith("https://"),
      },
    ],
    enabled: config.enabled,
    ready: config.ready,
  };
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
