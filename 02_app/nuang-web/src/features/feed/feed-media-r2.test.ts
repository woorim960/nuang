import { createHmac, webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canonicalizeFeedMediaR2Key,
  createFeedMediaR2Adapter,
  defaultFeedMediaR2MaxManagedBytes,
  feedMediaR2ConfigurationRules,
  getFeedMediaR2Readiness,
  parseFeedMediaR2MaxManagedBytes,
  validateFeedMediaR2Configuration,
} from "@/features/feed/feed-media-r2";

const readyEnvironment = {
  CLOUDFLARE_R2_ACCESS_KEY_ID: "r2-access-key",
  CLOUDFLARE_R2_ACCOUNT_ID: "a".repeat(32),
  CLOUDFLARE_R2_BUCKET_NAME: "nuang-feed-media",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "s".repeat(40),
  FEED_MEDIA_R2_DELIVERY_ORIGIN: "https://media.nuang.app",
  FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: "h".repeat(40),
  FEED_MEDIA_R2_ENABLED: "true",
  FEED_MEDIA_R2_MAX_MANAGED_BYTES: "8000000000",
  FEED_MEDIA_R2_REQUEST_TIMEOUT_MS: "5000",
};

describe("feed media R2 server adapter", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("stays disabled by default and fails closed without making a request", async () => {
    const signedFetch = vi.fn();
    const adapter = createFeedMediaR2Adapter({
      environment: {},
      signedFetch,
    });

    expect(adapter.readiness).toEqual({ status: "disabled" });
    expect(adapter.maxManagedBytes).toBeNull();
    expect(
      adapter.createDeliveryUrl({ key: "a/post/image.webp", mode: "public" }),
    ).toBeNull();
    await expect(
      adapter.putObject({
        body: new Uint8Array([1, 2, 3]),
        contentType: "image/webp",
        key: "a/post/image.webp",
      }),
    ).resolves.toEqual({ code: "feature_disabled", ok: false });
    expect(signedFetch).not.toHaveBeenCalled();
  });

  it("reports an enabled but incomplete environment as misconfigured", async () => {
    const adapter = createFeedMediaR2Adapter({
      environment: { FEED_MEDIA_R2_ENABLED: "true" },
    });

    expect(getFeedMediaR2Readiness({ FEED_MEDIA_R2_ENABLED: "true" })).toEqual({
      status: "misconfigured",
    });
    await expect(
      adapter.deleteObject({ key: "a/post/image.webp" }),
    ).resolves.toEqual({ code: "configuration_invalid", ok: false });
  });

  it("exports a pure validation summary without returning secret values", () => {
    expect(validateFeedMediaR2Configuration({})).toEqual({
      enabled: false,
      issues: [],
      status: "disabled",
    });
    expect(validateFeedMediaR2Configuration(readyEnvironment)).toEqual({
      enabled: true,
      issues: [],
      status: "ready",
    });

    const invalidSecret = "do-not-return-this-r2-secret";
    const invalidSigningSecret = "short-signing-secret";
    const summary = validateFeedMediaR2Configuration({
      ...readyEnvironment,
      CLOUDFLARE_R2_ACCESS_KEY_ID: " ",
      CLOUDFLARE_R2_ACCOUNT_ID: "not-an-account-id",
      CLOUDFLARE_R2_BUCKET_NAME: "Invalid_Bucket",
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: invalidSecret,
      FEED_MEDIA_R2_DELIVERY_ORIGIN: "http://media.nuang.app/path",
      FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET: invalidSigningSecret,
      FEED_MEDIA_R2_MAX_MANAGED_BYTES: "999999999",
      FEED_MEDIA_R2_REQUEST_TIMEOUT_MS: "249",
    });

    expect(summary).toEqual({
      enabled: true,
      issues: [
        "account_id_invalid",
        "bucket_name_invalid",
        "access_key_id_missing",
        "secret_access_key_invalid",
        "delivery_origin_invalid",
        "delivery_signing_secret_invalid",
        "request_timeout_invalid",
        "max_managed_bytes_invalid",
      ],
      status: "misconfigured",
    });
    expect(JSON.stringify(summary)).not.toContain(invalidSecret);
    expect(JSON.stringify(summary)).not.toContain(invalidSigningSecret);
    expect(feedMediaR2ConfigurationRules.requestTimeoutMs).toEqual({
      default: 5_000,
      maximum: 30_000,
      minimum: 250,
    });
    expect(feedMediaR2ConfigurationRules.maxManagedBytes.default).toBe(
      8_000_000_000,
    );
  });

  it("accepts only canonical immutable object keys", () => {
    expect(
      canonicalizeFeedMediaR2Key(
        "account-1/post_2/01-550e8400-e29b-41d4-a716-446655440000.webp",
      ),
    ).toBe("account-1/post_2/01-550e8400-e29b-41d4-a716-446655440000.webp");

    for (const key of [
      "",
      "/account/post/image.webp",
      "account/post/image.webp/",
      "account//image.webp",
      "account/../image.webp",
      "account/%2e%2e/image.webp",
      "account\\post\\image.webp",
      " account/post/image.webp",
      "account/post/사진.webp",
    ]) {
      expect(canonicalizeFeedMediaR2Key(key), key).toBeNull();
    }
  });

  it("parses the free-tier management ceiling within its safe range", () => {
    expect(parseFeedMediaR2MaxManagedBytes(undefined)).toBe(
      defaultFeedMediaR2MaxManagedBytes,
    );
    expect(parseFeedMediaR2MaxManagedBytes("1000000000")).toBe(1_000_000_000);
    expect(parseFeedMediaR2MaxManagedBytes("9500000000")).toBe(9_500_000_000);
    expect(parseFeedMediaR2MaxManagedBytes("999999999")).toBeNull();
    expect(parseFeedMediaR2MaxManagedBytes("9500000001")).toBeNull();
    expect(parseFeedMediaR2MaxManagedBytes("8GB")).toBeNull();
  });

  it("uses signed S3 PUT and DELETE requests without exposing credentials", async () => {
    const signedFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { headers: { ETag: '"etag-1"' }, status: 201 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const adapter = createFeedMediaR2Adapter({
      environment: readyEnvironment,
      signedFetch,
    });
    const body = Buffer.from([1, 2, 3]);

    await expect(
      adapter.putObject({
        body,
        contentType: "image/webp",
        key: "account-1/post-1/image-1.webp",
      }),
    ).resolves.toEqual({ etag: '"etag-1"', ok: true, status: 201 });
    await expect(
      adapter.deleteObject({ key: "account-1/post-1/image-1.webp" }),
    ).resolves.toEqual({ ok: true, status: 204 });

    const [putUrl, putInit] = signedFetch.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(putUrl).toBe(
      `https://${"a".repeat(32)}.r2.cloudflarestorage.com/nuang-feed-media/account-1/post-1/image-1.webp`,
    );
    expect(putUrl).not.toContain(readyEnvironment.CLOUDFLARE_R2_ACCESS_KEY_ID);
    expect(putUrl).not.toContain(
      readyEnvironment.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    );
    expect(putInit.method).toBe("PUT");
    expect(putInit.body).toBe(body);
    expect(new Headers(putInit.headers).get("If-None-Match")).toBe("*");
    expect(new Headers(putInit.headers).get("Cache-Control")).toBe(
      "private, no-store",
    );
    expect(putInit.signal).toBeInstanceOf(AbortSignal);

    const [deleteUrl, deleteInit] = signedFetch.mock.calls[1] as [
      string,
      RequestInit,
    ];
    expect(deleteUrl).toBe(putUrl);
    expect(deleteInit.method).toBe("DELETE");
  });

  it("applies AWS Signature V4 when no test transport is injected", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const transport = vi.fn(async (input: RequestInfo | URL) => {
      const request = input as Request;
      const authorization = request.headers.get("Authorization") ?? "";
      expect(request).toBeInstanceOf(Request);
      expect(authorization).toMatch(/^AWS4-HMAC-SHA256 /);
      expect(authorization).toContain("/auto/s3/aws4_request");
      expect(authorization).not.toContain(
        readyEnvironment.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      );
      return new Response(null, { status: 201 });
    });
    vi.stubGlobal("fetch", transport);
    const adapter = createFeedMediaR2Adapter({
      environment: readyEnvironment,
    });

    await expect(
      adapter.putObject({
        body: new Uint8Array([1, 2, 3]),
        contentType: "image/webp",
        key: "account/post/image.webp",
      }),
    ).resolves.toEqual({ ok: true, status: 201 });
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("treats deletion as idempotent and classifies storage rejection", async () => {
    const signedFetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 412 }))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));
    const adapter = createFeedMediaR2Adapter({
      environment: readyEnvironment,
      signedFetch,
    });

    await expect(
      adapter.deleteObject({ key: "account/post/image.webp" }),
    ).resolves.toEqual({ ok: true, status: 404 });
    await expect(
      adapter.putObject({
        body: new Uint8Array([1]),
        contentType: "image/webp",
        key: "account/post/image.webp",
      }),
    ).resolves.toEqual({ code: "object_exists", ok: false });
    await expect(
      adapter.deleteObject({ key: "account/post/image.webp" }),
    ).resolves.toEqual({ code: "storage_rejected", ok: false });
  });

  it("aborts a stalled R2 request at the configured timeout", async () => {
    vi.useFakeTimers();
    const signedFetch = vi.fn(
      (_input: Request | { toString(): string }, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          );
        }),
    );
    const adapter = createFeedMediaR2Adapter({
      environment: {
        ...readyEnvironment,
        FEED_MEDIA_R2_REQUEST_TIMEOUT_MS: "250",
      },
      signedFetch,
    });

    const result = adapter.putObject({
      body: new Uint8Array([1]),
      contentType: "image/webp",
      key: "account/post/image.webp",
    });
    await vi.advanceTimersByTimeAsync(251);
    await expect(result).resolves.toEqual({ code: "timeout", ok: false });
  });

  it("creates one-hour Worker HMAC links without exposing S3 credentials", () => {
    const adapter = createFeedMediaR2Adapter({
      environment: readyEnvironment,
      signedFetch: vi.fn(),
    });
    const now = new Date("2026-08-15T00:00:00.000Z");
    const publicUrl = new URL(
      adapter.createDeliveryUrl({
        key: "account/post/image.webp",
        mode: "public",
        now,
      }) ?? "",
    );
    const privateUrl = new URL(
      adapter.createDeliveryUrl({
        key: "account/post/image.webp",
        mode: "private",
        now,
      }) ?? "",
    );

    expect(publicUrl.origin).toBe("https://media.nuang.app");
    expect(publicUrl.searchParams.get("exp")).toBe("1786755600");
    expect(privateUrl.searchParams.get("exp")).toBe("1786755600");
    expect(Array.from(publicUrl.searchParams.keys()).sort()).toEqual([
      "exp",
      "mode",
      "sig",
      "v",
    ]);
    expect(publicUrl.search).not.toContain("X-Amz");

    const expiresAt = Number(publicUrl.searchParams.get("exp"));
    const expectedSignature = createHmac(
      "sha256",
      readyEnvironment.FEED_MEDIA_R2_DELIVERY_SIGNING_SECRET,
    )
      .update(
        `nuang:feed-media-delivery:v1\n/account/post/image.webp\n${expiresAt}\npublic`,
      )
      .digest("base64url");
    expect(publicUrl.searchParams.get("sig")).toBe(expectedSignature);
  });
});
