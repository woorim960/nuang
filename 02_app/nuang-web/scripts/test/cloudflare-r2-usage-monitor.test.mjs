import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateCloudflareR2Usage,
  probeCloudflareR2Delivery,
  readCloudflareR2Usage,
} from "../lib/cloudflare-r2-usage-monitor.mjs";

const validConfiguration = {
  accountId: "a".repeat(32),
  apiToken: "analytics-token-with-safe-length",
  bucketName: "nuang-feed-media",
};

const emptyAccountMetricsPayload = {
  errors: [],
  result: {
    infrequentAccess: {
      published: { metadataSize: 0, objects: 0, payloadSize: 0 },
      uploaded: { metadataSize: 0, objects: 0, payloadSize: 0 },
    },
    standard: {
      published: { metadataSize: 0, objects: 0, payloadSize: 0 },
      uploaded: { metadataSize: 0, objects: 0, payloadSize: 0 },
    },
  },
  success: true,
};

const emptyAnalyticsPayload = {
  data: {
    viewer: {
      accounts: [
        {
          operations: [],
          storage: [
            {
              dimensions: { datetime: "2026-08-15T09:00:00.000Z" },
              max: {
                metadataSize: 0,
                objectCount: 0,
                payloadSize: 0,
                uploadCount: 0,
              },
            },
          ],
        },
      ],
    },
  },
};

function createCloudflareFetch({
  accountMetricsPayload = emptyAccountMetricsPayload,
  analyticsPayload,
  requests = [],
}) {
  return async (url, options) => {
    const href = String(url);
    requests.push({ options, url: href });
    if (href.endsWith(`/accounts/${validConfiguration.accountId}/r2/metrics`)) {
      return Response.json(accountMetricsPayload);
    }
    if (href === "https://api.cloudflare.com/client/v4/graphql") {
      return Response.json(analyticsPayload);
    }
    throw new Error("unexpected Cloudflare URL");
  };
}

test("R2 delivery boundary verifies a signed private 404 without exposing its URL", async () => {
  let requestedUrl;
  const check = await probeCloudflareR2Delivery({
    fetchImpl: async (url) => {
      requestedUrl = new URL(url);
      return new Response(null, {
        headers: {
          "cache-control": "private, no-store",
          "cross-origin-resource-policy": "same-site",
        },
        status: 404,
      });
    },
    now: new Date("2026-08-15T09:30:00.000Z"),
    origin: "https://media.nuang.app",
    signingSecret: "delivery-secret".repeat(4),
  });

  assert.equal(requestedUrl.origin, "https://media.nuang.app");
  assert.equal(requestedUrl.searchParams.get("mode"), "private");
  assert.equal(requestedUrl.searchParams.get("v"), "1");
  assert.ok(requestedUrl.searchParams.get("sig")?.length > 30);
  assert.deepEqual(check, {
    detail:
      "http=404 signed_private_absence=true cache=no-store corp=same-site",
    id: "storage:r2-delivery-boundary",
    status: "pass",
  });
  assert.equal(JSON.stringify(check).includes("sig="), false);
});

test("R2 delivery boundary fails closed on status and security headers", async () => {
  await assert.rejects(
    probeCloudflareR2Delivery({
      fetchImpl: async () => new Response(null, { status: 200 }),
      origin: "https://media.nuang.app",
      signingSecret: "delivery-secret".repeat(4),
    }),
    (error) => error.code === "delivery_http_200",
  );

  await assert.rejects(
    probeCloudflareR2Delivery({
      fetchImpl: async () =>
        new Response(null, {
          headers: {
            "cache-control": "private, no-store",
            "cross-origin-resource-policy": "cross-origin",
          },
          status: 404,
        }),
      origin: "https://media.nuang.app",
      signingSecret: "delivery-secret".repeat(4),
    }),
    (error) => error.code === "delivery_corp_unsafe",
  );
});

test("R2 analytics reads a conservative 31-day account window without exposing credentials", async () => {
  const requests = [];
  const usage = await readCloudflareR2Usage({
    ...validConfiguration,
    fetchImpl: createCloudflareFetch({
      accountMetricsPayload: {
        errors: [],
        result: {
          infrequentAccess: {
            published: { metadataSize: 5, objects: 1, payloadSize: 45 },
            uploaded: { metadataSize: 0, objects: 2, payloadSize: 50 },
          },
          standard: {
            published: {
              metadataSize: 800,
              objects: 5,
              payloadSize: 4_000,
            },
            uploaded: {
              metadataSize: 20,
              objects: 1,
              payloadSize: 180,
            },
          },
        },
        success: true,
      },
      analyticsPayload: {
        data: {
          viewer: {
            accounts: [
              {
                operations: [
                  {
                    dimensions: {
                      actionStatus: "success",
                      actionType: "PutObject",
                      responseStatusCode: 200,
                    },
                    sum: { requests: 25 },
                  },
                  {
                    dimensions: {
                      actionStatus: "success",
                      actionType: "GetObject",
                      responseStatusCode: 200,
                    },
                    sum: { requests: 240 },
                  },
                  {
                    dimensions: {
                      actionStatus: "success",
                      actionType: "DeleteObject",
                      responseStatusCode: 204,
                    },
                    sum: { requests: 2 },
                  },
                ],
                storage: [
                  {
                    dimensions: { datetime: "2026-08-15T09:00:00.000Z" },
                    max: {
                      metadataSize: 200,
                      objectCount: 3,
                      payloadSize: 1_000,
                      uploadCount: 0,
                    },
                  },
                ],
              },
            ],
          },
        },
      },
      requests,
    }),
    now: new Date("2026-08-15T09:30:00.000Z"),
  });

  assert.equal(requests.length, 2);
  const request = requests.find((entry) => entry.options.method === "POST");
  const accountMetricsRequest = requests.find(
    (entry) => entry.options.method === "GET",
  );
  assert.equal(request.url, "https://api.cloudflare.com/client/v4/graphql");
  assert.equal(
    request.options.headers.authorization,
    `Bearer ${validConfiguration.apiToken}`,
  );
  assert.equal(
    accountMetricsRequest.url,
    `https://api.cloudflare.com/client/v4/accounts/${validConfiguration.accountId}/r2/metrics`,
  );
  assert.equal(
    accountMetricsRequest.options.headers.authorization,
    `Bearer ${validConfiguration.apiToken}`,
  );
  const body = JSON.parse(request.options.body);
  assert.deepEqual(body.variables, {
    accountTag: validConfiguration.accountId,
    bucketName: validConfiguration.bucketName,
    endDate: "2026-08-15T09:30:00.000Z",
    startDate: "2026-07-15T09:30:00.000Z",
  });
  const operationQuery = body.query.slice(
    body.query.indexOf("operations:"),
    body.query.indexOf("storage:"),
  );
  assert.doesNotMatch(operationQuery, /bucketName/);
  assert.match(body.query.slice(body.query.indexOf("storage:")), /bucketName/);
  assert.equal(usage.classARequests, 25);
  assert.equal(usage.classBRequests, 240);
  assert.equal(usage.freeRequests, 2);
  assert.equal(usage.bucketStorageBytes, 1_200);
  assert.equal(usage.bucketObjectCount, 3);
  assert.equal(usage.accountStandardBytes, 5_000);
  assert.equal(usage.accountStandardObjects, 6);
  assert.equal(usage.accountInfrequentAccessBytes, 100);
  assert.equal(usage.accountInfrequentAccessObjects, 3);
});

test("R2 analytics fails closed on unknown operations and stale provider data", () => {
  const checks = evaluateCloudflareR2Usage(
    {
      accountInfrequentAccessBytes: 0,
      accountInfrequentAccessObjects: 0,
      accountStandardBytes: 1_000,
      accountStandardObjects: 1,
      bucketObjectCount: 1,
      bucketStorageBytes: 1_000,
      bucketUploadCount: 0,
      classARequests: 1,
      classBRequests: 1,
      observedAt: "2026-08-15T00:00:00.000Z",
      unknownActionTypeCount: 1,
      unknownRequests: 1,
    },
    {
      ledgerActiveBytes: 1_000,
      ledgerStableActiveBytes: 1_000,
      now: new Date("2026-08-15T07:00:00.000Z"),
    },
  );

  assert.equal(
    checks.find((check) => check.id === "storage:r2-operation-contract")
      ?.status,
    "fail",
  );
  assert.equal(
    checks.find((check) => check.id === "storage:r2-analytics-freshness")
      ?.status,
    "fail",
  );
});

test("R2 free-tier checks warn at 70 percent and fail at 85 percent", () => {
  const base = {
    accountInfrequentAccessBytes: 0,
    accountInfrequentAccessObjects: 0,
    accountStandardBytes: 7_000_000_000,
    accountStandardObjects: 10,
    bucketObjectCount: 10,
    bucketStorageBytes: 7_000_000_000,
    bucketUploadCount: 0,
    classARequests: 700_000,
    classBRequests: 8_500_000,
    observedAt: "2026-08-15T09:00:00.000Z",
    unknownActionTypeCount: 0,
    unknownRequests: 0,
  };
  const checks = evaluateCloudflareR2Usage(base, {
    ledgerActiveBytes: 7_000_000_000,
    ledgerStableActiveBytes: 7_000_000_000,
    now: new Date("2026-08-15T09:30:00.000Z"),
  });

  assert.equal(
    checks.find((check) => check.id === "storage:r2-provider-capacity")?.status,
    "warn",
  );
  assert.equal(
    checks.find((check) => check.id === "storage:r2-class-a-month")?.status,
    "warn",
  );
  assert.equal(
    checks.find((check) => check.id === "storage:r2-class-b-month")?.status,
    "fail",
  );
});

test("R2 capacity is account-wide and Infrequent Access fails outside the free tier", () => {
  const checks = evaluateCloudflareR2Usage(
    {
      accountInfrequentAccessBytes: 0,
      accountInfrequentAccessObjects: 1,
      accountStandardBytes: 7_000_000_000,
      accountStandardObjects: 25,
      bucketObjectCount: 1,
      bucketStorageBytes: 1_000,
      bucketUploadCount: 0,
      classARequests: 0,
      classBRequests: 0,
      observedAt: "2026-08-15T09:00:00.000Z",
      unauthorizedRequests: 0,
      unknownActionTypeCount: 0,
      unknownRequests: 0,
    },
    {
      ledgerActiveBytes: 1_000,
      ledgerStableActiveBytes: 1_000,
      now: new Date("2026-08-15T09:30:00.000Z"),
    },
  );

  assert.equal(
    checks.find((check) => check.id === "storage:r2-provider-capacity")?.status,
    "warn",
  );
  assert.equal(
    checks.find((check) => check.id === "storage:r2-ledger-drift")?.status,
    "pass",
  );
  assert.equal(
    checks.find((check) => check.id === "storage:r2-infrequent-access")?.status,
    "fail",
  );
});

test("R2 account storage checks fail closed when required metrics are absent", () => {
  const checks = evaluateCloudflareR2Usage({
    bucketObjectCount: 0,
    bucketStorageBytes: 0,
    bucketUploadCount: 0,
    classARequests: 0,
    classBRequests: 0,
    observedAt: "2026-08-15T09:00:00.000Z",
    unauthorizedRequests: 0,
    unknownActionTypeCount: 0,
    unknownRequests: 0,
  });

  assert.equal(
    checks.find((check) => check.id === "storage:r2-provider-capacity")?.status,
    "fail",
  );
  assert.equal(
    checks.find((check) => check.id === "storage:r2-infrequent-access")?.status,
    "fail",
  );
});

test("R2 provider bytes above the database ledger are surfaced", () => {
  const checks = evaluateCloudflareR2Usage(
    {
      accountInfrequentAccessBytes: 0,
      accountInfrequentAccessObjects: 0,
      accountStandardBytes: 120_000_000,
      accountStandardObjects: 2,
      bucketObjectCount: 2,
      bucketStorageBytes: 120_000_000,
      bucketUploadCount: 0,
      classARequests: 0,
      classBRequests: 0,
      observedAt: "2026-08-15T09:00:00.000Z",
      unknownActionTypeCount: 0,
      unknownRequests: 0,
    },
    {
      ledgerActiveBytes: 1_000,
      ledgerStableActiveBytes: 1_000,
      now: new Date("2026-08-15T09:30:00.000Z"),
    },
  );

  assert.equal(
    checks.find((check) => check.id === "storage:r2-ledger-drift")?.status,
    "fail",
  );
});

test("R2 ledger drift catches provider-missing stable media without counting reservations", () => {
  const checks = evaluateCloudflareR2Usage(
    {
      accountInfrequentAccessBytes: 0,
      accountInfrequentAccessObjects: 0,
      accountStandardBytes: 0,
      accountStandardObjects: 0,
      bucketObjectCount: 0,
      bucketStorageBytes: 0,
      bucketUploadCount: 0,
      classARequests: 0,
      classBRequests: 0,
      observedAt: "2026-08-15T09:00:00.000Z",
      unauthorizedRequests: 0,
      unknownActionTypeCount: 0,
      unknownRequests: 0,
    },
    {
      ledgerActiveBytes: 2_000_000,
      ledgerCleanupBytes: 0,
      ledgerStableActiveBytes: 2_000_000,
      now: new Date("2026-08-15T09:30:00.000Z"),
    },
  );

  assert.equal(
    checks.find((check) => check.id === "storage:r2-ledger-drift")?.status,
    "warn",
  );
});

test("R2 401 operations are excluded from billable classes and surfaced separately", async () => {
  const usage = await readCloudflareR2Usage({
    ...validConfiguration,
    fetchImpl: createCloudflareFetch({
      analyticsPayload: {
        data: {
          viewer: {
            accounts: [
              {
                operations: [
                  {
                    dimensions: {
                      actionStatus: "userError",
                      actionType: "GetObject",
                      responseStatusCode: 401,
                    },
                    sum: { requests: 123 },
                  },
                ],
                storage: [
                  {
                    dimensions: { datetime: "2026-08-15T09:00:00.000Z" },
                    max: {
                      metadataSize: 0,
                      objectCount: 0,
                      payloadSize: 0,
                      uploadCount: 0,
                    },
                  },
                ],
              },
            ],
          },
        },
      },
    }),
    now: new Date("2026-08-15T09:30:00.000Z"),
  });

  assert.equal(usage.classBRequests, 0);
  assert.equal(usage.unauthorizedRequests, 123);
});

test("R2 operation contract fails even when an unknown type reports zero requests", () => {
  const checks = evaluateCloudflareR2Usage({
    accountInfrequentAccessBytes: 0,
    accountInfrequentAccessObjects: 0,
    accountStandardBytes: 0,
    accountStandardObjects: 0,
    bucketObjectCount: 0,
    bucketStorageBytes: 0,
    bucketUploadCount: 0,
    classARequests: 0,
    classBRequests: 0,
    observedAt: "2026-08-15T09:00:00.000Z",
    unauthorizedRequests: 0,
    unknownActionTypeCount: 1,
    unknownRequests: 0,
  });

  assert.equal(
    checks.find((check) => check.id === "storage:r2-operation-contract")
      ?.status,
    "fail",
  );
});

test("R2 analytics rejects invalid configuration and provider payloads safely", async () => {
  await assert.rejects(
    readCloudflareR2Usage({
      ...validConfiguration,
      accountId: "invalid",
      fetchImpl: async () => {
        throw new Error("must not run");
      },
    }),
    (error) => error.code === "invalid_account_id",
  );

  await assert.rejects(
    readCloudflareR2Usage({
      ...validConfiguration,
      fetchImpl: createCloudflareFetch({
        analyticsPayload: {
          errors: [{ message: "do not expose this response" }],
        },
      }),
    }),
    (error) => error.code === "invalid_payload",
  );

  await assert.rejects(
    readCloudflareR2Usage({
      ...validConfiguration,
      fetchImpl: createCloudflareFetch({
        analyticsPayload: {
          data: {
            viewer: {
              accounts: [
                {
                  operations: [
                    {
                      dimensions: {
                        actionType: "GetObject",
                        responseStatusCode: 200,
                      },
                      sum: {},
                    },
                  ],
                  storage: [],
                },
              ],
            },
          },
        },
      }),
    }),
    (error) => error.code === "invalid_metrics",
  );
});

test("R2 account storage metrics reject unsafe or oversized payloads without exposing bodies", async () => {
  await assert.rejects(
    readCloudflareR2Usage({
      ...validConfiguration,
      fetchImpl: createCloudflareFetch({
        accountMetricsPayload: {
          errors: [{ message: "secret provider detail" }],
          result: {},
          success: false,
        },
        analyticsPayload: emptyAnalyticsPayload,
      }),
    }),
    (error) =>
      error.code === "invalid_account_metrics_payload" &&
      !error.message.includes("secret provider detail"),
  );

  await assert.rejects(
    readCloudflareR2Usage({
      ...validConfiguration,
      fetchImpl: createCloudflareFetch({
        accountMetricsPayload: {
          errors: [],
          result: {
            standard: {
              published: {
                metadataSize: 0,
                objects: 1,
                payloadSize: -1,
              },
            },
          },
          success: true,
        },
        analyticsPayload: emptyAnalyticsPayload,
      }),
    }),
    (error) => error.code === "invalid_account_metrics",
  );

  const omittedOptionalMetrics = await readCloudflareR2Usage({
    ...validConfiguration,
    fetchImpl: createCloudflareFetch({
      accountMetricsPayload: {
        errors: [],
        result: {
          standard: {
            published: { objects: 1, payloadSize: 2 },
          },
        },
        success: true,
      },
      analyticsPayload: emptyAnalyticsPayload,
    }),
  });
  assert.equal(omittedOptionalMetrics.accountStandardBytes, 2);
  assert.equal(omittedOptionalMetrics.accountStandardObjects, 1);
  assert.equal(omittedOptionalMetrics.accountInfrequentAccessBytes, 0);
  assert.equal(omittedOptionalMetrics.accountInfrequentAccessObjects, 0);

  await assert.rejects(
    readCloudflareR2Usage({
      ...validConfiguration,
      fetchImpl: createCloudflareFetch({
        accountMetricsPayload: {
          errors: [],
          result: {
            standard: {
              published: {
                metadataSize: 0,
                objects: false,
                payloadSize: 1,
              },
            },
          },
          success: true,
        },
        analyticsPayload: emptyAnalyticsPayload,
      }),
    }),
    (error) => error.code === "invalid_account_metrics",
  );

  await assert.rejects(
    readCloudflareR2Usage({
      ...validConfiguration,
      fetchImpl: async (url) =>
        String(url).endsWith(
          `/accounts/${validConfiguration.accountId}/r2/metrics`,
        )
          ? new Response("{}", {
              headers: { "content-length": String(64 * 1024 + 1) },
            })
          : Response.json(emptyAnalyticsPayload),
    }),
    (error) => error.code === "response_too_large",
  );
});
