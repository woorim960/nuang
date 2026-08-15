import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import {
  loadSmokeEnvironment,
  parseSmokeArguments,
  runFeedMediaR2Smoke,
  smokeWebpBytes,
  validateSmokeConfiguration,
} from "../smoke-feed-media-r2.mjs";

const secret = "s".repeat(48);
const signingSecret = "h".repeat(48);
const smokeScriptPath = fileURLToPath(
  new URL("../smoke-feed-media-r2.mjs", import.meta.url),
);

test("the embedded probe is a tiny valid one-pixel WebP", async () => {
  const metadata = await sharp(smokeWebpBytes).metadata();

  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1);
  assert.equal(metadata.height, 1);
  assert.ok(smokeWebpBytes.length < 100);
});

test("argument parsing requires one explicit non-network or live mode", () => {
  assert.deepEqual(parseSmokeArguments(["--dry-run"]), {
    mode: "dry-run",
    ok: true,
  });
  assert.deepEqual(parseSmokeArguments(["--execute"]), {
    mode: "execute",
    ok: true,
  });
  assert.deepEqual(parseSmokeArguments([]), {
    errorCode: "usage_invalid",
    ok: false,
  });
  assert.deepEqual(parseSmokeArguments(["--execute", "--dry-run"]), {
    errorCode: "usage_invalid",
    ok: false,
  });
});

test("dry-run validates the full canary contract without calling a network dependency", async () => {
  let requests = 0;
  const environment = readyEnvironment();
  const result = await runFeedMediaR2Smoke({
    dependencies: {
      deliveryFetch: async () => {
        requests += 1;
        throw new Error("must not run");
      },
      storageFetch: async () => {
        requests += 1;
        throw new Error("must not run");
      },
    },
    environment,
    mode: "dry-run",
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry-run");
  assert.equal(result.configuration.status, "ready");
  assert.equal(requests, 0);
  assert.equal(JSON.stringify(result).includes(secret), false);
  assert.equal(JSON.stringify(result).includes(signingSecret), false);
});

test("dry-run CLI emits one secret-free aggregate JSON line", () => {
  const completed = spawnSync(
    process.execPath,
    [smokeScriptPath, "--dry-run"],
    {
      encoding: "utf8",
      env: { ...process.env, ...readyEnvironment() },
    },
  );

  assert.equal(completed.status, 0);
  assert.equal(completed.stderr, "");
  const lines = completed.stdout.trim().split("\n");
  assert.equal(lines.length, 1);
  const result = JSON.parse(lines[0]);
  assert.equal(result.ok, true);
  assert.equal(result.mode, "dry-run");
  assert.equal(lines[0].includes(secret), false);
  assert.equal(lines[0].includes(signingSecret), false);
  assert.equal(lines[0].includes("sig="), false);
});

test("environment loading applies .env, .env.local, then process precedence", () => {
  const directory = mkdtempSync(join(tmpdir(), "nuang-r2-smoke-env-"));
  try {
    writeFileSync(
      join(directory, ".env"),
      "SOURCE=base\nBASE_ONLY='base value'\n",
      { mode: 0o600 },
    );
    writeFileSync(
      join(directory, ".env.local"),
      'SOURCE="local"\nLOCAL_ONLY=local\n',
      { mode: 0o600 },
    );

    const environment = loadSmokeEnvironment({
      cwd: directory,
      processEnvironment: { PROCESS_ONLY: "process", SOURCE: "process" },
    });
    assert.deepEqual(environment, {
      BASE_ONLY: "base value",
      LOCAL_ONLY: "local",
      PROCESS_ONLY: "process",
      SOURCE: "process",
    });
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});

test("configuration validation fails closed for a partial or unsafe rollout", async () => {
  const environment = readyEnvironment();
  delete environment.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  environment.FEED_MEDIA_R2_ALL_CUSTOMERS = "true";

  const validation = validateSmokeConfiguration(environment);
  assert.equal(validation.ok, false);
  assert.deepEqual(validation.issues, [
    "all_customers_not_disabled",
    "secret_access_key_invalid",
  ]);

  const result = await runFeedMediaR2Smoke({
    dependencies: {
      deliveryFetch: async () => {
        throw new Error("must not run");
      },
      storageFetch: async () => {
        throw new Error("must not run");
      },
    },
    environment,
    mode: "execute",
  });
  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "configuration_invalid");
});

test("dark smoke permits Supabase writes without a canary but R2 writes require valid canaries", () => {
  const darkEnvironment = readyEnvironment();
  assert.equal(validateSmokeConfiguration(darkEnvironment).ok, true);
  darkEnvironment.FEED_MEDIA_R2_CANARY_ACCOUNT_IDS = "not-used-in-dark-smoke";
  assert.equal(validateSmokeConfiguration(darkEnvironment).ok, true);

  const r2Environment = {
    ...darkEnvironment,
    FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
  };
  assert.deepEqual(validateSmokeConfiguration(r2Environment), {
    issues: ["canary_accounts_invalid", "privacy_review_not_approved"],
    ok: false,
  });

  r2Environment.FEED_MEDIA_R2_CANARY_ACCOUNT_IDS =
    "11111111-1111-4111-8111-111111111111";
  assert.deepEqual(validateSmokeConfiguration(r2Environment), {
    issues: ["privacy_review_not_approved"],
    ok: false,
  });
  r2Environment.FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED = "true";
  assert.equal(validateSmokeConfiguration(r2Environment).ok, true);
});

test("analytics, storage, and delivery secrets must be present and distinct", () => {
  const environment = readyEnvironment();
  environment.CLOUDFLARE_R2_ANALYTICS_API_TOKEN = signingSecret;

  assert.deepEqual(validateSmokeConfiguration(environment), {
    issues: ["r2_secrets_not_distinct"],
    ok: false,
  });
});

test("live mock covers immutable PUT, signed delivery, cache fill, delete, and finally cleanup", async () => {
  const harness = createLiveHarness();
  const result = await runFeedMediaR2Smoke({
    dependencies: harness.dependencies,
    environment: readyEnvironment(),
    mode: "execute",
  });

  assert.equal(result.ok, true);
  assert.equal(result.cacheHitAttempts, 2);
  assert.deepEqual(
    result.checks.map(({ id, status }) => `${id}:${status}`),
    [
      "configuration:pass",
      "put:pass",
      "invalid-signature:pass",
      "private-bypass:pass",
      "public-miss:pass",
      "public-hit:pass",
      "delete:pass",
      "post-delete-404:pass",
      "cleanup:pass",
    ],
  );
  assert.equal(harness.puts.length, 1);
  assert.equal(harness.puts[0].ifNoneMatch, "*");
  assert.deepEqual(harness.puts[0].body, smokeWebpBytes);
  assert.match(
    harness.puts[0].key,
    /^smoke\/v1\/\d{8}\/probe-[a-f0-9]{32}\.webp$/,
  );
  assert.equal(harness.deletes, 2);
  assert.equal(
    harness.deliveryModes.join(","),
    "private,private,public,public,public,private",
  );

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes(signingSecret), false);
  assert.equal(serialized.includes(harness.puts[0].key), false);
  assert.equal(serialized.includes("sig="), false);
  assert.equal(serialized.includes(smokeWebpBytes.toString("base64")), false);
});

test("a failed delivery check still performs finally cleanup and returns only a safe code", async () => {
  const harness = createLiveHarness({ invalidSignatureStatus: 200 });
  const result = await runFeedMediaR2Smoke({
    dependencies: harness.dependencies,
    environment: readyEnvironment(),
    mode: "execute",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "invalid_signature_not_rejected");
  assert.equal(harness.deletes, 1);
  assert.deepEqual(result.checks.at(-1), {
    id: "cleanup",
    status: "pass",
  });
});

test("digest mismatch fails closed and still cleans the immutable object", async () => {
  const harness = createLiveHarness({ corruptPrivateBody: true });
  const result = await runFeedMediaR2Smoke({
    dependencies: harness.dependencies,
    environment: readyEnvironment(),
    mode: "execute",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "content_digest_invalid");
  assert.equal(harness.deletes, 1);
  assert.deepEqual(result.checks.at(-1), {
    id: "cleanup",
    status: "pass",
  });
});

test("cleanup failure takes precedence so an apparently good probe cannot leak an object silently", async () => {
  const harness = createLiveHarness({ cleanupStatus: 500 });
  const result = await runFeedMediaR2Smoke({
    dependencies: harness.dependencies,
    environment: readyEnvironment(),
    mode: "execute",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errorCode, "cleanup_failed");
  assert.deepEqual(result.checks.at(-1), {
    id: "cleanup",
    status: "fail",
  });
});

function readyEnvironment() {
  return {
    CLOUDFLARE_R2_ACCESS_KEY_ID: "A1".repeat(16),
    CLOUDFLARE_R2_ACCOUNT_ID: "a".repeat(32),
    CLOUDFLARE_R2_ANALYTICS_API_TOKEN: "t".repeat(48),
    CLOUDFLARE_R2_BUCKET_NAME: "nuang-feed-media",
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: secret,
    FEED_MEDIA_R2_ALL_CUSTOMERS: "false",
    FEED_MEDIA_R2_ALL_CUSTOMERS_APPROVED: "false",
    FEED_MEDIA_R2_CANARY_ACCOUNT_IDS: "",
    FEED_MEDIA_R2_DELIVERY_ORIGIN: "https://media.nuang.app",
    FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: signingSecret,
    FEED_MEDIA_R2_ENABLED: "true",
    FEED_MEDIA_R2_PRIVACY_REVIEW_APPROVED: "false",
    FEED_MEDIA_R2_MAX_MANAGED_BYTES: "8000000000",
    FEED_MEDIA_R2_REQUEST_TIMEOUT_MS: "5000",
    FEED_MEDIA_WRITE_PROVIDER: "supabase",
  };
}

function createLiveHarness({
  cleanupStatus = 204,
  corruptPrivateBody = false,
  invalidSignatureStatus = 401,
} = {}) {
  const puts = [];
  const deliveryModes = [];
  let deletes = 0;
  let objectDeleted = false;
  let publicReads = 0;
  const fixedNow = Date.parse("2026-08-15T09:00:00.000Z");
  const corruptedBody = Buffer.from(smokeWebpBytes);
  corruptedBody[corruptedBody.length - 1] ^= 1;

  const storageFetch = async (input, init) => {
    const url = new URL(input);
    const key = url.pathname
      .split("/")
      .slice(2)
      .map(decodeURIComponent)
      .join("/");
    if (init.method === "PUT") {
      puts.push({
        body: Buffer.from(init.body),
        ifNoneMatch: init.headers["If-None-Match"],
        key,
      });
      objectDeleted = false;
      return new Response(null, { status: 200 });
    }
    if (init.method === "DELETE") {
      deletes += 1;
      objectDeleted = true;
      return new Response(null, {
        status: deletes === 1 ? 204 : cleanupStatus,
      });
    }
    throw new Error("unexpected storage method");
  };

  const deliveryFetch = async (input) => {
    const url = new URL(input);
    const mode = url.searchParams.get("mode");
    deliveryModes.push(mode);
    if (deliveryModes.length === 1) {
      return new Response(null, { status: invalidSignatureStatus });
    }
    if (objectDeleted) return new Response(null, { status: 404 });
    if (mode === "private") {
      return corruptPrivateBody
        ? imageResponse("BYPASS", corruptedBody)
        : imageResponse("BYPASS");
    }
    publicReads += 1;
    return imageResponse(publicReads < 3 ? "MISS" : "HIT");
  };

  return {
    deliveryModes,
    dependencies: {
      deliveryFetch,
      now: () => fixedNow,
      randomBytes: () => Buffer.alloc(16, 0xab),
      sleep: async () => {},
      storageFetch,
    },
    get deletes() {
      return deletes;
    },
    puts,
  };
}

function imageResponse(cacheStatus, body = smokeWebpBytes) {
  return new Response(body, {
    headers: {
      "Content-Length": String(body.length),
      "Content-Type": "image/webp",
      "X-Nuang-Cache": cacheStatus,
    },
    status: 200,
  });
}
