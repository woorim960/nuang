import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isFeedMediaStorageProvider,
  type FeedMediaStorageProvider,
} from "@/features/feed/feed-media";
import {
  deleteFeedMediaObjects,
  type FeedMediaStoredObject,
} from "@/features/feed/feed-media-storage";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type CleanupRow = {
  byteSize: number;
  provider: FeedMediaStorageProvider;
  storagePath: string;
};

type StaleUploadRow = CleanupRow & {
  id: string;
  postId: string;
};

export const staleFeedMediaUploadAgeMs = 30 * 60 * 1_000;

export const feedMediaCleanupRuntimeLimits = {
  batchSize: 100,
  maxAttempted: 3_000,
  maxBatches: 40,
  providerTimeoutMs: 8_000,
  timeBudgetMs: 42_000,
} as const;

const cleanupMutationConcurrency = 10;
const minimumBatchStartTimeMs = 1_000;

export async function pruneResolvedFeedMediaCleanupQueue({
  client = createSupabaseServiceClient(),
  limit = 10_000,
}: {
  client?: SupabaseClient | null;
  limit?: number;
} = {}) {
  if (!client) return pruneResult(0, false);
  const safeLimit = Math.max(1, Math.min(100_000, Math.trunc(limit)));
  try {
    const response = await client
      .schema("feed")
      .rpc("prune_resolved_media_storage_cleanup", {
        p_limit: safeLimit,
      });
    const pruned =
      typeof response.data === "string" ? Number(response.data) : response.data;
    if (
      response.error ||
      typeof pruned !== "number" ||
      !Number.isSafeInteger(pruned) ||
      pruned < 0 ||
      pruned > safeLimit
    ) {
      return pruneResult(0, false);
    }
    return pruneResult(pruned, true);
  } catch {
    return pruneResult(0, false);
  }
}

export async function drainFeedMediaCleanupQueue({
  client = createSupabaseServiceClient(),
  limit = 20,
  providerTimeoutMs = feedMediaCleanupRuntimeLimits.providerTimeoutMs,
}: {
  client?: SupabaseClient | null;
  limit?: number;
  providerTimeoutMs?: number;
} = {}) {
  if (!client) return cleanupResult(0, 0, 0, false);
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  let response: { data: unknown[] | null; error: unknown };
  try {
    response = (await client
      .schema("feed")
      .from("media_storage_cleanup_queue")
      .select("storage_provider,storage_path,byte_size")
      .is("resolved_at", null)
      .is("guard_account_id", null)
      .lte("next_attempt_at", new Date().toISOString())
      .order("next_attempt_at", { ascending: true })
      .limit(safeLimit)) as { data: unknown[] | null; error: unknown };
  } catch {
    return cleanupResult(0, 0, 0, false);
  }
  if (response.error) return cleanupResult(0, 0, 0, false);

  const rows = (response.data ?? []).flatMap((rawRow) => {
    const row = rawRow as {
      byte_size?: unknown;
      storage_path?: unknown;
      storage_provider?: unknown;
    };
    const byteSize =
      typeof row.byte_size === "string" ? Number(row.byte_size) : row.byte_size;
    if (
      !isFeedMediaStorageProvider(row.storage_provider) ||
      typeof row.storage_path !== "string" ||
      typeof byteSize !== "number" ||
      !Number.isSafeInteger(byteSize) ||
      byteSize <= 0
    ) {
      return [];
    }
    return [
      {
        byteSize,
        provider: row.storage_provider,
        storagePath: row.storage_path,
      } satisfies CleanupRow,
    ];
  });
  if (rows.length === 0) return cleanupResult(0, 0, 0, true);

  let failedKeys = new Set<string>();
  try {
    const deletion = await deleteFeedMediaObjectsWithTimeout({
      client,
      objects: rows.map((row) => ({
        provider: row.provider,
        storagePath: row.storagePath,
      })),
      timeoutMs: providerTimeoutMs,
    });
    failedKeys = new Set(
      deletion.failedObjects.map(
        (object) => `${object.provider}\n${object.storagePath}`,
      ),
    );
    if (!deletion.ok && failedKeys.size === 0) {
      failedKeys = new Set(
        rows.map((row) => `${row.provider}\n${row.storagePath}`),
      );
    }
  } catch {
    failedKeys = new Set(
      rows.map((row) => `${row.provider}\n${row.storagePath}`),
    );
  }
  const mutations = await mapWithConcurrency(
    rows,
    cleanupMutationConcurrency,
    async (row) => {
      const key = `${row.provider}\n${row.storagePath}`;
      const deletionFailed = failedKeys.has(key);
      let rpc: { data: unknown; error: unknown };
      try {
        rpc = deletionFailed
          ? await client.schema("feed").rpc("enqueue_media_storage_cleanup", {
              p_byte_size: row.byteSize,
              p_reason: "cleanup_retry",
              p_storage_path: row.storagePath,
              p_storage_provider: row.provider,
            })
          : await client.schema("feed").rpc("resolve_media_storage_cleanup", {
              p_storage_path: row.storagePath,
              p_storage_provider: row.provider,
            });
      } catch {
        return { deleted: 0, failed: 1 };
      }
      if (rpc.error || deletionFailed || rpc.data !== true) {
        return { deleted: 0, failed: 1 };
      }
      return { deleted: 1, failed: 0 };
    },
  );
  const deleted = sumBy(mutations, "deleted");
  const failed = sumBy(mutations, "failed");

  return cleanupResult(rows.length, deleted, failed, failed === 0);
}

export async function reconcileStaleFeedMediaUploads({
  client = createSupabaseServiceClient(),
  limit = 20,
  providerTimeoutMs = feedMediaCleanupRuntimeLimits.providerTimeoutMs,
}: {
  client?: SupabaseClient | null;
  limit?: number;
  providerTimeoutMs?: number;
} = {}) {
  if (!client) return staleUploadResult(0, 0, 0, 0, 0, false);

  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const staleBefore = new Date(
    Date.now() - staleFeedMediaUploadAgeMs,
  ).toISOString();
  let response: { data: unknown[] | null; error: unknown };
  try {
    response = (await client
      .schema("feed")
      .from("feed_post_media")
      .select("id,post_id,storage_provider,storage_path,byte_size")
      .eq("storage_accounted", true)
      .not("deleted_at", "is", null)
      .lt("deleted_at", staleBefore)
      .order("deleted_at", { ascending: true })
      .limit(safeLimit)) as { data: unknown[] | null; error: unknown };
  } catch {
    return staleUploadResult(0, 0, 0, 0, 0, false);
  }
  if (response.error) return staleUploadResult(0, 0, 0, 0, 0, false);

  const rawRows = response.data ?? [];
  const rows: StaleUploadRow[] = [];
  let failed = 0;

  for (const rawRow of rawRows) {
    const row = rawRow as {
      byte_size?: unknown;
      id?: unknown;
      post_id?: unknown;
      storage_path?: unknown;
      storage_provider?: unknown;
    };
    const byteSize =
      typeof row.byte_size === "string" ? Number(row.byte_size) : row.byte_size;
    if (
      typeof row.id !== "string" ||
      row.id.length === 0 ||
      typeof row.post_id !== "string" ||
      row.post_id.length === 0 ||
      !isFeedMediaStorageProvider(row.storage_provider) ||
      typeof row.storage_path !== "string" ||
      row.storage_path.length === 0 ||
      typeof byteSize !== "number" ||
      !Number.isSafeInteger(byteSize) ||
      byteSize <= 0 ||
      byteSize > 9_500_000_000
    ) {
      failed += 1;
      continue;
    }
    rows.push({
      byteSize,
      id: row.id,
      postId: row.post_id,
      provider: row.storage_provider,
      storagePath: row.storage_path,
    });
  }

  const hiddenAt = new Date().toISOString();
  const hiddenGroups = await mapWithConcurrency(
    [...groupStaleRowsByPost(rows)],
    cleanupMutationConcurrency,
    async ([postId, postRows]) => {
      let hideError = true;
      try {
        const hide = await client
          .schema("feed")
          .from("feed_post")
          .update({
            deleted_at: hiddenAt,
            moderation_status: "removed",
            removed_at: hiddenAt,
          })
          .eq("id", postId);
        hideError = Boolean(hide.error);
      } catch {
        hideError = true;
      }
      return hideError
        ? { failed: postRows.length, rows: [] }
        : { failed: 0, rows: postRows };
    },
  );
  failed += sumBy(hiddenGroups, "failed");
  const hiddenRows = hiddenGroups.flatMap((group) => group.rows);

  let failedDeletionKeys = new Set<string>();
  if (hiddenRows.length > 0) {
    try {
      const deletion = await deleteFeedMediaObjectsWithTimeout({
        client,
        objects: hiddenRows.map((row) => ({
          provider: row.provider,
          storagePath: row.storagePath,
        })),
        timeoutMs: providerTimeoutMs,
      });
      failedDeletionKeys = new Set(
        deletion.failedObjects.map((object) =>
          storageObjectKey(object.provider, object.storagePath),
        ),
      );
      if (!deletion.ok && failedDeletionKeys.size === 0) {
        failedDeletionKeys = new Set(
          hiddenRows.map((row) =>
            storageObjectKey(row.provider, row.storagePath),
          ),
        );
      }
    } catch {
      // Provider timeouts are commit-ambiguous. Queue every immutable key so
      // a later idempotent delete can confirm the final state.
      failedDeletionKeys = new Set(
        hiddenRows.map((row) =>
          storageObjectKey(row.provider, row.storagePath),
        ),
      );
    }
  }

  const queueOutcomes = await mapWithConcurrency(
    hiddenRows,
    cleanupMutationConcurrency,
    async (row) => {
      const key = storageObjectKey(row.provider, row.storagePath);
      if (!failedDeletionKeys.has(key)) {
        return { deleted: 1, failed: 0, queued: 0, row };
      }

      let cleanupQueued = false;
      try {
        const enqueue = await client
          .schema("feed")
          .rpc("enqueue_media_storage_cleanup", {
            p_byte_size: row.byteSize,
            p_reason: "stale_upload_reconciliation",
            p_storage_path: row.storagePath,
            p_storage_provider: row.provider,
          });
        cleanupQueued = !enqueue.error && typeof enqueue.data === "string";
      } catch {
        cleanupQueued = false;
      }
      return cleanupQueued
        ? { deleted: 0, failed: 0, queued: 1, row }
        : { deleted: 0, failed: 1, queued: 0, row: null };
    },
  );
  const deleted = sumBy(queueOutcomes, "deleted");
  const queued = sumBy(queueOutcomes, "queued");
  failed += sumBy(queueOutcomes, "failed");
  const readyRows = queueOutcomes.flatMap((outcome) =>
    outcome.row ? [outcome.row] : [],
  );

  const reconciliationOutcomes = await mapWithConcurrency(
    [...groupStaleRowsByPost(readyRows)].map(([, postRows]) => postRows),
    cleanupMutationConcurrency,
    async (postRows) => {
      let updateError = true;
      try {
        const update = await client
          .schema("feed")
          .from("feed_post_media")
          .update({ storage_accounted: false })
          .in(
            "id",
            postRows.map((row) => row.id),
          )
          .eq("storage_accounted", true);
        updateError = Boolean(update.error);
      } catch {
        updateError = true;
      }
      return updateError
        ? { failed: postRows.length, reconciled: 0 }
        : { failed: 0, reconciled: postRows.length };
    },
  );
  failed += sumBy(reconciliationOutcomes, "failed");
  const reconciled = sumBy(reconciliationOutcomes, "reconciled");

  return staleUploadResult(
    rawRows.length,
    deleted,
    queued,
    reconciled,
    failed,
    failed === 0,
  );
}

export async function runFeedMediaCleanupWithinBudget({
  batchSize = feedMediaCleanupRuntimeLimits.batchSize,
  client = createSupabaseServiceClient(),
  drain = drainFeedMediaCleanupQueue,
  maxAttempted = feedMediaCleanupRuntimeLimits.maxAttempted,
  maxBatches = feedMediaCleanupRuntimeLimits.maxBatches,
  now = Date.now,
  providerTimeoutMs = feedMediaCleanupRuntimeLimits.providerTimeoutMs,
  reconcile = reconcileStaleFeedMediaUploads,
  timeBudgetMs = feedMediaCleanupRuntimeLimits.timeBudgetMs,
}: {
  batchSize?: number;
  client?: SupabaseClient | null;
  drain?: typeof drainFeedMediaCleanupQueue;
  maxAttempted?: number;
  maxBatches?: number;
  now?: () => number;
  providerTimeoutMs?: number;
  reconcile?: typeof reconcileStaleFeedMediaUploads;
  timeBudgetMs?: number;
} = {}) {
  if (!client) {
    return cleanupRuntimeResult({
      attempted: 0,
      batches: 0,
      budgetExhausted: false,
      deleted: 0,
      failed: 1,
      hasMore: true,
      ok: false,
      queued: 0,
      reconciled: 0,
    });
  }

  const safeBatchSize = boundedInteger(batchSize, 1, 100, 100);
  const safeMaxAttempted = boundedInteger(
    maxAttempted,
    1,
    10_000,
    feedMediaCleanupRuntimeLimits.maxAttempted,
  );
  const safeMaxBatches = boundedInteger(
    maxBatches,
    1,
    200,
    feedMediaCleanupRuntimeLimits.maxBatches,
  );
  const safeTimeBudgetMs = boundedInteger(
    timeBudgetMs,
    1_000,
    50_000,
    feedMediaCleanupRuntimeLimits.timeBudgetMs,
  );
  const safeProviderTimeoutMs = boundedInteger(
    providerTimeoutMs,
    250,
    15_000,
    feedMediaCleanupRuntimeLimits.providerTimeoutMs,
  );
  const deadline = readClock(now) + safeTimeBudgetMs;

  let attempted = 0;
  let batches = 0;
  let deleted = 0;
  let failed = 0;
  let ok = true;
  let queued = 0;
  let reconciled = 0;
  let queueDone = false;
  let queueHalted = false;
  let staleDone = false;
  let staleHalted = false;

  const canStartBatch = () =>
    batches < safeMaxBatches &&
    attempted < safeMaxAttempted &&
    deadline - readClock(now) >= minimumBatchStartTimeMs;
  const nextLimit = () => Math.min(safeBatchSize, safeMaxAttempted - attempted);
  const nextProviderTimeout = () =>
    Math.min(
      safeProviderTimeoutMs,
      Math.max(250, deadline - readClock(now) - 500),
    );

  while (
    canStartBatch() &&
    (!queueDone || !staleDone) &&
    (!queueHalted || !staleHalted)
  ) {
    let ranBatch = false;

    if (!queueDone && !queueHalted && canStartBatch()) {
      const limit = nextLimit();
      ranBatch = true;
      batches += 1;
      try {
        const result = await drain({
          client,
          limit,
          providerTimeoutMs: nextProviderTimeout(),
        });
        attempted += result.attempted;
        deleted += result.deleted;
        failed += result.failed;
        ok = ok && result.ok;
        queueDone = result.attempted < limit;
        queueHalted = !result.ok || result.failed > 0;
      } catch {
        failed += 1;
        ok = false;
        queueHalted = true;
      }
    }

    if (!staleDone && !staleHalted && canStartBatch()) {
      const limit = nextLimit();
      ranBatch = true;
      batches += 1;
      try {
        const result = await reconcile({
          client,
          limit,
          providerTimeoutMs: nextProviderTimeout(),
        });
        attempted += result.attempted;
        deleted += result.deleted;
        failed += result.failed;
        queued += result.queued;
        reconciled += result.reconciled;
        ok = ok && result.ok;
        staleDone = result.attempted < limit;
        staleHalted = !result.ok || result.failed > 0;
      } catch {
        failed += 1;
        ok = false;
        staleHalted = true;
      }
    }

    if (
      !ranBatch ||
      ((queueDone || queueHalted) && (staleDone || staleHalted))
    ) {
      break;
    }
  }

  const hasMore = !queueDone || !staleDone;
  return cleanupRuntimeResult({
    attempted,
    batches,
    budgetExhausted:
      hasMore && deadline - readClock(now) < minimumBatchStartTimeMs,
    deleted,
    failed,
    hasMore,
    ok,
    queued,
    reconciled,
  });
}

async function deleteFeedMediaObjectsWithTimeout({
  client,
  objects,
  timeoutMs,
}: {
  client: SupabaseClient;
  objects: FeedMediaStoredObject[];
  timeoutMs: number;
}) {
  const safeTimeoutMs = boundedInteger(timeoutMs, 250, 15_000, 8_000);
  const controller = new AbortController();
  const timeout = Symbol("feed-media-provider-timeout");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deletion = deleteFeedMediaObjects({
    client,
    objects,
    signal: controller.signal,
  }).catch(() => null);
  const result = await Promise.race([
    deletion,
    new Promise<typeof timeout>((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve(timeout);
      }, safeTimeoutMs);
    }),
  ]);
  if (timer) clearTimeout(timer);
  if (!result || result === timeout) {
    controller.abort();
    return { failedObjects: objects, ok: false } as const;
  }
  return result;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<R>,
) {
  if (values.length === 0) return [];
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (true) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= values.length) return;
        results[index] = await operation(values[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function sumBy<K extends PropertyKey, T extends Record<K, number>>(
  values: T[],
  key: K,
) {
  return values.reduce((total, value) => total + value[key], 0);
}

function boundedInteger(
  value: number,
  minimum: number,
  maximum: number,
  fallback: number,
) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(value)));
}

function readClock(now: () => number) {
  const value = now();
  return Number.isFinite(value) ? value : Date.now();
}

function cleanupRuntimeResult(result: {
  attempted: number;
  batches: number;
  budgetExhausted: boolean;
  deleted: number;
  failed: number;
  hasMore: boolean;
  ok: boolean;
  queued: number;
  reconciled: number;
}) {
  return result;
}

function cleanupResult(
  attempted: number,
  deleted: number,
  failed: number,
  ok: boolean,
) {
  return { attempted, deleted, failed, ok } as const;
}

function pruneResult(pruned: number, ok: boolean) {
  return { pruned, ok } as const;
}

function groupStaleRowsByPost(rows: StaleUploadRow[]) {
  const groups = new Map<string, StaleUploadRow[]>();
  for (const row of rows) {
    const group = groups.get(row.postId) ?? [];
    group.push(row);
    groups.set(row.postId, group);
  }
  return groups;
}

function staleUploadResult(
  attempted: number,
  deleted: number,
  queued: number,
  reconciled: number,
  failed: number,
  ok: boolean,
) {
  return { attempted, deleted, queued, reconciled, failed, ok } as const;
}

function storageObjectKey(
  provider: FeedMediaStorageProvider,
  storagePath: string,
) {
  return `${provider}\n${storagePath}`;
}
