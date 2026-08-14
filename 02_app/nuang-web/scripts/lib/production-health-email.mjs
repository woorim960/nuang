import { createHash } from "node:crypto";

export const DEFAULT_MONITOR_EMAIL_CONFIG = Object.freeze({
  from: "뉴앙 운영 <monitor@notice.nuang.app>",
  replyTo: "woorimprog@gmail.com",
  to: "woorimprog@gmail.com",
});

const STATUS_PRESENTATION = Object.freeze({
  fail: {
    accent: "#963548",
    badgeBackground: "#fff0f2",
    badgeText: "긴급",
    heading: "확인이 필요한 문제가 있어요",
    subjectLabel: "긴급",
  },
  pass: {
    accent: "#306e60",
    badgeBackground: "#eaf8f2",
    badgeText: "정상",
    heading: "뉴앙 서비스가 안정적으로 운영 중이에요",
    subjectLabel: "정상",
  },
  recovered: {
    accent: "#6658d7",
    badgeBackground: "#f0edff",
    badgeText: "회복",
    heading: "일시적인 오류 뒤 정상으로 돌아왔어요",
    subjectLabel: "회복",
  },
  warn: {
    accent: "#7c571e",
    badgeBackground: "#fff6df",
    badgeText: "주의",
    heading: "미리 살펴볼 항목이 있어요",
    subjectLabel: "주의",
  },
});

export function createMonitorEmailPayload({
  checkedAt = new Date().toISOString(),
  firstAttemptFailed = false,
  report,
}) {
  const summary = summarizeProductionHealthReport(report);
  const presentationKey =
    firstAttemptFailed && report.status === "pass"
      ? "recovered"
      : report.status;
  const presentation = STATUS_PRESENTATION[presentationKey];
  const formattedTime = formatKoreanDateTime(checkedAt);
  const issues = report.checks.filter((check) => check.status !== "pass");
  const issueHtml =
    issues.length > 0
      ? issues
          .map(
            (issue) => `
              <tr>
                <td style="padding:0 0 10px">
                  <div style="padding:14px 16px;border:1px solid ${issue.status === "fail" ? "#f3c9d0" : "#f0dfb5"};border-radius:14px;background:${issue.status === "fail" ? "#fff8f9" : "#fffbf2"}">
                    <p style="margin:0 0 5px;color:${issue.status === "fail" ? "#a72f45" : "#8a5708"};font-size:12px;font-weight:800;letter-spacing:.03em">${issue.status === "fail" ? "긴급 확인" : "주의 확인"}</p>
                    <p style="margin:0 0 4px;color:#302d39;font-size:14px;font-weight:750;line-height:1.5">${escapeHtml(issue.id)}</p>
                    <p style="margin:0;color:#6b6575;font-size:13px;line-height:1.65">${escapeHtml(issue.detail)}</p>
                  </div>
                </td>
              </tr>`,
          )
          .join("")
      : `
          <tr>
            <td style="padding:16px;border:1px solid #dcefe7;border-radius:14px;background:#f7fcfa;color:#4c665d;font-size:14px;line-height:1.65">
              페이지·API, 데이터베이스, 예약 작업, 발송 큐와 삭제 안전장치가 모두 정상입니다.
            </td>
          </tr>`;

  const subject = `[뉴앙 운영] ${presentation.subjectLabel} · ${formattedTime}`;
  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f4fa;color:#302d39;font-family:'Pretendard Variable',Pretendard,-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR','Segoe UI',sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(presentation.heading)} · 경고 ${report.counts.warn}건, 실패 ${report.counts.fail}건</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f6f4fa">
      <tr>
        <td align="center" style="padding:28px 14px">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;overflow:hidden;border:1px solid #e7e3ee;border-radius:24px;background:#ffffff;box-shadow:0 10px 32px rgba(53,44,83,.07)">
            <tr>
              <td style="padding:28px 28px 24px;background:#f4f1ff">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="color:#5e50d5;font-size:18px;font-weight:850;letter-spacing:.04em">NUANG <span style="color:#9a93aa;font-size:12px;font-weight:700;letter-spacing:.04em">운영 리포트</span></td>
                    <td align="right"><span style="display:inline-block;padding:6px 10px;border-radius:999px;background:${presentation.badgeBackground};color:${presentation.accent};font-size:12px;font-weight:850">${presentation.badgeText}</span></td>
                  </tr>
                </table>
                <h1 style="margin:22px 0 8px;color:#292631;font-size:25px;line-height:1.4;letter-spacing:-.035em">${escapeHtml(presentation.heading)}</h1>
                <p style="margin:0;color:#746e7e;font-size:13px;line-height:1.7">${escapeHtml(formattedTime)} 기준 · 읽기 전용 자동 점검</p>
              </td>
            </tr>
            <tr>
              <td style="padding:26px 28px 6px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${metricRow("가장 느린 응답", summary.maxHttpDisplay, "페이지·API 10개", presentation.accent)}
                  ${metricRow("DB 사용량", summary.databaseSize, "무료 500MB 기준", presentation.accent)}
                  ${metricRow("DB 연결", summary.databaseConnections, "무료 연결 한도 기준", presentation.accent)}
                  ${metricRow("점검 결과", `주의 ${report.counts.warn} · 실패 ${report.counts.fail}`, `총 ${report.checks.length}개 항목`, presentation.accent)}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 28px 22px">
                <p style="margin:0 0 12px;color:#4b4654;font-size:14px;font-weight:850">상세 결과</p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  ${issueHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid #ece9f2;background:#fbfafd;color:#837d8d;font-size:12px;line-height:1.75">
                이 리포트는 뉴앙 운영 환경을 저부하·읽기 전용으로 확인한 결과입니다.<br>
                서비스 데이터 변경, 배포, 마이그레이션은 실행하지 않았습니다.<br>
                <span style="color:#5e50d5;font-weight:750">뉴앙 · 나를 이해하고, 서로를 이해하는 성향 놀이터</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const issueText =
    issues.length > 0
      ? issues.map(
          (issue) =>
            `- ${issue.status.toUpperCase()} ${issue.id}: ${issue.detail}`,
        )
      : ["- 모든 점검 항목이 정상입니다."];
  const text = [
    "뉴앙 운영 리포트",
    presentation.heading,
    formattedTime,
    "",
    `가장 느린 응답: ${summary.maxHttpDisplay}`,
    `DB 사용량: ${summary.databaseSize}`,
    `DB 연결: ${summary.databaseConnections}`,
    `점검 결과: 정상 ${report.counts.pass} · 주의 ${report.counts.warn} · 실패 ${report.counts.fail}`,
    "",
    "상세 결과",
    ...issueText,
    "",
    "이 리포트는 읽기 전용 자동 점검 결과이며 서비스 데이터를 변경하지 않았습니다.",
  ].join("\n");

  return {
    html,
    presentationKey,
    subject,
    summary,
    text,
  };
}

export function summarizeProductionHealthReport(report) {
  const httpChecks = report.checks.filter((check) =>
    check.id.startsWith("http:"),
  );
  const httpTotalValues = httpChecks
    .map((check) => Number(check.totalMs))
    .filter(Number.isFinite);
  const maxHttpTotalMs =
    httpTotalValues.length > 0 ? Math.max(...httpTotalValues) : null;
  const databaseSize =
    report.checks.find((check) => check.id === "database:size")?.detail ??
    "확인 불가";
  const databaseConnections =
    report.checks.find((check) => check.id === "database:connections")
      ?.detail ?? "확인 불가";

  return {
    databaseConnections,
    databaseSize,
    failCount: report.counts.fail,
    maxHttpDisplay:
      maxHttpTotalMs === null ? "확인 불가" : `${maxHttpTotalMs}ms`,
    maxHttpTotalMs,
    warnCount: report.counts.warn,
  };
}

export function parseProductionHealthReport(value) {
  if (
    !value ||
    typeof value !== "object" ||
    !["pass", "warn", "fail"].includes(value.status) ||
    typeof value.checkedAt !== "string" ||
    !Number.isFinite(Date.parse(value.checkedAt)) ||
    !Array.isArray(value.checks) ||
    value.checks.length === 0 ||
    value.checks.length > 200
  ) {
    return null;
  }

  const checksValid = value.checks.every(
    (check) =>
      check &&
      typeof check === "object" &&
      typeof check.id === "string" &&
      check.id.length > 0 &&
      check.id.length <= 500 &&
      typeof check.detail === "string" &&
      check.detail.length <= 2_000 &&
      ["pass", "warn", "fail"].includes(check.status) &&
      (check.totalMs === undefined ||
        (Number.isFinite(Number(check.totalMs)) && Number(check.totalMs) >= 0)),
  );
  if (!checksValid) return null;

  const counts = { fail: 0, pass: 0, warn: 0 };
  for (const check of value.checks) counts[check.status] += 1;
  const expectedStatus =
    counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "pass";
  if (
    expectedStatus !== value.status ||
    !value.counts ||
    typeof value.counts !== "object" ||
    counts.pass !== value.counts.pass ||
    counts.warn !== value.counts.warn ||
    counts.fail !== value.counts.fail
  ) {
    return null;
  }

  return value;
}

export async function sendMonitorEmail({
  apiKey,
  fetchImpl = fetch,
  from = DEFAULT_MONITOR_EMAIL_CONFIG.from,
  idempotencyScope,
  payload,
  replyTo = DEFAULT_MONITOR_EMAIL_CONFIG.replyTo,
  to = DEFAULT_MONITOR_EMAIL_CONFIG.to,
}) {
  if (!apiKey) throw new Error("monitor_email_api_key_missing");
  if (!isEmailAddress(to) || !isEmailAddress(replyTo)) {
    throw new Error("monitor_email_address_invalid");
  }
  if (!isNuangSender(from)) throw new Error("monitor_email_sender_invalid");

  const idempotencyKey = createMonitorEmailIdempotencyKey({
    checkedAt: payload.checkedAt,
    idempotencyScope,
    status: payload.status,
    to,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response;
  try {
    response = await fetchImpl("https://api.resend.com/emails", {
      body: JSON.stringify({
        from,
        html: payload.html,
        reply_to: replyTo,
        subject: payload.subject,
        tags: [{ name: "category", value: "production_monitor" }],
        text: payload.text,
        to: [to],
      }),
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
      },
      method: "POST",
      signal: controller.signal,
    });
  } catch (error) {
    throw new Error(`monitor_email_network_${safeErrorCode(error)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`monitor_email_http_${response.status}`);
  }

  return { idempotencyKey, ok: true };
}

export function createMonitorEmailIdempotencyKey({
  checkedAt,
  idempotencyScope,
  status,
  to,
}) {
  const scope = idempotencyScope
    ? `${idempotencyScope}|${to.toLowerCase()}`
    : `${checkedAt}|${status}|${to.toLowerCase()}`;
  const digest = createHash("sha256").update(scope).digest("hex").slice(0, 32);
  return `nuang-health-${digest}`;
}

function metricRow(label, value, hint, accent) {
  return `<tr>
    <td style="padding:0 0 12px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #ece9f2;border-radius:15px;background:#fdfcff">
        <tr>
          <td style="padding:14px 16px;color:#746e7e;font-size:13px;font-weight:700">${escapeHtml(label)}</td>
          <td align="right" style="padding:14px 16px 2px;color:${accent};font-size:17px;font-weight:850">${escapeHtml(value)}</td>
        </tr>
        <tr>
          <td></td>
          <td align="right" style="padding:0 16px 13px;color:#9a94a3;font-size:11px">${escapeHtml(hint)}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function formatKoreanDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isEmailAddress(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isNuangSender(value) {
  const match = value.match(/<([^<>]+)>$/);
  const email = (match?.[1] ?? value).trim().toLowerCase();
  const domain = email.split("@").at(-1);
  return (
    isEmailAddress(email) &&
    (domain === "nuang.app" || Boolean(domain?.endsWith(".nuang.app")))
  );
}

function safeErrorCode(error) {
  if (typeof error?.code === "string") return error.code;
  if (typeof error?.name === "string") return error.name;
  return "unavailable";
}
