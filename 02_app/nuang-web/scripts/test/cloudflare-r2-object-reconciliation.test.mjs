import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { reconcileCloudflareR2Objects } from "../lib/cloudflare-r2-object-reconciliation.mjs";

const ORIGIN = "https://media.nuang.app";
const SECRET = "reconciliation-secret-".padEnd(48, "x");
const NOW = new Date("2026-08-15T01:00:00.000Z");

test("R2 reconciliation signs private HEAD requests and never exceeds concurrency four", async () => {
  const objects = Array.from({ length: 9 }, (_, index) => ({
    byteSize: 100 + index,
    mimeType: index % 2 === 0 ? "image/webp" : "image/jpeg",
    storagePath: `feed/v1/post-1/${String(index + 1).padStart(2, "0")}.webp`,
  }));
  let active = 0;
  let maximumActive = 0;
  const seen = [];
  const check = await reconcileCloudflareR2Objects({
    fetchImpl: async (requestUrl, init) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      const url = new URL(requestUrl);
      const descriptor = objects.find(
        (object) => `/${object.storagePath}` === url.pathname,
      );
      assert.ok(descriptor);
      assert.equal(init.method, "HEAD");
      assert.equal(init.cache, "no-store");
      assert.equal(init.redirect, "error");
      assert.equal(url.searchParams.get("v"), "1");
      assert.equal(url.searchParams.get("mode"), "private");
      const expiresAt = url.searchParams.get("exp");
      const expectedSignature = createHmac("sha256", SECRET)
        .update(
          `nuang:feed-media-delivery:v1\n${url.pathname}\n${expiresAt}\nprivate`,
        )
        .digest("base64url");
      assert.equal(url.searchParams.get("sig"), expectedSignature);
      seen.push(url.pathname);
      active -= 1;
      return healthyHeadResponse(descriptor);
    },
    now: NOW,
    objects,
    origin: ORIGIN,
    signingSecret: SECRET,
  });

  assert.equal(maximumActive, 4);
  assert.equal(seen.length, objects.length);
  assert.deepEqual(check, {
    detail: "active=9 checked=9 matched=9 missing=0 mismatched=0 unavailable=0",
    id: "storage:r2-object-reconciliation",
    status: "pass",
  });
  for (const object of objects) {
    assert.doesNotMatch(JSON.stringify(check), new RegExp(object.storagePath));
  }
});

test("R2 reconciliation fails closed on missing, metadata mismatch, and provider errors", async () => {
  const objects = [
    descriptor("missing.webp", 101),
    descriptor("length.webp", 102),
    descriptor("mime.webp", 103),
    descriptor("cache.webp", 104),
    descriptor("corp.webp", 105),
    descriptor("cache-status.webp", 106),
    descriptor("unauthorized.webp", 107),
    descriptor("provider.webp", 108),
    descriptor("network.webp", 109),
  ];
  const check = await reconcileCloudflareR2Objects({
    fetchImpl: async (requestUrl) => {
      const name = new URL(requestUrl).pathname.split("/").at(-1);
      const object = objects.find((entry) => entry.storagePath.endsWith(name));
      if (name === "missing.webp") return new Response(null, { status: 404 });
      if (name === "network.webp") throw new Error("secret upstream detail");
      if (name === "provider.webp") return new Response(null, { status: 503 });
      if (name === "unauthorized.webp") {
        return new Response(null, { status: 401 });
      }
      const headers = healthyHeaders(object);
      if (name === "length.webp") headers.set("content-length", "999");
      if (name === "mime.webp") headers.set("content-type", "text/html");
      if (name === "cache.webp") headers.set("cache-control", "private");
      if (name === "corp.webp") {
        headers.set("cross-origin-resource-policy", "cross-origin");
      }
      if (name === "cache-status.webp") {
        headers.set("x-nuang-cache", "HIT");
      }
      return new Response(null, { headers, status: 200 });
    },
    now: NOW,
    objects,
    origin: ORIGIN,
    signingSecret: SECRET,
  });

  assert.equal(check.status, "fail");
  assert.equal(
    check.detail,
    "active=9 checked=9 matched=0 missing=1 mismatched=6 unavailable=2",
  );
  assert.doesNotMatch(JSON.stringify(check), /missing\.webp|secret upstream/);
});

test("R2 reconciliation refuses more than 100 objects without making a request", async () => {
  let calls = 0;
  const objects = Array.from({ length: 101 }, (_, index) =>
    descriptor(`${index}.webp`, index + 1),
  );
  const check = await reconcileCloudflareR2Objects({
    fetchImpl: async () => {
      calls += 1;
      throw new Error("must not be called");
    },
    now: NOW,
    objects,
    origin: ORIGIN,
    signingSecret: SECRET,
  });

  assert.equal(calls, 0);
  assert.equal(check.status, "fail");
  assert.match(check.detail, /active=101/);
  assert.match(check.detail, /limit=100 limit_exceeded=true/);
});

test("R2 reconciliation makes no request when the active R2 ledger is empty", async () => {
  let calls = 0;
  const check = await reconcileCloudflareR2Objects({
    fetchImpl: async () => {
      calls += 1;
      throw new Error("must not be called");
    },
    now: NOW,
    objects: [],
    origin: ORIGIN,
    signingSecret: SECRET,
  });

  assert.equal(calls, 0);
  assert.deepEqual(check, {
    detail: "active=0 checked=0 matched=0 missing=0 mismatched=0 unavailable=0",
    id: "storage:r2-object-reconciliation",
    status: "pass",
  });
});

test("R2 reconciliation rejects unsafe or duplicate descriptors without exposing keys", async () => {
  let calls = 0;
  const unsafePath = "feed/v1/private user/secret.webp";
  const duplicatePath = "feed/v1/post-1/same.webp";
  const check = await reconcileCloudflareR2Objects({
    fetchImpl: async () => {
      calls += 1;
      throw new Error("must not be called");
    },
    now: NOW,
    objects: [
      { byteSize: 10, mimeType: "image/webp", storagePath: unsafePath },
      { byteSize: 11, mimeType: "image/webp", storagePath: duplicatePath },
      { byteSize: 11, mimeType: "image/webp", storagePath: duplicatePath },
    ],
    origin: ORIGIN,
    signingSecret: SECRET,
  });

  assert.equal(calls, 0);
  assert.equal(check.status, "fail");
  assert.match(check.detail, /invalid_descriptors=1/);
  assert.match(check.detail, /duplicate_descriptors=1/);
  assert.doesNotMatch(JSON.stringify(check), /private user|same\.webp/);
});

test("R2 reconciliation configuration errors only expose safe codes", async () => {
  await assert.rejects(
    reconcileCloudflareR2Objects({
      fetchImpl: async () => healthyHeadResponse(descriptor("one.webp", 1)),
      now: NOW,
      objects: [],
      origin: "https://attacker.example",
      signingSecret: SECRET,
    }),
    (error) =>
      error.code === "invalid_delivery_origin" &&
      !error.message.includes("attacker"),
  );
  await assert.rejects(
    reconcileCloudflareR2Objects({
      concurrency: 5,
      fetchImpl: async () => healthyHeadResponse(descriptor("one.webp", 1)),
      now: NOW,
      objects: [],
      origin: ORIGIN,
      signingSecret: SECRET,
    }),
    (error) => error.code === "invalid_concurrency",
  );
});

test("production monitor selects all active R2 descriptors and reconciles only when enabled", () => {
  const source = readFileSync(
    new URL("../check-production-health.mjs", import.meta.url),
    "utf8",
  );
  assert.match(source, /reconcileCloudflareR2Objects/);
  assert.match(source, /storage_provider = 'cloudflare_r2'/);
  assert.match(source, /storage_accounted/);
  assert.match(source, /storage_ready/);
  assert.match(source, /deleted_at is null/);
  const descriptorQuery = source.match(
    /const r2ActiveObjects =[\s\S]*?limit 101[\s\S]*?: null;/,
  )?.[0];
  assert.ok(descriptorQuery);
  assert.match(descriptorQuery, /storage_path as "storagePath"/);
  assert.match(descriptorQuery, /byte_size::text as "byteSize"/);
  assert.match(descriptorQuery, /mime_type as "mimeType"/);
  assert.doesNotMatch(descriptorQuery, /interval '6 hours'/);
  assert.match(
    source,
    /else if \(r2Enabled\) \{[\s\S]*?reconcileCloudflareR2Objects/,
  );
});

function descriptor(name, byteSize) {
  return {
    byteSize,
    mimeType: "image/webp",
    storagePath: `feed/v1/post-1/${name}`,
  };
}

function healthyHeaders(object) {
  return new Headers({
    "cache-control": "private, no-store",
    "content-length": String(object.byteSize),
    "content-type": object.mimeType,
    "cross-origin-resource-policy": "same-site",
    "x-nuang-cache": "BYPASS",
  });
}

function healthyHeadResponse(object) {
  return new Response(null, {
    headers: healthyHeaders(object),
    status: 200,
  });
}
