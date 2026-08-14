import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  feedMediaBucket,
  type FeedMediaStorageProvider,
  isFeedMediaStorageProvider,
} from "@/features/feed/feed-media";
import {
  createFeedMediaR2Adapter,
  type FeedMediaDeliveryMode,
  type FeedMediaR2Adapter,
} from "@/features/feed/feed-media-r2";

type Environment = Record<string, string | undefined>;

export type FeedMediaStoredObject = {
  provider: FeedMediaStorageProvider;
  storagePath: string;
};

export type FeedMediaStorageWriteTarget =
  | {
      ok: true;
      provider: "supabase";
      r2: null;
    }
  | {
      ok: true;
      provider: "cloudflare_r2";
      r2: FeedMediaR2Adapter;
    }
  | {
      ok: false;
      reason: "configuration_invalid";
    };

export function resolveFeedMediaStorageWriteTarget({
  environment = process.env,
  r2 = createFeedMediaR2Adapter({ environment }),
}: {
  environment?: Environment;
  r2?: FeedMediaR2Adapter;
} = {}): FeedMediaStorageWriteTarget {
  const configuredProvider =
    environment.FEED_MEDIA_WRITE_PROVIDER?.trim() || "supabase";

  if (!isFeedMediaStorageProvider(configuredProvider)) {
    return { ok: false, reason: "configuration_invalid" };
  }
  if (configuredProvider === "supabase") {
    return { ok: true, provider: "supabase", r2: null };
  }
  if (r2.readiness.status !== "ready" || r2.maxManagedBytes === null) {
    return { ok: false, reason: "configuration_invalid" };
  }
  return { ok: true, provider: "cloudflare_r2", r2 };
}

export function createFeedMediaObjectKey({
  order,
  postId,
  uuid,
}: {
  order: number;
  postId: string;
  uuid: string;
}) {
  return `feed/v1/${postId}/${String(order).padStart(2, "0")}-${uuid}.webp`;
}

export async function uploadFeedMediaObject({
  body,
  client,
  contentType,
  object,
  r2,
}: {
  body: Buffer | Uint8Array;
  client: SupabaseClient;
  contentType: string;
  object: FeedMediaStoredObject;
  r2?: FeedMediaR2Adapter;
}) {
  if (object.provider === "supabase") {
    const response = await client.storage
      .from(feedMediaBucket)
      .upload(object.storagePath, body, {
        cacheControl: "31536000",
        contentType,
        upsert: false,
      });
    return { ok: !response.error } as const;
  }

  const adapter = r2 ?? createFeedMediaR2Adapter();
  const response = await adapter.putObject({
    body,
    contentType,
    key: object.storagePath,
  });
  return { ok: response.ok } as const;
}

export async function deleteFeedMediaObjects({
  client,
  objects,
  r2 = createFeedMediaR2Adapter(),
  signal,
}: {
  client: SupabaseClient;
  objects: FeedMediaStoredObject[];
  r2?: FeedMediaR2Adapter;
  signal?: AbortSignal;
}) {
  const supabasePaths = unique(
    objects
      .filter((object) => object.provider === "supabase")
      .map((object) => object.storagePath),
  );
  const r2Paths = unique(
    objects
      .filter((object) => object.provider === "cloudflare_r2")
      .map((object) => object.storagePath),
  );

  // Both providers run together, but each keeps a strict concurrency bound.
  // The cleanup caller can abort scheduling after its time budget; anything
  // not confirmed deleted remains a failure and therefore stays durably queued.
  const [failedR2Paths, failedSupabasePaths] = await Promise.all([
    deleteR2Paths({ paths: r2Paths, r2, signal }),
    deleteSupabasePaths({ client, paths: supabasePaths, signal }),
  ]);
  const failedObjects: FeedMediaStoredObject[] = [
    ...failedR2Paths.map((storagePath) => ({
      provider: "cloudflare_r2" as const,
      storagePath,
    })),
    ...failedSupabasePaths.map((storagePath) => ({
      provider: "supabase" as const,
      storagePath,
    })),
  ];

  return failedObjects.length === 0
    ? ({ failedObjects: [], ok: true } as const)
    : ({ failedObjects, ok: false } as const);
}

const r2DeleteConcurrency = 10;
const supabaseDeleteBatchSize = 100;

async function deleteR2Paths({
  paths,
  r2,
  signal,
}: {
  paths: string[];
  r2: FeedMediaR2Adapter;
  signal?: AbortSignal;
}) {
  if (paths.length === 0) return [];
  if (r2.readiness.status !== "ready" || signal?.aborted) return paths;

  const deleted = new Array<boolean>(paths.length).fill(false);
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(r2DeleteConcurrency, paths.length) },
    async () => {
      while (!signal?.aborted) {
        const index = nextIndex;
        nextIndex += 1;
        if (index >= paths.length) return;
        try {
          const response = await r2.deleteObject({ key: paths[index] });
          deleted[index] = response.ok;
        } catch {
          // A rejected request is commit-ambiguous and remains failed.
        }
      }
    },
  );
  await Promise.all(workers);
  return paths.filter((_, index) => !deleted[index]);
}

async function deleteSupabasePaths({
  client,
  paths,
  signal,
}: {
  client: SupabaseClient;
  paths: string[];
  signal?: AbortSignal;
}) {
  const deleted = new Array<boolean>(paths.length).fill(false);
  for (
    let index = 0;
    index < paths.length && !signal?.aborted;
    index += supabaseDeleteBatchSize
  ) {
    const batch = paths.slice(index, index + supabaseDeleteBatchSize);
    try {
      const response = await client.storage.from(feedMediaBucket).remove(batch);
      if (!response.error) {
        deleted.fill(true, index, index + batch.length);
      }
    } catch {
      // Treat a rejected storage request exactly like an explicit batch error.
    }
  }
  return paths.filter((_, index) => !deleted[index]);
}

export function createFeedMediaR2DeliveryUrl({
  mode,
  storagePath,
  r2 = createFeedMediaR2Adapter(),
}: {
  mode: FeedMediaDeliveryMode;
  storagePath: string;
  r2?: FeedMediaR2Adapter;
}) {
  if (r2.readiness.status !== "ready") return null;
  return r2.createDeliveryUrl({ key: storagePath, mode });
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
