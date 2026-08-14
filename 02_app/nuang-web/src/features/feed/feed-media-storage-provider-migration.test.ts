import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202608150003_feed_media_storage_provider.sql",
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ").trim();
const enqueueCleanupFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create function feed.enqueue_media_storage_cleanup(",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.enqueue_media_storage_cleanup(",
  ),
);
const enqueueAccountCleanupFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create function feed.enqueue_account_media_storage_cleanup(",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.enqueue_account_media_storage_cleanup(",
  ),
);
const resolveCleanupFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create function feed.resolve_media_storage_cleanup(",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.resolve_media_storage_cleanup(",
  ),
);
const pruneResolvedCleanupFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create function feed.prune_resolved_media_storage_cleanup(",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.prune_resolved_media_storage_cleanup(",
  ),
);
const hideMediaAfterSoftDeleteFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create function feed.hide_feed_post_media_after_soft_delete()",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.hide_feed_post_media_after_soft_delete()",
  ),
);
const enqueueDeletedMediaCleanupFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create function feed.enqueue_deleted_feed_post_media_cleanup()",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.enqueue_deleted_feed_post_media_cleanup()",
  ),
);
const activateMediaFunction = normalizedMigration.slice(
  normalizedMigration.indexOf("create function feed.activate_feed_post_media("),
  normalizedMigration.indexOf(
    "revoke all on function feed.activate_feed_post_media(",
  ),
);
const reserveFunction = normalizedMigration.slice(
  normalizedMigration.indexOf("create function feed.reserve_media_storage("),
  normalizedMigration.indexOf(
    "revoke all on function feed.reserve_media_storage(",
  ),
);
const releaseFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create function feed.release_media_storage_reservation(",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.release_media_storage_reservation(",
  ),
);

describe("feed media storage provider migration", () => {
  it("runs atomically and abandons a busy table quickly", () => {
    expect(migration.trimStart()).toMatch(/^begin;/i);
    expect(migration.trimEnd()).toMatch(/commit;$/i);
    expect(normalizedMigration).toContain("set local lock_timeout = '5s';");
    expect(normalizedMigration).toContain(
      "lock table feed.feed_post_media in access exclusive mode;",
    );
    expect(normalizedMigration).toContain(
      "lock table identity.account in share row exclusive mode;",
    );
    expect(normalizedMigration).toContain(
      "lock table feed.feed_post in share row exclusive mode;",
    );
    expect(
      normalizedMigration.indexOf("lock table identity.account"),
    ).toBeLessThan(normalizedMigration.indexOf("lock table feed.feed_post in"));
    expect(
      normalizedMigration.indexOf("lock table feed.feed_post in"),
    ).toBeLessThan(
      normalizedMigration.indexOf("lock table feed.feed_post_media"),
    );
    expect(normalizedMigration).toContain(
      "feed_media_storage_identity_account_table_missing",
    );
    expect(normalizedMigration).toContain(
      "feed_media_storage_post_table_missing",
    );
  });

  it("keeps every existing row on Supabase unless a writer opts into R2", () => {
    expect(normalizedMigration).toContain(
      "add column storage_provider text not null default 'supabase'",
    );
    expect(normalizedMigration).toContain(
      "check (storage_provider in ('supabase', 'cloudflare_r2')) not valid",
    );
    expect(normalizedMigration).toContain("add column content_sha256 text");
    expect(normalizedMigration).toContain("content_sha256 ~ '^[0-9a-f]{64}$'");
    expect(normalizedMigration).toContain(
      "add column source_byte_size integer",
    );
    expect(normalizedMigration).toContain(
      "source_byte_size is null or source_byte_size > 0",
    );
    expect(normalizedMigration).toContain(
      "add column optimized_at timestamptz",
    );
    expect(normalizedMigration).toContain(
      "add column storage_accounted boolean not null default true",
    );
    expect(normalizedMigration).toContain(
      "add column storage_ready boolean not null default true",
    );
  });

  it("validates all new data contracts and documents their semantics", () => {
    for (const constraint of [
      "feed_post_media_storage_provider_check",
      "feed_post_media_content_sha256_check",
      "feed_post_media_source_byte_size_check",
    ]) {
      expect(normalizedMigration).toContain(
        `validate constraint ${constraint};`,
      );
    }

    for (const column of [
      "storage_provider",
      "storage_accounted",
      "storage_ready",
      "content_sha256",
      "source_byte_size",
      "optimized_at",
      "bucket_id",
      "storage_path",
    ]) {
      expect(normalizedMigration).toContain(
        `comment on column feed.feed_post_media.${column} is`,
      );
    }
  });

  it("exposes only a fail-closed service usage RPC for free-tier guards", () => {
    expect(normalizedMigration).toContain(
      "create function feed.read_media_storage_usage( p_storage_provider text ) returns bigint language plpgsql stable security definer set search_path = pg_catalog, feed",
    );
    expect(normalizedMigration).toContain(
      "p_storage_provider not in ('supabase', 'cloudflare_r2')",
    );
    expect(normalizedMigration).toContain(
      "raise exception 'feed_media_storage_provider_invalid' using errcode = '22023'",
    );
    expect(normalizedMigration).toContain(
      "coalesce(sum(media.byte_size::bigint), 0::bigint)",
    );
    expect(normalizedMigration).toContain("media.storage_accounted");
    expect(normalizedMigration).toContain("from public, anon, authenticated;");
    expect(normalizedMigration).toContain("to service_role;");
    expect(normalizedMigration).toContain(
      "comment on function feed.read_media_storage_usage(text) is",
    );
  });

  it("creates private, expiring reservations that follow post rollback", () => {
    expect(normalizedMigration).toContain(
      "create table feed.feed_media_storage_reservation",
    );
    expect(normalizedMigration).toContain("id uuid primary key");
    expect(normalizedMigration).toContain(
      "references feed.feed_post(id) on delete cascade",
    );
    expect(normalizedMigration).toContain(
      "check (byte_size between 1 and 9500000000)",
    );
    expect(normalizedMigration).toContain("check (expires_at > created_at)");
    expect(normalizedMigration).toContain("v_now + interval '15 minutes'");
    expect(normalizedMigration).toContain(
      "alter table feed.feed_media_storage_reservation enable row level security",
    );
    expect(normalizedMigration).toContain(
      "revoke all on feed.feed_media_storage_reservation from public, anon, authenticated, service_role",
    );
    expect(normalizedMigration).toContain(
      "grant select on feed.feed_media_storage_reservation to service_role",
    );
    expect(migration).not.toMatch(/\bcreate\s+policy\b/i);
  });

  it("serializes quota checks and counts active plus live reserved bytes", () => {
    expect(reserveFunction).toContain(
      "returns boolean language plpgsql security definer set search_path = pg_catalog, feed",
    );
    expect(
      reserveFunction.match(/pg_catalog\.pg_advisory_xact_lock/g),
    ).toHaveLength(1);
    expect(reserveFunction).toContain(
      "'nuang:feed-media-storage:' || p_storage_provider",
    );
    expect(reserveFunction).toContain("for key share;");
    expect(reserveFunction).toContain("reservation.expires_at <= v_now");
    expect(reserveFunction).toContain(
      "coalesce(sum(media.byte_size::numeric), 0::numeric)",
    );
    expect(reserveFunction).toContain("media.storage_accounted");
    expect(reserveFunction).toContain(
      "coalesce(sum(reservation.byte_size::numeric), 0::numeric)",
    );
    expect(reserveFunction).toContain(
      "coalesce(sum(cleanup.byte_size::numeric), 0::numeric)",
    );
    expect(reserveFunction).toContain("cleanup.resolved_at is null");
    expect(reserveFunction).toContain("cleanup.guard_account_id is null");
    expect(reserveFunction).toContain("if v_existing.id is null then");
    expect(reserveFunction).toContain("+ p_byte_size");
    expect(reserveFunction).toContain("elsif v_active_byte_size");
    expect(reserveFunction).toContain("+ v_cleanup_byte_size");

    const lockIndex = reserveFunction.indexOf("pg_advisory_xact_lock");
    const usageIndex = reserveFunction.indexOf("sum(media.byte_size::numeric)");
    const limitIndex = reserveFunction.indexOf("return false;");
    const insertIndex = reserveFunction.indexOf(
      "insert into feed.feed_media_storage_reservation",
    );

    expect(lockIndex).toBeGreaterThan(-1);
    expect(usageIndex).toBeGreaterThan(lockIndex);
    expect(limitIndex).toBeGreaterThan(usageIndex);
    expect(insertIndex).toBeGreaterThan(limitIndex);
  });

  it("validates reservation inputs and makes retries deterministic", () => {
    expect(reserveFunction).toContain(
      "p_storage_provider not in ('supabase', 'cloudflare_r2')",
    );
    expect(reserveFunction).toContain(
      "p_byte_size not between 1 and 9500000000",
    );
    expect(reserveFunction).toContain(
      "p_max_byte_size not between 1 and 9500000000",
    );
    expect(reserveFunction).toContain("p_byte_size > p_max_byte_size");
    expect(reserveFunction).toContain(
      "raise exception 'feed_media_storage_reservation_post_missing'",
    );
    expect(reserveFunction).toContain(
      "raise exception 'feed_media_storage_reservation_conflict'",
    );
    expect(reserveFunction).toContain("if v_existing.id is not null then");
    expect(reserveFunction).toContain("return true;");
  });

  it("releases under the same provider lock and treats absence as success", () => {
    expect(releaseFunction).toContain(
      "returns boolean language plpgsql security definer set search_path = pg_catalog, feed",
    );
    expect(releaseFunction).toContain(
      "'nuang:feed-media-storage:' || p_storage_provider",
    );
    expect(releaseFunction).toContain(
      "delete from feed.feed_media_storage_reservation",
    );
    expect(releaseFunction).toContain(
      "Deleting an already released, expired, or post-cascaded id is success",
    );
    expect(releaseFunction.trimEnd()).toMatch(/return true; end; \$\$;$/);
    expect(
      migration.match(/'nuang:feed-media-storage:' \|\| p_storage_provider/g),
    ).toHaveLength(5);
  });

  it("tracks unresolved external objects in a service-only cleanup queue", () => {
    expect(normalizedMigration).toContain(
      "create table feed.media_storage_cleanup_queue",
    );
    expect(normalizedMigration).toContain(
      "constraint media_storage_cleanup_queue_byte_size_check check (byte_size between 1 and 9500000000)",
    );
    expect(normalizedMigration).toContain(
      "constraint media_storage_cleanup_queue_resolution_check check (resolved_at is null or resolved_at >= created_at)",
    );
    expect(normalizedMigration).toContain(
      "alter table feed.media_storage_cleanup_queue enable row level security",
    );
    expect(normalizedMigration).toContain(
      "revoke all on feed.media_storage_cleanup_queue from public, anon, authenticated, service_role",
    );
    expect(normalizedMigration).toContain(
      "grant select on feed.media_storage_cleanup_queue to service_role",
    );
    expect(normalizedMigration).toContain(
      "guard_account_id uuid references identity.account(id) on delete set null",
    );
    expect(normalizedMigration).toContain("v_service_role_can_mutate");
  });

  it("enqueues cleanup idempotently without undercounting an orphan", () => {
    expect(enqueueCleanupFunction).toContain(
      "returns uuid language plpgsql security definer set search_path = pg_catalog, feed",
    );
    expect(enqueueCleanupFunction).toContain("pg_advisory_xact_lock");
    expect(enqueueCleanupFunction).toContain(
      "on conflict (storage_provider, storage_path) where resolved_at is null do update set",
    );
    expect(enqueueCleanupFunction).toContain(
      "byte_size = greatest(cleanup.byte_size, excluded.byte_size)",
    );
    expect(enqueueCleanupFunction).toContain(
      "attempts = least(cleanup.attempts + 1, 1000000)",
    );
    expect(enqueueCleanupFunction).toContain(
      "returning cleanup.id into v_cleanup_id",
    );
    expect(enqueueCleanupFunction).toContain(
      "where cleanup.guard_account_id is null",
    );
    expect(enqueueCleanupFunction).toContain(
      "raise exception 'feed_media_storage_cleanup_account_guarded' using errcode = '40001'",
    );
  });

  it("guards account cleanup until the account row is deleted", () => {
    expect(enqueueAccountCleanupFunction).toContain(
      "returns uuid language plpgsql security definer set search_path = pg_catalog, feed",
    );
    expect(enqueueAccountCleanupFunction).toContain(
      "from identity.account account where account.id = p_account_id for key share",
    );
    expect(enqueueAccountCleanupFunction).toContain("guard_account_id");
    expect(enqueueAccountCleanupFunction).toContain(
      "where cleanup.guard_account_id = excluded.guard_account_id and cleanup.guard_account_id is not null",
    );
    expect(enqueueAccountCleanupFunction).toContain(
      "raise exception 'feed_account_media_storage_cleanup_conflict' using errcode = '23505'",
    );
  });

  it("resolves cleanup idempotently under the provider quota lock", () => {
    expect(resolveCleanupFunction).toContain(
      "returns boolean language plpgsql security definer set search_path = pg_catalog, feed",
    );
    expect(resolveCleanupFunction).toContain("pg_advisory_xact_lock");
    expect(resolveCleanupFunction).toContain(
      "update feed.media_storage_cleanup_queue cleanup",
    );
    expect(resolveCleanupFunction).toContain("resolved_at = v_now");
    expect(resolveCleanupFunction).toContain(
      "cleanup.guard_account_id is null",
    );
    expect(resolveCleanupFunction).toContain(
      "cleanup.next_attempt_at <= v_now",
    );
    expect(resolveCleanupFunction).toContain(
      "if v_has_pending then return false;",
    );
    expect(resolveCleanupFunction.trimEnd()).toMatch(
      /return true; end; \$\$;$/,
    );
  });

  it("retains successful cleanup evidence for fourteen days, then prunes a bounded batch", () => {
    expect(pruneResolvedCleanupFunction).toContain(
      "returns integer language plpgsql security definer set search_path = pg_catalog, feed",
    );
    expect(pruneResolvedCleanupFunction).toContain(
      "p_limit not between 1 and 100000",
    );
    expect(pruneResolvedCleanupFunction).toContain(
      "cleanup.resolved_at < now() - interval '14 days'",
    );
    expect(pruneResolvedCleanupFunction).toContain(
      "order by cleanup.resolved_at, cleanup.id limit p_limit for update of cleanup skip locked",
    );
    expect(pruneResolvedCleanupFunction).toContain(
      "delete from feed.media_storage_cleanup_queue cleanup using candidates",
    );
    expect(pruneResolvedCleanupFunction).toContain(
      "get diagnostics v_deleted_count = row_count",
    );
    expect(normalizedMigration).toContain(
      "grant execute on function feed.prune_resolved_media_storage_cleanup(integer) to service_role",
    );
  });

  it("atomically hands physically deleted accounted media to a grace queue", () => {
    expect(enqueueDeletedMediaCleanupFunction).toContain("returns trigger");
    expect(enqueueDeletedMediaCleanupFunction).toContain(
      "if not old.storage_accounted then return old;",
    );
    expect(enqueueDeletedMediaCleanupFunction).toContain(
      "when old.storage_ready then v_now else v_now + interval '15 minutes'",
    );
    expect(enqueueDeletedMediaCleanupFunction).toContain(
      "insert into feed.media_storage_cleanup_queue as cleanup",
    );
    expect(enqueueDeletedMediaCleanupFunction).toContain(
      "on conflict (storage_provider, storage_path) where resolved_at is null do update set",
    );
    expect(enqueueDeletedMediaCleanupFunction).toContain(
      "byte_size = greatest(cleanup.byte_size, excluded.byte_size)",
    );
    expect(enqueueDeletedMediaCleanupFunction).toContain(
      "next_attempt_at = greatest( cleanup.next_attempt_at, excluded.next_attempt_at )",
    );
    expect(enqueueDeletedMediaCleanupFunction).toContain(
      "when cleanup.guard_account_id is null then excluded.reason else cleanup.reason",
    );
    expect(enqueueDeletedMediaCleanupFunction).not.toContain(
      "pg_advisory_xact_lock",
    );
    expect(normalizedMigration).toContain(
      "create trigger feed_post_media_delete_cleanup before delete on feed.feed_post_media for each row execute function feed.enqueue_deleted_feed_post_media_cleanup()",
    );
    expect(normalizedMigration).toContain(
      "revoke all on function feed.enqueue_deleted_feed_post_media_cleanup() from public, anon, authenticated, service_role",
    );
  });

  it("serializes post soft deletion with exact all-or-nothing media activation", () => {
    expect(hideMediaAfterSoftDeleteFunction).toContain("returns trigger");
    expect(hideMediaAfterSoftDeleteFunction).toContain(
      "if old.deleted_at is null and new.deleted_at is not null then",
    );
    expect(hideMediaAfterSoftDeleteFunction).toContain(
      "update feed.feed_post_media media set deleted_at = new.deleted_at where media.post_id = new.id and media.deleted_at is null",
    );
    expect(normalizedMigration).toContain(
      "create trigger feed_post_soft_delete_hide_media after update of deleted_at on feed.feed_post for each row execute function feed.hide_feed_post_media_after_soft_delete()",
    );

    expect(activateMediaFunction).toContain("returns boolean");
    expect(activateMediaFunction).toContain(
      "cardinality(p_storage_paths) not between 1 and 19",
    );
    expect(activateMediaFunction).toContain(
      "count(*) <> count(distinct supplied_path.storage_path)",
    );
    expect(activateMediaFunction).toContain(
      "from feed.feed_post post where post.id = p_post_id and post.deleted_at is null for update",
    );
    expect(activateMediaFunction).toContain("if not found then return false;");
    expect(activateMediaFunction).toContain(
      "v_total_count <> cardinality(p_storage_paths) or v_matching_count <> cardinality(p_storage_paths)",
    );
    expect(activateMediaFunction).toContain("media.storage_accounted");
    expect(activateMediaFunction).toContain("not media.storage_ready");
    expect(activateMediaFunction).toContain("media.deleted_at is not null");
    expect(activateMediaFunction).toContain("media.optimized_at is not null");
    expect(activateMediaFunction).toContain(
      "get diagnostics v_updated_count = row_count",
    );
    expect(activateMediaFunction).toContain(
      "set deleted_at = null, storage_ready = true",
    );
    expect(activateMediaFunction).toContain(
      "raise exception 'feed_media_activation_changed_concurrently' using errcode = '40001'",
    );
    expect(normalizedMigration).toContain(
      "grant execute on function feed.activate_feed_post_media(uuid, text[]) to service_role",
    );
  });

  it("preserves the private bucket, object key, and RLS contracts", () => {
    expect(normalizedMigration).toContain("v_rls_enabled");
    expect(normalizedMigration).toContain("v_bucket_attnum");
    expect(normalizedMigration).toContain("v_storage_path_attnum");
    expect(normalizedMigration).toContain(
      "policy_row.polname = 'feed visible post media read'",
    );
    expect(migration).not.toMatch(/\bdrop\s+column\b/i);
    expect(migration).not.toMatch(/\bdisable\s+row\s+level\s+security\b/i);
    expect(migration).not.toMatch(/\bdrop\s+policy\b/i);
    expect(migration).not.toMatch(/\bstorage\.buckets\b/i);
  });

  it("uses exact covering indexes for each serialized quota component", () => {
    expect(normalizedMigration).toContain("no speculative hash index");
    expect(normalizedMigration).toContain(
      "create index feed_post_media_active_provider_usage_idx on feed.feed_post_media(storage_provider) include (byte_size) where storage_accounted",
    );
    expect(normalizedMigration).toContain(
      "create index feed_media_storage_reservation_provider_expiry_idx on feed.feed_media_storage_reservation(storage_provider, expires_at) include (byte_size)",
    );
    expect(normalizedMigration).toContain(
      "create index feed_media_storage_reservation_post_idx on feed.feed_media_storage_reservation(post_id)",
    );
    expect(normalizedMigration).toContain(
      "create unique index media_storage_cleanup_queue_active_object_uidx on feed.media_storage_cleanup_queue(storage_provider, storage_path) include (byte_size) where resolved_at is null",
    );
    expect(normalizedMigration).toContain(
      "create index media_storage_cleanup_queue_retry_idx on feed.media_storage_cleanup_queue(next_attempt_at, id) where resolved_at is null and guard_account_id is null",
    );
    expect(normalizedMigration).toContain(
      "create index media_storage_cleanup_queue_guard_account_idx on feed.media_storage_cleanup_queue(guard_account_id) where guard_account_id is not null",
    );
    expect(normalizedMigration).toContain(
      "create index media_storage_cleanup_queue_resolved_retention_idx on feed.media_storage_cleanup_queue(resolved_at, id) where resolved_at is not null",
    );
    expect(migration.match(/\bcreate\s+(?:unique\s+)?index\b/gi)).toHaveLength(
      7,
    );
    expect(normalizedMigration).toContain("index_row.indnkeyatts = 1");
    expect(normalizedMigration).toContain("index_row.indnatts = 2");
    expect(normalizedMigration).toContain("index_row.indisvalid");
    expect(normalizedMigration).toContain("index_row.indisready");
    expect(normalizedMigration).toContain("= 'storage_accounted'");
    expect(normalizedMigration).toContain(
      "= '((resolved_at IS NULL) AND (guard_account_id IS NULL))'",
    );
    expect(normalizedMigration).toContain("with ordinality");
  });

  it("does not rewrite existing media rows", () => {
    const schemaPrefix = migration.slice(
      0,
      migration.indexOf("create function feed.enqueue_media_storage_cleanup("),
    );

    expect(schemaPrefix).not.toMatch(/\binsert\s+into\b/i);
    expect(schemaPrefix).not.toMatch(/\bupdate\s+[a-z_]/i);
    expect(schemaPrefix).not.toMatch(/\bdelete\s+from\b/i);
    expect(schemaPrefix).not.toMatch(/\btruncate\b/i);
  });

  it("fails closed on preflight drift and proves the final catalog shape", () => {
    expect(normalizedMigration).toContain(
      "feed_media_storage_provider_precondition_failed",
    );
    expect(normalizedMigration).toContain(
      "v_provider_default is distinct from '''supabase''::text'",
    );
    expect(normalizedMigration).toContain("v_constraint_count <> 3");
    expect(normalizedMigration).toContain(
      "v_function_return_type <> 'bigint'::regtype",
    );
    expect(normalizedMigration).toContain("v_function_volatility <> 's'");
    expect(normalizedMigration).toContain(
      "feed_media_storage_provider_postcondition_failed",
    );
    expect(normalizedMigration).toContain(
      "feed_media_storage_reservation_postcondition_failed",
    );
    expect(normalizedMigration).toContain(
      "feed_media_storage_reservation_rpc_postcondition_failed",
    );
    expect(normalizedMigration).toContain(
      "feed_media_storage_cleanup_postcondition_failed",
    );
    expect(normalizedMigration).toContain(
      "feed_media_storage_cleanup_rpc_postcondition_failed",
    );
    expect(normalizedMigration).toContain(
      "v_function_return_type <> 'boolean'::regtype",
    );
    expect(normalizedMigration).toContain("v_function_volatility <> 'v'");
    expect(normalizedMigration).toContain("notify pgrst, 'reload schema';");
  });
});
