import { createHmac } from "node:crypto";

const CLOUDFLARE_GRAPHQL_ENDPOINT =
  "https://api.cloudflare.com/client/v4/graphql";
const CLOUDFLARE_REST_API_ORIGIN = "https://api.cloudflare.com";
const EXPECTED_DELIVERY_ORIGIN = "https://media.nuang.app";
const EXPECTED_ABSENT_OBJECT_KEY =
  "health/v1/nuang-r2-delivery-boundary-expected-absent.webp";

export const R2_FREE_TIER = Object.freeze({
  classARequests: 1_000_000,
  classBRequests: 10_000_000,
  storageBytes: 10_000_000_000,
});

export const R2_USAGE_THRESHOLDS = Object.freeze({
  analyticsMaxAgeMs: 6 * 60 * 60 * 1000,
  failRatio: 0.85,
  ledgerFailDriftBytes: 100_000_000,
  ledgerWarnDriftBytes: 500_000,
  unauthorizedFailRequests: 10_000,
  unauthorizedWarnRequests: 100,
  warnRatio: 0.7,
});

const CLASS_A_ACTIONS = new Set([
  "CompleteMultipartUpload",
  "CopyObject",
  "CreateMultipartUpload",
  "LifecycleStorageTierTransition",
  "ListBuckets",
  "ListMultipartUploads",
  "ListObjects",
  "ListParts",
  "PutBucket",
  "PutBucketCors",
  "PutBucketEncryption",
  "PutBucketLifecycleConfiguration",
  "PutObject",
  "UploadPart",
  "UploadPartCopy",
]);

const CLASS_B_ACTIONS = new Set([
  "GetBucketCors",
  "GetBucketEncryption",
  "GetBucketLifecycleConfiguration",
  "GetBucketLocation",
  "GetObject",
  "HeadBucket",
  "HeadObject",
  "UsageSummary",
]);

const FREE_ACTIONS = new Set([
  "AbortMultipartUpload",
  "DeleteBucket",
  "DeleteObject",
]);

const R2_USAGE_QUERY = `
  query NuangR2Usage(
    $accountTag: string!
    $startDate: Time
    $endDate: Time
    $bucketName: string
  ) {
    viewer {
      accounts(filter: { accountTag: $accountTag }) {
        operations: r2OperationsAdaptiveGroups(
          limit: 10000
          filter: {
            datetime_geq: $startDate
            datetime_leq: $endDate
          }
        ) {
          sum { requests }
          dimensions { actionType actionStatus responseStatusCode }
        }
        storage: r2StorageAdaptiveGroups(
          limit: 1
          filter: {
            datetime_geq: $startDate
            datetime_leq: $endDate
            bucketName: $bucketName
          }
          orderBy: [datetime_DESC]
        ) {
          max { objectCount uploadCount payloadSize metadataSize }
          dimensions { datetime }
        }
      }
    }
  }
`;

export async function readCloudflareR2Usage({
  accountId,
  apiToken,
  bucketName,
  fetchImpl = fetch,
  now = new Date(),
  timeoutMs = 5_000,
}) {
  validateConfiguration({ accountId, apiToken, bucketName });
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw monitorError("invalid_time");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  // Cloudflare allowances follow the account billing cycle, not a calendar
  // month. Analytics retains 31 days, so this rolling window is a conservative
  // upper bound that cannot undercount the active billing period.
  const usageWindowStart = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);

  try {
    const authorization = `Bearer ${apiToken}`;
    const accountMetricsUrl = new URL(
      `/client/v4/accounts/${accountId}/r2/metrics`,
      CLOUDFLARE_REST_API_ORIGIN,
    );
    const [analyticsResponse, accountMetricsResponse] = await Promise.all([
      fetchImpl(CLOUDFLARE_GRAPHQL_ENDPOINT, {
        body: JSON.stringify({
          query: R2_USAGE_QUERY,
          variables: {
            accountTag: accountId,
            bucketName,
            endDate: now.toISOString(),
            startDate: usageWindowStart.toISOString(),
          },
        }),
        cache: "no-store",
        headers: {
          authorization,
          "content-type": "application/json",
        },
        method: "POST",
        signal: controller.signal,
      }),
      fetchImpl(accountMetricsUrl, {
        cache: "no-store",
        headers: {
          authorization,
          accept: "application/json",
        },
        method: "GET",
        redirect: "error",
        signal: controller.signal,
      }),
    ]);
    const [analyticsPayload, accountMetricsPayload] = await Promise.all([
      readBoundedJson(analyticsResponse, 256 * 1024),
      readBoundedJson(accountMetricsResponse, 64 * 1024),
    ]);
    if (!analyticsResponse.ok) {
      throw monitorError(`analytics_http_${analyticsResponse.status}`);
    }
    if (!accountMetricsResponse.ok) {
      throw monitorError(
        `account_metrics_http_${accountMetricsResponse.status}`,
      );
    }
    if (
      !analyticsPayload ||
      !Array.isArray(analyticsPayload?.data?.viewer?.accounts)
    ) {
      throw monitorError("invalid_payload");
    }
    if (
      Array.isArray(analyticsPayload.errors) &&
      analyticsPayload.errors.length > 0
    ) {
      throw monitorError("graphql_error");
    }

    const account = analyticsPayload.data.viewer.accounts[0];
    if (!account || !Array.isArray(account.operations)) {
      throw monitorError("account_unavailable");
    }

    const operations = summarizeOperations(account.operations);
    const storage = summarizeStorage(account.storage);
    const accountStorage = summarizeAccountStorage(accountMetricsPayload);
    return {
      ...operations,
      ...storage,
      ...accountStorage,
      periodEnd: now.toISOString(),
      periodStart: usageWindowStart.toISOString(),
      windowDays: 31,
    };
  } catch (error) {
    if (error?.name === "AbortError") throw monitorError("timeout");
    throw error?.code ? error : monitorError("unavailable");
  } finally {
    controller.abort();
    clearTimeout(timeout);
  }
}

export async function probeCloudflareR2Delivery({
  fetchImpl = fetch,
  now = new Date(),
  origin,
  signingSecret,
  timeoutMs = 5_000,
}) {
  if (origin !== EXPECTED_DELIVERY_ORIGIN) {
    throw monitorError("invalid_delivery_origin");
  }
  if (typeof signingSecret !== "string" || signingSecret.length < 32) {
    throw monitorError("invalid_delivery_secret");
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw monitorError("invalid_time");
  }

  const expiresAt = Math.floor(now.getTime() / 1000) + 5 * 60;
  const pathname = `/${EXPECTED_ABSENT_OBJECT_KEY}`;
  const signature = createHmac("sha256", signingSecret)
    .update(`nuang:feed-media-delivery:v1\n${pathname}\n${expiresAt}\nprivate`)
    .digest("base64url");
  const url = new URL(pathname, `${origin}/`);
  url.searchParams.set("v", "1");
  url.searchParams.set("exp", String(expiresAt));
  url.searchParams.set("mode", "private");
  url.searchParams.set("sig", signature);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      headers: { accept: "image/webp" },
      method: "GET",
      redirect: "error",
      signal: controller.signal,
    });
    await response.body?.cancel().catch(() => undefined);
    if (response.status !== 404) {
      throw monitorError(`delivery_http_${response.status}`);
    }
    const cacheControl = response.headers.get("cache-control")?.toLowerCase();
    if (!cacheControl?.includes("no-store")) {
      throw monitorError("delivery_cache_unsafe");
    }
    if (
      response.headers.get("cross-origin-resource-policy")?.toLowerCase() !==
      "same-site"
    ) {
      throw monitorError("delivery_corp_unsafe");
    }
    return {
      detail:
        "http=404 signed_private_absence=true cache=no-store corp=same-site",
      id: "storage:r2-delivery-boundary",
      status: "pass",
    };
  } catch (error) {
    if (error?.name === "AbortError") throw monitorError("delivery_timeout");
    throw error?.code ? error : monitorError("delivery_unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

export function evaluateCloudflareR2Usage(
  usage,
  {
    ledgerActiveBytes = 0,
    ledgerCleanupBytes = 0,
    ledgerStableActiveBytes = 0,
    now = new Date(),
    thresholds = R2_USAGE_THRESHOLDS,
  } = {},
) {
  const accountInfrequentAccessMetricsValid =
    isFiniteNonNegativeMetric(usage.accountInfrequentAccessBytes) &&
    isFiniteNonNegativeMetric(usage.accountInfrequentAccessObjects);
  const accountStandardMetricsValid =
    isFiniteNonNegativeMetric(usage.accountStandardBytes) &&
    isFiniteNonNegativeMetric(usage.accountStandardObjects);
  const accountInfrequentAccessBytes = finiteNonNegative(
    usage.accountInfrequentAccessBytes,
  );
  const accountInfrequentAccessObjects = finiteNonNegative(
    usage.accountInfrequentAccessObjects,
  );
  const accountStandardBytes = finiteNonNegative(usage.accountStandardBytes);
  const accountStandardObjects = finiteNonNegative(
    usage.accountStandardObjects,
  );
  const bucketStorageBytes = finiteNonNegative(usage.bucketStorageBytes);
  const classARequests = finiteNonNegative(usage.classARequests);
  const classBRequests = finiteNonNegative(usage.classBRequests);
  const observedAt = new Date(usage.observedAt ?? "");
  const observedAgeMs = Number.isFinite(observedAt.getTime())
    ? Math.max(0, now.getTime() - observedAt.getTime())
    : Number.POSITIVE_INFINITY;
  const activeBytes = finiteNonNegative(ledgerActiveBytes);
  const cleanupBytes = finiteNonNegative(ledgerCleanupBytes);
  const stableActiveBytes = finiteNonNegative(ledgerStableActiveBytes);
  const providerUntrackedBytes = Math.max(
    0,
    bucketStorageBytes - activeBytes - cleanupBytes,
  );
  const providerMissingStableBytes = Math.max(
    0,
    stableActiveBytes - bucketStorageBytes,
  );
  const driftBytes = Math.max(
    providerUntrackedBytes,
    providerMissingStableBytes,
  );
  const driftFailAt = Math.max(
    thresholds.ledgerFailDriftBytes,
    stableActiveBytes * 0.1,
  );

  return [
    usageCheck({
      id: "storage:r2-provider-capacity",
      quota: R2_FREE_TIER.storageBytes,
      thresholds,
      unit: "bytes",
      value: accountStandardMetricsValid
        ? accountStandardBytes
        : Number.POSITIVE_INFINITY,
      suffix: `account_objects=${accountStandardObjects}`,
    }),
    {
      detail: `${formatBytes(accountInfrequentAccessBytes)} objects=${accountInfrequentAccessObjects} free_tier=false`,
      id: "storage:r2-infrequent-access",
      status:
        !accountInfrequentAccessMetricsValid ||
        accountInfrequentAccessBytes > 0 ||
        accountInfrequentAccessObjects > 0
          ? "fail"
          : "pass",
    },
    usageCheck({
      id: "storage:r2-class-a-month",
      quota: R2_FREE_TIER.classARequests,
      thresholds,
      unit: "requests",
      value: classARequests,
    }),
    usageCheck({
      id: "storage:r2-class-b-month",
      quota: R2_FREE_TIER.classBRequests,
      thresholds,
      unit: "requests",
      value: classBRequests,
    }),
    {
      detail: `unknown_requests=${finiteNonNegative(usage.unknownRequests)} unknown_types=${finiteNonNegative(usage.unknownActionTypeCount)}`,
      id: "storage:r2-operation-contract",
      status:
        finiteNonNegative(usage.unknownRequests) > 0 ||
        finiteNonNegative(usage.unknownActionTypeCount) > 0
          ? "fail"
          : "pass",
    },
    {
      detail: `requests=${finiteNonNegative(usage.unauthorizedRequests)}`,
      id: "storage:r2-unauthorized-requests",
      status:
        finiteNonNegative(usage.unauthorizedRequests) >=
        thresholds.unauthorizedFailRequests
          ? "fail"
          : finiteNonNegative(usage.unauthorizedRequests) >=
              thresholds.unauthorizedWarnRequests
            ? "warn"
            : "pass",
    },
    {
      detail: `observed_age=${formatDuration(observedAgeMs)}`,
      id: "storage:r2-analytics-freshness",
      status:
        Number.isFinite(observedAgeMs) &&
        observedAgeMs <= thresholds.analyticsMaxAgeMs
          ? "pass"
          : "fail",
    },
    {
      detail: `bucket=${formatBytes(bucketStorageBytes)} bucket_objects=${finiteNonNegative(usage.bucketObjectCount)} bucket_uploads=${finiteNonNegative(usage.bucketUploadCount)} ledger_active=${formatBytes(activeBytes)} ledger_cleanup=${formatBytes(cleanupBytes)} ledger_stable=${formatBytes(stableActiveBytes)} untracked=${formatBytes(providerUntrackedBytes)} missing_stable=${formatBytes(providerMissingStableBytes)}`,
      id: "storage:r2-ledger-drift",
      status:
        driftBytes >= driftFailAt
          ? "fail"
          : driftBytes >= thresholds.ledgerWarnDriftBytes
            ? "warn"
            : "pass",
    },
  ];
}

function validateConfiguration({ accountId, apiToken, bucketName }) {
  if (typeof accountId !== "string" || !/^[a-f0-9]{32}$/i.test(accountId)) {
    throw monitorError("invalid_account_id");
  }
  if (
    typeof bucketName !== "string" ||
    !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/.test(bucketName)
  ) {
    throw monitorError("invalid_bucket_name");
  }
  if (typeof apiToken !== "string" || apiToken.trim().length < 20) {
    throw monitorError("invalid_api_token");
  }
}

function summarizeOperations(rows) {
  let classARequests = 0;
  let classBRequests = 0;
  let freeRequests = 0;
  let unauthorizedRequests = 0;
  let unknownRequests = 0;
  const unknownActionTypes = new Set();

  for (const row of rows) {
    const actionType = row?.dimensions?.actionType;
    const requests = readNonNegativeMetric(row?.sum?.requests);
    const responseStatusCode = Number(row?.dimensions?.responseStatusCode);
    if (responseStatusCode === 401) {
      unauthorizedRequests += requests;
      continue;
    }
    if (CLASS_A_ACTIONS.has(actionType)) classARequests += requests;
    else if (CLASS_B_ACTIONS.has(actionType)) classBRequests += requests;
    else if (FREE_ACTIONS.has(actionType)) freeRequests += requests;
    else {
      unknownRequests += requests;
      unknownActionTypes.add(
        typeof actionType === "string" ? actionType : "invalid",
      );
    }
  }

  return {
    classARequests,
    classBRequests,
    freeRequests,
    unauthorizedRequests,
    unknownActionTypeCount: unknownActionTypes.size,
    unknownRequests,
  };
}

function summarizeStorage(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      bucketMetadataBytes: 0,
      bucketObjectCount: 0,
      bucketPayloadBytes: 0,
      bucketStorageBytes: 0,
      bucketUploadCount: 0,
      observedAt: null,
    };
  }

  const row = rows[0];
  const payloadBytes = readNonNegativeMetric(row?.max?.payloadSize);
  const metadataBytes = readNonNegativeMetric(row?.max?.metadataSize);
  return {
    bucketMetadataBytes: metadataBytes,
    bucketObjectCount: readNonNegativeMetric(row?.max?.objectCount),
    bucketPayloadBytes: payloadBytes,
    bucketStorageBytes: payloadBytes + metadataBytes,
    bucketUploadCount: readNonNegativeMetric(row?.max?.uploadCount),
    observedAt:
      typeof row?.dimensions?.datetime === "string"
        ? row.dimensions.datetime
        : null,
  };
}

function summarizeAccountStorage(payload) {
  if (
    !isRecord(payload) ||
    payload.success !== true ||
    !isRecord(payload.result) ||
    (payload.errors !== undefined && !Array.isArray(payload.errors)) ||
    (Array.isArray(payload.errors) && payload.errors.length > 0)
  ) {
    throw monitorError("invalid_account_metrics_payload");
  }

  const standard = summarizeAccountStorageClass(payload.result.standard);
  const infrequentAccess = summarizeAccountStorageClass(
    payload.result.infrequentAccess,
  );
  return {
    accountInfrequentAccessBytes: infrequentAccess.storageBytes,
    accountInfrequentAccessObjects: infrequentAccess.objects,
    accountStandardBytes: standard.storageBytes,
    accountStandardObjects: standard.objects,
  };
}

function summarizeAccountStorageClass(value) {
  if (value === undefined) return { objects: 0, storageBytes: 0 };
  if (!isRecord(value)) {
    throw monitorError("invalid_account_metrics");
  }

  const published = summarizeAccountStorageState(value.published);
  const uploaded = summarizeAccountStorageState(value.uploaded);
  return {
    objects: sumAccountMetrics(published.objects, uploaded.objects),
    storageBytes: sumAccountMetrics(
      published.storageBytes,
      uploaded.storageBytes,
    ),
  };
}

function summarizeAccountStorageState(value) {
  if (value === undefined) return { objects: 0, storageBytes: 0 };
  if (!isRecord(value)) {
    throw monitorError("invalid_account_metrics");
  }

  const metadataBytes = readOptionalNonNegativeMetric(value.metadataSize);
  const payloadBytes = readOptionalNonNegativeMetric(value.payloadSize);
  return {
    objects: readOptionalNonNegativeMetric(value.objects),
    storageBytes: sumAccountMetrics(metadataBytes, payloadBytes),
  };
}

function sumAccountMetrics(...values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total < 0) {
    throw monitorError("invalid_account_metrics");
  }
  return total;
}

function usageCheck({ id, quota, suffix = "", thresholds, unit, value }) {
  const ratio = quota > 0 ? value / quota : Number.POSITIVE_INFINITY;
  return {
    detail: `${unit === "bytes" ? formatBytes(value) : Math.round(value)} / ${
      unit === "bytes" ? formatBytes(quota) : quota
    } (${Math.round(ratio * 100)}%)${suffix ? ` ${suffix}` : ""}`,
    id,
    status:
      !Number.isFinite(ratio) || ratio >= thresholds.failRatio
        ? "fail"
        : ratio >= thresholds.warnRatio
          ? "warn"
          : "pass",
    value: ratio,
  };
}

async function readBoundedJson(response, maxBytes) {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) {
    throw monitorError("response_too_large");
  }
  if (!response.body?.getReader) {
    const text = await response.text();
    if (Buffer.byteLength(text) > maxBytes) {
      throw monitorError("response_too_large");
    }
    return parseJson(text);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw monitorError("response_too_large");
    }
    chunks.push(value);
  }
  const combined = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  return parseJson(combined.toString("utf8"));
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw monitorError("invalid_json");
  }
}

function monitorError(code) {
  return Object.assign(new Error("Cloudflare R2 usage probe failed"), { code });
}

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function isFiniteNonNegativeMetric(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function readNonNegativeMetric(value) {
  if (typeof value !== "number") {
    throw monitorError("invalid_metrics");
  }
  if (!Number.isFinite(value) || value < 0) {
    throw monitorError("invalid_metrics");
  }
  return value;
}

function readOptionalNonNegativeMetric(value) {
  if (value === undefined) return 0;
  if (typeof value !== "number") {
    throw monitorError("invalid_account_metrics");
  }
  if (!Number.isFinite(value) || value < 0) {
    throw monitorError("invalid_account_metrics");
  }
  return value;
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatBytes(value) {
  if (!Number.isFinite(value)) return "unknown";
  const units = ["B", "KB", "MB", "GB"];
  let amount = value;
  let unitIndex = 0;
  while (amount >= 1000 && unitIndex < units.length - 1) {
    amount /= 1000;
    unitIndex += 1;
  }
  return `${amount.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
}

function formatDuration(value) {
  if (!Number.isFinite(value)) return "never";
  if (value < 60_000) return `${Math.round(value / 1000)}s`;
  if (value < 60 * 60 * 1000) return `${Math.round(value / 60_000)}m`;
  return `${Math.round(value / (60 * 60 * 1000))}h`;
}
