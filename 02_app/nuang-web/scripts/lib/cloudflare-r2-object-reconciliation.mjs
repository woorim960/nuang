import { createHmac } from "node:crypto";

const EXPECTED_DELIVERY_ORIGIN = "https://media.nuang.app";
const MAX_OBJECTS = 100;
const MAX_CONCURRENCY = 4;
const MAX_OBJECT_KEY_BYTES = 512;
const OBJECT_KEY_SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SUPPORTED_IMAGE_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function reconcileCloudflareR2Objects({
  concurrency = MAX_CONCURRENCY,
  fetchImpl = fetch,
  now = new Date(),
  objects,
  origin,
  signingSecret,
  timeoutMs = 15_000,
}) {
  validateConfiguration({
    concurrency,
    fetchImpl,
    now,
    objects,
    origin,
    signingSecret,
    timeoutMs,
  });
  const currentSigningSecret = signingSecret.trim();

  if (objects.length > MAX_OBJECTS) {
    return createCheck({
      active: objects.length,
      checked: 0,
      limitExceeded: true,
      matched: 0,
      mismatched: 0,
      missing: 0,
      unavailable: 0,
    });
  }

  const descriptors = objects.map(normalizeObjectDescriptor);
  const invalidDescriptors = descriptors.filter(
    (descriptor) => descriptor === null,
  ).length;
  const duplicateCount = countDuplicateKeys(descriptors);
  if (invalidDescriptors > 0 || duplicateCount > 0) {
    return createCheck({
      active: objects.length,
      checked: 0,
      duplicateDescriptors: duplicateCount,
      invalidDescriptors,
      matched: 0,
      mismatched: 0,
      missing: 0,
      unavailable: 0,
    });
  }

  if (descriptors.length === 0) {
    return createCheck({
      active: 0,
      checked: 0,
      matched: 0,
      mismatched: 0,
      missing: 0,
      unavailable: 0,
    });
  }

  const expiresAt = Math.floor(now.getTime() / 1_000) + 5 * 60;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const outcomes = Array(descriptors.length);
  let nextIndex = 0;

  async function worker() {
    while (!controller.signal.aborted) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= descriptors.length) return;
      outcomes[index] = await inspectObject({
        descriptor: descriptors[index],
        expiresAt,
        fetchImpl,
        origin,
        signal: controller.signal,
        signingSecret: currentSigningSecret,
      });
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, descriptors.length) }, () =>
        worker(),
      ),
    );
  } finally {
    clearTimeout(timeout);
  }

  const counts = {
    matched: 0,
    mismatched: 0,
    missing: 0,
    unavailable: 0,
  };
  for (const outcome of outcomes) {
    counts[outcome ?? "unavailable"] += 1;
  }

  return createCheck({
    active: descriptors.length,
    checked: outcomes.filter((outcome) => outcome !== undefined).length,
    ...counts,
  });
}

async function inspectObject({
  descriptor,
  expiresAt,
  fetchImpl,
  origin,
  signal,
  signingSecret,
}) {
  const pathname = `/${descriptor.storagePath}`;
  const signature = createHmac("sha256", signingSecret)
    .update(`nuang:feed-media-delivery:v1\n${pathname}\n${expiresAt}\nprivate`)
    .digest("base64url");
  const url = new URL(pathname, `${origin}/`);
  url.searchParams.set("v", "1");
  url.searchParams.set("exp", String(expiresAt));
  url.searchParams.set("mode", "private");
  url.searchParams.set("sig", signature);

  try {
    const response = await fetchImpl(url, {
      cache: "no-store",
      headers: { accept: descriptor.mimeType },
      method: "HEAD",
      redirect: "error",
      signal,
    });
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 404) return "missing";
    if (response.status !== 200) {
      return response.status >= 500 ? "unavailable" : "mismatched";
    }

    const contentLength = parseContentLength(
      response.headers.get("content-length"),
    );
    const contentType = normalizeMediaType(
      response.headers.get("content-type"),
    );
    const cacheControl = response.headers
      .get("cache-control")
      ?.split(",")
      .map((token) => token.trim().toLowerCase());
    const matches =
      contentLength === descriptor.byteSize &&
      contentType === descriptor.mimeType &&
      SUPPORTED_IMAGE_MEDIA_TYPES.has(contentType) &&
      cacheControl?.includes("no-store") === true &&
      response.headers.get("cross-origin-resource-policy")?.toLowerCase() ===
        "same-site" &&
      response.headers.get("x-nuang-cache") === "BYPASS";
    return matches ? "matched" : "mismatched";
  } catch {
    return "unavailable";
  }
}

function validateConfiguration({
  concurrency,
  fetchImpl,
  now,
  objects,
  origin,
  signingSecret,
  timeoutMs,
}) {
  if (origin !== EXPECTED_DELIVERY_ORIGIN) {
    throw reconciliationError("invalid_delivery_origin");
  }
  if (typeof signingSecret !== "string" || signingSecret.trim().length < 32) {
    throw reconciliationError("invalid_delivery_secret");
  }
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw reconciliationError("invalid_time");
  }
  if (!Array.isArray(objects)) {
    throw reconciliationError("invalid_objects");
  }
  if (typeof fetchImpl !== "function") {
    throw reconciliationError("invalid_fetch");
  }
  if (
    !Number.isInteger(concurrency) ||
    concurrency < 1 ||
    concurrency > MAX_CONCURRENCY
  ) {
    throw reconciliationError("invalid_concurrency");
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw reconciliationError("invalid_timeout");
  }
}

function normalizeObjectDescriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const storagePath = value.storagePath;
  const byteSize =
    typeof value.byteSize === "number"
      ? value.byteSize
      : typeof value.byteSize === "string" && /^\d+$/.test(value.byteSize)
        ? Number(value.byteSize)
        : Number.NaN;
  const mimeType = typeof value.mimeType === "string" ? value.mimeType : null;
  if (
    !isCanonicalObjectKey(storagePath) ||
    !Number.isSafeInteger(byteSize) ||
    byteSize < 1 ||
    !mimeType ||
    !SUPPORTED_IMAGE_MEDIA_TYPES.has(mimeType)
  ) {
    return null;
  }
  return { byteSize, mimeType, storagePath };
}

function isCanonicalObjectKey(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.includes("\\") ||
    new TextEncoder().encode(value).byteLength > MAX_OBJECT_KEY_BYTES
  ) {
    return false;
  }
  const segments = value.split("/");
  return (
    segments.length <= 8 &&
    segments.every((segment) => OBJECT_KEY_SEGMENT_PATTERN.test(segment))
  );
}

function countDuplicateKeys(descriptors) {
  const keys = descriptors
    .filter((descriptor) => descriptor !== null)
    .map((descriptor) => descriptor.storagePath);
  return keys.length - new Set(keys).size;
}

function normalizeMediaType(value) {
  if (typeof value !== "string") return null;
  return value.split(";", 1)[0]?.trim().toLowerCase() || null;
}

function parseContentLength(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function createCheck({
  active,
  checked,
  duplicateDescriptors = 0,
  invalidDescriptors = 0,
  limitExceeded = false,
  matched,
  mismatched,
  missing,
  unavailable,
}) {
  const failed =
    limitExceeded ||
    invalidDescriptors > 0 ||
    duplicateDescriptors > 0 ||
    missing > 0 ||
    mismatched > 0 ||
    unavailable > 0 ||
    matched !== active;
  const detail = [
    `active=${active}`,
    `checked=${checked}`,
    `matched=${matched}`,
    `missing=${missing}`,
    `mismatched=${mismatched}`,
    `unavailable=${unavailable}`,
  ];
  if (limitExceeded) detail.push(`limit=${MAX_OBJECTS}`, "limit_exceeded=true");
  if (invalidDescriptors > 0) {
    detail.push(`invalid_descriptors=${invalidDescriptors}`);
  }
  if (duplicateDescriptors > 0) {
    detail.push(`duplicate_descriptors=${duplicateDescriptors}`);
  }
  return {
    detail: detail.join(" "),
    id: "storage:r2-object-reconciliation",
    status: failed ? "fail" : "pass",
  };
}

function reconciliationError(code) {
  return Object.assign(
    new Error("Cloudflare R2 object reconciliation failed"),
    { code },
  );
}
