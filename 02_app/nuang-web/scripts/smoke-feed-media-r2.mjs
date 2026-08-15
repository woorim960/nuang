import { createHash, createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { AwsClient } from "aws4fetch";

const EXPECTED_DELIVERY_ORIGIN = "https://media.nuang.app";
const DELIVERY_SIGNATURE_VERSION = "1";
const DELIVERY_LINK_LIFETIME_SECONDS = 5 * 60;
const MIN_SECRET_CHARACTERS = 32;
const MIN_REQUEST_TIMEOUT_MS = 250;
const MAX_REQUEST_TIMEOUT_MS = 30_000;
const MIN_MANAGED_BYTES = 1_000_000_000;
const MAX_MANAGED_BYTES = 9_500_000_000;
const PUBLIC_CACHE_RETRY_DELAYS_MS = [150, 300, 600, 1_000, 1_500];
const ACCOUNT_ID_PATTERN = /^[a-f0-9]{32}$/i;
const ACCESS_KEY_ID_PATTERN = /^[A-Za-z0-9]{16,128}$/;
const BUCKET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const ACCOUNT_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lossless 1x1 WebP generated once for the probe. Embedding the immutable
// fixture avoids runtime image dependencies and keeps the upload below 100 B.
export const smokeWebpBytes = Buffer.from(
  "UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAdQkUZ0pv+BiOh/AAA=",
  "base64",
);

const smokeWebpDigest = createHash("sha256")
  .update(smokeWebpBytes)
  .digest("hex");

const knownCheckIds = [
  "configuration",
  "put",
  "invalid-signature",
  "private-bypass",
  "public-miss",
  "public-hit",
  "delete",
  "post-delete-404",
  "cleanup",
];

class SmokeFailure extends Error {
  constructor(code, checkId) {
    super(code);
    this.code = code;
    this.checkId = checkId;
  }
}

export function parseSmokeArguments(argumentsList) {
  if (
    argumentsList.length === 1 &&
    (argumentsList[0] === "--dry-run" || argumentsList[0] === "--execute")
  ) {
    return {
      ok: true,
      mode: argumentsList[0] === "--dry-run" ? "dry-run" : "execute",
    };
  }
  return { errorCode: "usage_invalid", ok: false };
}

export function validateSmokeConfiguration(environment) {
  const issues = [];
  const value = (key) => environment[key]?.trim() ?? "";
  const writeProvider = value("FEED_MEDIA_WRITE_PROVIDER") || "supabase";

  if (value("FEED_MEDIA_R2_ENABLED").toLowerCase() !== "true") {
    issues.push("r2_not_enabled");
  }
  if (writeProvider !== "supabase" && writeProvider !== "cloudflare_r2") {
    issues.push("write_provider_invalid");
  }
  if (value("FEED_MEDIA_R2_ALL_CUSTOMERS").toLowerCase() !== "false") {
    issues.push("all_customers_not_disabled");
  }
  if (value("FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED").toLowerCase() !== "false") {
    issues.push("all_customers_approval_not_disabled");
  }
  const privacyReviewApproved = value(
    "FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED",
  ).toLowerCase();
  if (writeProvider === "cloudflare_r2" && privacyReviewApproved !== "true") {
    issues.push("privacy_review_not_approved");
  }

  const canaryValue = value("FEED_MEDIA_R2_CANARY_ACCOUNT_IDS");
  const canaryAccounts = canaryValue
    .split(",")
    .map((accountId) => accountId.trim())
    .filter(Boolean);
  if (
    writeProvider === "cloudflare_r2" &&
    (canaryAccounts.length === 0 ||
      canaryAccounts.some((accountId) => !ACCOUNT_UUID_PATTERN.test(accountId)))
  ) {
    issues.push("canary_accounts_invalid");
  }

  if (!ACCOUNT_ID_PATTERN.test(value("CLOUDFLARE_R2_ACCOUNT_ID"))) {
    issues.push("account_id_invalid");
  }
  if (!BUCKET_NAME_PATTERN.test(value("CLOUDFLARE_R2_BUCKET_NAME"))) {
    issues.push("bucket_name_invalid");
  }
  if (!ACCESS_KEY_ID_PATTERN.test(value("CLOUDFLARE_R2_ACCESS_KEY_ID"))) {
    issues.push("access_key_invalid");
  }
  const storageSecret = value("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  const analyticsToken = value("CLOUDFLARE_R2_ANALYTICS_API_TOKEN");
  const signingSecret = value("FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET");
  const previousSigningSecret = value(
    "FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET_PREVIOUS",
  );
  if (storageSecret.length < MIN_SECRET_CHARACTERS) {
    issues.push("secret_access_key_invalid");
  }
  if (!analyticsToken) {
    issues.push("analytics_token_missing");
  }
  if (signingSecret.length < MIN_SECRET_CHARACTERS) {
    issues.push("delivery_signing_secret_invalid");
  }
  if (
    previousSigningSecret &&
    previousSigningSecret.length < MIN_SECRET_CHARACTERS
  ) {
    issues.push("previous_signing_secret_invalid");
  }
  const configuredSecrets = [
    storageSecret,
    analyticsToken,
    signingSecret,
    previousSigningSecret,
  ].filter(Boolean);
  if (new Set(configuredSecrets).size !== configuredSecrets.length) {
    issues.push("r2_secrets_not_distinct");
  }
  if (!isExpectedDeliveryOrigin(value("FEED_MEDIA_R2_DELIVERY_ORIGIN"))) {
    issues.push("delivery_origin_invalid");
  }
  if (
    !isIntegerInRange(
      value("FEED_MEDIA_R2_REQUEST_TIMEOUT_MS"),
      MIN_REQUEST_TIMEOUT_MS,
      MAX_REQUEST_TIMEOUT_MS,
    )
  ) {
    issues.push("request_timeout_invalid");
  }
  if (
    !isIntegerInRange(
      value("FEED_MEDIA_R2_MAX_MANAGED_BYTES"),
      MIN_MANAGED_BYTES,
      MAX_MANAGED_BYTES,
    )
  ) {
    issues.push("max_managed_bytes_invalid");
  }

  return {
    issues: Array.from(new Set(issues)).sort(),
    ok: issues.length === 0,
  };
}

export function loadSmokeEnvironment({
  cwd = process.cwd(),
  processEnvironment = process.env,
} = {}) {
  return {
    ...readEnvFile(resolve(cwd, ".env")),
    ...readEnvFile(resolve(cwd, ".env.local")),
    ...processEnvironment,
  };
}

export async function runFeedMediaR2Smoke({
  dependencies = {},
  environment,
  mode,
}) {
  const checks = new Map();
  const validation = validateSmokeConfiguration(environment);
  checks.set("configuration", validation.ok ? "pass" : "fail");

  if (!validation.ok) {
    return buildResult({
      checks,
      errorCode: "configuration_invalid",
      issues: validation.issues,
      mode,
      ok: false,
    });
  }
  if (mode === "dry-run") {
    return buildResult({ checks, issues: [], mode, ok: true });
  }
  if (mode !== "execute") {
    return buildResult({
      checks,
      errorCode: "mode_invalid",
      issues: [],
      mode: "invalid",
      ok: false,
    });
  }

  const configuration = readConfiguration(environment);
  const now = dependencies.now ?? (() => Date.now());
  const sleep = dependencies.sleep ?? delay;
  const random = dependencies.randomBytes ?? randomBytes;
  const key = createSmokeObjectKey({ now: now(), randomBytes: random });
  const storageFetch =
    dependencies.storageFetch ?? createSignedStorageFetch(configuration);
  const deliveryFetch = dependencies.deliveryFetch ?? fetch;
  let cleanupRequired = false;
  let primaryFailure = null;
  let cacheHitAttempts = 0;

  try {
    cleanupRequired = true;
    const put = await requestStorage({
      body: smokeWebpBytes,
      checkId: "put",
      configuration,
      key,
      method: "PUT",
      storageFetch,
    });
    if (!put.ok) {
      cleanupRequired = put.status !== 409 && put.status !== 412;
      fail(checks, "put", "put_rejected");
    }
    checks.set("put", "pass");
    await discardResponseBody(put);

    const validPrivateUrl = createDeliveryUrl({
      configuration,
      key,
      mode: "private",
      now: now(),
    });
    const invalidUrl = tamperSignature(validPrivateUrl);
    const invalidResponse = await requestDelivery({
      checkId: "invalid-signature",
      configuration,
      deliveryFetch,
      url: invalidUrl,
    });
    if (invalidResponse.status !== 401) {
      await discardResponseBody(invalidResponse);
      fail(checks, "invalid-signature", "invalid_signature_not_rejected");
    }
    await discardResponseBody(invalidResponse);
    checks.set("invalid-signature", "pass");

    const privateResponse = await requestDelivery({
      checkId: "private-bypass",
      configuration,
      deliveryFetch,
      url: validPrivateUrl,
    });
    await assertImageResponse({
      cacheStatus: "BYPASS",
      checkId: "private-bypass",
      checks,
      response: privateResponse,
    });

    const publicUrl = createDeliveryUrl({
      configuration,
      key,
      mode: "public",
      now: now(),
    });
    const publicMiss = await requestDelivery({
      checkId: "public-miss",
      configuration,
      deliveryFetch,
      url: publicUrl,
    });
    await assertImageResponse({
      cacheStatus: "MISS",
      checkId: "public-miss",
      checks,
      response: publicMiss,
    });

    let cacheHit = false;
    for (const retryDelayMs of PUBLIC_CACHE_RETRY_DELAYS_MS) {
      await sleep(retryDelayMs);
      cacheHitAttempts += 1;
      const publicRetry = await requestDelivery({
        checkId: "public-hit",
        configuration,
        deliveryFetch,
        url: publicUrl,
      });
      const cacheStatus = publicRetry.headers.get("x-nuang-cache");
      if (cacheStatus !== "MISS" && cacheStatus !== "HIT") {
        await discardResponseBody(publicRetry);
        fail(checks, "public-hit", "public_cache_status_invalid");
      }
      await assertImageBytes({
        checkId: "public-hit",
        checks,
        response: publicRetry,
      });
      if (cacheStatus === "HIT") {
        cacheHit = true;
        checks.set("public-hit", "pass");
        break;
      }
    }
    if (!cacheHit) fail(checks, "public-hit", "public_cache_hit_timeout");

    const deleted = await requestStorage({
      checkId: "delete",
      configuration,
      key,
      method: "DELETE",
      storageFetch,
    });
    if (![200, 204, 404].includes(deleted.status)) {
      await discardResponseBody(deleted);
      fail(checks, "delete", "delete_rejected");
    }
    await discardResponseBody(deleted);
    checks.set("delete", "pass");

    const afterDeleteUrl = createDeliveryUrl({
      configuration,
      key,
      mode: "private",
      now: now(),
    });
    const afterDelete = await requestDelivery({
      checkId: "post-delete-404",
      configuration,
      deliveryFetch,
      url: afterDeleteUrl,
    });
    if (afterDelete.status !== 404) {
      await discardResponseBody(afterDelete);
      fail(checks, "post-delete-404", "post_delete_not_found_failed");
    }
    await discardResponseBody(afterDelete);
    checks.set("post-delete-404", "pass");
  } catch (error) {
    primaryFailure = normalizeFailure(error);
  } finally {
    if (cleanupRequired) {
      try {
        const cleanup = await requestStorage({
          checkId: "cleanup",
          configuration,
          key,
          method: "DELETE",
          storageFetch,
        });
        if (![200, 204, 404].includes(cleanup.status)) {
          await discardResponseBody(cleanup);
          throw new SmokeFailure("cleanup_rejected", "cleanup");
        }
        await discardResponseBody(cleanup);
        checks.set("cleanup", "pass");
      } catch {
        checks.set("cleanup", "fail");
        primaryFailure = new SmokeFailure("cleanup_failed", "cleanup");
      }
    } else {
      checks.set("cleanup", "not-required");
    }
  }

  if (primaryFailure) {
    if (primaryFailure.checkId && !checks.has(primaryFailure.checkId)) {
      checks.set(primaryFailure.checkId, "fail");
    }
    return buildResult({
      cacheHitAttempts,
      checks,
      errorCode: primaryFailure.code,
      issues: [],
      mode,
      ok: false,
    });
  }

  return buildResult({
    cacheHitAttempts,
    checks,
    issues: [],
    mode,
    ok: true,
  });
}

function readConfiguration(environment) {
  const read = (key) => environment[key].trim();
  return {
    accessKeyId: read("CLOUDFLARE_R2_ACCESS_KEY_ID"),
    accountId: read("CLOUDFLARE_R2_ACCOUNT_ID"),
    bucketName: read("CLOUDFLARE_R2_BUCKET_NAME"),
    deliveryOrigin: read("FEED_MEDIA_R2_DELIVERY_ORIGIN"),
    deliverySigningSecret: read("FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET"),
    requestTimeoutMs: Number(read("FEED_MEDIA_R2_REQUEST_TIMEOUT_MS")),
    secretAccessKey: read("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
  };
}

function createSignedStorageFetch(configuration) {
  const client = new AwsClient({
    accessKeyId: configuration.accessKeyId,
    region: "auto",
    retries: 0,
    secretAccessKey: configuration.secretAccessKey,
    service: "s3",
  });
  return client.fetch.bind(client);
}

function createSmokeObjectKey({ now, randomBytes: createRandomBytes }) {
  const day = new Date(now).toISOString().slice(0, 10).replaceAll("-", "");
  const nonce = createRandomBytes(16).toString("hex");
  return `smoke/v1/${day}/probe-${nonce}.webp`;
}

async function requestStorage({
  body,
  checkId,
  configuration,
  key,
  method,
  storageFetch,
}) {
  const endpoint = new URL(
    `https://${configuration.accountId}.r2.cloudflarestorage.com`,
  );
  endpoint.pathname = `/${encodeURIComponent(
    configuration.bucketName,
  )}/${encodeObjectKey(key)}`;
  const headers =
    method === "PUT"
      ? {
          "Cache-Control": "private, no-store",
          "Content-Type": "image/webp",
          "If-None-Match": "*",
        }
      : undefined;
  return fetchWithTimeout({
    checkId,
    fetcher: storageFetch,
    init: { body, headers, method },
    timeoutMs: configuration.requestTimeoutMs,
    url: endpoint,
  });
}

async function requestDelivery({ checkId, configuration, deliveryFetch, url }) {
  return fetchWithTimeout({
    checkId,
    fetcher: deliveryFetch,
    init: {
      headers: { Accept: "image/webp" },
      method: "GET",
      redirect: "error",
    },
    timeoutMs: configuration.requestTimeoutMs,
    url,
  });
}

async function fetchWithTimeout({ checkId, fetcher, init, timeoutMs, url }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } catch {
    throw new SmokeFailure(
      controller.signal.aborted ? "request_timeout" : "network_error",
      checkId,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function createDeliveryUrl({ configuration, key, mode, now }) {
  const expiresAt = Math.floor(now / 1_000) + DELIVERY_LINK_LIFETIME_SECONDS;
  const pathname = `/${encodeObjectKey(key)}`;
  const signature = createHmac("sha256", configuration.deliverySigningSecret)
    .update(`nuang:feed-media-delivery:v1\n${pathname}\n${expiresAt}\n${mode}`)
    .digest("base64url");
  const url = new URL(pathname, `${configuration.deliveryOrigin}/`);
  url.searchParams.set("v", DELIVERY_SIGNATURE_VERSION);
  url.searchParams.set("exp", String(expiresAt));
  url.searchParams.set("mode", mode);
  url.searchParams.set("sig", signature);
  return url;
}

function tamperSignature(url) {
  const tampered = new URL(url);
  const signature = tampered.searchParams.get("sig");
  const replacement = signature.startsWith("A") ? "B" : "A";
  tampered.searchParams.set("sig", `${replacement}${signature.slice(1)}`);
  return tampered;
}

async function assertImageResponse({ cacheStatus, checkId, checks, response }) {
  if (response.headers.get("x-nuang-cache") !== cacheStatus) {
    await discardResponseBody(response);
    fail(checks, checkId, "cache_status_invalid");
  }
  await assertImageBytes({ checkId, checks, response });
  checks.set(checkId, "pass");
}

async function assertImageBytes({ checkId, checks, response }) {
  if (response.status !== 200) {
    await discardResponseBody(response);
    fail(checks, checkId, "delivery_status_invalid");
  }
  const contentType = response.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "image/webp") {
    await discardResponseBody(response);
    fail(checks, checkId, "content_type_invalid");
  }
  if (
    response.headers.get("content-length") !== String(smokeWebpBytes.length)
  ) {
    await discardResponseBody(response);
    fail(checks, checkId, "content_length_invalid");
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== smokeWebpBytes.length || digest !== smokeWebpDigest) {
    fail(checks, checkId, "content_digest_invalid");
  }
}

async function discardResponseBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // Body disposal does not change the check result and is never logged.
  }
}

function fail(checks, checkId, code) {
  checks.set(checkId, "fail");
  throw new SmokeFailure(code, checkId);
}

function normalizeFailure(error) {
  return error instanceof SmokeFailure
    ? error
    : new SmokeFailure("unexpected_error", "unexpected");
}

function buildResult({
  cacheHitAttempts,
  checks,
  errorCode,
  issues,
  mode,
  ok,
}) {
  return {
    checks: knownCheckIds
      .filter((id) => checks.has(id))
      .map((id) => ({ id, status: checks.get(id) })),
    configuration: {
      issues,
      status: issues.length === 0 ? "ready" : "invalid",
    },
    ...(typeof cacheHitAttempts === "number" ? { cacheHitAttempts } : {}),
    ...(errorCode ? { errorCode } : {}),
    mode,
    ok,
  };
}

function isExpectedDeliveryOrigin(value) {
  try {
    const url = new URL(value);
    return (
      url.origin === EXPECTED_DELIVERY_ORIGIN &&
      url.pathname === "/" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

function isIntegerInRange(value, minimum, maximum) {
  if (!/^\d+$/.test(value)) return false;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= minimum && number <= maximum;
}

function encodeObjectKey(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function main() {
  const parsed = parseSmokeArguments(process.argv.slice(2));
  if (!parsed.ok) {
    process.stdout.write(
      `${JSON.stringify({ errorCode: parsed.errorCode, mode: "invalid", ok: false })}\n`,
    );
    process.exitCode = 1;
    return;
  }

  let result;
  try {
    result = await runFeedMediaR2Smoke({
      environment: loadSmokeEnvironment(),
      mode: parsed.mode,
    });
  } catch {
    result = {
      errorCode: "unexpected_error",
      mode: parsed.mode,
      ok: false,
    };
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) await main();

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex === -1) return [line, ""];
        const key = line.slice(0, separatorIndex).trim();
        const rawValue = line.slice(separatorIndex + 1).trim();
        return [key, stripQuotes(rawValue)];
      }),
  );
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
