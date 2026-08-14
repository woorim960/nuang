import { performance } from "node:perf_hooks";

export const DEFAULT_HTTP_PROBES = Object.freeze([
  { id: "landing", kind: "html", path: "/", status: 200 },
  { id: "home", kind: "html", path: "/home", status: 200 },
  { id: "feed", kind: "html", path: "/feed", status: 200 },
  { id: "feed-api", kind: "feed-json", path: "/api/feed", status: 200 },
  {
    id: "account-deletion-help",
    kind: "html",
    path: "/help/account-deletion",
    status: 200,
  },
  {
    id: "privacy-policy",
    kind: "html",
    path: "/policies/privacy",
    status: 200,
  },
  {
    cacheNoStore: true,
    id: "account-results-auth-boundary",
    kind: "status",
    path: "/api/account-results",
    status: 401,
  },
  {
    cacheNoStore: true,
    id: "assessment-progress-auth-boundary",
    kind: "status",
    path: "/api/assessment-progress",
    status: 401,
  },
  {
    cacheNoStore: true,
    id: "free-topic-auth-boundary",
    kind: "status",
    path: "/api/free-topic-results",
    status: 401,
  },
  {
    cacheNoStore: true,
    id: "lab-auth-boundary",
    kind: "status",
    path: "/api/lab-results",
    status: 401,
  },
]);

export const DEFAULT_THRESHOLDS = Object.freeze({
  dailyCronMaxAgeMs: 36 * 60 * 60 * 1000,
  databaseFailBytes: 425 * 1024 * 1024,
  databaseQuotaBytes: 500 * 1024 * 1024,
  databaseWarnBytes: 350 * 1024 * 1024,
  databaseConnectionFailRatio: 0.75,
  databaseConnectionWarnRatio: 0.5,
  frequentCronMaxAgeMs: 5 * 60 * 1000,
  httpFailMs: 5_000,
  httpWarnMs: 1_500,
  // Vercel Hobby runs the cleanup route once per day. A due item is a useful
  // warning, while 36 hours proves that at least one complete daily window was
  // missed even with scheduler jitter.
  mediaCleanupFailAgeMs: 36 * 60 * 60 * 1000,
  mediaPendingUploadFailAgeMs: 30 * 60 * 1000,
  mediaStorageFailRatio: 0.85,
  mediaStorageWarnRatio: 0.7,
  queueMaxAgeMs: 5 * 60 * 1000,
  recentCronFailMs: 5_000,
  recentCronWarnMs: 1_000,
});

export const EXPECTED_CRON_SCHEDULES = Object.freeze({
  "nuang-advertising-mail-outbox-retry": "* * * * *",
  "nuang-business-operations-metadata-prune": "17 19 * * *",
  "nuang-close-due-community-content": "* * * * *",
  "nuang-cron-run-history-prune": "7 19 * * *",
  "nuang-gate-c-retention": "17 3 * * *",
  "nuang-gate-c-reward-retention": "29 3 * * *",
  "nuang-marketing-consent-confirmation-prepare": "31 18 * * *",
  "nuang-marketing-email-outbox-drain": "* * * * *",
  "nuang-privacy-retention-prune": "41 19 * * *",
  "nuang-product-analytics-retention": "17 3 * * *",
  "nuang-publish-due-community-content": "* * * * *",
});

export async function runHttpProbes({
  concurrency = 2,
  fetchImpl = fetch,
  now = () => performance.now(),
  origin,
  probes = DEFAULT_HTTP_PROBES,
  thresholds = DEFAULT_THRESHOLDS,
  timeoutMs = 8_000,
}) {
  const normalizedOrigin = normalizeOrigin(origin);
  const checks = new Array(probes.length);
  let cursor = 0;
  const workerCount = Math.min(
    probes.length,
    Math.max(1, Math.floor(concurrency)),
  );

  async function worker() {
    while (cursor < probes.length) {
      const index = cursor;
      cursor += 1;
      checks[index] = await runHttpProbe({
        fetchImpl,
        normalizedOrigin,
        now,
        probe: probes[index],
        thresholds,
        timeoutMs,
      });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return checks;
}

async function runHttpProbe({
  fetchImpl,
  normalizedOrigin,
  now,
  probe,
  thresholds,
  timeoutMs,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = now();

  try {
    const response = await fetchImpl(`${normalizedOrigin}${probe.path}`, {
      cache: "no-store",
      headers: { "user-agent": "nuang-production-monitor/1.0" },
      redirect: "manual",
      signal: controller.signal,
    });
    const headersAt = now();
    const validation = await validateResponseBody(response, probe.kind);
    const completedAt = now();
    const ttfbMs = Math.round(headersAt - startedAt);
    const totalMs = Math.round(completedAt - startedAt);
    const statusMatches = response.status === probe.status;
    const cacheControl = response.headers.get("cache-control") ?? "";
    const cacheMatches =
      !probe.cacheNoStore || cacheControl.toLowerCase().includes("no-store");
    const latencyStatus = classifyUpperBound(
      totalMs,
      thresholds.httpWarnMs,
      thresholds.httpFailMs,
    );
    const status =
      !statusMatches || !cacheMatches || !validation.ok
        ? "fail"
        : latencyStatus;

    return {
      detail: [
        `http=${response.status}`,
        `ttfb=${ttfbMs}ms`,
        `total=${totalMs}ms`,
        validation.detail,
        probe.cacheNoStore
          ? `cache=${cacheMatches ? "no-store" : "unsafe"}`
          : null,
      ]
        .filter(Boolean)
        .join(" "),
      id: `http:${probe.id}`,
      status,
      totalMs,
      ttfbMs,
    };
  } catch (error) {
    return {
      detail: `request failed (${safeErrorCode(error)})`,
      id: `http:${probe.id}`,
      status: "fail",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function evaluateDatabaseSnapshot(
  snapshot,
  { now = new Date(), thresholds = DEFAULT_THRESHOLDS } = {},
) {
  const checks = [];
  const databaseBytes = toFiniteNumber(snapshot.capacity.databaseBytes);
  const connectionCount = toFiniteNumber(snapshot.capacity.connectionCount);
  const maxConnections = toFiniteNumber(snapshot.capacity.maxConnections);
  const connectionRatio =
    maxConnections > 0 ? connectionCount / maxConnections : 1;

  checks.push({
    detail: `transaction_read_only=${Boolean(snapshot.capacity.transactionReadOnly)}`,
    id: "database:read-only-guard",
    status: snapshot.capacity.transactionReadOnly ? "pass" : "fail",
  });
  checks.push({
    detail: `${formatBytes(databaseBytes)} / ${formatBytes(thresholds.databaseQuotaBytes)}`,
    id: "database:size",
    status: classifyUpperBound(
      databaseBytes,
      thresholds.databaseWarnBytes,
      thresholds.databaseFailBytes,
    ),
    value: databaseBytes,
  });
  checks.push({
    detail: `${connectionCount}/${maxConnections} (${Math.round(connectionRatio * 100)}%)`,
    id: "database:connections",
    status: classifyUpperBound(
      connectionRatio,
      thresholds.databaseConnectionWarnRatio,
      thresholds.databaseConnectionFailRatio,
    ),
    value: connectionRatio,
  });
  checks.push({
    detail: formatBytes(toFiniteNumber(snapshot.capacity.cronHistoryBytes)),
    id: "database:cron-history-size",
    status: "pass",
  });

  checks.push(evaluateCronInventory(snapshot.cronJobs));

  for (const job of snapshot.cronJobs) {
    const recentFailures = toFiniteNumber(job.recentFailures);
    const stuckRuns = toFiniteNumber(job.stuckRuns);
    const maxDurationMs = toFiniteNumber(job.maxDurationMs);
    const frequent = job.schedule === "* * * * *";
    const lastSuccessAgeMs = ageMs(job.lastSuccessAt, now);
    const lastRunAgeMs = ageMs(job.lastRunAt, now);
    const lastRunStatus = job.lastRunStatus ?? "never";
    let status = "pass";

    if (recentFailures > 0) status = "warn";
    if (
      !job.active ||
      stuckRuns > 0 ||
      !["running", "succeeded"].includes(lastRunStatus)
    ) {
      status = "fail";
    }
    if (
      frequent &&
      (!Number.isFinite(lastSuccessAgeMs) ||
        lastSuccessAgeMs > thresholds.frequentCronMaxAgeMs)
    ) {
      status = "fail";
    }
    if (
      !frequent &&
      (!Number.isFinite(lastSuccessAgeMs) ||
        lastSuccessAgeMs > thresholds.dailyCronMaxAgeMs)
    ) {
      status = "fail";
    }
    status = maxStatus(
      status,
      classifyUpperBound(
        maxDurationMs,
        thresholds.recentCronWarnMs,
        thresholds.recentCronFailMs,
      ),
    );

    checks.push({
      detail: [
        `active=${Boolean(job.active)}`,
        `runs=${toFiniteNumber(job.recentRuns)}`,
        `failures=${recentFailures}`,
        `stuck=${stuckRuns}`,
        `max=${Math.round(maxDurationMs)}ms`,
        `last_status=${lastRunStatus}`,
        `last_run_age=${formatDuration(lastRunAgeMs)}`,
        frequent
          ? `last_success_age=${formatDuration(lastSuccessAgeMs)}`
          : `schedule=${job.schedule}`,
      ].join(" "),
      id: `cron:${job.jobname}`,
      status,
    });
  }

  checks.push(
    evaluateQueue(
      "queue:advertising",
      {
        dueCount: snapshot.queues.advertisingDue,
        oldestDueAt: snapshot.queues.advertisingOldestDueAt,
        recentTerminalFailures: snapshot.queues.advertisingRecentDead,
        staleCount: snapshot.queues.advertisingStale,
      },
      now,
      thresholds,
    ),
    evaluateQueue(
      "queue:marketing-campaign",
      {
        dueCount: snapshot.queues.marketingCampaignDue,
        oldestDueAt: snapshot.queues.marketingCampaignOldestDueAt,
        recentTerminalFailures: snapshot.queues.marketingCampaignRecentFailed,
        staleCount: snapshot.queues.marketingCampaignStale,
        suppressedReason: marketingSuppressionReason(snapshot.queues),
      },
      now,
      thresholds,
    ),
    evaluateQueue(
      "queue:marketing-confirmation",
      {
        dueCount: snapshot.queues.marketingConfirmationDue,
        oldestDueAt: snapshot.queues.marketingConfirmationOldestDueAt,
        recentTerminalFailures:
          snapshot.queues.marketingConfirmationRecentFailed,
        staleCount: snapshot.queues.marketingConfirmationStale,
        suppressedReason: marketingSuppressionReason(snapshot.queues),
      },
      now,
      thresholds,
    ),
    evaluateQueue(
      "queue:official-content-publish",
      {
        dueCount: snapshot.queues.communityPublishDue,
        oldestDueAt: snapshot.queues.communityPublishOldestDueAt,
        recentTerminalFailures: 0,
        staleCount: 0,
      },
      now,
      thresholds,
    ),
    evaluateQueue(
      "queue:official-content-close",
      {
        dueCount: snapshot.queues.communityCloseDue,
        oldestDueAt: snapshot.queues.communityCloseOldestDueAt,
        recentTerminalFailures: 0,
        staleCount: 0,
      },
      now,
      thresholds,
    ),
  );
  checks.push({
    detail: `total=${toFiniteNumber(snapshot.tombstones.total)} recent=${toFiniteNumber(snapshot.tombstones.recent)}`,
    id: "result-deletion:tombstones",
    status: "pass",
  });

  const mediaActiveBytes = toFiniteNumber(snapshot.mediaStorage.activeBytes);
  const mediaReservedBytes = toFiniteNumber(
    snapshot.mediaStorage.reservedBytes,
  );
  const mediaCleanupBytes = toFiniteNumber(snapshot.mediaStorage.cleanupBytes);
  const mediaMaxManagedBytes = toFiniteNumber(
    snapshot.mediaStorage.maxManagedBytes,
  );
  const mediaManagedBytes =
    mediaActiveBytes + mediaReservedBytes + mediaCleanupBytes;
  const mediaManagedRatio =
    mediaMaxManagedBytes > 0
      ? mediaManagedBytes / mediaMaxManagedBytes
      : Number.POSITIVE_INFINITY;
  checks.push({
    detail: `${formatBytes(mediaManagedBytes)} / ${formatBytes(mediaMaxManagedBytes)} (${Math.round(mediaManagedRatio * 100)}%) active=${formatBytes(mediaActiveBytes)} reserved=${formatBytes(mediaReservedBytes)} cleanup=${formatBytes(mediaCleanupBytes)}`,
    id: "storage:r2-managed-capacity",
    status: classifyUpperBound(
      mediaManagedRatio,
      thresholds.mediaStorageWarnRatio,
      thresholds.mediaStorageFailRatio,
    ),
    value: mediaManagedRatio,
  });
  const mediaCleanupPending = toFiniteNumber(
    snapshot.mediaStorage.cleanupPending,
  );
  const mediaCleanupAgeMs = ageMs(snapshot.mediaStorage.cleanupOldestAt, now);
  checks.push({
    detail: `pending=${mediaCleanupPending}${
      mediaCleanupPending > 0
        ? ` oldest_age=${formatDuration(mediaCleanupAgeMs)}`
        : ""
    }`,
    id: "storage:media-cleanup",
    status:
      mediaCleanupPending === 0
        ? "pass"
        : mediaCleanupAgeMs > thresholds.mediaCleanupFailAgeMs
          ? "fail"
          : "warn",
  });
  const pendingUploadCount = toFiniteNumber(
    snapshot.mediaStorage.pendingUploadCount,
  );
  const pendingUploadAgeMs = ageMs(
    snapshot.mediaStorage.pendingUploadOldestAt,
    now,
  );
  checks.push({
    detail: `pending=${pendingUploadCount}${
      pendingUploadCount > 0
        ? ` oldest_age=${formatDuration(pendingUploadAgeMs)}`
        : ""
    }`,
    id: "storage:media-upload-pending",
    status:
      pendingUploadCount === 0
        ? "pass"
        : pendingUploadAgeMs > thresholds.mediaPendingUploadFailAgeMs
          ? "fail"
          : "warn",
  });

  return checks;
}

export function createHealthReport(checks, checkedAt = new Date()) {
  const counts = { fail: 0, pass: 0, warn: 0 };
  for (const check of checks) counts[check.status] += 1;

  return {
    checkedAt: checkedAt.toISOString(),
    checks,
    counts,
    status: counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "pass",
  };
}

export function formatHealthReport(report) {
  const lines = [`NUANG production health: ${report.status.toUpperCase()}`];
  for (const check of report.checks) {
    lines.push(`${check.status.toUpperCase()} ${check.id} - ${check.detail}`);
  }
  lines.push(
    `summary: pass=${report.counts.pass} warn=${report.counts.warn} fail=${report.counts.fail}`,
  );
  return lines.join("\n");
}

export function normalizeOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" && !isLocalHttp(url)) {
    throw new Error("monitor origin must use HTTPS outside localhost");
  }
  return url.origin;
}

function evaluateQueue(id, queue, now, thresholds) {
  const dueCount = toFiniteNumber(queue.dueCount);
  const staleCount = toFiniteNumber(queue.staleCount);
  const recentTerminalFailures = toFiniteNumber(queue.recentTerminalFailures);
  const oldestAgeMs = ageMs(queue.oldestDueAt, now);
  let status = "pass";

  if (!queue.suppressedReason && dueCount > 0) status = "warn";
  if (staleCount > 0 || recentTerminalFailures > 0) {
    status = "fail";
  }
  if (
    !queue.suppressedReason &&
    dueCount > 0 &&
    oldestAgeMs > thresholds.queueMaxAgeMs
  ) {
    status = "fail";
  }

  return {
    detail: [
      `due=${dueCount}`,
      `stale=${staleCount}`,
      `recent_terminal_failures=${recentTerminalFailures}`,
      dueCount > 0 ? `oldest_due_age=${formatDuration(oldestAgeMs)}` : null,
      queue.suppressedReason ? `suppressed=${queue.suppressedReason}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    id,
    status,
  };
}

function evaluateCronInventory(cronJobs) {
  const missing = [];
  const duplicates = [];
  const scheduleMismatches = [];
  const unexpected = cronJobs
    .map((job) => job.jobname)
    .filter((jobname) => !(jobname in EXPECTED_CRON_SCHEDULES));
  for (const [jobname, schedule] of Object.entries(EXPECTED_CRON_SCHEDULES)) {
    const matching = cronJobs.filter((job) => job.jobname === jobname);
    if (matching.length === 0) missing.push(jobname);
    if (matching.length > 1) duplicates.push(jobname);
    if (matching.some((job) => job.schedule !== schedule)) {
      scheduleMismatches.push(jobname);
    }
  }

  const status =
    missing.length > 0 ||
    duplicates.length > 0 ||
    scheduleMismatches.length > 0 ||
    unexpected.length > 0
      ? "fail"
      : "pass";

  return {
    detail: [
      `expected=${Object.keys(EXPECTED_CRON_SCHEDULES).length}`,
      `actual=${cronJobs.length}`,
      missing.length > 0 ? `missing=${missing.join(",")}` : null,
      duplicates.length > 0 ? `duplicates=${duplicates.join(",")}` : null,
      scheduleMismatches.length > 0
        ? `schedule_mismatch=${scheduleMismatches.join(",")}`
        : null,
      unexpected.length > 0 ? `unexpected=${unexpected.join(",")}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    id: "cron:inventory",
    status,
  };
}

function marketingSuppressionReason(queues) {
  if (!queues.marketingWindowOpen) return "outside_delivery_window";
  if (queues.marketingEmergencyPaused) return "emergency_paused";
  return null;
}

async function validateResponseBody(response, kind) {
  if (kind === "feed-json") {
    const payload = await response.json().catch(() => null);
    return {
      detail: Array.isArray(payload?.result?.items)
        ? `items=${payload.result.items.length}`
        : "invalid_feed_payload",
      ok: Array.isArray(payload?.result?.items),
    };
  }

  const body = await response.text().catch(() => "");
  if (kind === "html") {
    return {
      detail: `bytes=${Buffer.byteLength(body)}`,
      ok: body.length >= 500 && /<!doctype html/i.test(body),
    };
  }
  return { detail: null, ok: body.length >= 0 };
}

function isLocalHttp(url) {
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
}

function classifyUpperBound(value, warnAt, failAt) {
  if (!Number.isFinite(value) || value >= failAt) return "fail";
  if (value >= warnAt) return "warn";
  return "pass";
}

function maxStatus(left, right) {
  const weight = { fail: 2, pass: 0, warn: 1 };
  return weight[left] >= weight[right] ? left : right;
}

function ageMs(value, now) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp)
    ? Math.max(0, now.getTime() - timestamp)
    : Number.POSITIVE_INFINITY;
}

function toFiniteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeErrorCode(error) {
  if (error?.name === "AbortError") return "timeout";
  return typeof error?.code === "string" ? error.code : "unavailable";
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return "unknown";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${amount.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}

function formatDuration(value) {
  if (!Number.isFinite(value)) return "never";
  if (value < 1_000) return `${Math.round(value)}ms`;
  if (value < 60_000) return `${Math.round(value / 1_000)}s`;
  return `${Math.round(value / 60_000)}m`;
}
