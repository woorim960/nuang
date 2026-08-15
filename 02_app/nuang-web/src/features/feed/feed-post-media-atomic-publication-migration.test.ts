import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608150004_feed_post_media_atomic_publication.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.replace(/\s+/g, " ").trim();
const activateMediaFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create or replace function feed.activate_feed_post_media(",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.activate_feed_post_media(",
  ),
);
const syncLinkModerationFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create or replace function feed.sync_external_link_target_moderation()",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.sync_external_link_target_moderation()",
  ),
);
const normalizePendingModerationFunction = normalizedMigration.slice(
  normalizedMigration.indexOf(
    "create function feed.normalize_pending_media_post_moderation()",
  ),
  normalizedMigration.indexOf(
    "revoke all on function feed.normalize_pending_media_post_moderation()",
  ),
);

describe("feed post media atomic publication migration", () => {
  it("is a bounded, atomic forward migration after the storage-provider base", () => {
    expect(migration.trimStart()).toMatch(/^begin;/i);
    expect(migration.trimEnd()).toMatch(/commit;$/i);
    expect(normalizedMigration).toContain("set local lock_timeout = '5s';");
    expect(normalizedMigration).toContain(
      "lock table feed.feed_post in access exclusive mode;",
    );
    expect(normalizedMigration).toContain(
      "feed.activate_feed_post_media(uuid,text[])",
    );
    expect(normalizedMigration).toContain(
      "feed_post_media_publication_precondition_failed",
    );
  });

  it("adds exact nullable client idempotency keys and validates their pair", () => {
    expect(normalizedMigration).toContain(
      "add column client_request_id text, add column client_request_hash text",
    );
    expect(normalizedMigration).toContain(
      "char_length(client_request_id) between 8 and 128",
    );
    expect(normalizedMigration).toContain(
      "client_request_id = btrim(client_request_id)",
    );
    expect(normalizedMigration).toContain(
      "client_request_hash ~ '^[0-9a-f]{64}$'",
    );
    expect(normalizedMigration).toContain(
      "(client_request_id is null and client_request_hash is null) or (client_request_id is not null and client_request_hash is not null)",
    );

    for (const constraint of [
      "feed_post_client_request_id_check",
      "feed_post_client_request_hash_check",
      "feed_post_client_request_pair_check",
    ]) {
      expect(normalizedMigration).toContain(
        `validate constraint ${constraint};`,
      );
    }
  });

  it("enforces one covered request key per active account post while allowing rollback retry", () => {
    expect(normalizedMigration).toContain(
      "create unique index feed_post_author_client_request_uidx on feed.feed_post(author_account_id, client_request_id) include (id, client_request_hash) where client_request_id is not null and deleted_at is null;",
    );
    expect(normalizedMigration).toContain("index_row.indisunique");
    expect(normalizedMigration).toContain("index_row.indnkeyatts = 2");
    expect(normalizedMigration).toContain("index_row.indnatts = 4");
    expect(normalizedMigration).toContain(
      "array[ v_author_attnum, v_client_request_id_attnum, v_id_attnum, v_request_hash_attnum ]::smallint[]",
    );
    expect(normalizedMigration).toContain("~* 'client_request_id IS NOT NULL'");
    expect(normalizedMigration).toContain("~* 'deleted_at IS NULL'");
    expect(normalizedMigration).toContain(
      "comment on index feed.feed_post_author_client_request_uidx is",
    );
  });

  it("backfills legacy posts to ready and makes pending publication fail closed", () => {
    expect(normalizedMigration).toContain(
      "add column media_upload_state text not null default 'ready'",
    );
    expect(normalizedMigration).toContain(
      "add column media_final_moderation_status text",
    );
    expect(normalizedMigration).toContain(
      "check (media_upload_state in ('ready', 'pending')) not valid",
    );
    expect(normalizedMigration).toContain(
      "media_final_moderation_status in ('pending_review', 'published')",
    );
    expect(normalizedMigration).toContain(
      "media_upload_state = 'ready' and media_final_moderation_status is null",
    );
    expect(normalizedMigration).toContain(
      "media_upload_state = 'pending' and media_final_moderation_status is not null and published_at is null",
    );
    expect(normalizedMigration).toContain(
      "moderation_status = 'pending_review' and limited_at is null and removed_at is null",
    );
    expect(normalizedMigration).toContain(
      "moderation_status = 'limited' and limited_at is not null and removed_at is null",
    );
    expect(normalizedMigration).toContain(
      "moderation_status = 'removed' and limited_at is null and removed_at is not null",
    );

    for (const constraint of [
      "feed_post_media_upload_state_check",
      "feed_post_media_final_moderation_status_check",
      "feed_post_media_publication_transition_check",
    ]) {
      expect(normalizedMigration).toContain(
        `validate constraint ${constraint};`,
      );
    }
  });

  it("hides pending posts from both public and author SELECT policies", () => {
    expect(normalizedMigration).toContain(
      'drop policy "feed published post read" on feed.feed_post;',
    );
    expect(normalizedMigration).toContain(
      'drop policy "feed own post read" on feed.feed_post;',
    );
    expect(normalizedMigration).toContain(
      "create policy \"feed published post read\" on feed.feed_post as permissive for select to public using ( media_upload_state = 'ready' and moderation_status = 'published' and visibility in ('public', 'profile_public') and deleted_at is null );",
    );
    expect(normalizedMigration).toContain(
      "create policy \"feed own post read\" on feed.feed_post as permissive for select to public using ( media_upload_state = 'ready' and author_account_id = identity.current_account_id() and deleted_at is null );",
    );
    expect(normalizedMigration).toContain("policy_row.polpermissive");
    expect(normalizedMigration).toContain(
      "policy_row.polroles = array[0::oid]",
    );
    expect(normalizedMigration).toContain("policy_row.polwithcheck is null");
    expect(normalizedMigration).toContain("v_published_policy_count <> 1");
    expect(normalizedMigration).toContain("v_own_policy_count <> 1");
    expect(normalizedMigration).toContain(
      "v_post_owner is distinct from v_expected_post_owner",
    );
  });

  it("keeps retry coordination columns private while preserving existing feed reads", () => {
    expect(normalizedMigration).toContain(
      "revoke select on table feed.feed_post from anon, authenticated;",
    );
    expect(normalizedMigration).toContain(
      "attribute.attname not in ( 'client_request_hash', 'client_request_id', 'media_final_moderation_status', 'media_upload_state' )",
    );
    expect(normalizedMigration).toContain(
      "grant select (%s) on table feed.feed_post to anon, authenticated",
    );
    expect(normalizedMigration).toContain(
      "v_public_read_grant_count <> v_public_read_column_count",
    );
    expect(normalizedMigration).toContain(
      "v_internal_read_privilege_count <> 0",
    );
    expect(normalizedMigration).toContain(
      "v_table_select_privilege_count <> 0",
    );
    expect(normalizedMigration).toContain(
      "not pg_catalog.has_table_privilege( 'service_role', 'feed.feed_post', 'SELECT' )",
    );
  });

  it("normalizes existing moderation writers without exposing pending media", () => {
    expect(normalizePendingModerationFunction).toContain(
      "returns trigger language plpgsql set search_path = pg_catalog, feed",
    );
    expect(normalizePendingModerationFunction).toContain(
      "if old.media_upload_state <> 'pending' or new.media_upload_state <> 'pending' then return new",
    );
    expect(normalizePendingModerationFunction).toContain(
      "if new.moderation_status = 'published' then new.media_final_moderation_status := 'published'; new.moderation_status := 'pending_review'",
    );
    expect(normalizePendingModerationFunction).toContain(
      "elsif new.moderation_status = 'pending_review' then",
    );
    expect(normalizePendingModerationFunction).toContain(
      "elsif new.moderation_status = 'limited' then",
    );
    expect(normalizePendingModerationFunction).toContain(
      "elsif new.moderation_status = 'removed' then",
    );
    expect(normalizedMigration).toContain(
      "create trigger feed_post_pending_media_moderation_normalize before update of media_upload_state, media_final_moderation_status, moderation_status, published_at, limited_at, removed_at on feed.feed_post for each row execute function feed.normalize_pending_media_post_moderation();",
    );
    expect(normalizedMigration).toContain(
      "revoke all on function feed.normalize_pending_media_post_moderation() from public, anon, authenticated, service_role;",
    );
    expect(normalizedMigration).toContain(
      "v_normalizer_function_owner is distinct from v_expected_post_owner",
    );
    expect(normalizedMigration).toContain("and not procedure_row.prosecdef");
    expect(normalizedMigration).toContain("v_normalizer_trigger_count <> 1");
  });

  it("keeps link decisions hidden during upload and makes blocked terminal", () => {
    expect(syncLinkModerationFunction).toContain(
      "returns trigger language plpgsql security definer set search_path = pg_catalog, feed",
    );
    expect(syncLinkModerationFunction).toContain(
      "from feed.feed_post post where post.id = new.post_id and post.deleted_at is null for update",
    );
    expect(syncLinkModerationFunction).toContain(
      "if not found then return new; end if;",
    );
    expect(syncLinkModerationFunction).toContain(
      "if v_post_upload_state = 'pending' then",
    );
    expect(syncLinkModerationFunction).toContain(
      "if v_has_blocked then update feed.feed_post post set limited_at = null, moderation_status = 'removed', published_at = null, removed_at = coalesce(post.removed_at, now())",
    );
    expect(syncLinkModerationFunction).toContain(
      "elsif v_post_moderation_status = 'pending_review' then update feed.feed_post post set limited_at = null, media_final_moderation_status = v_next_status, moderation_status = 'pending_review', published_at = null, removed_at = null",
    );
    expect(syncLinkModerationFunction).toContain(
      "and post.media_upload_state = 'ready' and post.moderation_status in ( 'pending_review', 'published', 'removed' )",
    );
    expect(syncLinkModerationFunction).toContain(
      "update feed.feed_comment comment_row",
    );
    expect(normalizedMigration).toContain(
      "revoke all on function feed.sync_external_link_target_moderation() from public, anon, authenticated, service_role;",
    );
    expect(normalizedMigration).toContain(
      "comment on function feed.sync_external_link_target_moderation() is",
    );
    expect(normalizedMigration).toContain(
      "comment on trigger feed_external_link_moderation_sync on feed.feed_external_link is",
    );
  });

  it("locks the live parent and accepts only one exact pending or active media set", () => {
    expect(activateMediaFunction).toContain(
      "cardinality(p_storage_paths) not between 1 and 19",
    );
    expect(activateMediaFunction).toContain(
      "count(*) <> count(distinct supplied_path.storage_path)",
    );
    expect(activateMediaFunction).toContain(
      "from feed.feed_post post where post.id = p_post_id and post.deleted_at is null for update;",
    );
    expect(activateMediaFunction).toContain("if not found then return false;");
    expect(activateMediaFunction).toContain(
      "v_post_upload_state not in ('ready', 'pending')",
    );
    expect(activateMediaFunction).toContain(
      "raise exception 'feed_media_activation_post_state_invalid' using errcode = '23514'",
    );
    expect(activateMediaFunction).toContain(
      "v_current_moderation_status in ('limited', 'removed') then return false",
    );
    expect(activateMediaFunction).toContain(
      "v_current_published_at is not null or v_current_limited_at is not null or v_current_removed_at is not null",
    );
    expect(activateMediaFunction).toContain(
      "from feed.feed_post_media media where media.post_id = p_post_id for update;",
    );
    expect(activateMediaFunction).toContain(
      "v_total_count <> cardinality(p_storage_paths)",
    );
    expect(activateMediaFunction).toContain(
      "v_pending_count <> cardinality(p_storage_paths) and v_active_count <> cardinality(p_storage_paths)",
    );
    expect(activateMediaFunction).toContain("media.storage_accounted");
    expect(activateMediaFunction).toContain("not media.storage_ready");
    expect(activateMediaFunction).toContain("media.optimized_at is not null");
    expect(activateMediaFunction).toContain("media.storage_ready");
    expect(activateMediaFunction).toContain("media.deleted_at is null");
  });

  it("preserves the ready-post writer and makes identical active retries succeed", () => {
    expect(activateMediaFunction).toContain(
      "if v_pending_count = cardinality(p_storage_paths) then update feed.feed_post_media media set deleted_at = null, storage_ready = true",
    );
    expect(activateMediaFunction).toContain(
      "get diagnostics v_media_updated_count = row_count",
    );
    expect(activateMediaFunction).toContain(
      "if v_media_updated_count <> cardinality(p_storage_paths) then raise exception 'feed_media_activation_changed_concurrently'",
    );
    expect(activateMediaFunction).toContain(
      "if v_post_upload_state = 'pending' then",
    );
    expect(activateMediaFunction.trimEnd()).toMatch(/return true; end; \$\$;$/);
  });

  it("publishes the post only in the same transaction as complete media activation", () => {
    const mediaUpdateIndex = activateMediaFunction.indexOf(
      "update feed.feed_post_media media",
    );
    const postUpdateIndex = activateMediaFunction.indexOf(
      "update feed.feed_post post",
    );

    expect(mediaUpdateIndex).toBeGreaterThan(-1);
    expect(postUpdateIndex).toBeGreaterThan(mediaUpdateIndex);
    expect(activateMediaFunction).toContain(
      "media_final_moderation_status = null, media_upload_state = 'ready', moderation_status = v_final_moderation_status",
    );
    expect(activateMediaFunction).toContain(
      "when v_final_moderation_status = 'published' then now() else null",
    );
    expect(activateMediaFunction).toContain(
      "get diagnostics v_post_updated_count = row_count",
    );
    expect(activateMediaFunction).toContain(
      "and post.moderation_status = 'pending_review' and post.published_at is null and post.limited_at is null and post.removed_at is null",
    );
    expect(activateMediaFunction).toContain(
      "raise exception 'feed_media_activation_post_changed_concurrently' using errcode = '40001'",
    );
  });

  it("keeps activation service-only, documented, cache-refreshed, and verified", () => {
    expect(activateMediaFunction).toContain(
      "returns boolean language plpgsql security definer set search_path = pg_catalog, feed",
    );
    expect(normalizedMigration).toContain(
      "revoke all on function feed.activate_feed_post_media(uuid, text[]) from public, anon, authenticated, service_role;",
    );
    expect(normalizedMigration).toContain(
      "grant execute on function feed.activate_feed_post_media(uuid, text[]) to service_role;",
    );
    expect(normalizedMigration).toContain(
      "comment on function feed.activate_feed_post_media(uuid, text[]) is",
    );
    expect(normalizedMigration).toContain(
      "feed_post_media_publication_postcondition_failed",
    );
    expect(normalizedMigration).toContain("v_column_contract_count <> 4");
    expect(normalizedMigration).toContain("v_commented_column_count <> 4");
    expect(normalizedMigration).toContain("v_constraint_count <> 6");
    expect(normalizedMigration).toContain("v_index_contract_count <> 1");
    expect(normalizedMigration).toContain(
      "v_function_owner is distinct from v_expected_activation_owner",
    );
    expect(normalizedMigration).toContain(
      "v_sync_function_owner is distinct from v_expected_sync_function_owner",
    );
    expect(normalizedMigration).toContain("v_sync_trigger_count <> 1");
    expect(normalizedMigration).toContain("notify pgrst, 'reload schema';");
  });

  it("changes only the two intended read policies and no storage objects", () => {
    expect(migration.match(/\bdrop\s+policy\b/gi)).toHaveLength(2);
    expect(migration.match(/\bcreate\s+policy\b/gi)).toHaveLength(2);
    expect(migration).not.toMatch(/\bdisable\s+row\s+level\s+security\b/i);
    expect(migration).not.toMatch(/\bstorage\.objects\b/i);
    expect(migration).not.toMatch(/\bstorage\.buckets\b/i);
    expect(migration).not.toMatch(/\bdrop\s+(?:table|column)\b/i);
  });
});
