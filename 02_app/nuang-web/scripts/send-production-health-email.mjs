import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createMonitorExecutionObservation,
  createMonitorEmailPayload,
  createScheduledMonitorEmailIdempotencyScope,
  DEFAULT_MONITOR_EMAIL_CONFIG,
  sendMonitorEmailWithRetry,
} from "./lib/production-health-email.mjs";
import { runProductionHealthMonitor } from "./lib/production-health-runner.mjs";

const executionStartedAt = new Date().toISOString();
const args = new Set(process.argv.slice(2));
const scheduled = args.has("--scheduled");
const scheduledStartedAt = scheduled ? executionStartedAt : null;
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...process.env,
};
const retryDelayMs = 10_000;

const firstAttempt = await runProductionHealthMonitor();
const shouldRetry =
  !firstAttempt.report || firstAttempt.report.status === "fail";
let finalAttempt = firstAttempt;

if (shouldRetry) {
  await delay(retryDelayMs);
  finalAttempt = await runProductionHealthMonitor();
}

const report =
  finalAttempt.report ?? createUnavailableReport(finalAttempt.errorCode);
const rendered = createMonitorEmailPayload({
  checkedAt: report.checkedAt,
  firstAttemptFailed: shouldRetry && report.status === "pass",
  report,
});
const execution = createMonitorExecutionObservation({
  finalAttemptErrorCode: finalAttempt.errorCode,
  firstAttemptErrorCode: firstAttempt.errorCode,
});
const deliveryPayload = {
  checkedAt: report.checkedAt,
  html: rendered.html,
  status: report.status,
  subject: rendered.subject,
  text: rendered.text,
};
const monitorEmailTo =
  env.NUANG_MONITOR_EMAIL_TO?.trim() || DEFAULT_MONITOR_EMAIL_CONFIG.to;

try {
  const delivery = await sendMonitorEmailWithRetry({
    apiKey: env.RESEND_API_KEY?.trim(),
    from:
      env.NUANG_MONITOR_EMAIL_FROM?.trim() || DEFAULT_MONITOR_EMAIL_CONFIG.from,
    idempotencyScope: scheduled
      ? createScheduledMonitorEmailIdempotencyScope({
          checks: report.checks,
          presentationKey: rendered.presentationKey,
          startedAt: scheduledStartedAt,
          to: monitorEmailTo,
        })
      : undefined,
    payload: deliveryPayload,
    replyTo:
      env.NUANG_MONITOR_EMAIL_REPLY_TO?.trim() ||
      DEFAULT_MONITOR_EMAIL_CONFIG.replyTo,
    to: monitorEmailTo,
  });

  console.log(
    JSON.stringify({
      checkedAt: report.checkedAt,
      deduplicated: delivery.deduplicated,
      delivery: "sent",
      execution,
      firstAttemptFailed: shouldRetry,
      issues: report.checks
        .filter((check) => check.status !== "pass")
        .map(({ detail, id, status }) => ({ detail, id, status })),
      presentation: rendered.presentationKey,
      status: report.status,
      summary: rendered.summary,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      checkedAt: report.checkedAt,
      delivery: "failed",
      errorCode: safeErrorCode(error),
      execution,
      status: report.status,
      summary: rendered.summary,
    }),
  );
  process.exitCode = 1;
}

function createUnavailableReport(errorCode) {
  return {
    checkedAt: new Date().toISOString(),
    checks: [
      {
        detail: `monitor execution unavailable (${errorCode ?? "unknown"})`,
        id: "monitor:execution",
        status: "fail",
      },
    ],
    counts: { fail: 1, pass: 0, warn: 0 },
    status: "fail",
  };
}

function readEnvFile(fileName) {
  const path = resolve(fileName);
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) return [line, ""];
        const key = line.slice(0, separator).trim();
        const rawValue = line.slice(separator + 1).trim();
        const value =
          (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
          (rawValue.startsWith("'") && rawValue.endsWith("'"))
            ? rawValue.slice(1, -1)
            : rawValue;
        return [key, value];
      }),
  );
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function safeErrorCode(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (/^monitor_email_[a-z0-9_]+$/.test(message)) return message;
  if (typeof error?.code === "string") return error.code;
  if (typeof error?.name === "string" && error.name !== "Error") {
    return error.name;
  }
  if (error?.name === "Error") return "monitor_email_unavailable";
  return "unavailable";
}
