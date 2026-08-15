import { webcrypto } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createFeedMediaR2Adapter } from "@/features/feed/feed-media-r2";
import { handleFeedMediaRequest } from "../../../cloudflare/feed-media-worker/src/index";

const signingSecret = "worker-shared-signing-secret-1234567890";
const fixedNow = new Date("2026-08-15T00:00:00.000Z");
const objectKey = "account-1/post-1/01-image.webp";

beforeAll(() => {
  vi.stubGlobal("crypto", webcrypto);
});

describe("feed media R2 Worker delivery contract", () => {
  it("verifies a server link and caches public bytes by canonical object key", async () => {
    const bucket = createBucket();
    const cache = new MemoryCache();
    const context = new TestExecutionContext();
    const url = createDeliveryUrl("public");
    expect(
      Number(new URL(url).searchParams.get("exp")) - fixedNow.getTime() / 1_000,
    ).toBe(3_600);

    const first = await handleFeedMediaRequest(
      new Request(url),
      workerEnvironment(bucket),
      context,
      { cache, now: () => fixedNow.getTime() },
    );
    expect(first.status).toBe(200);
    expect(first.headers.get("X-Nuang-Cache")).toBe("MISS");
    expect(first.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=60, immutable",
    );
    expect(first.headers.get("Cross-Origin-Resource-Policy")).toBe("same-site");
    expect(await first.text()).toBe("image-bytes");
    expect(bucket.get).toHaveBeenCalledTimes(1);
    await context.settle();

    expect(cache.lastPutUrl?.search).toBe("");
    expect(cache.lastPutUrl?.pathname).toBe(
      `/__nuang_feed_media_cache_v1__/${objectKey}`,
    );

    const second = await handleFeedMediaRequest(
      new Request(url),
      workerEnvironment(bucket),
      new TestExecutionContext(),
      { cache, now: () => fixedNow.getTime() },
    );
    expect(second.status).toBe(200);
    expect(second.headers.get("X-Nuang-Cache")).toBe("HIT");
    expect(await second.text()).toBe("image-bytes");
    expect(bucket.get).toHaveBeenCalledTimes(1);
  });

  it("always bypasses cache and disables storage for private delivery", async () => {
    const bucket = createBucket();
    const cache = new MemoryCache();
    const url = createDeliveryUrl("private");

    for (let requestNumber = 0; requestNumber < 2; requestNumber += 1) {
      const response = await handleFeedMediaRequest(
        new Request(url),
        workerEnvironment(bucket),
        new TestExecutionContext(),
        { cache, now: () => fixedNow.getTime() },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("X-Nuang-Cache")).toBe("BYPASS");
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
        "same-site",
      );
      expect(await response.text()).toBe("image-bytes");
    }

    expect(bucket.get).toHaveBeenCalledTimes(2);
    expect(cache.match).not.toHaveBeenCalled();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("keeps public delivery available when the edge cache lookup fails", async () => {
    const bucket = createBucket();
    const cache = new MemoryCache();
    cache.match.mockRejectedValueOnce(new Error("cache unavailable"));

    const response = await handleFeedMediaRequest(
      new Request(createDeliveryUrl("public")),
      workerEnvironment(bucket),
      new TestExecutionContext(),
      { cache, now: () => fixedNow.getTime() },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Nuang-Cache")).toBe("BYPASS");
    expect(await response.text()).toBe("image-bytes");
    expect(bucket.get).toHaveBeenCalledTimes(1);
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("keeps the public link valid for delayed lazy loading beyond the cache TTL", async () => {
    const bucket = createBucket();
    const response = await handleFeedMediaRequest(
      new Request(createDeliveryUrl("public")),
      workerEnvironment(bucket),
      new TestExecutionContext(),
      {
        cache: new MemoryCache(),
        now: () => fixedNow.getTime() + 3_500_000,
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=60, immutable",
    );
    expect(bucket.get).toHaveBeenCalledTimes(1);
  });

  it("rejects tampering, expiry, and extra query parameters before R2", async () => {
    const bucket = createBucket();
    const original = new URL(createDeliveryUrl("public"));
    const signature = original.searchParams.get("sig") ?? "";

    const tampered = new URL(original);
    tampered.searchParams.set(
      "sig",
      `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`,
    );
    const tamperedResponse = await handleFeedMediaRequest(
      new Request(tampered),
      workerEnvironment(bucket),
      new TestExecutionContext(),
      { cache: new MemoryCache(), now: () => fixedNow.getTime() },
    );
    expect(tamperedResponse.status).toBe(401);

    const expiredResponse = await handleFeedMediaRequest(
      new Request(original),
      workerEnvironment(bucket),
      new TestExecutionContext(),
      {
        cache: new MemoryCache(),
        now: () => fixedNow.getTime() + 3_601_000,
      },
    );
    expect(expiredResponse.status).toBe(401);

    const extraParameter = new URL(original);
    extraParameter.searchParams.set("download", "1");
    const extraParameterResponse = await handleFeedMediaRequest(
      new Request(extraParameter),
      workerEnvironment(bucket),
      new TestExecutionContext(),
      { cache: new MemoryCache(), now: () => fixedNow.getTime() },
    );
    expect(extraParameterResponse.status).toBe(401);
    expect(bucket.get).not.toHaveBeenCalled();
    expect(bucket.head).not.toHaveBeenCalled();
  });

  it("accepts the optional previous secret only during a valid rotation", async () => {
    const previousSecret = "worker-previous-signing-secret-123456789";
    const bucket = createBucket();
    const response = await handleFeedMediaRequest(
      new Request(createDeliveryUrl("private", previousSecret)),
      workerEnvironment(bucket, previousSecret),
      new TestExecutionContext(),
      { now: () => fixedNow.getTime() },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("image-bytes");
    expect(bucket.get).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the optional previous secret is short or unchanged", async () => {
    for (const previousSecret of ["short", signingSecret]) {
      const bucket = createBucket();
      const response = await handleFeedMediaRequest(
        new Request(createDeliveryUrl("public")),
        workerEnvironment(bucket, previousSecret),
        new TestExecutionContext(),
        { cache: new MemoryCache(), now: () => fixedNow.getTime() },
      );

      expect(response.status).toBe(503);
      expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
        "same-site",
      );
      expect(bucket.get).not.toHaveBeenCalled();
    }
  });

  it("rejects non-image R2 metadata without caching the response", async () => {
    const bucket = createBucket("text/html; charset=utf-8");
    const cache = new MemoryCache();
    const context = new TestExecutionContext();
    const response = await handleFeedMediaRequest(
      new Request(createDeliveryUrl("public")),
      workerEnvironment(bucket),
      context,
      { cache, now: () => fixedNow.getTime() },
    );

    expect(response.status).toBe(415);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe(
      "same-site",
    );
    expect(await response.text()).toBe("Unsupported media type");
    await context.settle();
    expect(cache.put).not.toHaveBeenCalled();
  });

  it("supports HEAD without downloading the object and rejects every write method", async () => {
    const bucket = createBucket();
    const url = createDeliveryUrl("public");
    const context = new TestExecutionContext();

    const head = await handleFeedMediaRequest(
      new Request(url, { method: "HEAD" }),
      workerEnvironment(bucket),
      context,
      { cache: new MemoryCache(), now: () => fixedNow.getTime() },
    );
    expect(head.status).toBe(200);
    expect(head.headers.get("X-Nuang-Cache")).toBe("MISS");
    expect(await head.text()).toBe("");
    expect(bucket.head).toHaveBeenCalledTimes(1);
    expect(bucket.get).not.toHaveBeenCalled();

    const post = await handleFeedMediaRequest(
      new Request(url, { method: "POST" }),
      workerEnvironment(bucket),
      context,
      { cache: new MemoryCache(), now: () => fixedNow.getTime() },
    );
    expect(post.status).toBe(405);
    expect(post.headers.get("Allow")).toBe("GET, HEAD");
  });

  it("fails closed for missing secrets and non-canonical paths", async () => {
    const bucket = createBucket();
    const unavailable = await handleFeedMediaRequest(
      new Request("https://media.nuang.app/account/post/image.webp"),
      {
        FEED_MEDIA: bucket,
        FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: "",
      },
      new TestExecutionContext(),
    );
    expect(unavailable.status).toBe(503);

    const invalidPath = await handleFeedMediaRequest(
      new Request(
        "https://media.nuang.app/account/%252e%252e/image.webp?v=1&exp=1786755600&mode=public&sig=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      ),
      workerEnvironment(bucket),
      new TestExecutionContext(),
      { cache: new MemoryCache(), now: () => fixedNow.getTime() },
    );
    expect(invalidPath.status).toBe(400);
    expect(bucket.get).not.toHaveBeenCalled();
  });
});

function createDeliveryUrl(
  mode: "private" | "public",
  deliverySigningSecret = signingSecret,
) {
  const adapter = createFeedMediaR2Adapter({
    environment: {
      CLOUDFLARE_R2_ACCESS_KEY_ID: "access-key",
      CLOUDFLARE_R2_ACCOUNT_ID: "a".repeat(32),
      CLOUDFLARE_R2_BUCKET_NAME: "nuang-feed-media",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: "s".repeat(40),
      FEED_MEDIA_R2_DELIVERY_ORIGIN: "https://media.nuang.app",
      FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: deliverySigningSecret,
      FEED_MEDIA_R2_ENABLED: "true",
    },
    signedFetch: vi.fn(),
  });
  const url = adapter.createDeliveryUrl({
    key: objectKey,
    mode,
    now: fixedNow,
  });
  if (!url) throw new Error("Test R2 adapter was not ready.");
  return url;
}

function createBucket(contentType = "image/webp") {
  const metadata = {
    httpEtag: '"etag-1"',
    size: 11,
    uploaded: new Date("2026-08-15T00:00:00.000Z"),
    writeHttpMetadata(headers: Headers) {
      headers.set("Content-Type", contentType);
    },
  };
  return {
    get: vi.fn(async () => ({ ...metadata, body: "image-bytes" })),
    head: vi.fn(async () => metadata),
  };
}

function workerEnvironment(
  bucket: ReturnType<typeof createBucket>,
  previousSigningSecret?: string,
) {
  return {
    FEED_MEDIA: bucket,
    FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: signingSecret,
    ...(previousSigningSecret === undefined
      ? {}
      : {
          FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET_PREVIOUS: previousSigningSecret,
        }),
  };
}

class TestExecutionContext {
  private readonly promises: Promise<unknown>[] = [];

  waitUntil(promise: Promise<unknown>) {
    this.promises.push(promise);
  }

  async settle() {
    await Promise.all(this.promises);
  }
}

class MemoryCache {
  private readonly entries = new Map<string, Response>();
  lastPutUrl: URL | null = null;

  match = vi.fn(async (request: Request) => {
    return this.entries.get(request.url)?.clone();
  });

  put = vi.fn(async (request: Request, response: Response) => {
    this.lastPutUrl = new URL(request.url);
    this.entries.set(request.url, response.clone());
  });
}
