import "server-only";

import { getAppOrigin } from "@/lib/supabase/env";

export const marketingEmailDefaults = {
  contactEmail: "woorimprog@gmail.com",
  contactPhone: "010-2515-0939",
  from: "뉴앙 <news@notice.nuang.app>",
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
  const encryptionReady = isEncryptionKey(
    process.env.FIELD_ENCRYPTION_KEY?.trim(),
  );
  const webhookReady =
    (process.env.AD_RESEND_WEBHOOK_SECRET?.trim().length ?? 0) >= 24;
  const cronReady =
    (process.env.AD_OUTBOX_CRON_SECRET?.trim().length ?? 0) >= 32;
  const fromReady = isNuangMailbox(from);
  const originReady = isNuangOrigin(origin);

  return {
    apiKey,
    contactEmail,
    contactPhone,
    cronReady,
    enabled,
    encryptionReady,
    from,
    fromReady,
    origin,
    originReady,
    ready:
      enabled &&
      Boolean(apiKey) &&
      encryptionReady &&
      webhookReady &&
      cronReady &&
      isEmailAddress(replyTo) &&
      isEmailAddress(contactEmail) &&
      fromReady &&
      originReady,
    replyTo,
    webhookReady,
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
        ok: config.fromReady,
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
        ok: config.originReady,
      },
      {
        key: "encryption",
        label: "연락처·수신거부 암호화 키",
        ok: config.encryptionReady,
      },
      {
        key: "webhook",
        label: "Resend 상태 Webhook",
        ok: config.webhookReady,
      },
      {
        key: "cron",
        label: "예약 발송 작업 인증",
        ok: config.cronReady,
      },
    ],
    enabled: config.enabled,
    ready: config.ready,
  };
}

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isEncryptionKey(value: string | undefined) {
  if (!value) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

function isNuangMailbox(value: string) {
  const match = value.match(/<([^<>]+)>$/);
  const email = (match?.[1] ?? value).trim().toLowerCase();
  if (!isEmailAddress(email)) return false;
  const domain = email.split("@").at(-1);
  return domain === "nuang.app" || Boolean(domain?.endsWith(".nuang.app"));
}

function isNuangOrigin(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      (url.hostname === "nuang.app" || url.hostname.endsWith(".nuang.app"))
    );
  } catch {
    return false;
  }
}
