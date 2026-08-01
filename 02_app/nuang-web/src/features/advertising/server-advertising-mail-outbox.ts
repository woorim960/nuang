import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revealAdvertisingInquiryValue } from "@/features/advertising/server-advertising-inquiry-security";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const operatorPayloadSchema = z.object({
  companyName: z.string().min(1).max(100),
  createdAt: z.string(),
  inquiryType: z.string().min(1).max(80),
  publicReference: z.string().min(1).max(40),
});

const inquirerPayloadSchema = z.object({
  createdAt: z.string(),
  inquiryType: z.string().min(1).max(80),
  maskedEmail: z.string().min(3).max(254),
  publicReference: z.string().min(1).max(40),
});

type ClaimedOutboxRow = {
  attempt_count: number;
  event_key: string;
  id: string;
  inquiry_id: string;
  payload: unknown;
  recipient_ciphertext: string | null;
  recipient_role: "inquirer" | "operator";
  template_key: "inquirer_receipt" | "operator_notification";
};

type DeliveryResult = {
  code?: string;
  messageId?: string;
  ok: boolean;
};

export async function drainAdvertisingMailOutbox({
  inquiryId = null,
  limit = 10,
}: {
  inquiryId?: string | null;
  limit?: number;
} = {}) {
  const client = createSupabaseServiceClient();
  if (!client) {
    return { claimed: 0, failed: 0, ok: false as const, sent: 0 };
  }

  const workerToken = randomUUID();
  const claim = await client.rpc("claim_advertising_mail_outbox", {
    target_batch_size: Math.min(Math.max(limit, 1), 50),
    target_inquiry_id: inquiryId,
    target_worker_token: workerToken,
  });

  if (claim.error) {
    console.error("Unable to claim advertising mail outbox", {
      code: claim.error.code ?? "database_error",
    });
    return { claimed: 0, failed: 0, ok: false as const, sent: 0 };
  }

  const rows = Array.isArray(claim.data)
    ? (claim.data as ClaimedOutboxRow[])
    : [];
  let sent = 0;
  let failed = 0;

  for (const row of rows) {
    const delivery = await deliverClaimedMessage(row);
    const completion = await client.rpc("complete_advertising_mail_outbox", {
      target_error_code: delivery.ok
        ? null
        : (delivery.code ?? "delivery_failed"),
      target_outbox_id: row.id,
      target_provider_message_id: delivery.messageId ?? null,
      target_succeeded: delivery.ok,
      target_worker_token: workerToken,
    });
    if (completion.error) {
      console.error("Unable to complete advertising mail outbox claim", {
        code: completion.error.code ?? "database_error",
        outboxId: row.id,
      });
    }
    if (delivery.ok) sent += 1;
    else failed += 1;
  }

  return {
    claimed: rows.length,
    failed,
    ok: true as const,
    sent,
  };
}

async function deliverClaimedMessage(
  row: ClaimedOutboxRow,
): Promise<DeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.AD_INQUIRY_FROM?.trim() ||
    process.env.ADMIN_NOTIFICATION_FROM?.trim() ||
    process.env.EMAIL_VERIFICATION_FROM?.trim();
  if (!apiKey || !from) return { code: "mail_not_configured", ok: false };

  let mail;
  try {
    mail = createMail(row);
  } catch (error) {
    console.error("Advertising mail payload could not be rendered", {
      code: error instanceof Error ? error.name : "invalid_payload",
      outboxId: row.id,
    });
    return { code: "invalid_mail_payload", ok: false };
  }

  if (mail.to.length === 0) {
    return { code: "mail_recipient_not_configured", ok: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: mail.html,
      subject: sanitizeEmailSubject(mail.subject),
      text: mail.text,
      to: mail.to,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": row.event_key.slice(0, 240),
    },
    method: "POST",
  }).catch(() => null);

  if (!response?.ok) {
    return {
      code: response ? `resend_http_${response.status}` : "resend_unreachable",
      ok: false,
    };
  }

  const responsePayload = (await response.json().catch(() => null)) as {
    id?: unknown;
  } | null;
  if (typeof responsePayload?.id !== "string") {
    return { code: "resend_message_id_missing", ok: false };
  }
  return { messageId: responsePayload.id, ok: true };
}

function createMail(row: ClaimedOutboxRow) {
  if (
    row.recipient_role === "operator" &&
    row.template_key === "operator_notification"
  ) {
    const payload = operatorPayloadSchema.parse(row.payload);
    const adminUrl = new URL(
      `/admin/advertising?inquiry=${encodeURIComponent(row.inquiry_id)}`,
      resolveAppOrigin(),
    ).toString();
    const inquiryLabel = inquiryTypeLabel(payload.inquiryType);
    const title = "새 광고·제휴 문의가 접수됐습니다";
    return {
      html: createEmailHtml({
        actionLabel: "운영센터에서 문의 확인",
        actionUrl: adminUrl,
        eyebrow: "NUANG BUSINESS OPERATIONS",
        lines: [
          ["접수번호", payload.publicReference],
          ["문의 유형", inquiryLabel],
          ["회사·브랜드", payload.companyName],
          ["접수 시각", formatKoreanDateTime(payload.createdAt)],
        ],
        note: "연락처와 상세 문의 원문은 메일에 포함하지 않았습니다. 안전한 운영센터에서 확인해 주세요.",
        title,
      }),
      subject: `[뉴앙 광고문의][${inquiryLabel}] ${payload.companyName} · ${payload.publicReference}`,
      text: createEmailText({
        actionLabel: "운영센터에서 문의 확인",
        actionUrl: adminUrl,
        lines: [
          ["접수번호", payload.publicReference],
          ["문의 유형", inquiryLabel],
          ["회사·브랜드", payload.companyName],
          ["접수 시각", formatKoreanDateTime(payload.createdAt)],
        ],
        note: "연락처와 상세 문의 원문은 메일에 포함하지 않았습니다.",
        title,
      }),
      to: readAdvertisingNotificationRecipients(),
    };
  }

  if (
    row.recipient_role === "inquirer" &&
    row.template_key === "inquirer_receipt" &&
    row.recipient_ciphertext
  ) {
    const payload = inquirerPayloadSchema.parse(row.payload);
    const recipient = revealAdvertisingInquiryValue({
      ciphertext: row.recipient_ciphertext,
      field: "outbox_recipient",
      inquiryId: row.inquiry_id,
    });
    const advertiseUrl = new URL("/advertise", resolveAppOrigin()).toString();
    const inquiryLabel = inquiryTypeLabel(payload.inquiryType);
    const title = "광고·제휴 문의가 안전하게 접수됐습니다";
    return {
      html: createEmailHtml({
        actionLabel: "뉴앙 광고 안내 보기",
        actionUrl: advertiseUrl,
        eyebrow: "NUANG BUSINESS",
        lines: [
          ["접수번호", payload.publicReference],
          ["문의 유형", inquiryLabel],
          ["연락 이메일", payload.maskedEmail],
          ["접수 시각", formatKoreanDateTime(payload.createdAt)],
        ],
        note: "영업일 기준 1~2일 안에 입력한 업무 이메일로 연락드릴게요. 이 메일은 문의 접수 확인이며 광고성 정보 수신 동의로 사용하지 않습니다.",
        title,
      }),
      subject: `[뉴앙] 광고 문의가 접수됐습니다 · ${payload.publicReference}`,
      text: createEmailText({
        actionLabel: "뉴앙 광고 안내 보기",
        actionUrl: advertiseUrl,
        lines: [
          ["접수번호", payload.publicReference],
          ["문의 유형", inquiryLabel],
          ["연락 이메일", payload.maskedEmail],
          ["접수 시각", formatKoreanDateTime(payload.createdAt)],
        ],
        note: "영업일 기준 1~2일 안에 입력한 업무 이메일로 연락드릴게요. 이 메일은 광고성 정보 수신 동의로 사용하지 않습니다.",
        title,
      }),
      to: [recipient],
    };
  }

  throw new Error("Unsupported advertising mail template");
}

export function readAdvertisingNotificationRecipients() {
  const configured =
    process.env.AD_INQUIRY_NOTIFICATION_EMAILS?.trim() ||
    process.env.ADMIN_REVIEW_NOTIFICATION_EMAILS?.trim() ||
    process.env.ADMIN_BOOTSTRAP_EMAILS?.trim() ||
    "";
  return [
    ...new Set(
      configured
        .split(",")
        .map((value) => value.trim().toLocaleLowerCase("en-US"))
        .filter(isEmailAddress),
    ),
  ];
}

export function escapeAdvertisingEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createEmailText({
  actionLabel,
  actionUrl,
  lines,
  note,
  title,
}: {
  actionLabel: string;
  actionUrl: string;
  lines: [string, string][];
  note: string;
  title: string;
}) {
  return [
    title,
    "",
    ...lines.map(([label, value]) => `${label}: ${value}`),
    "",
    note,
    `${actionLabel}: ${actionUrl}`,
  ].join("\n");
}

function createEmailHtml({
  actionLabel,
  actionUrl,
  eyebrow,
  lines,
  note,
  title,
}: {
  actionLabel: string;
  actionUrl: string;
  eyebrow: string;
  lines: [string, string][];
  note: string;
  title: string;
}) {
  const detailRows = lines
    .map(
      ([
        label,
        value,
      ]) => `<div style="display:grid;grid-template-columns:92px 1fr;gap:12px;padding:5px 0">
        <dt style="color:#6f6c78">${escapeAdvertisingEmailHtml(label)}</dt>
        <dd style="margin:0;color:#24222a;font-weight:650">${escapeAdvertisingEmailHtml(value)}</dd>
      </div>`,
    )
    .join("");
  return `<!doctype html>
<html lang="ko">
  <body style="margin:0;padding:36px 16px;background:#f3f4f7;color:#24222a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <main style="max-width:560px;margin:0 auto;padding:36px;border:1px solid #dedfe5;border-radius:16px;background:#fff">
      <p style="margin:0 0 10px;color:#6257b8;font-size:12px;font-weight:800;letter-spacing:.13em">${escapeAdvertisingEmailHtml(eyebrow)}</p>
      <h1 style="margin:0;font-size:23px;line-height:1.45">${escapeAdvertisingEmailHtml(title)}</h1>
      <dl style="margin:24px 0;padding:18px;border:1px solid #e8e8ed;border-radius:12px;background:#f8f8fa;font-size:14px;line-height:1.65">${detailRows}</dl>
      <p style="margin:0 0 24px;color:#625f69;font-size:14px;line-height:1.75">${escapeAdvertisingEmailHtml(note)}</p>
      <a href="${escapeAdvertisingEmailHtml(actionUrl)}" style="display:block;padding:14px 18px;border-radius:10px;background:#393642;color:#fff;font-size:15px;font-weight:750;text-align:center;text-decoration:none">${escapeAdvertisingEmailHtml(actionLabel)}</a>
    </main>
  </body>
</html>`;
}

function inquiryTypeLabel(value: string) {
  return (
    {
      banner: "배너",
      branded_together_pack: "브랜드 함께하기 팩",
      contextual_affiliate: "문맥형 제휴",
      other: "기타",
    }[value] ?? "기타"
  );
}

function sanitizeEmailSubject(value: string) {
  return value.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").slice(0, 180);
}

function isEmailAddress(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function formatKoreanDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function resolveAppOrigin() {
  const configured =
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!configured) return "http://localhost:3000";
  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return "http://localhost:3000";
  }
}
