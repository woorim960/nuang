import "server-only";

export const adminReviewNotificationKinds = [
  "core_result_feedback",
  "product_feedback",
  "profile_report",
  "content_report",
  "external_link",
] as const;

export type AdminReviewNotificationKind =
  (typeof adminReviewNotificationKinds)[number];

type AdminReviewNotificationInput = {
  id: string;
  kind: AdminReviewNotificationKind;
  occurredAt?: string;
};

const notificationCopy: Record<
  AdminReviewNotificationKind,
  {
    actionLabel: string;
    adminPath: string;
    subject: string;
    title: string;
  }
> = {
  core_result_feedback: {
    actionLabel: "결과 문장 품질 큐 열기",
    adminPath: "/admin/feedback#core-result-quality",
    subject: "새 결과 문장 의견이 도착했어요",
    title: "검토할 결과 리포트 문장 의견이 있어요",
  },
  content_report: {
    actionLabel: "신고 대기열 열기",
    adminPath: "/admin/community?view=reports",
    subject: "새 콘텐츠 신고가 접수됐어요",
    title: "확인이 필요한 콘텐츠 신고가 도착했어요",
  },
  external_link: {
    actionLabel: "링크 검토 열기",
    adminPath: "/admin/community?view=links",
    subject: "새 외부 링크 검토 건이 있어요",
    title: "처음 보는 외부 링크가 등록됐어요",
  },
  product_feedback: {
    actionLabel: "의견함 열기",
    adminPath: "/admin/feedback",
    subject: "새 사용자 의견이 도착했어요",
    title: "뉴앙에 새 의견이 접수됐어요",
  },
  profile_report: {
    actionLabel: "신고 대기열 열기",
    adminPath: "/admin/community?view=reports",
    subject: "새 프로필 신고가 접수됐어요",
    title: "확인이 필요한 프로필 신고가 도착했어요",
  },
};

/**
 * Review notifications are deliberately best-effort. A mail provider outage
 * must never roll back a user's feedback or safety report after it was stored.
 */
export async function sendAdminReviewNotification({
  id,
  kind,
  occurredAt = new Date().toISOString(),
}: AdminReviewNotificationInput) {
  const recipients = readAdminReviewRecipients();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.ADMIN_NOTIFICATION_FROM?.trim() ||
    process.env.EMAIL_VERIFICATION_FROM?.trim();

  if (recipients.length === 0 || !apiKey || !from) {
    return { code: "notification_not_configured" as const, ok: false as const };
  }

  const copy = notificationCopy[kind];
  const reviewUrl = new URL(copy.adminPath, resolveAppOrigin()).toString();
  const reference = `${kind}:${id}`;
  const response = await fetch("https://api.resend.com/emails", {
    body: JSON.stringify({
      from,
      html: createAdminReviewEmailHtml({
        actionLabel: copy.actionLabel,
        occurredAt,
        reference,
        reviewUrl,
        title: copy.title,
      }),
      subject: `[뉴앙 운영] ${copy.subject}`,
      text: createAdminReviewEmailText({
        actionLabel: copy.actionLabel,
        occurredAt,
        reference,
        reviewUrl,
        title: copy.title,
      }),
      to: recipients,
    }),
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": createIdempotencyKey(kind, id),
    },
    method: "POST",
  }).catch(() => null);

  if (!response?.ok) {
    console.error("Unable to deliver admin review notification", {
      kind,
      status: response?.status ?? null,
    });
    return {
      code: "notification_delivery_failed" as const,
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

export function readAdminReviewRecipients() {
  const dedicated = process.env.ADMIN_REVIEW_NOTIFICATION_EMAILS?.trim();
  const configured =
    dedicated || process.env.ADMIN_BOOTSTRAP_EMAILS?.trim() || "";

  return [
    ...new Set(
      configured
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(isEmailAddress),
    ),
  ];
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

function createIdempotencyKey(kind: AdminReviewNotificationKind, id: string) {
  return `nuang-admin-review-${kind}-${id}`.slice(0, 240);
}

function createAdminReviewEmailText({
  actionLabel,
  occurredAt,
  reference,
  reviewUrl,
  title,
}: {
  actionLabel: string;
  occurredAt: string;
  reference: string;
  reviewUrl: string;
  title: string;
}) {
  return [
    title,
    "",
    `접수 시각: ${formatKoreanDateTime(occurredAt)}`,
    `관리 번호: ${reference}`,
    "",
    "사용자가 남긴 원문과 개인정보는 메일에 포함하지 않았습니다.",
    `${actionLabel}: ${reviewUrl}`,
  ].join("\n");
}

function createAdminReviewEmailHtml({
  actionLabel,
  occurredAt,
  reference,
  reviewUrl,
  title,
}: {
  actionLabel: string;
  occurredAt: string;
  reference: string;
  reviewUrl: string;
  title: string;
}) {
  return `<!doctype html>
<html lang="ko">
  <body style="margin:0;padding:32px 16px;background:#f7f7fb;color:#292733;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <main style="max-width:520px;margin:0 auto;padding:32px;border:1px solid #ebe9f2;border-radius:24px;background:#ffffff">
      <p style="margin:0 0 8px;color:#756f83;font-size:13px;font-weight:700;letter-spacing:.12em">NUANG OPERATIONS</p>
      <h1 style="margin:0;font-size:22px;line-height:1.45">${escapeHtml(title)}</h1>
      <dl style="margin:22px 0;padding:18px;border-radius:16px;background:#f8f7fc;font-size:14px;line-height:1.7">
        <div><dt style="display:inline;color:#817b8c">접수 시각</dt><dd style="display:inline;margin-left:12px">${escapeHtml(formatKoreanDateTime(occurredAt))}</dd></div>
        <div><dt style="display:inline;color:#817b8c">관리 번호</dt><dd style="display:inline;margin-left:12px">${escapeHtml(reference)}</dd></div>
      </dl>
      <p style="margin:0 0 22px;color:#6f6979;font-size:14px;line-height:1.7">사용자가 남긴 원문과 개인정보는 메일에 포함하지 않았습니다. 안전한 운영센터에서 확인해 주세요.</p>
      <a href="${escapeHtml(reviewUrl)}" style="display:block;padding:14px 18px;border-radius:14px;background:#6f63df;color:#ffffff;font-size:15px;font-weight:700;text-align:center;text-decoration:none">${escapeHtml(actionLabel)}</a>
    </main>
  </body>
</html>`;
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

function isEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
