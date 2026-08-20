import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createMonitorEmailIdempotencyKey,
  createMonitorEmailPayload,
  createScheduledMonitorEmailIdempotencyScope,
  DEFAULT_MONITOR_EMAIL_CONFIG,
  parseProductionHealthReport,
  sendMonitorEmail,
  sendMonitorEmailWithRetry,
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

test("monitor execution failure is distinct from a customer-facing outage", () => {
  const rendered = createMonitorEmailPayload({
    report: {
      checkedAt: "2026-08-21T01:00:00.000Z",
      checks: [
        {
          detail: "monitor execution unavailable (monitor_timeout)",
          id: "monitor:execution",
          status: "fail",
        },
      ],
      counts: { fail: 1, pass: 0, warn: 0 },
      status: "fail",
    },
  });

  assert.match(rendered.subject, /^\[뉴앙 운영\] 점검 실패/);
  assert.match(rendered.html, /점검 도구 확인/);
  assert.doesNotMatch(rendered.html, /긴급 확인/);
  assert.equal(rendered.presentationKey, "monitor-unavailable");
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
  assert.equal(result.deduplicated, false);
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

test("scheduled entrypoint freezes its start before setup and monitoring", () => {
  const source = readFileSync(
    new URL("../send-production-health-email.mjs", import.meta.url),
    "utf8",
  );
  const startCaptureIndex = source.indexOf("const executionStartedAt");
  const environmentSetupIndex = source.indexOf("const env =");
  const monitorStartIndex = source.indexOf(
    "const firstAttempt = await runProductionHealthMonitor()",
  );

  assert.notEqual(startCaptureIndex, -1);
  assert.notEqual(environmentSetupIndex, -1);
  assert.notEqual(monitorStartIndex, -1);
  assert.ok(startCaptureIndex < environmentSetupIndex);
  assert.ok(startCaptureIndex < monitorStartIndex);
  assert.match(source, /scheduled \? executionStartedAt : null/);
  assert.match(source, /startedAt: scheduledStartedAt/);
});

test("scheduled pass keys follow the minute-52 occurrence boundary", () => {
  const passAt0610 = scheduledScope({
    startedAt: "2026-08-15T06:10:00.000Z",
    to: "WOORIMPROG@GMAIL.COM",
  });
  const passAt0651 = scheduledScope({
    startedAt: "2026-08-15T06:51:59.999Z",
  });
  const passAt0652 = scheduledScope({
    startedAt: "2026-08-15T06:52:00.000Z",
  });
  const passAt0653 = scheduledScope({
    startedAt: "2026-08-15T06:53:00.000Z",
  });
  const otherRecipient = scheduledScope({
    startedAt: "2026-08-15T06:10:00.000Z",
    to: "other@example.com",
  });

  assert.match(passAt0610, /^scheduled-pass-dedupe:v3:/);
  assert.match(passAt0610, /2026-08-15T05:52:00\.000Z/);
  assert.match(passAt0653, /2026-08-15T06:52:00\.000Z/);
  assert.equal(
    scheduledKey(passAt0610, "2026-08-15T06:10:30.000Z"),
    scheduledKey(passAt0651, "2026-08-15T06:51:30.000Z"),
  );
  assert.notEqual(
    scheduledKey(passAt0610, "2026-08-15T06:10:30.000Z"),
    scheduledKey(passAt0653, "2026-08-15T06:53:30.000Z"),
  );
  assert.equal(
    scheduledKey(passAt0652, "2026-08-15T06:52:30.000Z"),
    scheduledKey(passAt0653, "2026-08-15T06:53:30.000Z"),
  );
  assert.notEqual(passAt0610, otherRecipient);
});

test("scheduled alerts use frozen start as a nonce across recovery and re-failure", () => {
  const failedChecks = [
    { detail: "first", id: "http:feed", status: "fail" },
    { id: "http:landing", status: "pass" },
  ];
  const firstFailure = scheduledScope({
    checks: failedChecks,
    presentationKey: "fail",
    startedAt: "2026-08-15T06:53:00.000Z",
  });
  const sameAttempt = scheduledScope({
    checks: [...failedChecks]
      .reverse()
      .map((check) => ({ ...check, detail: "changed" })),
    presentationKey: "fail",
    startedAt: "2026-08-15T06:53:00.000Z",
  });
  const recovered = scheduledScope({
    presentationKey: "recovered",
    startedAt: "2026-08-15T06:54:00.000Z",
  });
  const passed = scheduledScope({
    presentationKey: "pass",
    startedAt: "2026-08-15T06:55:00.000Z",
  });
  const secondFailure = scheduledScope({
    checks: failedChecks,
    presentationKey: "fail",
    startedAt: "2026-08-15T06:56:00.000Z",
  });
  const differentIssue = scheduledScope({
    checks: [{ id: "database:probe", status: "fail" }],
    presentationKey: "fail",
    startedAt: "2026-08-15T06:53:00.000Z",
  });

  assert.match(firstFailure, /^scheduled-alert:v3:/);
  assert.match(recovered, /^scheduled-alert:v3:/);
  assert.equal(
    scheduledKey(firstFailure, "2026-08-15T06:53:30.000Z", "fail"),
    scheduledKey(sameAttempt, "2026-08-15T06:53:40.000Z", "fail"),
  );
  const transitionKeys = [
    scheduledKey(firstFailure, "2026-08-15T06:53:30.000Z", "fail"),
    scheduledKey(recovered, "2026-08-15T06:54:30.000Z"),
    scheduledKey(passed, "2026-08-15T06:55:30.000Z"),
    scheduledKey(secondFailure, "2026-08-15T06:56:30.000Z", "fail"),
  ];
  assert.equal(new Set(transitionKeys).size, transitionKeys.length);
  assert.notEqual(firstFailure, differentIssue);
});

test("scheduled pass payload conflicts become deduplicated success", async () => {
  let requestCount = 0;
  let waitCount = 0;
  const result = await sendMonitorEmailWithRetry({
    apiKey: "test-api-key",
    delayImpl: async () => {
      waitCount += 1;
    },
    fetchImpl: async () => {
      requestCount += 1;
      return Response.json(
        {
          message: "provider detail must stay private",
          name: "invalid_idempotent_request",
        },
        { status: 409 },
      );
    },
    idempotencyScope: scheduledScope(),
    payload: testDeliveryPayload(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.deduplicated, true);
  assert.equal(requestCount, 1);
  assert.equal(waitCount, 0);
});

test("scheduled alert payload conflicts fail closed", async () => {
  let requestCount = 0;
  let waitCount = 0;
  await assert.rejects(
    sendMonitorEmailWithRetry({
      apiKey: "test-api-key",
      delayImpl: async () => {
        waitCount += 1;
      },
      fetchImpl: async () => {
        requestCount += 1;
        return Response.json(
          { name: "invalid_idempotent_request" },
          { status: 409 },
        );
      },
      idempotencyScope: scheduledScope({
        checks: [{ id: "http:feed", status: "fail" }],
        presentationKey: "fail",
        startedAt: "2026-08-15T06:53:00.000Z",
      }),
      payload: testDeliveryPayload({ status: "fail" }),
    }),
    /monitor_email_resend_invalid_idempotent_request/,
  );
  assert.equal(requestCount, 1);
  assert.equal(waitCount, 0);
});

test("unscheduled invalid idempotency conflicts still fail closed", async () => {
  await assert.rejects(
    sendMonitorEmailWithRetry({
      apiKey: "test-api-key",
      fetchImpl: async () =>
        Response.json({ name: "invalid_idempotent_request" }, { status: 409 }),
      payload: testDeliveryPayload(),
    }),
    /monitor_email_resend_invalid_idempotent_request/,
  );
});

test("concurrent idempotency conflicts retry once with the exact request", async () => {
  const requests = [];
  const waits = [];
  const result = await sendMonitorEmailWithRetry({
    apiKey: "test-api-key",
    delayImpl: async (ms) => {
      waits.push(ms);
    },
    fetchImpl: async (url, init) => {
      requests.push({
        body: init.body,
        idempotencyKey: init.headers["idempotency-key"],
        url,
      });
      return requests.length === 1
        ? Response.json(
            { name: "concurrent_idempotent_requests" },
            { status: 409 },
          )
        : Response.json({ id: "email-id" });
    },
    idempotencyScope: scheduledScope(),
    payload: testDeliveryPayload(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.deduplicated, false);
  assert.deepEqual(waits, [2_000]);
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0], requests[1]);
});

test("persistent concurrent idempotency conflicts fail after one retry", async () => {
  let requestCount = 0;
  await assert.rejects(
    sendMonitorEmailWithRetry({
      apiKey: "test-api-key",
      delayImpl: async () => undefined,
      fetchImpl: async () => {
        requestCount += 1;
        return Response.json(
          { name: "concurrent_idempotent_requests" },
          { status: 409 },
        );
      },
      idempotencyScope: scheduledScope(),
      payload: testDeliveryPayload(),
    }),
    /monitor_email_resend_concurrent_idempotent_requests/,
  );
  assert.equal(requestCount, 2);
});

test("a concurrent duplicate that completes becomes deduplicated success", async () => {
  let requestCount = 0;
  const result = await sendMonitorEmailWithRetry({
    apiKey: "test-api-key",
    delayImpl: async () => undefined,
    fetchImpl: async () => {
      requestCount += 1;
      return Response.json(
        {
          name:
            requestCount === 1
              ? "concurrent_idempotent_requests"
              : "invalid_idempotent_request",
        },
        { status: 409 },
      );
    },
    idempotencyScope: scheduledScope(),
    payload: testDeliveryPayload(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.deduplicated, true);
  assert.equal(requestCount, 2);
});

test("unknown and non-JSON 409 responses fail without exposing the body", async () => {
  const responses = [
    () =>
      Response.json(
        { message: "private provider detail", name: "unknown_conflict" },
        { status: 409 },
      ),
    () => new Response("private non-json provider detail", { status: 409 }),
  ];

  for (const createResponse of responses) {
    await assert.rejects(
      sendMonitorEmailWithRetry({
        apiKey: "test-api-key",
        fetchImpl: async () => createResponse(),
        idempotencyScope: scheduledScope(),
        payload: testDeliveryPayload(),
      }),
      (error) => {
        assert.equal(error.message, "monitor_email_http_409");
        assert.doesNotMatch(error.message, /private|provider/i);
        return true;
      },
    );
  }
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

function scheduledKey(idempotencyScope, checkedAt, status = "pass") {
  return createMonitorEmailIdempotencyKey({
    checkedAt,
    idempotencyScope,
    status,
    to: DEFAULT_MONITOR_EMAIL_CONFIG.to,
  });
}

function scheduledScope({
  checks = [{ id: "http:landing", status: "pass" }],
  presentationKey = "pass",
  startedAt = "2026-08-15T01:52:00.000Z",
  to = DEFAULT_MONITOR_EMAIL_CONFIG.to,
} = {}) {
  return createScheduledMonitorEmailIdempotencyScope({
    checks,
    presentationKey,
    startedAt,
    to,
  });
}

function testDeliveryPayload(overrides = {}) {
  return {
    checkedAt: "2026-08-15T01:52:00.000Z",
    html: "<p>test</p>",
    status: "pass",
    subject: "test",
    text: "test",
    ...overrides,
  };
}

function expectInvalid(report) {
  assert.equal(parseProductionHealthReport(report), null);
}
