import assert from "node:assert/strict";
import test from "node:test";
import {
  createMonitorEmailIdempotencyKey,
  createMonitorEmailPayload,
  DEFAULT_MONITOR_EMAIL_CONFIG,
  parseProductionHealthReport,
  sendMonitorEmail,
} from "../lib/production-health-email.mjs";

test("healthy report renders a branded Korean HTML and text email", () => {
  const rendered = createMonitorEmailPayload({ report: healthyReport() });

  assert.match(rendered.subject, /^\[뉴앙 운영\] 정상/);
  assert.match(rendered.html, /NUANG/);
  assert.match(rendered.html, /읽기 전용 자동 점검/);
  assert.match(rendered.html, /48\.2 MB \/ 500 MB/);
  assert.match(rendered.text, /가장 느린 응답: 754ms/);
  assert.equal(rendered.presentationKey, "pass");
});

test("warning and failure details are escaped and visible", () => {
  const report = healthyReport();
  report.status = "fail";
  report.counts = { fail: 1, pass: 3, warn: 1 };
  report.checks.push({
    detail: "<script>alert('x')</script>",
    id: "queue:<unsafe>",
    status: "fail",
  });
  report.checks.push({
    detail: "slow",
    id: "http:feed",
    status: "warn",
    totalMs: 2_000,
  });
  const rendered = createMonitorEmailPayload({ report });

  assert.match(rendered.subject, /^\[뉴앙 운영\] 긴급/);
  assert.doesNotMatch(rendered.html, /<script>/);
  assert.match(rendered.html, /queue:&lt;unsafe&gt;/);
  assert.match(rendered.html, /&lt;script&gt;/);
  assert.equal(rendered.presentationKey, "fail");
});

test("a recovered retry is presented separately from a clean pass", () => {
  const rendered = createMonitorEmailPayload({
    firstAttemptFailed: true,
    report: healthyReport(),
  });

  assert.match(rendered.subject, /^\[뉴앙 운영\] 회복/);
  assert.match(rendered.html, /일시적인 오류 뒤 정상/);
  assert.equal(rendered.presentationKey, "recovered");
});

test("delivery uses the Nuang sender, recipient, and an idempotency key", async () => {
  let request = null;
  const payload = createMonitorEmailPayload({ report: healthyReport() });

  const result = await sendMonitorEmail({
    apiKey: "test-api-key",
    fetchImpl: async (url, init) => {
      request = { init, url };
      return Response.json({ id: "email-id" });
    },
    payload: {
      checkedAt: "2026-08-15T01:52:00.000Z",
      html: payload.html,
      status: "pass",
      subject: payload.subject,
      text: payload.text,
    },
  });

  const body = JSON.parse(request.init.body);
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(body.from, DEFAULT_MONITOR_EMAIL_CONFIG.from);
  assert.deepEqual(body.to, ["woorimprog@gmail.com"]);
  assert.equal(body.reply_to, "woorimprog@gmail.com");
  assert.deepEqual(body.tags, [
    { name: "category", value: "production_monitor" },
  ]);
  assert.match(request.init.headers["idempotency-key"], /^nuang-health-/);
  assert.equal(result.ok, true);
});

test("idempotency key is stable and recipient-sensitive", () => {
  const input = {
    checkedAt: "2026-08-15T01:52:00.000Z",
    status: "pass",
    to: "woorimprog@gmail.com",
  };

  assert.equal(
    createMonitorEmailIdempotencyKey(input),
    createMonitorEmailIdempotencyKey(input),
  );
  assert.notEqual(
    createMonitorEmailIdempotencyKey(input),
    createMonitorEmailIdempotencyKey({ ...input, to: "other@example.com" }),
  );
});

test("scheduled idempotency scope deduplicates reports in the same slot", () => {
  const base = {
    checkedAt: "2026-08-15T01:52:00.000Z",
    idempotencyScope: "scheduled-hour:2026-08-15T01:00:00.000Z",
    status: "pass",
    to: "woorimprog@gmail.com",
  };

  assert.equal(
    createMonitorEmailIdempotencyKey(base),
    createMonitorEmailIdempotencyKey({
      ...base,
      checkedAt: "2026-08-15T01:58:00.000Z",
      status: "fail",
    }),
  );
});

test("scheduled idempotency conflicts fail closed", async () => {
  await assert.rejects(
    sendMonitorEmail({
      apiKey: "test-api-key",
      fetchImpl: async () => new Response(null, { status: 409 }),
      idempotencyScope: "scheduled-hour:2026-08-15T01:00:00.000Z",
      payload: {
        checkedAt: "2026-08-15T01:52:00.000Z",
        html: "<p>test</p>",
        status: "pass",
        subject: "test",
        text: "test",
      },
    }),
    /monitor_email_http_409/,
  );
});

test("failed HTTP probes do not report a misleading zero millisecond latency", () => {
  const report = healthyReport();
  report.checks = report.checks.map((check) =>
    check.id.startsWith("http:")
      ? { detail: "request failed (timeout)", id: check.id, status: "fail" }
      : check,
  );
  report.status = "fail";
  report.counts = { fail: 2, pass: 2, warn: 0 };

  const rendered = createMonitorEmailPayload({ report });
  assert.match(rendered.html, /가장 느린 응답/);
  assert.match(rendered.html, /확인 불가/);
  assert.doesNotMatch(rendered.text, /가장 느린 응답: 0ms/);
});

test("malformed monitor reports fail closed before rendering or delivery", () => {
  expectInvalid({ ...healthyReport(), checkedAt: "not-a-date" });
  expectInvalid({
    ...healthyReport(),
    counts: { fail: 0, pass: 999, warn: 0 },
  });
  expectInvalid({
    ...healthyReport(),
    checks: [{ detail: null, id: "http:landing", status: "pass" }],
    counts: { fail: 0, pass: 1, warn: 0 },
  });
  expectInvalid({ ...healthyReport(), status: "warn" });
  assert.equal(parseProductionHealthReport(healthyReport())?.status, "pass");
});

test("delivery rejects untrusted sender domains before network access", async () => {
  let called = false;

  await assert.rejects(
    sendMonitorEmail({
      apiKey: "test-api-key",
      fetchImpl: async () => {
        called = true;
        return Response.json({});
      },
      from: "attacker@example.com",
      payload: {
        checkedAt: "2026-08-15T01:52:00.000Z",
        html: "<p>test</p>",
        status: "pass",
        subject: "test",
        text: "test",
      },
    }),
    /monitor_email_sender_invalid/,
  );
  assert.equal(called, false);
});

function healthyReport() {
  return {
    checkedAt: "2026-08-15T01:52:00.000Z",
    checks: [
      {
        detail: "http=200 ttfb=40ms total=548ms bytes=1200",
        id: "http:landing",
        status: "pass",
        totalMs: 548,
      },
      {
        detail: "http=200 ttfb=70ms total=754ms items=0",
        id: "http:feed-api",
        status: "pass",
        totalMs: 754,
      },
      {
        detail: "48.2 MB / 500 MB",
        id: "database:size",
        status: "pass",
        value: 50_540_000,
      },
      {
        detail: "17/60 (28%)",
        id: "database:connections",
        status: "pass",
        value: 0.28,
      },
    ],
    counts: { fail: 0, pass: 4, warn: 0 },
    status: "pass",
  };
}

function expectInvalid(report) {
  assert.equal(parseProductionHealthReport(report), null);
}
