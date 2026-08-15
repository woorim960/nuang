begin;

set local lock_timeout = '5s';

-- This forward-only migration introduces the database half of two rolling
-- contracts. A client request key makes post creation retryable without
-- duplicating a customer's post, while a pending publication state keeps a
-- photo post private until every immutable object is ready. The existing app
-- may continue creating ready posts and calling the same activation RPC.
do $$
begin
  if to_regclass('feed.feed_post') is null then
    raise exception 'feed_post_media_publication_post_table_missing'
      using errcode = '42P01';
  end if;

  if to_regclass('feed.feed_post_media') is null then
    raise exception 'feed_post_media_publication_media_table_missing'
      using errcode = '42P01';
  end if;

  if to_regprocedure('feed.activate_feed_post_media(uuid,text[])') is null then
    raise exception 'feed_post_media_publication_activation_rpc_missing'
      using errcode = '42883';
  end if;

  if to_regprocedure('feed.normalize_pending_media_post_moderation()')
      is not null
    or exists (
      select 1
      from pg_catalog.pg_trigger trigger_row
      where trigger_row.tgrelid = 'feed.feed_post'::regclass
        and trigger_row.tgname =
          'feed_post_pending_media_moderation_normalize'
        and not trigger_row.tgisinternal
    )
  then
    raise exception 'feed_post_media_publication_normalizer_already_exists'
      using errcode = '42710';
  end if;
end;
$$;

-- ALTER TABLE requires this lock in either case. Acquiring it explicitly with
-- a bounded timeout makes a busy deployment fail before making any change.
-- Activation, soft deletion, and the media FK all serialize through this
-- parent relation, so no separate media-table lock is needed.
lock table feed.feed_post in access exclusive mode;

do $$
declare
  v_activation_owner oid;
  v_policy_count integer;
  v_post_owner oid;
  v_required_column_count integer;
  v_rls_enabled boolean;
  v_sync_function_owner oid;
  v_target_column_count integer;
begin
  select count(*)
  into v_required_column_count
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attname in (
      'author_account_id',
      'deleted_at',
      'limited_at',
      'moderation_status',
      'published_at',
      'removed_at'
    )
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select count(*)
  into v_target_column_count
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attname in (
      'client_request_hash',
      'client_request_id',
      'media_final_moderation_status',
      'media_upload_state'
    )
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select relation.relowner, relation.relrowsecurity
  into v_post_owner, v_rls_enabled
  from pg_catalog.pg_class relation
  where relation.oid = 'feed.feed_post'::regclass;

  select count(*)
  into v_policy_count
  from pg_catalog.pg_policy policy_row
  where policy_row.polrelid = 'feed.feed_post'::regclass
    and policy_row.polname in (
      'feed own post read',
      'feed published post read'
    )
    and policy_row.polcmd = 'r'
    and policy_row.polpermissive
    and policy_row.polroles = array[0::oid]
    and policy_row.polwithcheck is null;

  select procedure_row.proowner
  into v_activation_owner
  from pg_catalog.pg_proc procedure_row
  where procedure_row.oid = to_regprocedure(
    'feed.activate_feed_post_media(uuid,text[])'
  );

  select procedure_row.proowner
  into v_sync_function_owner
  from pg_catalog.pg_proc procedure_row
  where procedure_row.oid = to_regprocedure(
    'feed.sync_external_link_target_moderation()'
  );

  if v_required_column_count <> 6
    or v_target_column_count <> 0
    or v_policy_count <> 2
    or not coalesce(v_rls_enabled, false)
    or v_post_owner is null
    or v_activation_owner is null
    or v_sync_function_owner is null
    or not pg_catalog.has_table_privilege(
      'anon',
      'feed.feed_post',
      'SELECT'
    )
    or not pg_catalog.has_table_privilege(
      'authenticated',
      'feed.feed_post',
      'SELECT'
    )
    or not pg_catalog.has_table_privilege(
      'service_role',
      'feed.feed_post',
      'SELECT'
    )
    or not exists (
      select 1
      from pg_catalog.pg_attribute attribute
      where attribute.attrelid = 'feed.feed_post_media'::regclass
        and attribute.attname = 'storage_path'
        and attribute.atttypid = 'text'::regtype
        and attribute.attnotnull
        and attribute.attnum > 0
        and not attribute.attisdropped
    )
    or not exists (
      select 1
      from pg_catalog.pg_attribute attribute
      where attribute.attrelid = 'feed.feed_post_media'::regclass
        and attribute.attname = 'storage_ready'
        and attribute.atttypid = 'boolean'::regtype
        and attribute.attnotnull
        and attribute.attnum > 0
        and not attribute.attisdropped
    )
    or not exists (
      select 1
      from pg_catalog.pg_attribute attribute
      where attribute.attrelid = 'feed.feed_post_media'::regclass
        and attribute.attname = 'storage_accounted'
        and attribute.atttypid = 'boolean'::regtype
        and attribute.attnotnull
        and attribute.attnum > 0
        and not attribute.attisdropped
    )
    or not exists (
      select 1
      from pg_catalog.pg_attribute attribute
      where attribute.attrelid = 'feed.feed_post_media'::regclass
        and attribute.attname = 'optimized_at'
        and attribute.atttypid = 'timestamp with time zone'::regtype
        and attribute.attnum > 0
        and not attribute.attisdropped
    )
  then
    raise exception 'feed_post_media_publication_precondition_failed'
      using errcode = '23514';
  end if;

  -- Custom transaction-local settings retain the original owners across the
  -- DDL below so postconditions prove that policy/function replacement did not
  -- transfer ownership to a deployment helper role.
  perform pg_catalog.set_config(
    'nuang.feed_post_owner_oid',
    v_post_owner::text,
    true
  );
  perform pg_catalog.set_config(
    'nuang.feed_activation_owner_oid',
    v_activation_owner::text,
    true
  );
  perform pg_catalog.set_config(
    'nuang.feed_link_sync_owner_oid',
    v_sync_function_owner::text,
    true
  );
end;
$$;

alter table feed.feed_post
  add column client_request_id text,
  add column client_request_hash text,
  add column media_upload_state text not null default 'ready',
  add column media_final_moderation_status text;

alter table feed.feed_post
  add constraint feed_post_client_request_id_check
  check (
    client_request_id is null
    or (
      char_length(client_request_id) between 8 and 128
      and client_request_id = btrim(client_request_id)
    )
  ) not valid,
  add constraint feed_post_client_request_hash_check
  check (
    client_request_hash is null
    or client_request_hash ~ '^[0-9a-f]{64}$'
  ) not valid,
  add constraint feed_post_client_request_pair_check
  check (
    (client_request_id is null and client_request_hash is null)
    or (client_request_id is not null and client_request_hash is not null)
  ) not valid,
  add constraint feed_post_media_upload_state_check
  check (media_upload_state in ('ready', 'pending'))
  not valid,
  add constraint feed_post_media_final_moderation_status_check
  check (
    media_final_moderation_status is null
    or media_final_moderation_status in ('pending_review', 'published')
  ) not valid,
  add constraint feed_post_media_publication_transition_check
  check (
    (
      media_upload_state = 'ready'
      and media_final_moderation_status is null
    )
    or (
      media_upload_state = 'pending'
      and media_final_moderation_status is not null
      and published_at is null
      and (
        (
          moderation_status = 'pending_review'
          and limited_at is null
          and removed_at is null
        )
        or (
          moderation_status = 'limited'
          and limited_at is not null
          and removed_at is null
        )
        or (
          moderation_status = 'removed'
          and limited_at is null
          and removed_at is not null
        )
      )
    )
  ) not valid;

alter table feed.feed_post
  validate constraint feed_post_client_request_id_check;
alter table feed.feed_post
  validate constraint feed_post_client_request_hash_check;
alter table feed.feed_post
  validate constraint feed_post_client_request_pair_check;
alter table feed.feed_post
  validate constraint feed_post_media_upload_state_check;
alter table feed.feed_post
  validate constraint feed_post_media_final_moderation_status_check;
alter table feed.feed_post
  validate constraint feed_post_media_publication_transition_check;

-- NULL request keys belong to the rolling-deploy path and do not participate
-- in idempotency. The included id/hash lets a retry resolve the canonical post
-- and distinguish a byte-for-byte retry from key reuse without a heap lookup.
-- A rolled-back soft-deleted post leaves the boundary so the same request can
-- create a fresh active post instead of being trapped behind a failed upload.
create unique index feed_post_author_client_request_uidx
on feed.feed_post(author_account_id, client_request_id)
include (id, client_request_hash)
where client_request_id is not null
  and deleted_at is null;

comment on column feed.feed_post.client_request_id is
  'Optional trimmed client-generated idempotency key. It is unique per author and must be accompanied by client_request_hash.';
comment on column feed.feed_post.client_request_hash is
  'Optional lowercase SHA-256 of the canonical create-post request. Same-key retries compare this hash before returning the existing post.';
comment on column feed.feed_post.media_upload_state is
  'Photo-publication barrier. Existing and legacy-writer rows default ready; new photo posts remain pending until atomic media activation.';
comment on column feed.feed_post.media_final_moderation_status is
  'Final pending_review or published status held only while media_upload_state is pending, then cleared by atomic activation.';
comment on index feed.feed_post_author_client_request_uidx is
  'Per-account create-post idempotency boundary for active non-NULL client request keys, covering conflict resolution fields while allowing retry after soft-delete rollback.';

-- Existing admin, suspension, and rollback writers predate the media
-- publication barrier. Normalize only an already-pending row that remains
-- pending, so those established writes can make a held moderation decision
-- without exposing a half-finished photo post or violating the new CHECK.
create function feed.normalize_pending_media_post_moderation()
returns trigger
language plpgsql
set search_path = pg_catalog, feed
as $$
begin
  if old.media_upload_state <> 'pending'
    or new.media_upload_state <> 'pending'
  then
    return new;
  end if;

  if new.moderation_status = 'published' then
    new.media_final_moderation_status := 'published';
    new.moderation_status := 'pending_review';
    new.published_at := null;
    new.limited_at := null;
    new.removed_at := null;
  elsif new.moderation_status = 'pending_review' then
    -- A caller such as the external-link synchronizer may intentionally set
    -- either held value. Preserve it; a missing/invalid held value remains a
    -- hard CHECK failure instead of being guessed here.
    new.published_at := null;
    new.limited_at := null;
    new.removed_at := null;
  elsif new.moderation_status = 'limited' then
    new.published_at := null;
    new.limited_at := coalesce(new.limited_at, now());
    new.removed_at := null;
  elsif new.moderation_status = 'removed' then
    new.published_at := null;
    new.limited_at := null;
    new.removed_at := coalesce(new.removed_at, now());
  else
    raise exception 'feed_pending_media_moderation_invalid'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function feed.normalize_pending_media_post_moderation()
from public, anon, authenticated, service_role;

create trigger feed_post_pending_media_moderation_normalize
before update of
  media_upload_state,
  media_final_moderation_status,
  moderation_status,
  published_at,
  limited_at,
  removed_at
on feed.feed_post
for each row
execute function feed.normalize_pending_media_post_moderation();

comment on function feed.normalize_pending_media_post_moderation() is
  'Trigger-only compatibility boundary. Existing writers may moderate an already-pending photo post, but cannot expose it before atomic media activation.';

comment on trigger feed_post_pending_media_moderation_normalize
on feed.feed_post is
  'Normalizes legacy/admin moderation updates while both OLD and NEW media publication states remain pending.';

-- Pending photo posts must not appear even to their author as empty/ghost
-- cards. Recreate both SELECT policies in the same transaction, preserving the
-- original public and ownership predicates while adding the ready barrier.
drop policy "feed published post read" on feed.feed_post;
drop policy "feed own post read" on feed.feed_post;

create policy "feed published post read"
on feed.feed_post
as permissive
for select
to public
using (
  media_upload_state = 'ready'
  and moderation_status = 'published'
  and visibility in ('public', 'profile_public')
  and deleted_at is null
);

create policy "feed own post read"
on feed.feed_post
as permissive
for select
to public
using (
  media_upload_state = 'ready'
  and author_account_id = identity.current_account_id()
  and deleted_at is null
);

-- Request idempotency and pending-publication state are server coordination
-- details, not customer-facing feed data. Historical grants exposed every
-- future column through table-level SELECT, so replace only that privilege
-- with an explicit allowlist of the columns that existed before this
-- migration. INSERT/UPDATE/DELETE grants are intentionally left unchanged for
-- rolling compatibility; RLS continues to govern which rows are visible.
revoke select on table feed.feed_post from anon, authenticated;

do $$
declare
  v_public_read_columns text;
begin
  select string_agg(
    pg_catalog.quote_ident(attribute.attname),
    ', '
    order by attribute.attnum
  )
  into v_public_read_columns
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname not in (
      'client_request_hash',
      'client_request_id',
      'media_final_moderation_status',
      'media_upload_state'
    );

  if v_public_read_columns is null then
    raise exception 'feed_post_media_public_read_columns_missing'
      using errcode = '23514';
  end if;

  execute pg_catalog.format(
    'grant select (%s) on table feed.feed_post to anon, authenticated',
    v_public_read_columns
  );
end;
$$;

-- Link review can finish while immutable image uploads are still in flight.
-- For a pending post, allowed/pending outcomes update only the held final
-- moderation decision and keep the current row hidden. A blocked outcome is a
-- terminal pending state: activation returns false and can never republish it.
-- Ready posts and comments retain the established moderation behavior.
create or replace function feed.sync_external_link_target_moderation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_has_blocked boolean;
  v_has_pending boolean;
  v_next_status text;
  v_post_moderation_status text;
  v_post_upload_state text;
begin
  if new.post_id is not null then
    -- Use the same parent lock as media activation. Whichever transaction wins
    -- establishes the state observed by the other; no stale link decision can
    -- race an upload and overwrite a later parent transition.
    select post.media_upload_state, post.moderation_status
    into v_post_upload_state, v_post_moderation_status
    from feed.feed_post post
    where post.id = new.post_id
      and post.deleted_at is null
    for update;

    if not found then
      return new;
    end if;

    -- Aggregate only after owning the parent lock. Concurrent link decisions
    -- for the same post therefore update the held/final state in one order.
    select
      coalesce(bool_or(link.review_status = 'pending'), false),
      coalesce(bool_or(link.review_status = 'blocked'), false)
    into v_has_pending, v_has_blocked
    from feed.feed_external_link link
    where link.post_id = new.post_id;

    v_next_status := case
      when v_has_blocked then 'removed'
      when v_has_pending then 'pending_review'
      else 'published'
    end;

    if v_post_upload_state = 'pending' then
      if v_has_blocked then
        update feed.feed_post post
        set
          limited_at = null,
          moderation_status = 'removed',
          published_at = null,
          removed_at = coalesce(post.removed_at, now())
        where post.id = new.post_id
          and post.deleted_at is null
          and post.media_upload_state = 'pending';
      elsif v_post_moderation_status = 'pending_review' then
        update feed.feed_post post
        set
          limited_at = null,
          media_final_moderation_status = v_next_status,
          moderation_status = 'pending_review',
          published_at = null,
          removed_at = null
        where post.id = new.post_id
          and post.deleted_at is null
          and post.media_upload_state = 'pending'
          and post.moderation_status = 'pending_review';
      end if;
    else
      update feed.feed_post post
      set
        moderation_status = v_next_status,
        published_at = case
          when v_next_status = 'published'
            then coalesce(post.published_at, now())
          else post.published_at
        end,
        removed_at = case
          when v_next_status = 'removed'
            then coalesce(post.removed_at, now())
          when v_next_status = 'published' then null
          else post.removed_at
        end
      where post.id = new.post_id
        and post.deleted_at is null
        and post.media_upload_state = 'ready'
        and post.moderation_status in (
          'pending_review',
          'published',
          'removed'
        );
    end if;
  elsif new.comment_id is not null then
    select
      coalesce(bool_or(link.review_status = 'pending'), false),
      coalesce(bool_or(link.review_status = 'blocked'), false)
    into v_has_pending, v_has_blocked
    from feed.feed_external_link link
    where link.comment_id = new.comment_id;

    v_next_status := case
      when v_has_blocked then 'removed'
      when v_has_pending then 'pending_review'
      else 'published'
    end;

    update feed.feed_comment comment_row
    set
      moderation_status = v_next_status,
      published_at = case
        when v_next_status = 'published'
          then coalesce(comment_row.published_at, now())
        else comment_row.published_at
      end,
      removed_at = case
        when v_next_status = 'removed'
          then coalesce(comment_row.removed_at, now())
        when v_next_status = 'published' then null
        else comment_row.removed_at
      end
    where comment_row.id = new.comment_id
      and comment_row.deleted_at is null
      and comment_row.moderation_status in (
        'pending_review',
        'published',
        'removed'
      );
  end if;

  return new;
end;
$$;

revoke all on function feed.sync_external_link_target_moderation()
from public, anon, authenticated, service_role;

comment on function feed.sync_external_link_target_moderation() is
  'Trigger-only link moderation synchronizer. Pending photo posts retain a hidden current state while allowed/pending decisions update their held final status; blocked is terminal and cannot be activated.';

comment on trigger feed_external_link_moderation_sync
on feed.feed_external_link is
  'Serializes external-link review outcomes with parent post media activation and preserves the existing ready-post/comment moderation path.';

create or replace function feed.activate_feed_post_media(
  p_post_id uuid,
  p_storage_paths text[]
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_active_count integer;
  v_current_limited_at timestamptz;
  v_current_moderation_status text;
  v_current_published_at timestamptz;
  v_current_removed_at timestamptz;
  v_final_moderation_status text;
  v_media_updated_count integer;
  v_pending_count integer;
  v_post_updated_count integer;
  v_post_upload_state text;
  v_total_count integer;
begin
  if p_post_id is null
    or p_storage_paths is null
    or cardinality(p_storage_paths) not between 1 and 19
    or array_position(p_storage_paths, null) is not null
    or exists (
      select 1
      from unnest(p_storage_paths) as supplied_path(storage_path)
      where char_length(supplied_path.storage_path) not between 1 and 1024
        or supplied_path.storage_path is distinct from
          btrim(supplied_path.storage_path)
    )
    or (
      select count(*) <> count(distinct supplied_path.storage_path)
      from unnest(p_storage_paths) as supplied_path(storage_path)
    )
  then
    raise exception 'feed_media_activation_invalid'
      using errcode = '22023';
  end if;

  -- One parent-row lock is the publication serialization point. It excludes
  -- a concurrent soft/cascade delete and blocks a new media FK insertion until
  -- the exact child set and, for new writers, final post state commit together.
  select
    post.limited_at,
    post.moderation_status,
    post.published_at,
    post.removed_at,
    post.media_final_moderation_status,
    post.media_upload_state
  into
    v_current_limited_at,
    v_current_moderation_status,
    v_current_published_at,
    v_current_removed_at,
    v_final_moderation_status,
    v_post_upload_state
  from feed.feed_post post
  where post.id = p_post_id
    and post.deleted_at is null
  for update;

  if not found then
    return false;
  end if;

  if v_post_upload_state not in ('ready', 'pending')
    or (
      v_post_upload_state = 'pending'
      and (
        v_final_moderation_status is null
        or v_final_moderation_status not in ('pending_review', 'published')
      )
    )
    or (
      v_post_upload_state = 'ready'
      and v_final_moderation_status is not null
    )
  then
    raise exception 'feed_media_activation_post_state_invalid'
      using errcode = '23514';
  end if;

  -- A link or safety decision that limited/removed the hidden post is terminal
  -- for this upload attempt. Return false before touching child media so the
  -- caller follows its durable rollback/cleanup path instead of republishing.
  if v_post_upload_state = 'pending'
    and v_current_moderation_status in ('limited', 'removed')
  then
    return false;
  end if;

  if v_post_upload_state = 'pending'
    and (
      v_current_moderation_status <> 'pending_review'
      or v_current_published_at is not null
      or v_current_limited_at is not null
      or v_current_removed_at is not null
    )
  then
    raise exception 'feed_media_activation_post_state_invalid'
      using errcode = '23514';
  end if;

  -- Lock the existing child rows before classifying the set. New child rows
  -- remain excluded by the locked parent's FK check, so the following counts
  -- are an exact transaction-stable snapshot rather than a best-effort scan.
  perform 1
  from feed.feed_post_media media
  where media.post_id = p_post_id
  for update;

  select
    count(*)::integer,
    count(*) filter (
      where media.storage_path = any(p_storage_paths)
        and media.storage_accounted
        and not media.storage_ready
        and media.deleted_at is not null
        and media.optimized_at is not null
    )::integer,
    count(*) filter (
      where media.storage_path = any(p_storage_paths)
        and media.storage_accounted
        and media.storage_ready
        and media.deleted_at is null
    )::integer
  into v_total_count, v_pending_count, v_active_count
  from feed.feed_post_media media
  where media.post_id = p_post_id;

  if v_total_count <> cardinality(p_storage_paths)
    or (
      v_pending_count <> cardinality(p_storage_paths)
      and v_active_count <> cardinality(p_storage_paths)
    )
  then
    return false;
  end if;

  -- Current writers arrive here with a ready post and pending media. New
  -- writers arrive with a pending post. Both use the same all-or-nothing child
  -- transition; a committed retry instead takes the active-set success path.
  if v_pending_count = cardinality(p_storage_paths) then
    update feed.feed_post_media media
    set
      deleted_at = null,
      storage_ready = true
    where media.post_id = p_post_id
      and media.storage_path = any(p_storage_paths)
      and media.storage_accounted
      and not media.storage_ready
      and media.deleted_at is not null
      and media.optimized_at is not null;
    get diagnostics v_media_updated_count = row_count;

    if v_media_updated_count <> cardinality(p_storage_paths) then
      raise exception 'feed_media_activation_changed_concurrently'
        using errcode = '40001';
    end if;
  end if;

  -- Only the new pending protocol changes the parent. The post cannot become
  -- public before its complete media set is active because this update shares
  -- the transaction and row lock above. A review-pending post stays unpublished.
  if v_post_upload_state = 'pending' then
    update feed.feed_post post
    set
      media_final_moderation_status = null,
      media_upload_state = 'ready',
      moderation_status = v_final_moderation_status,
      published_at = case
        when v_final_moderation_status = 'published' then now()
        else null
      end
    where post.id = p_post_id
      and post.deleted_at is null
      and post.media_upload_state = 'pending'
      and post.media_final_moderation_status = v_final_moderation_status
      and post.moderation_status = 'pending_review'
      and post.published_at is null
      and post.limited_at is null
      and post.removed_at is null;
    get diagnostics v_post_updated_count = row_count;

    if v_post_updated_count <> 1 then
      raise exception 'feed_media_activation_post_changed_concurrently'
        using errcode = '40001';
    end if;
  end if;

  return true;
end;
$$;

revoke all on function feed.activate_feed_post_media(uuid, text[])
from public, anon, authenticated, service_role;

grant execute on function feed.activate_feed_post_media(uuid, text[])
to service_role;

comment on function feed.activate_feed_post_media(uuid, text[]) is
  'Service-only rolling-compatible activation. It exposes exactly one supplied optimized media set and atomically finalizes a pending post; an identical committed active-set retry succeeds.';

-- Fail the whole transaction if future edits weaken the persisted contract,
-- the covering uniqueness boundary, or the service-only RPC surface.
do $$
declare
  v_author_attnum smallint;
  v_client_request_id_attnum smallint;
  v_column_contract_count integer;
  v_commented_column_count integer;
  v_constraint_count integer;
  v_expected_activation_owner oid;
  v_expected_post_owner oid;
  v_expected_sync_function_owner oid;
  v_function_acl aclitem[];
  v_function_config text[];
  v_function_oid oid;
  v_function_owner oid;
  v_id_attnum smallint;
  v_index_contract_count integer;
  v_internal_read_privilege_count integer;
  v_normalizer_function_acl aclitem[];
  v_normalizer_function_config text[];
  v_normalizer_function_oid oid;
  v_normalizer_function_owner oid;
  v_normalizer_trigger_count integer;
  v_own_policy_count integer;
  v_post_owner oid;
  v_public_read_column_count integer;
  v_public_read_grant_count integer;
  v_published_policy_count integer;
  v_request_hash_attnum smallint;
  v_rls_enabled boolean;
  v_service_role_can_execute boolean;
  v_sync_function_acl aclitem[];
  v_sync_function_config text[];
  v_sync_function_oid oid;
  v_sync_function_owner oid;
  v_sync_trigger_count integer;
  v_table_select_privilege_count integer;
begin
  v_expected_post_owner := nullif(
    pg_catalog.current_setting('nuang.feed_post_owner_oid', true),
    ''
  )::oid;
  v_expected_activation_owner := nullif(
    pg_catalog.current_setting('nuang.feed_activation_owner_oid', true),
    ''
  )::oid;
  v_expected_sync_function_owner := nullif(
    pg_catalog.current_setting('nuang.feed_link_sync_owner_oid', true),
    ''
  )::oid;

  select relation.relowner, relation.relrowsecurity
  into v_post_owner, v_rls_enabled
  from pg_catalog.pg_class relation
  where relation.oid = 'feed.feed_post'::regclass;

  select attribute.attnum::smallint
  into v_author_attnum
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attname = 'author_account_id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_client_request_id_attnum
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attname = 'client_request_id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_id_attnum
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_request_hash_attnum
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attname = 'client_request_hash'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select count(*)
  into v_column_contract_count
  from pg_catalog.pg_attribute attribute
  left join pg_catalog.pg_attrdef default_row
    on default_row.adrelid = attribute.attrelid
    and default_row.adnum = attribute.attnum
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and (
      (
        attribute.attname in ('client_request_id', 'client_request_hash')
        and attribute.atttypid = 'text'::regtype
        and not attribute.attnotnull
        and default_row.oid is null
      )
      or (
        attribute.attname = 'media_upload_state'
        and attribute.atttypid = 'text'::regtype
        and attribute.attnotnull
        and pg_catalog.pg_get_expr(
          default_row.adbin,
          default_row.adrelid
        ) = '''ready''::text'
      )
      or (
        attribute.attname = 'media_final_moderation_status'
        and attribute.atttypid = 'text'::regtype
        and not attribute.attnotnull
        and default_row.oid is null
      )
    );

  select count(*)
  into v_commented_column_count
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attname in (
      'client_request_hash',
      'client_request_id',
      'media_final_moderation_status',
      'media_upload_state'
    )
    and attribute.attnum > 0
    and not attribute.attisdropped
    and pg_catalog.col_description(
      attribute.attrelid,
      attribute.attnum
    ) is not null;

  select count(*)
  into v_constraint_count
  from pg_catalog.pg_constraint constraint_row
  where constraint_row.conrelid = 'feed.feed_post'::regclass
    and constraint_row.contype = 'c'
    and constraint_row.convalidated
    and constraint_row.conname in (
      'feed_post_client_request_hash_check',
      'feed_post_client_request_id_check',
      'feed_post_client_request_pair_check',
      'feed_post_media_final_moderation_status_check',
      'feed_post_media_publication_transition_check',
      'feed_post_media_upload_state_check'
    );

  select
    count(*),
    count(*) filter (
      where pg_catalog.has_column_privilege(
        'anon',
        'feed.feed_post',
        attribute.attname,
        'SELECT'
      )
      and pg_catalog.has_column_privilege(
        'authenticated',
        'feed.feed_post',
        attribute.attname,
        'SELECT'
      )
    )
  into v_public_read_column_count, v_public_read_grant_count
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname not in (
      'client_request_hash',
      'client_request_id',
      'media_final_moderation_status',
      'media_upload_state'
    );

  select count(*)
  into v_internal_read_privilege_count
  from pg_catalog.pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname in (
      'client_request_hash',
      'client_request_id',
      'media_final_moderation_status',
      'media_upload_state'
    )
    and (
      pg_catalog.has_column_privilege(
        'anon',
        'feed.feed_post',
        attribute.attname,
        'SELECT'
      )
      or pg_catalog.has_column_privilege(
        'authenticated',
        'feed.feed_post',
        attribute.attname,
        'SELECT'
      )
    );

  select
    pg_catalog.has_table_privilege(
      'anon',
      'feed.feed_post',
      'SELECT'
    )::integer
    + pg_catalog.has_table_privilege(
      'authenticated',
      'feed.feed_post',
      'SELECT'
    )::integer
  into v_table_select_privilege_count;

  select count(*)
  into v_index_contract_count
  from pg_catalog.pg_index index_row
  join pg_catalog.pg_class index_relation
    on index_relation.oid = index_row.indexrelid
  where index_relation.relnamespace = 'feed'::regnamespace
    and index_relation.relname = 'feed_post_author_client_request_uidx'
    and index_row.indrelid = 'feed.feed_post'::regclass
    and index_row.indisunique
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 2
    and index_row.indnatts = 4
    and array(
      select indexed_attribute.attnum
      from unnest(index_row.indkey::smallint[]) with ordinality
        as indexed_attribute(attnum, position)
      order by indexed_attribute.position
    ) = array[
      v_author_attnum,
      v_client_request_id_attnum,
      v_id_attnum,
      v_request_hash_attnum
    ]::smallint[]
    and index_row.indpred is not null
    and pg_catalog.pg_get_expr(
      index_row.indpred,
      index_row.indrelid
    ) ~* 'client_request_id IS NOT NULL'
    and pg_catalog.pg_get_expr(
      index_row.indpred,
      index_row.indrelid
    ) ~* 'deleted_at IS NULL';

  select count(*)
  into v_published_policy_count
  from pg_catalog.pg_policy policy_row
  where policy_row.polrelid = 'feed.feed_post'::regclass
    and policy_row.polname = 'feed published post read'
    and policy_row.polcmd = 'r'
    and policy_row.polpermissive
    and policy_row.polroles = array[0::oid]
    and policy_row.polwithcheck is null
    and pg_catalog.pg_get_expr(
      policy_row.polqual,
      policy_row.polrelid
    ) = '((media_upload_state = ''ready''::text) AND (moderation_status = ''published''::text) AND (visibility = ANY (ARRAY[''public''::text, ''profile_public''::text])) AND (deleted_at IS NULL))';

  select count(*)
  into v_own_policy_count
  from pg_catalog.pg_policy policy_row
  where policy_row.polrelid = 'feed.feed_post'::regclass
    and policy_row.polname = 'feed own post read'
    and policy_row.polcmd = 'r'
    and policy_row.polpermissive
    and policy_row.polroles = array[0::oid]
    and policy_row.polwithcheck is null
    and pg_catalog.pg_get_expr(
      policy_row.polqual,
      policy_row.polrelid
    ) = '((media_upload_state = ''ready''::text) AND (author_account_id = identity.current_account_id()) AND (deleted_at IS NULL))';

  v_function_oid := to_regprocedure(
    'feed.activate_feed_post_media(uuid,text[])'
  );

  if v_function_oid is not null then
    select
      procedure_row.proacl,
      procedure_row.proconfig,
      procedure_row.proowner
    into
      v_function_acl,
      v_function_config,
      v_function_owner
    from pg_catalog.pg_proc procedure_row
    where procedure_row.oid = v_function_oid;

    v_service_role_can_execute := pg_catalog.has_function_privilege(
      'service_role',
      v_function_oid,
      'EXECUTE'
    );
  end if;

  v_sync_function_oid := to_regprocedure(
    'feed.sync_external_link_target_moderation()'
  );

  if v_sync_function_oid is not null then
    select
      procedure_row.proacl,
      procedure_row.proconfig,
      procedure_row.proowner
    into
      v_sync_function_acl,
      v_sync_function_config,
      v_sync_function_owner
    from pg_catalog.pg_proc procedure_row
    where procedure_row.oid = v_sync_function_oid;
  end if;

  v_normalizer_function_oid := to_regprocedure(
    'feed.normalize_pending_media_post_moderation()'
  );

  if v_normalizer_function_oid is not null then
    select
      procedure_row.proacl,
      procedure_row.proconfig,
      procedure_row.proowner
    into
      v_normalizer_function_acl,
      v_normalizer_function_config,
      v_normalizer_function_owner
    from pg_catalog.pg_proc procedure_row
    where procedure_row.oid = v_normalizer_function_oid;
  end if;

  select count(*)
  into v_normalizer_trigger_count
  from pg_catalog.pg_trigger trigger_row
  where trigger_row.tgrelid = 'feed.feed_post'::regclass
    and trigger_row.tgname =
      'feed_post_pending_media_moderation_normalize'
    and trigger_row.tgfoid = v_normalizer_function_oid
    and trigger_row.tgtype = 19
    and trigger_row.tgenabled = 'O'
    and not trigger_row.tgisinternal
    and pg_catalog.obj_description(
      trigger_row.oid,
      'pg_trigger'
    ) is not null;

  select count(*)
  into v_sync_trigger_count
  from pg_catalog.pg_trigger trigger_row
  where trigger_row.tgrelid = 'feed.feed_external_link'::regclass
    and trigger_row.tgname = 'feed_external_link_moderation_sync'
    and trigger_row.tgfoid = v_sync_function_oid
    and trigger_row.tgtype = 21
    and trigger_row.tgenabled = 'O'
    and not trigger_row.tgisinternal
    and pg_catalog.obj_description(
      trigger_row.oid,
      'pg_trigger'
    ) is not null;

  if v_column_contract_count <> 4
    or v_commented_column_count <> 4
    or v_constraint_count <> 6
    or v_index_contract_count <> 1
    or v_public_read_column_count = 0
    or v_public_read_grant_count <> v_public_read_column_count
    or v_internal_read_privilege_count <> 0
    or v_table_select_privilege_count <> 0
    or not pg_catalog.has_table_privilege(
      'service_role',
      'feed.feed_post',
      'SELECT'
    )
    or v_published_policy_count <> 1
    or v_own_policy_count <> 1
    or not coalesce(v_rls_enabled, false)
    or v_post_owner is distinct from v_expected_post_owner
    or v_function_oid is null
    or v_function_owner is distinct from v_expected_activation_owner
    or not exists (
      select 1
      from pg_catalog.pg_proc procedure_row
      where procedure_row.oid = v_function_oid
        and procedure_row.prorettype = 'boolean'::regtype
        and procedure_row.provolatile = 'v'
        and procedure_row.prosecdef
    )
    or not coalesce(
      v_function_config @> array['search_path=pg_catalog, feed'],
      false
    )
    or pg_catalog.has_function_privilege(
      'anon',
      v_function_oid,
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      v_function_oid,
      'EXECUTE'
    )
    or not coalesce(v_service_role_can_execute, false)
    or exists (
      select 1
      from pg_catalog.aclexplode(
        coalesce(
          v_function_acl,
          pg_catalog.acldefault('f', v_function_owner)
        )
      ) acl_entry
      where acl_entry.grantee = 0
        and acl_entry.privilege_type = 'EXECUTE'
    )
    or pg_catalog.obj_description(v_function_oid, 'pg_proc') is null
    or v_sync_function_oid is null
    or v_sync_function_owner is distinct from
      v_expected_sync_function_owner
    or not exists (
      select 1
      from pg_catalog.pg_proc procedure_row
      where procedure_row.oid = v_sync_function_oid
        and procedure_row.prorettype = 'trigger'::regtype
        and procedure_row.provolatile = 'v'
        and procedure_row.prosecdef
    )
    or not coalesce(
      v_sync_function_config @> array['search_path=pg_catalog, feed'],
      false
    )
    or pg_catalog.has_function_privilege(
      'anon',
      v_sync_function_oid,
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      v_sync_function_oid,
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'service_role',
      v_sync_function_oid,
      'EXECUTE'
    )
    or exists (
      select 1
      from pg_catalog.aclexplode(
        coalesce(
          v_sync_function_acl,
          pg_catalog.acldefault('f', v_sync_function_owner)
        )
      ) acl_entry
      where acl_entry.grantee = 0
        and acl_entry.privilege_type = 'EXECUTE'
    )
    or pg_catalog.obj_description(
      v_sync_function_oid,
      'pg_proc'
    ) is null
    or v_sync_trigger_count <> 1
    or v_normalizer_function_oid is null
    or v_normalizer_function_owner is distinct from v_expected_post_owner
    or not exists (
      select 1
      from pg_catalog.pg_proc procedure_row
      where procedure_row.oid = v_normalizer_function_oid
        and procedure_row.prorettype = 'trigger'::regtype
        and procedure_row.provolatile = 'v'
        and not procedure_row.prosecdef
    )
    or not coalesce(
      v_normalizer_function_config @>
        array['search_path=pg_catalog, feed'],
      false
    )
    or pg_catalog.has_function_privilege(
      'anon',
      v_normalizer_function_oid,
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'authenticated',
      v_normalizer_function_oid,
      'EXECUTE'
    )
    or pg_catalog.has_function_privilege(
      'service_role',
      v_normalizer_function_oid,
      'EXECUTE'
    )
    or exists (
      select 1
      from pg_catalog.aclexplode(
        coalesce(
          v_normalizer_function_acl,
          pg_catalog.acldefault(
            'f',
            v_normalizer_function_owner
          )
        )
      ) acl_entry
      where acl_entry.grantee = 0
        and acl_entry.privilege_type = 'EXECUTE'
    )
    or pg_catalog.obj_description(
      v_normalizer_function_oid,
      'pg_proc'
    ) is null
    or v_normalizer_trigger_count <> 1
  then
    raise exception 'feed_post_media_publication_postcondition_failed'
      using errcode = '23514';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
