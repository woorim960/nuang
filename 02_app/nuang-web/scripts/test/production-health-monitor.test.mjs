import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createHealthReport,
  evaluateDatabaseSnapshot,
  EXPECTED_CRON_SCHEDULES,
  normalizeOrigin,
  runHttpProbes,
} from "../lib/production-health-monitor.mjs";

const healthyCronJob = {
  active: true,
  jobname: "nuang-example",
  lastRunAt: "2026-08-15T00:59:00.000Z",
  lastRunStatus: "succeeded",
  lastSuccessAt: "2026-08-15T00:59:00.000Z",
  maxDurationMs: 25,
  recentFailures: 0,
  recentRuns: 60,
  schedule: "* * * * *",
  stuckRuns: 0,
};

test("HTTP probes validate public content and private API boundaries", async () => {
  const checks = await runHttpProbes({
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      if (path === "/api/feed") {
        return Response.json({ result: { items: [] } });
      }
      if (path.startsWith("/api/")) {
        return Response.json(
          { error: "authentication_required" },
          { headers: { "cache-control": "private, no-store" }, status: 401 },
        );
      }
      return new Response(`<!doctype html>${"x".repeat(600)}`, {
        headers: { "content-type": "text/html" },
        status: 200,
      });
    },
    origin: "https://nuang.app",
    thresholds: { httpFailMs: 60_000, httpWarnMs: 30_000 },
  });

  assert.equal(checks.length, 10);
  assert.equal(
    checks.every((check) => check.status === "pass"),
    true,
  );
});

test("HTTP probes fail closed on unsafe auth cache headers", async () => {
  const checks = await runHttpProbes({
    fetchImpl: async () => Response.json({}, { status: 401 }),
    origin: "https://nuang.app",
    probes: [
      {
        cacheNoStore: true,
        id: "private",
        kind: "status",
        path: "/api/private",
        status: 401,
      },
    ],
    thresholds: { httpFailMs: 60_000, httpWarnMs: 30_000 },
  });

  assert.equal(checks[0].status, "fail");
  assert.match(checks[0].detail, /cache=unsafe/);
});

test("HTTP probes cap request concurrency at two", async () => {
  let active = 0;
  let maxActive = 0;
  const probes = Array.from({ length: 6 }, (_, index) => ({
    id: `probe-${index}`,
    kind: "status",
    path: `/probe-${index}`,
    status: 200,
  }));

  const checks = await runHttpProbes({
    concurrency: 2,
    fetchImpl: async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return new Response("ok");
    },
    origin: "https://nuang.app",
    probes,
    thresholds: { httpFailMs: 60_000, httpWarnMs: 30_000 },
  });

  assert.equal(checks.length, 6);
  assert.equal(maxActive, 2);
});

test("HTTP probes confirm a latency warning once before reporting it", async () => {
  const waits = [];
  const timings = [0, 2, 4, 10, 10.2, 10.4];
  const checks = await runHttpProbes({
    confirmationDelayMs: 10_000,
    fetchImpl: async () => new Response("ok"),
    now: () => timings.shift() ?? 10.4,
    origin: "https://nuang.app",
    probes: [
      {
        id: "transient-latency",
        kind: "status",
        path: "/transient",
        status: 200,
      },
    ],
    thresholds: { httpFailMs: 100, httpWarnMs: 1 },
    wait: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });

  assert.deepEqual(waits, [10_000]);
  assert.equal(checks[0].status, "pass");
  assert.equal(checks[0].firstTotalMs, 4);
  assert.match(checks[0].detail, /recovered=true/);
});

test("database snapshot stays healthy for current low-load state", () => {
  const checks = evaluateDatabaseSnapshot(healthySnapshot(), {
    now: new Date("2026-08-15T01:00:00.000Z"),
  });
  const report = createHealthReport(checks);

  assert.equal(report.status, "pass");
  assert.equal(report.counts.fail, 0);
});

test("database snapshot warns before the free database quota", () => {
  const snapshot = healthySnapshot();
  snapshot.capacity.databaseBytes = 360 * 1024 * 1024;
  const report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );

  assert.equal(report.status, "warn");
  assert.equal(
    report.checks.find((check) => check.id === "database:size")?.status,
    "warn",
  );
});

test("Supabase project storage warns before the free organization quota", () => {
  const snapshot = healthySnapshot();
  snapshot.capacity.supabaseStorageBytes = 700_000_000;
  let report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );

  const warning = report.checks.find(
    (check) => check.id === "storage:supabase-project-capacity",
  );
  assert.equal(warning?.status, "warn");
  assert.match(warning?.detail ?? "", /project_only=true/);

  snapshot.capacity.supabaseStorageBytes = 850_000_000;
  report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    report.checks.find(
      (check) => check.id === "storage:supabase-project-capacity",
    )?.status,
    "fail",
  );
});

test("R2 capacity warns at 70 percent and stale cleanup fails closed", () => {
  const snapshot = healthySnapshot();
  snapshot.mediaStorage.activeBytes = 5_600_000_000;
  let report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    report.checks.find((check) => check.id === "storage:r2-managed-capacity")
      ?.status,
    "warn",
  );

  snapshot.mediaStorage.cleanupPending = 1;
  snapshot.mediaStorage.cleanupBytes = 250_000;
  snapshot.mediaStorage.cleanupOldestAt = "2026-08-15T00:40:00.000Z";
  report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    report.checks.find((check) => check.id === "storage:media-cleanup")?.status,
    "warn",
  );

  snapshot.mediaStorage.cleanupOldestAt = "2026-08-13T12:00:00.000Z";
  report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    report.checks.find((check) => check.id === "storage:media-cleanup")?.status,
    "fail",
  );

  snapshot.mediaStorage.cleanupPending = 0;
  snapshot.mediaStorage.cleanupBytes = 0;
  snapshot.mediaStorage.cleanupOldestAt = null;
  snapshot.mediaStorage.pendingUploadCount = 1;
  snapshot.mediaStorage.pendingUploadOldestAt = "2026-08-15T00:20:00.000Z";
  report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    report.checks.find((check) => check.id === "storage:media-upload-pending")
      ?.status,
    "fail",
  );
});

test("cron failures and stale queues are deployment blockers", () => {
  const snapshot = healthySnapshot();
  snapshot.cronJobs[0].recentFailures = 1;
  snapshot.cronJobs[0].lastRunStatus = "failed";
  snapshot.queues.advertisingStale = 1;
  const report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );

  assert.equal(report.status, "fail");
  assert.equal(report.counts.fail >= 2, true);
});

test("cron inventory fails when an expected job is missing", () => {
  const snapshot = healthySnapshot();
  snapshot.cronJobs = snapshot.cronJobs.slice(1);
  const report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );

  assert.equal(
    report.checks.find((check) => check.id === "cron:inventory")?.status,
    "fail",
  );
});

test("daily cron fails when its last success is older than 36 hours", () => {
  const snapshot = healthySnapshot();
  const dailyJob = snapshot.cronJobs.find(
    (job) => job.schedule !== "* * * * *",
  );
  dailyJob.lastRunAt = "2026-08-13T12:00:00.000Z";
  dailyJob.lastSuccessAt = "2026-08-13T12:00:00.000Z";

  const report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    report.checks.find((check) => check.id === `cron:${dailyJob.jobname}`)
      ?.status,
    "fail",
  );
});

test("marketing backlog is suppressed outside its window or while paused", () => {
  const snapshot = healthySnapshot();
  snapshot.queues.marketingCampaignDue = 3;
  snapshot.queues.marketingCampaignOldestDueAt = "2026-08-15T00:00:00.000Z";
  snapshot.queues.marketingConfirmationDue = 2;
  snapshot.queues.marketingConfirmationOldestDueAt = "2026-08-15T00:00:00.000Z";
  snapshot.queues.marketingWindowOpen = false;

  let report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    queueChecks(report).every((check) => check.status === "pass"),
    true,
  );
  assert.equal(
    queueChecks(report).every((check) =>
      check.detail.includes("suppressed=outside_delivery_window"),
    ),
    true,
  );

  snapshot.queues.marketingWindowOpen = true;
  snapshot.queues.marketingEmergencyPaused = true;
  report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    queueChecks(report).every((check) => check.status === "pass"),
    true,
  );
  assert.equal(
    queueChecks(report).every((check) =>
      check.detail.includes("suppressed=emergency_paused"),
    ),
    true,
  );

  snapshot.queues.marketingCampaignStale = 1;
  report = createHealthReport(
    evaluateDatabaseSnapshot(snapshot, {
      now: new Date("2026-08-15T01:00:00.000Z"),
    }),
  );
  assert.equal(
    report.checks.find((check) => check.id === "queue:marketing-campaign")
      ?.status,
    "fail",
  );
});

test("monitor origin rejects non-local cleartext HTTP", () => {
  assert.throws(() => normalizeOrigin("http://nuang.app"), /HTTPS/);
  assert.equal(
    normalizeOrigin("http://127.0.0.1:3000"),
    "http://127.0.0.1:3000",
  );
});

test("database monitor is read-only and always rolls back", () => {
  const source = readFileSync(
    new URL("../check-production-health.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /begin read only/i);
  assert.match(source, /statement_timeout = '5s'/i);
  assert.match(source, /rejectUnauthorized: true/);
  assert.match(source, /ssl: \{ ca: databaseCa, rejectUnauthorized: true \}/);
  assert.match(source, /client\.query\("rollback"\)/);
  assert.doesNotMatch(source, /client\.query\("commit"\)/i);
  assert.doesNotMatch(source, /Promise\.all\(\[/);
});

test("database monitor pins the official Supabase CA", () => {
  const pem = readFileSync(
    new URL(
      "../../config/certificates/supabase-prod-ca-2021.crt",
      import.meta.url,
    ),
    "utf8",
  );
  const certificate = new X509Certificate(pem);

  assert.equal(certificate.ca, true);
  assert.equal(
    certificate.subject,
    "C=US\nST=Delware\nL=New Castle\nO=Supabase Inc\nCN=Supabase Root 2021 CA",
  );
  assert.equal(
    certificate.fingerprint256,
    "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA",
  );
});

test("database queue query mirrors worker eligibility guards", () => {
  const source = readFileSync(
    new URL("../check-production-health.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /lookbackMinutes = 90/);
  assert.match(source, /time '08:00'/);
  assert.match(source, /time '21:00'/);
  assert.match(source, /emergency_paused = true/);
  assert.match(
    source,
    /recipient\.control_version = campaign\.control_version/,
  );
  assert.match(
    source,
    /coalesce\(campaign\.scheduled_at, now\(\)\) <= now\(\)/,
  );
  assert.match(source, /limit 10000/);
  assert.equal(source.match(/attempt_count < 5/g)?.length, 6);
  assert.equal(source.match(/attempt_count >= 5/g)?.length, 3);
  assert.match(source, /lifecycle_status = 'scheduled'/);
  assert.match(source, /response_closes_at <= now\(\)/);
});

function healthySnapshot() {
  return {
    capacity: {
      connectionCount: 5,
      cronHistoryBytes: 2 * 1024 * 1024,
      databaseBytes: 100 * 1024 * 1024,
      maxConnections: 60,
      supabaseStorageBytes: 0,
      supabaseStorageObjects: 0,
      transactionReadOnly: true,
    },
    cronJobs: Object.entries(EXPECTED_CRON_SCHEDULES).map(
      ([jobname, schedule]) => ({ ...healthyCronJob, jobname, schedule }),
    ),
    queues: {
      advertisingDue: 0,
      advertisingOldestDueAt: null,
      advertisingRecentDead: 0,
      advertisingStale: 0,
      communityCloseDue: 0,
      communityCloseOldestDueAt: null,
      communityPublishDue: 0,
      communityPublishOldestDueAt: null,
      marketingCampaignDue: 0,
      marketingCampaignOldestDueAt: null,
      marketingCampaignRecentFailed: 0,
      marketingCampaignStale: 0,
      marketingConfirmationDue: 0,
      marketingConfirmationOldestDueAt: null,
      marketingConfirmationRecentFailed: 0,
      marketingConfirmationStale: 0,
      marketingEmergencyPaused: false,
      marketingWindowOpen: true,
    },
    mediaStorage: {
      activeBytes: 0,
      cleanupBytes: 0,
      cleanupOldestAt: null,
      cleanupPending: 0,
      maxManagedBytes: 8_000_000_000,
      pendingUploadCount: 0,
      pendingUploadOldestAt: null,
      reservedBytes: 0,
    },
    tombstones: { recent: 0, total: 0 },
  };
}

function queueChecks(report) {
  return report.checks.filter((check) =>
    ["queue:marketing-campaign", "queue:marketing-confirmation"].includes(
      check.id,
    ),
  );
}
