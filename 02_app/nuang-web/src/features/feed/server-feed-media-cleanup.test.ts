import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteFeedMediaObjects: vi.fn(),
}));

vi.mock("@/features/feed/feed-media-storage", () => ({
  deleteFeedMediaObjects: mocks.deleteFeedMediaObjects,
}));

import {
  drainFeedMediaCleanupQueue,
  pruneResolvedFeedMediaCleanupQueue,
  reconcileStaleFeedMediaUploads,
  runFeedMediaCleanupWithinBudget,
} from "@/features/feed/server-feed-media-cleanup";

const supabaseRow = {
  byte_size: 111,
  storage_path: "feed/v1/post-1/01-supabase.webp",
  storage_provider: "supabase" as const,
};
const r2Row = {
  byte_size: "222",
  storage_path: "feed/v1/post-1/02-r2.webp",
  storage_provider: "cloudflare_r2" as const,
};

describe("drainFeedMediaCleanupQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T06:30:00.000Z"));
    mocks.deleteFeedMediaObjects.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes due Supabase and R2 rows by provider and resolves each queue item", async () => {
    const harness = createCleanupClient({ rows: [supabaseRow, r2Row] });
    mocks.deleteFeedMediaObjects.mockResolvedValue({
      failedObjects: [],
      ok: true,
    });

    const result = await drainFeedMediaCleanupQueue({
      client: harness.client as never,
      limit: 500,
    });

    expect(result).toEqual({
      attempted: 2,
      deleted: 2,
      failed: 0,
      ok: true,
    });
    expect(mocks.deleteFeedMediaObjects).toHaveBeenCalledWith({
      client: harness.client,
      objects: [
        {
          provider: "supabase",
          storagePath: supabaseRow.storage_path,
        },
        {
          provider: "cloudflare_r2",
          storagePath: r2Row.storage_path,
        },
      ],
      signal: expect.any(AbortSignal),
    });
    expect(harness.queryCalls).toEqual([
      ["select", "storage_provider,storage_path,byte_size"],
      ["is", "resolved_at", null],
      ["is", "guard_account_id", null],
      ["lte", "next_attempt_at", "2026-08-15T06:30:00.000Z"],
      ["order", "next_attempt_at", { ascending: true }],
      ["limit", 100],
    ]);
    expect(harness.rpc).toHaveBeenCalledWith("resolve_media_storage_cleanup", {
      p_storage_path: supabaseRow.storage_path,
      p_storage_provider: "supabase",
    });
    expect(harness.rpc).toHaveBeenCalledWith("resolve_media_storage_cleanup", {
      p_storage_path: r2Row.storage_path,
      p_storage_provider: "cloudflare_r2",
    });
    expect(JSON.stringify(result)).not.toContain("feed/v1/");
  });

  it("re-enqueues a failed provider deletion while resolving successful objects", async () => {
    const harness = createCleanupClient({ rows: [supabaseRow, r2Row] });
    mocks.deleteFeedMediaObjects.mockResolvedValue({
      failedObjects: [
        {
          provider: "cloudflare_r2",
          storagePath: r2Row.storage_path,
        },
      ],
      ok: false,
    });

    const result = await drainFeedMediaCleanupQueue({
      client: harness.client as never,
    });

    expect(result).toEqual({
      attempted: 2,
      deleted: 1,
      failed: 1,
      ok: false,
    });
    expect(harness.rpc).toHaveBeenCalledWith("resolve_media_storage_cleanup", {
      p_storage_path: supabaseRow.storage_path,
      p_storage_provider: "supabase",
    });
    expect(harness.rpc).toHaveBeenCalledWith("enqueue_media_storage_cleanup", {
      p_byte_size: 222,
      p_reason: "cleanup_retry",
      p_storage_path: r2Row.storage_path,
      p_storage_provider: "cloudflare_r2",
    });
    expect(harness.rpc).not.toHaveBeenCalledWith(
      "resolve_media_storage_cleanup",
      expect.objectContaining({ p_storage_path: r2Row.storage_path }),
    );
    expect(JSON.stringify(result)).not.toContain(r2Row.storage_path);
  });

  it("re-enqueues every due object when provider deletion times out ambiguously", async () => {
    const harness = createCleanupClient({ rows: [r2Row] });
    mocks.deleteFeedMediaObjects.mockRejectedValue(
      new Error("provider timeout"),
    );

    const result = await drainFeedMediaCleanupQueue({
      client: harness.client as never,
    });

    expect(result).toEqual({
      attempted: 1,
      deleted: 0,
      failed: 1,
      ok: false,
    });
    expect(harness.rpc).toHaveBeenCalledWith("enqueue_media_storage_cleanup", {
      p_byte_size: 222,
      p_reason: "cleanup_retry",
      p_storage_path: r2Row.storage_path,
      p_storage_provider: "cloudflare_r2",
    });
    expect(harness.rpc).not.toHaveBeenCalledWith(
      "resolve_media_storage_cleanup",
      expect.anything(),
    );
    expect(JSON.stringify(result)).not.toContain(r2Row.storage_path);
  });

  it("fails closed and re-enqueues an entire large batch at the provider timeout", async () => {
    const rows = Array.from({ length: 100 }, (_, index) => ({
      byte_size: 100 + index,
      storage_path: `feed/v1/post-timeout/${index}.webp`,
      storage_provider: index % 2 === 0 ? "supabase" : "cloudflare_r2",
    }));
    const harness = createCleanupClient({ rows });
    mocks.deleteFeedMediaObjects.mockImplementation(
      async () => new Promise(() => undefined),
    );

    const pending = drainFeedMediaCleanupQueue({
      client: harness.client as never,
      limit: 100,
      providerTimeoutMs: 250,
    });
    await vi.advanceTimersByTimeAsync(251);

    await expect(pending).resolves.toEqual({
      attempted: 100,
      deleted: 0,
      failed: 100,
      ok: false,
    });
    expect(harness.rpc).toHaveBeenCalledTimes(100);
    expect(
      mocks.deleteFeedMediaObjects.mock.calls[0]?.[0]?.signal.aborted,
    ).toBe(true);
    expect(JSON.stringify(await pending)).not.toContain("feed/v1/");
  });

  it("reports a grace-deferred resolve as pending instead of deleted", async () => {
    const harness = createCleanupClient({
      deferredResolvePaths: [supabaseRow.storage_path],
      rows: [supabaseRow],
    });
    mocks.deleteFeedMediaObjects.mockResolvedValue({
      failedObjects: [],
      ok: true,
    });

    const result = await drainFeedMediaCleanupQueue({
      client: harness.client as never,
    });

    expect(result).toEqual({
      attempted: 1,
      deleted: 0,
      failed: 1,
      ok: false,
    });
    expect(harness.rpc).toHaveBeenCalledWith("resolve_media_storage_cleanup", {
      p_storage_path: supabaseRow.storage_path,
      p_storage_provider: "supabase",
    });
    expect(JSON.stringify(result)).not.toContain(supabaseRow.storage_path);
  });

  it("fails closed without deleting anything when the due-row query fails", async () => {
    const harness = createCleanupClient({
      queryError: { code: "PGRST500", message: "read failed" },
      rows: [],
    });

    await expect(
      drainFeedMediaCleanupQueue({ client: harness.client as never }),
    ).resolves.toEqual({ attempted: 0, deleted: 0, failed: 0, ok: false });
    expect(mocks.deleteFeedMediaObjects).not.toHaveBeenCalled();
    expect(harness.rpc).not.toHaveBeenCalled();
  });

  it("ignores malformed queue rows instead of passing unsafe paths to storage", async () => {
    const unsafePath = "../account-1/private.webp";
    const harness = createCleanupClient({
      rows: [
        {
          byte_size: 12,
          storage_path: unsafePath,
          storage_provider: "unknown_provider",
        },
        {
          byte_size: 0,
          storage_path: "feed/v1/post-1/zero.webp",
          storage_provider: "supabase",
        },
      ],
    });

    const result = await drainFeedMediaCleanupQueue({
      client: harness.client as never,
    });

    expect(result).toEqual({ attempted: 0, deleted: 0, failed: 0, ok: true });
    expect(mocks.deleteFeedMediaObjects).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain(unsafePath);
  });
});

describe("runFeedMediaCleanupWithinBudget", () => {
  it("drains more than 100 queued objects across repeated bounded batches", async () => {
    const drain = vi
      .fn()
      .mockResolvedValueOnce({
        attempted: 100,
        deleted: 100,
        failed: 0,
        ok: true,
      })
      .mockResolvedValueOnce({
        attempted: 100,
        deleted: 100,
        failed: 0,
        ok: true,
      })
      .mockResolvedValueOnce({
        attempted: 50,
        deleted: 50,
        failed: 0,
        ok: true,
      });
    const reconcile = vi.fn().mockResolvedValue({
      attempted: 0,
      deleted: 0,
      failed: 0,
      ok: true,
      queued: 0,
      reconciled: 0,
    });

    const result = await runFeedMediaCleanupWithinBudget({
      client: {} as never,
      drain,
      maxAttempted: 1_000,
      reconcile,
    });

    expect(result).toEqual({
      attempted: 250,
      batches: 4,
      budgetExhausted: false,
      deleted: 250,
      failed: 0,
      hasMore: false,
      ok: true,
      queued: 0,
      reconciled: 0,
    });
    expect(drain).toHaveBeenCalledTimes(3);
    expect(drain.mock.calls.map(([options]) => options.limit)).toEqual([
      100, 100, 100,
    ]);
  });

  it("stops before the route reserve is consumed and reports budget exhaustion", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T06:30:00.000Z"));
    const drain = vi.fn(async () => {
      vi.setSystemTime(new Date(Date.now() + 2_500));
      return { attempted: 100, deleted: 100, failed: 0, ok: true };
    });
    const reconcile = vi.fn();

    const result = await runFeedMediaCleanupWithinBudget({
      client: {} as never,
      drain,
      reconcile,
      timeBudgetMs: 3_000,
    });

    expect(result).toMatchObject({
      attempted: 100,
      batches: 1,
      budgetExhausted: true,
      hasMore: true,
      ok: true,
    });
    expect(drain).toHaveBeenCalledTimes(1);
    expect(reconcile).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("uses the batch ceiling even when time does not advance, preventing an infinite loop", async () => {
    const fullCleanup = {
      attempted: 100,
      deleted: 100,
      failed: 0,
      ok: true,
    };
    const drain = vi.fn().mockResolvedValue(fullCleanup);
    const reconcile = vi.fn().mockResolvedValue({
      ...fullCleanup,
      queued: 0,
      reconciled: 100,
    });

    const result = await runFeedMediaCleanupWithinBudget({
      client: {} as never,
      drain,
      maxAttempted: 10_000,
      maxBatches: 3,
      now: () => 1_000,
      reconcile,
    });

    expect(result).toMatchObject({
      attempted: 300,
      batches: 3,
      budgetExhausted: false,
      hasMore: true,
      ok: true,
    });
    expect(drain).toHaveBeenCalledTimes(2);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });
});

describe("pruneResolvedFeedMediaCleanupQueue", () => {
  it("delegates bounded 14-day resolved metadata pruning to the service-only RPC", async () => {
    const rpc = vi.fn(async () => ({ data: 17, error: null }));
    const client = { schema: vi.fn(() => ({ rpc })) };

    const result = await pruneResolvedFeedMediaCleanupQueue({
      client: client as never,
      limit: 999_999,
    });

    expect(result).toEqual({ ok: true, pruned: 17 });
    expect(rpc).toHaveBeenCalledWith("prune_resolved_media_storage_cleanup", {
      p_limit: 100_000,
    });
    expect(JSON.stringify(result)).not.toContain("storage_path");
  });

  it("fails closed when the service-only prune RPC is unavailable", async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: { code: "PGRST500", message: "prune failed" },
    }));
    const client = { schema: vi.fn(() => ({ rpc })) };

    await expect(
      pruneResolvedFeedMediaCleanupQueue({ client: client as never }),
    ).resolves.toEqual({ ok: false, pruned: 0 });
  });
});

describe("reconcileStaleFeedMediaUploads", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T06:30:00.000Z"));
    mocks.deleteFeedMediaObjects.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reconciles stale rows including legacy optimized-at-null media after hiding their post", async () => {
    const rows = [
      createStaleUploadRow({
        id: "media-supabase",
        provider: "supabase",
        storagePath: "feed/v1/post-stale/01-supabase.webp",
      }),
      createStaleUploadRow({
        id: "media-r2",
        provider: "cloudflare_r2",
        storagePath: "feed/v1/post-stale/02-r2.webp",
      }),
    ];
    const harness = createStaleUploadClient({ rows });
    mocks.deleteFeedMediaObjects.mockImplementation(async ({ objects }) => {
      harness.events.push("delete-provider-objects");
      expect(objects).toEqual([
        {
          provider: "supabase",
          storagePath: rows[0].storage_path,
        },
        {
          provider: "cloudflare_r2",
          storagePath: rows[1].storage_path,
        },
      ]);
      return { failedObjects: [], ok: true };
    });

    const result = await reconcileStaleFeedMediaUploads({
      client: harness.client as never,
      limit: 500,
    });

    expect(result).toEqual({
      attempted: 2,
      deleted: 2,
      failed: 0,
      ok: true,
      queued: 0,
      reconciled: 2,
    });
    expect(harness.queryCalls).toEqual([
      ["select", "id,post_id,storage_provider,storage_path,byte_size"],
      ["eq", "storage_accounted", true],
      ["not", "deleted_at", "is", null],
      ["lt", "deleted_at", "2026-08-15T06:00:00.000Z"],
      ["order", "deleted_at", { ascending: true }],
      ["limit", 100],
    ]);
    expect(harness.events).toEqual([
      "hide-post:post-stale",
      "delete-provider-objects",
      "unaccount:media-supabase,media-r2",
    ]);
    expect(harness.postUpdate).toHaveBeenCalledWith({
      deleted_at: "2026-08-15T06:30:00.000Z",
      moderation_status: "removed",
      removed_at: "2026-08-15T06:30:00.000Z",
    });
    expect([...harness.accountedRows.values()]).toEqual([false, false]);
    expect(JSON.stringify(result)).not.toContain("feed/v1/");
  });

  it("durably queues a failed deletion before releasing stale media accounting", async () => {
    const row = createStaleUploadRow({
      id: "media-r2",
      provider: "cloudflare_r2",
      storagePath: "feed/v1/post-stale/01-r2.webp",
    });
    const harness = createStaleUploadClient({ rows: [row] });
    mocks.deleteFeedMediaObjects.mockImplementation(async () => {
      harness.events.push("delete-provider-objects");
      return {
        failedObjects: [
          {
            provider: "cloudflare_r2",
            storagePath: row.storage_path,
          },
        ],
        ok: false,
      };
    });

    const result = await reconcileStaleFeedMediaUploads({
      client: harness.client as never,
    });

    expect(result).toEqual({
      attempted: 1,
      deleted: 0,
      failed: 0,
      ok: true,
      queued: 1,
      reconciled: 1,
    });
    expect(harness.rpc).toHaveBeenCalledWith("enqueue_media_storage_cleanup", {
      p_byte_size: 101,
      p_reason: "stale_upload_reconciliation",
      p_storage_path: row.storage_path,
      p_storage_provider: "cloudflare_r2",
    });
    expect(harness.events).toEqual([
      "hide-post:post-stale",
      "delete-provider-objects",
      `enqueue:${row.storage_path}`,
      "unaccount:media-r2",
    ]);
    expect(harness.accountedRows.get(row.id)).toBe(false);
    expect(JSON.stringify(result)).not.toContain(row.storage_path);
  });

  it("queues every timeout-ambiguous object before releasing stale media accounting", async () => {
    const row = createStaleUploadRow({
      id: "media-timeout",
      provider: "cloudflare_r2",
      storagePath: "feed/v1/post-stale/01-timeout.webp",
    });
    const harness = createStaleUploadClient({ rows: [row] });
    mocks.deleteFeedMediaObjects.mockImplementation(async () => {
      harness.events.push("delete-provider-objects");
      throw new Error("provider timeout");
    });

    const result = await reconcileStaleFeedMediaUploads({
      client: harness.client as never,
    });

    expect(result).toEqual({
      attempted: 1,
      deleted: 0,
      failed: 0,
      ok: true,
      queued: 1,
      reconciled: 1,
    });
    expect(harness.rpc).toHaveBeenCalledWith("enqueue_media_storage_cleanup", {
      p_byte_size: 101,
      p_reason: "stale_upload_reconciliation",
      p_storage_path: row.storage_path,
      p_storage_provider: "cloudflare_r2",
    });
    expect(harness.events).toEqual([
      "hide-post:post-stale",
      "delete-provider-objects",
      `enqueue:${row.storage_path}`,
      "unaccount:media-timeout",
    ]);
    expect(harness.accountedRows.get(row.id)).toBe(false);
    expect(JSON.stringify(result)).not.toContain(row.storage_path);
  });

  it("leaves a stale row accounted and fails when deletion cannot be queued", async () => {
    const row = createStaleUploadRow({
      id: "media-r2",
      provider: "cloudflare_r2",
      storagePath: "feed/v1/post-stale/01-r2.webp",
    });
    const harness = createStaleUploadClient({
      enqueueFailurePaths: [row.storage_path],
      rows: [row],
    });
    mocks.deleteFeedMediaObjects.mockImplementation(async () => {
      harness.events.push("delete-provider-objects");
      return {
        failedObjects: [
          {
            provider: "cloudflare_r2",
            storagePath: row.storage_path,
          },
        ],
        ok: false,
      };
    });

    const result = await reconcileStaleFeedMediaUploads({
      client: harness.client as never,
    });

    expect(result).toEqual({
      attempted: 1,
      deleted: 0,
      failed: 1,
      ok: false,
      queued: 0,
      reconciled: 0,
    });
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(harness.accountedRows.get(row.id)).toBe(true);
    expect(harness.events).toEqual([
      "hide-post:post-stale",
      "delete-provider-objects",
      `enqueue:${row.storage_path}`,
    ]);
    expect(JSON.stringify(result)).not.toContain(row.storage_path);
  });

  it("keeps deleted bytes accounted when the final media DB update fails", async () => {
    const row = createStaleUploadRow({
      id: "media-supabase",
      provider: "supabase",
      storagePath: "feed/v1/post-stale/01-supabase.webp",
    });
    const harness = createStaleUploadClient({
      mediaUpdateError: { code: "PGRST500", message: "update failed" },
      rows: [row],
    });
    mocks.deleteFeedMediaObjects.mockImplementation(async () => {
      harness.events.push("delete-provider-objects");
      return { failedObjects: [], ok: true };
    });

    const result = await reconcileStaleFeedMediaUploads({
      client: harness.client as never,
    });

    expect(result).toEqual({
      attempted: 1,
      deleted: 1,
      failed: 1,
      ok: false,
      queued: 0,
      reconciled: 0,
    });
    expect(harness.accountedRows.get(row.id)).toBe(true);
    expect(harness.events).toEqual([
      "hide-post:post-stale",
      "delete-provider-objects",
      "unaccount:media-supabase",
    ]);
    expect(JSON.stringify(result)).not.toContain(row.storage_path);
  });

  it("does not delete objects when the owning post cannot be hidden", async () => {
    const row = createStaleUploadRow({
      id: "media-supabase",
      provider: "supabase",
      storagePath: "feed/v1/post-stale/01-supabase.webp",
    });
    const harness = createStaleUploadClient({
      postHideFailureIds: [row.post_id],
      rows: [row],
    });

    const result = await reconcileStaleFeedMediaUploads({
      client: harness.client as never,
    });

    expect(result).toEqual({
      attempted: 1,
      deleted: 0,
      failed: 1,
      ok: false,
      queued: 0,
      reconciled: 0,
    });
    expect(mocks.deleteFeedMediaObjects).not.toHaveBeenCalled();
    expect(harness.mediaUpdate).not.toHaveBeenCalled();
    expect(harness.accountedRows.get(row.id)).toBe(true);
  });
});

function createCleanupClient({
  deferredResolvePaths = [],
  queryError = null,
  rows,
}: {
  deferredResolvePaths?: string[];
  queryError?: unknown;
  rows: Array<Record<string, unknown>>;
}) {
  const queryCalls: unknown[][] = [];
  const rpc = vi.fn(
    async (functionName: string, parameters: Record<string, unknown>) => {
      if (
        functionName === "resolve_media_storage_cleanup" &&
        deferredResolvePaths.includes(String(parameters.p_storage_path))
      ) {
        return { data: false, error: null };
      }
      if (functionName === "enqueue_media_storage_cleanup") {
        return { data: "cleanup-1", error: null };
      }
      return { data: true, error: null };
    },
  );
  const query = {
    is(column: string, value: unknown) {
      queryCalls.push(["is", column, value]);
      return query;
    },
    limit(value: number) {
      queryCalls.push(["limit", value]);
      return Promise.resolve({ data: rows, error: queryError });
    },
    lte(column: string, value: unknown) {
      queryCalls.push(["lte", column, value]);
      return query;
    },
    order(column: string, options: unknown) {
      queryCalls.push(["order", column, options]);
      return query;
    },
    select(columns: string) {
      queryCalls.push(["select", columns]);
      return query;
    },
  };
  const client = {
    schema: vi.fn((schema: string) => {
      if (schema !== "feed") throw new Error(`Unexpected schema: ${schema}`);
      return {
        from: vi.fn((table: string) => {
          if (table !== "media_storage_cleanup_queue") {
            throw new Error(`Unexpected table: ${table}`);
          }
          return query;
        }),
        rpc,
      };
    }),
  };

  return { client, queryCalls, rpc };
}

function createStaleUploadRow({
  id,
  postId = "post-stale",
  provider,
  storagePath,
}: {
  id: string;
  postId?: string;
  provider: "cloudflare_r2" | "supabase";
  storagePath: string;
}) {
  return {
    byte_size: 101,
    id,
    optimized_at: null,
    post_id: postId,
    storage_path: storagePath,
    storage_provider: provider,
  };
}

function createStaleUploadClient({
  enqueueFailurePaths = [],
  mediaUpdateError = null,
  postHideFailureIds = [],
  queryError = null,
  rows,
}: {
  enqueueFailurePaths?: string[];
  mediaUpdateError?: unknown;
  postHideFailureIds?: string[];
  queryError?: unknown;
  rows: Array<ReturnType<typeof createStaleUploadRow>>;
}) {
  const accountedRows = new Map(rows.map((row) => [row.id, true]));
  const events: string[] = [];
  const queryCalls: unknown[][] = [];
  const query = {
    eq(column: string, value: unknown) {
      queryCalls.push(["eq", column, value]);
      return query;
    },
    limit(value: number) {
      queryCalls.push(["limit", value]);
      return Promise.resolve({ data: rows, error: queryError });
    },
    lt(column: string, value: unknown) {
      queryCalls.push(["lt", column, value]);
      return query;
    },
    not(column: string, operator: string, value: unknown) {
      queryCalls.push(["not", column, operator, value]);
      return query;
    },
    order(column: string, options: unknown) {
      queryCalls.push(["order", column, options]);
      return query;
    },
    select(columns: string) {
      queryCalls.push(["select", columns]);
      return query;
    },
  };
  const postUpdate = vi.fn((payload: Record<string, unknown>) => {
    void payload;
    return {
      eq: vi.fn(async (_column: string, postId: string) => {
        events.push(`hide-post:${postId}`);
        return {
          error: postHideFailureIds.includes(postId)
            ? { code: "PGRST500", message: "post hide failed" }
            : null,
        };
      }),
    };
  });
  const mediaUpdate = vi.fn((payload: Record<string, unknown>) => {
    expect(payload).toEqual({ storage_accounted: false });
    return {
      in: vi.fn((_column: string, mediaIds: string[]) => ({
        eq: vi.fn(async () => {
          events.push(`unaccount:${mediaIds.join(",")}`);
          if (!mediaUpdateError) {
            for (const mediaId of mediaIds) accountedRows.set(mediaId, false);
          }
          return { error: mediaUpdateError };
        }),
      })),
    };
  });
  const rpc = vi.fn(
    async (functionName: string, parameters: Record<string, unknown>) => {
      if (functionName !== "enqueue_media_storage_cleanup") {
        throw new Error(`Unexpected RPC: ${functionName}`);
      }
      const storagePath = String(parameters.p_storage_path);
      events.push(`enqueue:${storagePath}`);
      return enqueueFailurePaths.includes(storagePath)
        ? {
            data: null,
            error: { code: "PGRST500", message: "enqueue failed" },
          }
        : { data: `cleanup-${storagePath}`, error: null };
    },
  );
  const client = {
    schema: vi.fn((schema: string) => {
      if (schema !== "feed") throw new Error(`Unexpected schema: ${schema}`);
      return {
        from: vi.fn((table: string) => {
          if (table === "feed_post") return { update: postUpdate };
          if (table === "feed_post_media") {
            return { ...query, update: mediaUpdate };
          }
          throw new Error(`Unexpected table: ${table}`);
        }),
        rpc,
      };
    }),
  };

  return {
    accountedRows,
    client,
    events,
    mediaUpdate,
    postUpdate,
    queryCalls,
    rpc,
  };
}
