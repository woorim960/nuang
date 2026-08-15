import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { FeedMediaR2Adapter } from "@/features/feed/feed-media-r2";
import {
  createFeedMediaObjectKey,
  deleteFeedMediaObjects,
  resolveFeedMediaStorageWriteTarget,
  uploadFeedMediaObject,
} from "@/features/feed/feed-media-storage";

const canaryAccountId = "019fff4b-285d-7111-9c6c-48ced670a41b";
const otherAccountId = "550e8400-e29b-41d4-a716-446655440000";

describe("feed media storage routing", () => {
  it("uses Supabase by default while R2 is disabled", () => {
    expect(
      resolveFeedMediaStorageWriteTarget({
        accountId: canaryAccountId,
        environment: {},
        r2: unavailableR2Adapter("disabled"),
      }),
    ).toEqual({ ok: true, provider: "supabase", r2: null });
  });

  it("routes only an explicitly allowlisted account to a ready R2 target", () => {
    const r2 = readyR2Adapter();

    expect(
      resolveFeedMediaStorageWriteTarget({
        accountId: canaryAccountId,
        environment: {
          FEED_MEDIA_R2_CANARY_ACCOUNT_IDS: ` ${otherAccountId},${canaryAccountId.toUpperCase()} `,
          FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
        },
        r2,
      }),
    ).toEqual({ ok: true, provider: "cloudflare_r2", r2 });
  });

  it("keeps non-allowlisted customers on Supabase without requiring R2 readiness", () => {
    expect(
      resolveFeedMediaStorageWriteTarget({
        accountId: otherAccountId,
        environment: {
          FEED_MEDIA_R2_CANARY_ACCOUNT_IDS: canaryAccountId,
          FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
        },
        r2: unavailableR2Adapter("misconfigured"),
      }),
    ).toEqual({ ok: true, provider: "supabase", r2: null });
  });

  it("requires an explicit all-customers flag before routing outside the allowlist", () => {
    const r2 = readyR2Adapter();

    expect(
      resolveFeedMediaStorageWriteTarget({
        accountId: otherAccountId,
        environment: {
          FEED_MEDIA_R2_ALL_CUSTOMERS: "true",
          FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
        },
        r2,
      }),
    ).toEqual({ ok: true, provider: "cloudflare_r2", r2 });
  });

  it("fails closed for malformed rollout settings and unready canary R2", () => {
    expect(
      resolveFeedMediaStorageWriteTarget({
        accountId: canaryAccountId,
        environment: { FEED_MEDIA_WRITE_PROVIDER: "unknown" },
        r2: readyR2Adapter(),
      }),
    ).toEqual({ ok: false, reason: "configuration_invalid" });

    expect(
      resolveFeedMediaStorageWriteTarget({
        accountId: canaryAccountId,
        environment: {
          FEED_MEDIA_R2_CANARY_ACCOUNT_IDS: "not-a-uuid",
          FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
        },
        r2: readyR2Adapter(),
      }),
    ).toEqual({ ok: false, reason: "configuration_invalid" });

    expect(
      resolveFeedMediaStorageWriteTarget({
        accountId: canaryAccountId,
        environment: {
          FEED_MEDIA_R2_ALL_CUSTOMERS: "yes",
          FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
        },
        r2: readyR2Adapter(),
      }),
    ).toEqual({ ok: false, reason: "configuration_invalid" });

    expect(
      resolveFeedMediaStorageWriteTarget({
        accountId: canaryAccountId,
        environment: {
          FEED_MEDIA_R2_CANARY_ACCOUNT_IDS: canaryAccountId,
          FEED_MEDIA_WRITE_PROVIDER: "cloudflare_r2",
        },
        r2: unavailableR2Adapter("misconfigured"),
      }),
    ).toEqual({ ok: false, reason: "configuration_invalid" });
  });

  it("creates deterministic immutable keys without account or email PII", () => {
    const input = {
      order: 3,
      postId: "019fff4b-285d-7111-9c6c-48ced670a41b",
      uuid: "550e8400-e29b-41d4-a716-446655440000",
    };
    const key = createFeedMediaObjectKey(input);

    expect(key).toBe(
      "feed/v1/019fff4b-285d-7111-9c6c-48ced670a41b/03-550e8400-e29b-41d4-a716-446655440000.webp",
    );
    expect(createFeedMediaObjectKey(input)).toBe(key);
    expect(
      createFeedMediaObjectKey({ ...input, uuid: "new-object-version" }),
    ).not.toBe(key);
    expect(key).not.toContain("account-1");
    expect(key).not.toContain("woorimprog@gmail.com");
  });

  it("dispatches uploads by provider and prevents Supabase overwrites", async () => {
    const harness = createStorageClient();
    const r2 = readyR2Adapter();
    const body = Buffer.from([1, 2, 3]);

    await expect(
      uploadFeedMediaObject({
        body,
        client: harness.client,
        contentType: "image/webp",
        object: {
          provider: "supabase",
          storagePath: "feed/v1/post-1/01-one.webp",
        },
        r2,
      }),
    ).resolves.toEqual({ ok: true });
    expect(harness.upload).toHaveBeenCalledWith(
      "feed/v1/post-1/01-one.webp",
      body,
      {
        cacheControl: "31536000",
        contentType: "image/webp",
        upsert: false,
      },
    );
    expect(r2.putObject).not.toHaveBeenCalled();

    await expect(
      uploadFeedMediaObject({
        body,
        client: harness.client,
        contentType: "image/webp",
        object: {
          provider: "cloudflare_r2",
          storagePath: "feed/v1/post-1/02-two.webp",
        },
        r2,
      }),
    ).resolves.toEqual({ ok: true });
    expect(r2.putObject).toHaveBeenCalledWith({
      body,
      contentType: "image/webp",
      key: "feed/v1/post-1/02-two.webp",
    });
    expect(harness.upload).toHaveBeenCalledTimes(1);
  });

  it("deduplicates and deletes each provider's objects through its own backend", async () => {
    const harness = createStorageClient();
    const r2 = readyR2Adapter();

    await expect(
      deleteFeedMediaObjects({
        client: harness.client,
        objects: [
          { provider: "supabase", storagePath: "supabase/a.webp" },
          { provider: "cloudflare_r2", storagePath: "r2/a.webp" },
          { provider: "supabase", storagePath: "supabase/a.webp" },
          { provider: "cloudflare_r2", storagePath: "r2/b.webp" },
        ],
        r2,
      }),
    ).resolves.toEqual({ failedObjects: [], ok: true });

    expect(r2.deleteObject).toHaveBeenNthCalledWith(1, { key: "r2/a.webp" });
    expect(r2.deleteObject).toHaveBeenNthCalledWith(2, { key: "r2/b.webp" });
    expect(harness.remove).toHaveBeenCalledWith(["supabase/a.webp"]);
    expect(harness.storageFrom).toHaveBeenCalledWith("feed-media");
  });

  it("returns provider-specific failures while still cleaning the available backend", async () => {
    const harness = createStorageClient();

    await expect(
      deleteFeedMediaObjects({
        client: harness.client,
        objects: [
          { provider: "supabase", storagePath: "supabase/a.webp" },
          { provider: "cloudflare_r2", storagePath: "r2/a.webp" },
        ],
        r2: unavailableR2Adapter("disabled"),
      }),
    ).resolves.toEqual({
      failedObjects: [{ provider: "cloudflare_r2", storagePath: "r2/a.webp" }],
      ok: false,
    });

    expect(harness.remove).toHaveBeenCalledWith(["supabase/a.webp"]);
  });

  it("never throws when either provider rejects a delete batch", async () => {
    const r2Harness = createStorageClient();
    const r2 = readyR2Adapter();
    vi.mocked(r2.deleteObject)
      .mockRejectedValueOnce(new Error("R2 timeout"))
      .mockResolvedValueOnce({ ok: true, status: 204 });

    await expect(
      deleteFeedMediaObjects({
        client: r2Harness.client,
        objects: [
          { provider: "cloudflare_r2", storagePath: "r2/a.webp" },
          { provider: "cloudflare_r2", storagePath: "r2/b.webp" },
          { provider: "supabase", storagePath: "supabase/a.webp" },
        ],
        r2,
      }),
    ).resolves.toEqual({
      failedObjects: [{ provider: "cloudflare_r2", storagePath: "r2/a.webp" }],
      ok: false,
    });
    expect(r2Harness.remove).toHaveBeenCalledWith(["supabase/a.webp"]);

    const supabaseHarness = createStorageClient();
    supabaseHarness.remove.mockRejectedValueOnce(new Error("fetch rejected"));
    await expect(
      deleteFeedMediaObjects({
        client: supabaseHarness.client,
        objects: [{ provider: "supabase", storagePath: "supabase/b.webp" }],
        r2,
      }),
    ).resolves.toEqual({
      failedObjects: [{ provider: "supabase", storagePath: "supabase/b.webp" }],
      ok: false,
    });
  });

  it("bounds R2 deletion concurrency while draining more than 100 objects", async () => {
    const harness = createStorageClient();
    const r2 = readyR2Adapter();
    let active = 0;
    let maximumActive = 0;
    vi.mocked(r2.deleteObject).mockImplementation(async () => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return { ok: true, status: 204 };
    });
    const objects = Array.from({ length: 125 }, (_, index) => ({
      provider: "cloudflare_r2" as const,
      storagePath: `r2/${index}.webp`,
    }));

    await expect(
      deleteFeedMediaObjects({ client: harness.client, objects, r2 }),
    ).resolves.toEqual({ failedObjects: [], ok: true });
    expect(r2.deleteObject).toHaveBeenCalledTimes(125);
    expect(maximumActive).toBe(10);
  });
});

function createStorageClient() {
  const upload = vi.fn(async () => ({ error: null }));
  const remove = vi.fn(async () => ({ error: null }));
  const storageFrom = vi.fn(() => ({ remove, upload }));
  const client = {
    storage: { from: storageFrom },
  } as unknown as SupabaseClient;
  return { client, remove, storageFrom, upload };
}

function readyR2Adapter(): FeedMediaR2Adapter {
  return {
    createDeliveryUrl: vi.fn(() => "https://media.nuang.example/signed"),
    deleteObject: vi.fn(async () => ({ ok: true as const, status: 204 })),
    maxManagedBytes: 8_000_000_000,
    putObject: vi.fn(async () => ({ ok: true as const, status: 201 })),
    readiness: { status: "ready" },
  };
}

function unavailableR2Adapter(
  status: "disabled" | "misconfigured",
): FeedMediaR2Adapter {
  const code =
    status === "disabled"
      ? ("feature_disabled" as const)
      : ("configuration_invalid" as const);
  return {
    createDeliveryUrl: vi.fn(() => null),
    deleteObject: vi.fn(async () => ({
      code,
      ok: false as const,
    })),
    maxManagedBytes: null,
    putObject: vi.fn(async () => ({
      code,
      ok: false as const,
    })),
    readiness: { status },
  };
}
