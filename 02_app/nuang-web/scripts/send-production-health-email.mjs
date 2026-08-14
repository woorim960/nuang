import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createMonitorEmailPayload,
  DEFAULT_MONITOR_EMAIL_CONFIG,
  parseProductionHealthReport,
  sendMonitorEmail,
} from "./lib/production-health-email.mjs";

const env = {
  ...readEnvFile(".env"),
  ...readEnvFile(".env.local"),
  ...process.env,
};
const args = new Set(process.argv.slice(2));
const scheduled = args.has("--scheduled");
const retryDelayMs = 10_000;

const firstAttempt = await runMonitor();
const shouldRetry =
  !firstAttempt.report || firstAttempt.report.status === "fail";
let finalAttempt = firstAttempt;

if (shouldRetry) {
  await delay(retryDelayMs);
  finalAttempt = await runMonitor();
}

const report =
  finalAttempt.report ?? createUnavailableReport(finalAttempt.errorCode);
const rendered = createMonitorEmailPayload({
  checkedAt: report.checkedAt,
  firstAttemptFailed: shouldRetry && report.status === "pass",
  report,
});
const deliveryPayload = {
  checkedAt: report.checkedAt,
  html: rendered.html,
  status: report.status,
  subject: rendered.subject,
  text: rendered.text,
};

try {
  await sendEmailWithRetry({
    apiKey: env.RESEND_API_KEY?.trim(),
    from:
      env.NUANG_MONITOR_EMAIL_FROM?.trim() || DEFAULT_MONITOR_EMAIL_CONFIG.from,
    idempotencyScope: scheduled
      ? createHourlyIdempotencyScope(report.checkedAt)
      : undefined,
    payload: deliveryPayload,
    replyTo:
      env.NUANG_MONITOR_EMAIL_REPLY_TO?.trim() ||
      DEFAULT_MONITOR_EMAIL_CONFIG.replyTo,
    to: env.NUANG_MONITOR_EMAIL_TO?.trim() || DEFAULT_MONITOR_EMAIL_CONFIG.to,
  });

  console.log(
    JSON.stringify({
      checkedAt: report.checkedAt,
      delivery: "sent",
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
      status: report.status,
      summary: rendered.summary,
    }),
  );
  process.exitCode = 1;
}

async function sendEmailWithRetry(options) {
  try {
    return await sendMonitorEmail(options);
  } catch (error) {
    if (!isRetryableEmailError(error)) throw error;
    await delay(2_000);
    return sendMonitorEmail(options);
  }
}

async function runMonitor() {
  const scriptPath = resolve("scripts/check-production-health.mjs");
  return new Promise((resolveRun) => {
    const child = spawn(process.execPath, [scriptPath, "--json"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let overflow = false;
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, 90_000);

    child.stdout.on("data", (chunk) => {
      if (stdout.length + chunk.length > 1_000_000) {
        overflow = true;
        child.kill("SIGTERM");
        return;
      }
      stdout += chunk.toString("utf8");
    });
    child.stderr.resume();
    child.on("error", (error) => {
      clearTimeout(timeout);
      resolveRun({ errorCode: safeErrorCode(error), report: null });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (overflow) {
        resolveRun({ errorCode: "monitor_output_too_large", report: null });
        return;
      }
      const report = parseMonitorReport(stdout);
      resolveRun({
        errorCode: report
          ? null
          : signal
            ? `monitor_signal_${signal}`
            : `monitor_exit_${code ?? "unknown"}`,
        report,
      });
    });
  });
}

function parseMonitorReport(output) {
  try {
    return parseProductionHealthReport(JSON.parse(output.trim()));
  } catch {
    return null;
  }
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
  if (typeof error?.name === "string") return error.name;
  return "unavailable";
}

function isRetryableEmailError(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  if (message.startsWith("monitor_email_network_")) return true;
  const status = Number(message.match(/^monitor_email_http_(\d{3})$/)?.[1]);
  return status === 429 || status >= 500;
}

function createHourlyIdempotencyScope(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  date.setUTCMinutes(0, 0, 0);
  return `scheduled-hour:${date.toISOString()}`;
}
