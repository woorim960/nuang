begin;

set local lock_timeout = '5s';

-- This is a metadata-only forward migration. Existing media continues to
-- resolve through Supabase and remains conservatively quota-accounted unless
-- a writer explicitly selects R2 or later proves external object deletion.
do $$
begin
  if to_regclass('identity.account') is null then
    raise exception 'feed_media_storage_identity_account_table_missing'
      using errcode = '42P01';
  end if;

  if to_regclass('feed.feed_post') is null then
    raise exception 'feed_media_storage_post_table_missing'
      using errcode = '42P01';
  end if;

  if to_regclass('feed.feed_post_media') is null then
    raise exception 'feed_media_storage_provider_table_missing'
      using errcode = '42P01';
  end if;
end;
$$;

-- Match the account-deletion FK traversal order before taking the media DDL
-- lock. The bounded lock_timeout makes the migration abandon live contention
-- instead of waiting with only a subset of the dependency chain locked.
lock table identity.account in share row exclusive mode;
lock table feed.feed_post in share row exclusive mode;
lock table feed.feed_post_media in access exclusive mode;

do $$
declare
  v_bucket_attnum smallint;
  v_storage_path_attnum smallint;
  v_target_column_count integer;
  v_rls_enabled boolean;
begin
  select attribute.attnum::smallint
  into v_bucket_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'bucket_id'
    and attribute.atttypid = 'text'::regtype
    and attribute.attnotnull
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_storage_path_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'storage_path'
    and attribute.atttypid = 'text'::regtype
    and attribute.attnotnull
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select relation.relrowsecurity
  into v_rls_enabled
  from pg_class relation
  where relation.oid = 'feed.feed_post_media'::regclass;

  select count(*)
  into v_target_column_count
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname in (
      'content_sha256',
      'optimized_at',
      'source_byte_size',
      'storage_accounted',
      'storage_ready',
      'storage_provider'
    )
    and attribute.attnum > 0
    and not attribute.attisdropped;

  if v_bucket_attnum is null
    or v_storage_path_attnum is null
    or not coalesce(v_rls_enabled, false)
    or v_target_column_count <> 0
    or not exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conrelid = 'feed.feed_post_media'::regclass
        and constraint_row.contype = 'u'
        and constraint_row.convalidated
        and constraint_row.conkey = array[v_storage_path_attnum]::smallint[]
    )
    or not exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conrelid = 'feed.feed_post_media'::regclass
        and constraint_row.contype = 'c'
        and constraint_row.convalidated
        and constraint_row.conkey @> array[v_bucket_attnum]::smallint[]
    )
    or not exists (
      select 1
      from pg_policy policy_row
      where policy_row.polrelid = 'feed.feed_post_media'::regclass
        and policy_row.polname = 'feed visible post media read'
        and policy_row.polcmd = 'r'
    )
  then
    raise exception 'feed_media_storage_provider_precondition_failed'
      using errcode = '23514';
  end if;

  if to_regprocedure('feed.read_media_storage_usage(text)') is not null then
    raise exception 'feed_media_storage_usage_function_already_exists'
      using errcode = '42710';
  end if;

  if to_regclass('feed.feed_media_storage_reservation') is not null
    or to_regprocedure(
      'feed.reserve_media_storage(text,uuid,bigint,bigint,uuid)'
    ) is not null
    or to_regprocedure(
      'feed.release_media_storage_reservation(text,uuid)'
    ) is not null
  then
    raise exception 'feed_media_storage_reservation_already_exists'
      using errcode = '42710';
  end if;

  if to_regclass('feed.media_storage_cleanup_queue') is not null
    or to_regprocedure(
      'feed.enqueue_media_storage_cleanup(text,text,bigint,text)'
    ) is not null
    or to_regprocedure(
      'feed.enqueue_account_media_storage_cleanup(uuid,text,text,bigint,text)'
    ) is not null
    or to_regprocedure(
      'feed.resolve_media_storage_cleanup(text,text)'
    ) is not null
    or to_regprocedure(
      'feed.prune_resolved_media_storage_cleanup(integer)'
    ) is not null
    or to_regprocedure(
      'feed.activate_feed_post_media(uuid,text[])'
    ) is not null
    or to_regprocedure(
      'feed.enqueue_deleted_feed_post_media_cleanup()'
    ) is not null
    or to_regprocedure(
      'feed.hide_feed_post_media_after_soft_delete()'
    ) is not null
    or exists (
      select 1
      from pg_trigger trigger_row
      where trigger_row.tgrelid = 'feed.feed_post_media'::regclass
        and trigger_row.tgname = 'feed_post_media_delete_cleanup'
        and not trigger_row.tgisinternal
    )
    or exists (
      select 1
      from pg_trigger trigger_row
      where trigger_row.tgrelid = 'feed.feed_post'::regclass
        and trigger_row.tgname = 'feed_post_soft_delete_hide_media'
        and not trigger_row.tgisinternal
    )
  then
    raise exception 'feed_media_storage_cleanup_already_exists'
      using errcode = '42710';
  end if;
end;
$$;

alter table feed.feed_post_media
  add column storage_provider text not null default 'supabase',
  add column storage_accounted boolean not null default true,
  add column storage_ready boolean not null default true,
  add column content_sha256 text,
  add column source_byte_size integer,
  add column optimized_at timestamptz;

alter table feed.feed_post_media
  add constraint feed_post_media_storage_provider_check
  check (storage_provider in ('supabase', 'cloudflare_r2'))
  not valid,
  add constraint feed_post_media_content_sha256_check
  check (
    content_sha256 is null
    or content_sha256 ~ '^[0-9a-f]{64}$'
  )
  not valid,
  add constraint feed_post_media_source_byte_size_check
  check (source_byte_size is null or source_byte_size > 0)
  not valid;

alter table feed.feed_post_media
  validate constraint feed_post_media_storage_provider_check;
alter table feed.feed_post_media
  validate constraint feed_post_media_content_sha256_check;
alter table feed.feed_post_media
  validate constraint feed_post_media_source_byte_size_check;

comment on column feed.feed_post_media.storage_provider is
  'Physical object-store provider. Existing and omitted values remain on Supabase; cloudflare_r2 is selected only by an explicit writer.';
comment on column feed.feed_post_media.storage_accounted is
  'Whether byte_size still consumes provider capacity. Hidden pending uploads remain TRUE until deletion succeeds or durable cleanup is queued.';
comment on column feed.feed_post_media.storage_ready is
  'Whether the immutable object completed upload and activation. Existing and rolling-deploy rows default TRUE; new hidden uploads explicitly write FALSE until atomic activation.';
comment on column feed.feed_post_media.content_sha256 is
  'Optional lowercase SHA-256 digest of the stored optimized object, used for integrity checks rather than as an authorization decision.';
comment on column feed.feed_post_media.source_byte_size is
  'Optional positive byte size of the source image before optimization; byte_size remains the stored object size used for quotas.';
comment on column feed.feed_post_media.optimized_at is
  'Time at which the stored object finished media optimization; NULL identifies legacy or not-yet-optimized media.';
comment on column feed.feed_post_media.bucket_id is
  'Logical private feed-media bucket identifier retained across physical storage providers.';
comment on column feed.feed_post_media.storage_path is
  'Provider-relative object key. Its existing global uniqueness contract is retained during gradual provider rollout.';

-- Digest lookup is not a current runtime path, so no speculative hash index is
-- added. Provider usage is now a quota hot path; this partial covering index
-- keeps its active-byte scan out of the wider media rows.
create index feed_post_media_active_provider_usage_idx
on feed.feed_post_media(storage_provider)
include (byte_size)
where storage_accounted;

create table feed.feed_media_storage_reservation (
  id uuid primary key,
  post_id uuid not null
    references feed.feed_post(id) on delete cascade,
  storage_provider text not null,
  byte_size bigint not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint feed_media_storage_reservation_provider_check
    check (storage_provider in ('supabase', 'cloudflare_r2')),
  constraint feed_media_storage_reservation_byte_size_check
    check (byte_size between 1 and 9500000000),
  constraint feed_media_storage_reservation_expiry_check
    check (expires_at > created_at)
);

-- Provider/expiry supports the serialized expiry cleanup and live reservation
-- sum. The FK index prevents post rollback/deletion from scanning all active
-- reservations while enforcing ON DELETE CASCADE.
create index feed_media_storage_reservation_provider_expiry_idx
on feed.feed_media_storage_reservation(storage_provider, expires_at)
include (byte_size);

create index feed_media_storage_reservation_post_idx
on feed.feed_media_storage_reservation(post_id);

alter table feed.feed_media_storage_reservation enable row level security;

revoke all on feed.feed_media_storage_reservation
from public, anon, authenticated, service_role;

grant select on feed.feed_media_storage_reservation to service_role;

comment on table feed.feed_media_storage_reservation is
  'Service-only short-lived byte reservations that serialize free-tier capacity checks before external object upload.';
comment on column feed.feed_media_storage_reservation.id is
  'Caller-generated UUID idempotency key for one upload reservation.';
comment on column feed.feed_media_storage_reservation.post_id is
  'Owning feed post; rollback or deletion cascades to its unfinished reservations.';
comment on column feed.feed_media_storage_reservation.storage_provider is
  'Physical provider whose quota is reserved under a provider-scoped advisory lock.';
comment on column feed.feed_media_storage_reservation.byte_size is
  'Positive number of stored bytes conservatively reserved for the pending upload.';
comment on column feed.feed_media_storage_reservation.created_at is
  'Database time when the reservation was accepted.';
comment on column feed.feed_media_storage_reservation.expires_at is
  'Database expiry, fixed to fifteen minutes by the reservation RPC.';

create table feed.media_storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  guard_account_id uuid
    references identity.account(id) on delete set null,
  storage_provider text not null,
  storage_path text not null,
  byte_size bigint not null,
  reason text not null,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint media_storage_cleanup_queue_provider_check
    check (storage_provider in ('supabase', 'cloudflare_r2')),
  constraint media_storage_cleanup_queue_path_check
    check (
      char_length(storage_path) between 1 and 1024
      and storage_path = btrim(storage_path)
    ),
  constraint media_storage_cleanup_queue_byte_size_check
    check (byte_size between 1 and 9500000000),
  constraint media_storage_cleanup_queue_reason_check
    check (
      char_length(reason) between 1 and 500
      and reason = btrim(reason)
    ),
  constraint media_storage_cleanup_queue_attempts_check
    check (attempts between 0 and 1000000),
  constraint media_storage_cleanup_queue_resolution_check
    check (resolved_at is null or resolved_at >= created_at)
);

create unique index media_storage_cleanup_queue_active_object_uidx
on feed.media_storage_cleanup_queue(storage_provider, storage_path)
include (byte_size)
where resolved_at is null;

create index media_storage_cleanup_queue_retry_idx
on feed.media_storage_cleanup_queue(next_attempt_at, id)
where resolved_at is null and guard_account_id is null;

-- The FK action must find every guarded row, including resolved audit rows,
-- without scanning the entire durable queue when an account is deleted.
create index media_storage_cleanup_queue_guard_account_idx
on feed.media_storage_cleanup_queue(guard_account_id)
where guard_account_id is not null;

-- Resolved rows are a short audit trail, not an unbounded operational log.
-- This partial index keeps the daily fourteen-day retention prune bounded to
-- old successes without inflating the unresolved quota/retry indexes.
create index media_storage_cleanup_queue_resolved_retention_idx
on feed.media_storage_cleanup_queue(resolved_at, id)
where resolved_at is not null;

alter table feed.media_storage_cleanup_queue enable row level security;

revoke all on feed.media_storage_cleanup_queue
from public, anon, authenticated, service_role;

-- Reads support the service cleanup worker and monitoring. All mutations stay
-- behind the validated, provider-locked SECURITY DEFINER RPCs below.
grant select on feed.media_storage_cleanup_queue to service_role;

comment on table feed.media_storage_cleanup_queue is
  'Service-only durable cleanup queue for uploaded objects whose rollback deletion failed; unresolved bytes remain charged to the strict quota.';
comment on column feed.media_storage_cleanup_queue.id is
  'Server-generated durable cleanup work identifier.';
comment on column feed.media_storage_cleanup_queue.guard_account_id is
  'Account deletion guard. Cleanup workers may only process NULL; deleting the referenced account atomically clears the guard.';
comment on column feed.media_storage_cleanup_queue.storage_provider is
  'Physical provider containing the orphaned object.';
comment on column feed.media_storage_cleanup_queue.storage_path is
  'Exact provider-relative key of the orphaned object.';
comment on column feed.media_storage_cleanup_queue.byte_size is
  'Conservative orphaned object size included in quota calculations until resolution.';
comment on column feed.media_storage_cleanup_queue.reason is
  'Trimmed service failure reason retained for cleanup operations.';
comment on column feed.media_storage_cleanup_queue.attempts is
  'Number of failed deletion attempts observed for this unresolved object.';
comment on column feed.media_storage_cleanup_queue.next_attempt_at is
  'Earliest database time at which a cleanup worker should retry deletion.';
comment on column feed.media_storage_cleanup_queue.created_at is
  'Database time when this cleanup item was first queued.';
comment on column feed.media_storage_cleanup_queue.updated_at is
  'Database time when this cleanup item was last enqueued or resolved.';
comment on column feed.media_storage_cleanup_queue.resolved_at is
  'Database time when external deletion succeeded; NULL rows still consume quota, while successful audit rows are retained for fourteen days.';

create function feed.enqueue_media_storage_cleanup(
  p_storage_provider text,
  p_storage_path text,
  p_byte_size bigint,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_cleanup_id uuid;
  v_now timestamptz := now();
begin
  if p_storage_provider is null
    or p_storage_provider not in ('supabase', 'cloudflare_r2')
    or p_storage_path is null
    or char_length(p_storage_path) not between 1 and 1024
    or p_storage_path is distinct from btrim(p_storage_path)
    or p_byte_size is null
    or p_byte_size not between 1 and 9500000000
    or p_reason is null
    or char_length(btrim(p_reason)) not between 1 and 500
  then
    raise exception 'feed_media_storage_cleanup_invalid'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'nuang:feed-media-storage:' || p_storage_provider,
      0
    )
  );

  insert into feed.media_storage_cleanup_queue as cleanup (
    attempts,
    byte_size,
    created_at,
    next_attempt_at,
    reason,
    storage_path,
    storage_provider,
    updated_at
  )
  values (
    1,
    p_byte_size,
    v_now,
    v_now + interval '1 minute',
    btrim(p_reason),
    p_storage_path,
    p_storage_provider,
    v_now
  )
  on conflict (storage_provider, storage_path)
  where resolved_at is null
  do update set
    attempts = least(cleanup.attempts + 1, 1000000),
    byte_size = greatest(cleanup.byte_size, excluded.byte_size),
    next_attempt_at = v_now + interval '1 minute',
    reason = excluded.reason,
    updated_at = v_now
  where cleanup.guard_account_id is null
  returning cleanup.id into v_cleanup_id;

  if v_cleanup_id is null then
    raise exception 'feed_media_storage_cleanup_account_guarded'
      using errcode = '40001';
  end if;

  return v_cleanup_id;
end;
$$;

revoke all on function feed.enqueue_media_storage_cleanup(
  text,
  text,
  bigint,
  text
)
from public, anon, authenticated;

grant execute on function feed.enqueue_media_storage_cleanup(
  text,
  text,
  bigint,
  text
)
to service_role;

comment on function feed.enqueue_media_storage_cleanup(
  text,
  text,
  bigint,
  text
) is
  'Provider-locked idempotent enqueue for a failed external object rollback; repeated failures retain the largest observed byte size.';

create function feed.enqueue_account_media_storage_cleanup(
  p_account_id uuid,
  p_storage_provider text,
  p_storage_path text,
  p_byte_size bigint,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_cleanup_id uuid;
  v_now timestamptz := now();
begin
  if p_account_id is null
    or p_storage_provider is null
    or p_storage_provider not in ('supabase', 'cloudflare_r2')
    or p_storage_path is null
    or char_length(p_storage_path) not between 1 and 1024
    or p_storage_path is distinct from btrim(p_storage_path)
    or p_byte_size is null
    or p_byte_size not between 1 and 9500000000
    or p_reason is null
    or char_length(btrim(p_reason)) not between 1 and 500
  then
    raise exception 'feed_account_media_storage_cleanup_invalid'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'nuang:feed-media-storage:' || p_storage_provider,
      0
    )
  );

  -- Holding the referenced key through the UPSERT prevents a concurrent
  -- account deletion from turning a newly queued guard into an ambiguous
  -- unguarded row before this transaction commits.
  perform 1
  from identity.account account
  where account.id = p_account_id
  for key share;

  if not found then
    raise exception 'feed_account_media_storage_cleanup_account_missing'
      using errcode = '23503';
  end if;

  insert into feed.media_storage_cleanup_queue as cleanup (
    attempts,
    byte_size,
    created_at,
    guard_account_id,
    next_attempt_at,
    reason,
    storage_path,
    storage_provider,
    updated_at
  )
  values (
    0,
    p_byte_size,
    v_now,
    p_account_id,
    v_now,
    btrim(p_reason),
    p_storage_path,
    p_storage_provider,
    v_now
  )
  on conflict (storage_provider, storage_path)
  where resolved_at is null
  do update set
    byte_size = greatest(cleanup.byte_size, excluded.byte_size),
    reason = excluded.reason,
    updated_at = v_now
  where cleanup.guard_account_id = excluded.guard_account_id
    and cleanup.guard_account_id is not null
  returning cleanup.id into v_cleanup_id;

  -- A pre-existing unguarded row may already be eligible for deletion, while
  -- a row guarded by another account represents a different ownership claim.
  -- Neither may be silently converted into this account's pending deletion.
  if v_cleanup_id is null then
    raise exception 'feed_account_media_storage_cleanup_conflict'
      using errcode = '23505';
  end if;

  return v_cleanup_id;
end;
$$;

revoke all on function feed.enqueue_account_media_storage_cleanup(
  uuid,
  text,
  text,
  bigint,
  text
)
from public, anon, authenticated;

grant execute on function feed.enqueue_account_media_storage_cleanup(
  uuid,
  text,
  text,
  bigint,
  text
)
to service_role;

comment on function feed.enqueue_account_media_storage_cleanup(
  uuid,
  text,
  text,
  bigint,
  text
) is
  'Provider-locked account deletion enqueue. The FK guard makes unresolved work eligible only after the owning account row is deleted.';

create function feed.resolve_media_storage_cleanup(
  p_storage_provider text,
  p_storage_path text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_has_pending boolean;
  v_now timestamptz := now();
begin
  if p_storage_provider is null
    or p_storage_provider not in ('supabase', 'cloudflare_r2')
    or p_storage_path is null
    or char_length(p_storage_path) not between 1 and 1024
    or p_storage_path is distinct from btrim(p_storage_path)
  then
    raise exception 'feed_media_storage_cleanup_invalid'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'nuang:feed-media-storage:' || p_storage_provider,
      0
    )
  );

  update feed.media_storage_cleanup_queue cleanup
  set
    resolved_at = v_now,
    updated_at = v_now
  where cleanup.storage_provider = p_storage_provider
    and cleanup.storage_path = p_storage_path
    and cleanup.resolved_at is null
    and cleanup.guard_account_id is null
    and cleanup.next_attempt_at <= v_now;

  if found then
    return true;
  end if;

  select exists (
    select 1
    from feed.media_storage_cleanup_queue cleanup
    where cleanup.storage_provider = p_storage_provider
      and cleanup.storage_path = p_storage_path
      and cleanup.resolved_at is null
  )
  into v_has_pending;

  -- A guarded or grace-delayed row must not be resolved by a delete that ran
  -- before an in-flight immutable PUT had its final chance to commit. Absence
  -- remains idempotent success for already-resolved or never-queued objects.
  if v_has_pending then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function feed.resolve_media_storage_cleanup(text, text)
from public, anon, authenticated;

grant execute on function feed.resolve_media_storage_cleanup(text, text)
to service_role;

comment on function feed.resolve_media_storage_cleanup(text, text) is
  'Provider-locked idempotent resolution after an eligible orphaned object is confirmed deleted; account guards and physical-delete grace periods fail closed.';

create function feed.prune_resolved_media_storage_cleanup(
  p_limit integer
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_deleted_count integer;
begin
  if p_limit is null or p_limit not between 1 and 100000 then
    raise exception 'feed_media_storage_cleanup_prune_invalid'
      using errcode = '22023';
  end if;

  -- The retention boundary lives in the database so a bad worker argument
  -- cannot erase recent operational evidence. SKIP LOCKED keeps pruning from
  -- waiting on a concurrent resolver while the partial index supplies the
  -- oldest eligible ids without scanning unresolved quota rows.
  with candidates as materialized (
    select cleanup.id
    from feed.media_storage_cleanup_queue cleanup
    where cleanup.resolved_at < now() - interval '14 days'
    order by cleanup.resolved_at, cleanup.id
    limit p_limit
    for update of cleanup skip locked
  )
  delete from feed.media_storage_cleanup_queue cleanup
  using candidates
  where cleanup.id = candidates.id;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function feed.prune_resolved_media_storage_cleanup(integer)
from public, anon, authenticated;

grant execute on function feed.prune_resolved_media_storage_cleanup(integer)
to service_role;

comment on function feed.prune_resolved_media_storage_cleanup(integer) is
  'Service-only bounded batch prune for successful cleanup audit rows older than the database-enforced fourteen-day retention window.';

create function feed.hide_feed_post_media_after_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update feed.feed_post_media media
    set deleted_at = new.deleted_at
    where media.post_id = new.id
      and media.deleted_at is null;
  end if;

  return new;
end;
$$;

revoke all on function feed.hide_feed_post_media_after_soft_delete()
from public, anon, authenticated, service_role;

comment on function feed.hide_feed_post_media_after_soft_delete() is
  'Same-transaction visibility barrier: a post soft delete hides every active child media row before the post update commits.';

create trigger feed_post_soft_delete_hide_media
after update of deleted_at on feed.feed_post
for each row
execute function feed.hide_feed_post_media_after_soft_delete();

comment on trigger feed_post_soft_delete_hide_media
on feed.feed_post is
  'Makes media invisibility atomic with the parent post soft-delete transition so stale cleanup can recover if the follow-up object deletion never runs.';

create function feed.enqueue_deleted_feed_post_media_cleanup()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_now timestamptz := now();
  v_retry_after timestamptz;
begin
  if not old.storage_accounted then
    return old;
  end if;

  -- Activated or legacy objects cannot have a late PUT: activation and post
  -- deletion serialize on the parent row. Only a never-activated upload needs
  -- a grace window for provider I/O that may still complete after rollback.
  v_retry_after := case
    when old.storage_ready then v_now
    else v_now + interval '15 minutes'
  end;

  -- The media row and its replacement cleanup entry change in the same
  -- transaction. Capacity readers can observe the old row, both rows, or the
  -- queue row, but never a committed state in which neither accounts for the
  -- object. Avoiding the provider advisory lock here also preserves the lock
  -- order when an account cascade already owns the parent post row.
  insert into feed.media_storage_cleanup_queue as cleanup (
    attempts,
    byte_size,
    created_at,
    next_attempt_at,
    reason,
    storage_path,
    storage_provider,
    updated_at
  )
  values (
    0,
    old.byte_size,
    v_now,
    v_retry_after,
    'physical_media_row_delete',
    old.storage_path,
    old.storage_provider,
    v_now
  )
  on conflict (storage_provider, storage_path)
  where resolved_at is null
  do update set
    byte_size = greatest(cleanup.byte_size, excluded.byte_size),
    next_attempt_at = greatest(
      cleanup.next_attempt_at,
      excluded.next_attempt_at
    ),
    reason = case
      when cleanup.guard_account_id is null then excluded.reason
      else cleanup.reason
    end,
    updated_at = excluded.updated_at;

  return old;
end;
$$;

revoke all on function feed.enqueue_deleted_feed_post_media_cleanup()
from public, anon, authenticated, service_role;

comment on function feed.enqueue_deleted_feed_post_media_cleanup() is
  'BEFORE DELETE quota handoff for accounted media. It preserves an existing account guard, makes ready objects immediately eligible, and delays never-activated uploads for fifteen minutes so a concurrent immutable PUT cannot land after early resolution.';

create trigger feed_post_media_delete_cleanup
before delete on feed.feed_post_media
for each row
execute function feed.enqueue_deleted_feed_post_media_cleanup();

comment on trigger feed_post_media_delete_cleanup
on feed.feed_post_media is
  'Atomically transfers every physically deleted, still-accounted media object into the durable cleanup queue.';

create function feed.activate_feed_post_media(
  p_post_id uuid,
  p_storage_paths text[]
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_matching_count integer;
  v_total_count integer;
  v_updated_count integer;
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

  -- Serialize activation against soft deletion and account-cascade deletion.
  -- A losing upload returns false before exposing media; a winning activation
  -- commits before deletion, whose BEFORE DELETE trigger then owns cleanup.
  perform 1
  from feed.feed_post post
  where post.id = p_post_id
    and post.deleted_at is null
  for update;

  if not found then
    return false;
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where media.storage_path = any(p_storage_paths)
        and media.storage_accounted
        and not media.storage_ready
        and media.deleted_at is not null
        and media.optimized_at is not null
    )::integer
  into v_total_count, v_matching_count
  from feed.feed_post_media media
  where media.post_id = p_post_id;

  if v_total_count <> cardinality(p_storage_paths)
    or v_matching_count <> cardinality(p_storage_paths)
  then
    return false;
  end if;

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
  get diagnostics v_updated_count = row_count;

  if v_updated_count <> cardinality(p_storage_paths) then
    raise exception 'feed_media_activation_changed_concurrently'
      using errcode = '40001';
  end if;

  return true;
end;
$$;

revoke all on function feed.activate_feed_post_media(uuid, text[])
from public, anon, authenticated;

grant execute on function feed.activate_feed_post_media(uuid, text[])
to service_role;

comment on function feed.activate_feed_post_media(uuid, text[]) is
  'Service-only all-or-nothing activation that locks the live parent post and exposes exactly the supplied optimized media set.';

create function feed.reserve_media_storage(
  p_storage_provider text,
  p_post_id uuid,
  p_byte_size bigint,
  p_max_byte_size bigint,
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_active_byte_size numeric;
  v_cleanup_byte_size numeric;
  v_existing feed.feed_media_storage_reservation%rowtype;
  v_now timestamptz := now();
  v_reserved_byte_size numeric;
begin
  if p_storage_provider is null
    or p_storage_provider not in ('supabase', 'cloudflare_r2')
    or p_post_id is null
    or p_reservation_id is null
    or p_byte_size is null
    or p_byte_size not between 1 and 9500000000
    or p_max_byte_size is null
    or p_max_byte_size not between 1 and 9500000000
    or p_byte_size > p_max_byte_size
  then
    raise exception 'feed_media_storage_reservation_invalid'
      using errcode = '22023';
  end if;

  -- Every capacity decision for a provider shares this transaction lock. The
  -- reservation remains visible after this RPC commits, bridging the later
  -- object upload and feed_post_media insert transactions without a race.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'nuang:feed-media-storage:' || p_storage_provider,
      0
    )
  );

  -- Hold the parent key through reservation insertion so a concurrent post
  -- rollback cannot pass the existence check and orphan capacity afterwards.
  perform 1
  from feed.feed_post post
  where post.id = p_post_id
    and post.deleted_at is null
  for key share;

  if not found then
    raise exception 'feed_media_storage_reservation_post_missing'
      using errcode = '23503';
  end if;

  delete from feed.feed_media_storage_reservation reservation
  where reservation.storage_provider = p_storage_provider
    and reservation.expires_at <= v_now;

  select reservation.*
  into v_existing
  from feed.feed_media_storage_reservation reservation
  where reservation.id = p_reservation_id;

  if found then
    if v_existing.storage_provider <> p_storage_provider
      or v_existing.post_id <> p_post_id
      or v_existing.byte_size <> p_byte_size
      or v_existing.expires_at <= v_now
    then
      raise exception 'feed_media_storage_reservation_conflict'
        using errcode = '23505';
    end if;
  end if;

  select coalesce(sum(media.byte_size::numeric), 0::numeric)
  into v_active_byte_size
  from feed.feed_post_media media
  where media.storage_provider = p_storage_provider
    and media.storage_accounted;

  select coalesce(sum(reservation.byte_size::numeric), 0::numeric)
  into v_reserved_byte_size
  from feed.feed_media_storage_reservation reservation
  where reservation.storage_provider = p_storage_provider
    and reservation.expires_at > v_now;

  select coalesce(sum(cleanup.byte_size::numeric), 0::numeric)
  into v_cleanup_byte_size
  from feed.media_storage_cleanup_queue cleanup
  where cleanup.storage_provider = p_storage_provider
    and cleanup.resolved_at is null
    and cleanup.guard_account_id is null;

  if v_existing.id is null then
    if v_active_byte_size
      + v_reserved_byte_size
      + v_cleanup_byte_size
      + p_byte_size
      > p_max_byte_size
    then
      return false;
    end if;
  elsif v_active_byte_size
    + v_reserved_byte_size
    + v_cleanup_byte_size
    > p_max_byte_size
  then
    return false;
  end if;

  if v_existing.id is not null then
    return true;
  end if;

  insert into feed.feed_media_storage_reservation (
    byte_size,
    created_at,
    expires_at,
    id,
    post_id,
    storage_provider
  )
  values (
    p_byte_size,
    v_now,
    v_now + interval '15 minutes',
    p_reservation_id,
    p_post_id,
    p_storage_provider
  );

  return true;
end;
$$;

revoke all on function feed.reserve_media_storage(
  text,
  uuid,
  bigint,
  bigint,
  uuid
)
from public, anon, authenticated;

grant execute on function feed.reserve_media_storage(
  text,
  uuid,
  bigint,
  bigint,
  uuid
)
to service_role;

comment on function feed.reserve_media_storage(
  text,
  uuid,
  bigint,
  bigint,
  uuid
) is
  'Atomically reserves active provider capacity for fifteen minutes; returns false without writing when the supplied strict quota would be exceeded.';

create function feed.release_media_storage_reservation(
  p_storage_provider text,
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
begin
  if p_storage_provider is null
    or p_storage_provider not in ('supabase', 'cloudflare_r2')
    or p_reservation_id is null
  then
    raise exception 'feed_media_storage_reservation_invalid'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'nuang:feed-media-storage:' || p_storage_provider,
      0
    )
  );

  if exists (
    select 1
    from feed.feed_media_storage_reservation reservation
    where reservation.id = p_reservation_id
      and reservation.storage_provider <> p_storage_provider
  ) then
    raise exception 'feed_media_storage_reservation_conflict'
      using errcode = '23505';
  end if;

  delete from feed.feed_media_storage_reservation reservation
  where reservation.id = p_reservation_id
    and reservation.storage_provider = p_storage_provider;

  -- Deleting an already released, expired, or post-cascaded id is success.
  return true;
end;
$$;

revoke all on function feed.release_media_storage_reservation(text, uuid)
from public, anon, authenticated;

grant execute on function feed.release_media_storage_reservation(text, uuid)
to service_role;

comment on function feed.release_media_storage_reservation(text, uuid) is
  'Idempotently releases one provider-scoped upload reservation after commit or rollback.';

create function feed.read_media_storage_usage(
  p_storage_provider text
)
returns bigint
language plpgsql
stable
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_byte_size bigint;
begin
  if p_storage_provider is null
    or p_storage_provider not in ('supabase', 'cloudflare_r2') then
    raise exception 'feed_media_storage_provider_invalid'
      using errcode = '22023';
  end if;

  select coalesce(sum(media.byte_size::bigint), 0::bigint)
  into v_byte_size
  from feed.feed_post_media media
  where media.storage_provider = p_storage_provider
    and media.storage_accounted;

  return v_byte_size;
end;
$$;

revoke all on function feed.read_media_storage_usage(text)
from public, anon, authenticated;

grant execute on function feed.read_media_storage_usage(text)
to service_role;

comment on function feed.read_media_storage_usage(text) is
  'Service-only accounted stored-byte total for one supported feed media provider; used by strict free-tier quota guards.';

-- Prove the complete rolling-deploy contract before commit. Any unexpected
-- type, default, validation, privilege, RLS, or legacy key change aborts the
-- transaction and leaves the original schema in place.
do $$
declare
  v_accounted_attnum smallint;
  v_accounted_default text;
  v_anonymous_can_execute boolean;
  v_authenticated_can_execute boolean;
  v_byte_size_attnum smallint;
  v_bucket_attnum smallint;
  v_column_count integer;
  v_commented_column_count integer;
  v_constraint_count integer;
  v_function_acl aclitem[];
  v_function_config text[];
  v_function_oid oid;
  v_function_owner oid;
  v_function_return_type oid;
  v_function_security_definer boolean;
  v_function_volatility "char";
  v_other_default_count integer;
  v_provider_attnum smallint;
  v_provider_default text;
  v_ready_default text;
  v_rls_enabled boolean;
  v_service_role_can_execute boolean;
  v_storage_path_attnum smallint;
  v_usage_index_shape_count integer;
begin
  select count(*)
  into v_column_count
  from (
    values
      ('storage_provider', 'text'::regtype::oid, true),
      ('storage_accounted', 'boolean'::regtype::oid, true),
      ('storage_ready', 'boolean'::regtype::oid, true),
      ('content_sha256', 'text'::regtype::oid, false),
      ('source_byte_size', 'integer'::regtype::oid, false),
      ('optimized_at', 'timestamp with time zone'::regtype::oid, false)
  ) as target(attname, atttypid, attnotnull)
  join pg_attribute attribute
    on attribute.attrelid = 'feed.feed_post_media'::regclass
   and attribute.attname = target.attname
   and attribute.atttypid = target.atttypid
   and attribute.attnotnull = target.attnotnull
   and attribute.attnum > 0
   and not attribute.attisdropped;

  select pg_get_expr(default_row.adbin, default_row.adrelid)
  into v_provider_default
  from pg_attrdef default_row
  join pg_attribute attribute
    on attribute.attrelid = default_row.adrelid
   and attribute.attnum = default_row.adnum
  where default_row.adrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'storage_provider';

  select pg_get_expr(default_row.adbin, default_row.adrelid)
  into v_accounted_default
  from pg_attrdef default_row
  join pg_attribute attribute
    on attribute.attrelid = default_row.adrelid
   and attribute.attnum = default_row.adnum
  where default_row.adrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'storage_accounted';

  select pg_get_expr(default_row.adbin, default_row.adrelid)
  into v_ready_default
  from pg_attrdef default_row
  join pg_attribute attribute
    on attribute.attrelid = default_row.adrelid
   and attribute.attnum = default_row.adnum
  where default_row.adrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'storage_ready';

  select count(*)
  into v_other_default_count
  from pg_attrdef default_row
  join pg_attribute attribute
    on attribute.attrelid = default_row.adrelid
   and attribute.attnum = default_row.adnum
  where default_row.adrelid = 'feed.feed_post_media'::regclass
    and attribute.attname in (
      'content_sha256',
      'optimized_at',
      'source_byte_size'
    );

  select count(*)
  into v_constraint_count
  from pg_constraint constraint_row
  where constraint_row.conrelid = 'feed.feed_post_media'::regclass
    and constraint_row.contype = 'c'
    and constraint_row.convalidated
    and constraint_row.conname in (
      'feed_post_media_content_sha256_check',
      'feed_post_media_source_byte_size_check',
      'feed_post_media_storage_provider_check'
    );

  select count(*)
  into v_commented_column_count
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname in (
      'content_sha256',
      'optimized_at',
      'source_byte_size',
      'storage_accounted',
      'storage_ready',
      'storage_provider'
    )
    and attribute.attnum > 0
    and not attribute.attisdropped
    and col_description(attribute.attrelid, attribute.attnum) is not null;

  select attribute.attnum::smallint
  into v_bucket_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'bucket_id'
    and attribute.atttypid = 'text'::regtype
    and attribute.attnotnull
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_storage_path_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'storage_path'
    and attribute.atttypid = 'text'::regtype
    and attribute.attnotnull
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_provider_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'storage_provider'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_accounted_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'storage_accounted'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_byte_size_attnum
  from pg_attribute attribute
  where attribute.attrelid = 'feed.feed_post_media'::regclass
    and attribute.attname = 'byte_size'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select count(*)
  into v_usage_index_shape_count
  from pg_index index_row
  where index_row.indexrelid = to_regclass(
      'feed.feed_post_media_active_provider_usage_idx'
    )
    and index_row.indrelid = 'feed.feed_post_media'::regclass
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 1
    and index_row.indnatts = 2
    and array(
      select indexed_attribute.attnum
      from unnest(index_row.indkey::smallint[]) with ordinality
        as indexed_attribute(attnum, position)
      order by indexed_attribute.position
    ) = array[v_provider_attnum, v_byte_size_attnum]::smallint[]
    and pg_get_expr(index_row.indpred, index_row.indrelid)
      = 'storage_accounted';

  select relation.relrowsecurity
  into v_rls_enabled
  from pg_class relation
  where relation.oid = 'feed.feed_post_media'::regclass;

  v_function_oid := to_regprocedure('feed.read_media_storage_usage(text)');

  if v_function_oid is not null then
    select
      procedure_row.proacl,
      procedure_row.proconfig,
      procedure_row.proowner,
      procedure_row.prorettype,
      procedure_row.prosecdef,
      procedure_row.provolatile
    into
      v_function_acl,
      v_function_config,
      v_function_owner,
      v_function_return_type,
      v_function_security_definer,
      v_function_volatility
    from pg_proc procedure_row
    where procedure_row.oid = v_function_oid;

    v_anonymous_can_execute := has_function_privilege(
      'anon',
      v_function_oid,
      'EXECUTE'
    );
    v_authenticated_can_execute := has_function_privilege(
      'authenticated',
      v_function_oid,
      'EXECUTE'
    );
    v_service_role_can_execute := has_function_privilege(
      'service_role',
      v_function_oid,
      'EXECUTE'
    );
  end if;

  if v_column_count <> 6
    or v_provider_default is distinct from '''supabase''::text'
    or v_accounted_default is distinct from 'true'
    or v_ready_default is distinct from 'true'
    or v_other_default_count <> 0
    or v_constraint_count <> 3
    or v_commented_column_count <> 6
    or v_bucket_attnum is null
    or v_storage_path_attnum is null
    or v_accounted_attnum is null
    or v_usage_index_shape_count <> 1
    or not coalesce(v_rls_enabled, false)
    or not exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conrelid = 'feed.feed_post_media'::regclass
        and constraint_row.contype = 'u'
        and constraint_row.convalidated
        and constraint_row.conkey = array[v_storage_path_attnum]::smallint[]
    )
    or not exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conrelid = 'feed.feed_post_media'::regclass
        and constraint_row.contype = 'c'
        and constraint_row.convalidated
        and constraint_row.conkey @> array[v_bucket_attnum]::smallint[]
    )
    or not exists (
      select 1
      from pg_policy policy_row
      where policy_row.polrelid = 'feed.feed_post_media'::regclass
        and policy_row.polname = 'feed visible post media read'
        and policy_row.polcmd = 'r'
    )
    or v_function_oid is null
    or v_function_return_type <> 'bigint'::regtype
    or v_function_volatility <> 's'
    or not coalesce(v_function_security_definer, false)
    or not coalesce(
      v_function_config @> array['search_path=pg_catalog, feed'],
      false
    )
    or coalesce(v_anonymous_can_execute, true)
    or coalesce(v_authenticated_can_execute, true)
    or not coalesce(v_service_role_can_execute, false)
    or exists (
      select 1
      from aclexplode(
        coalesce(v_function_acl, acldefault('f', v_function_owner))
      ) acl_entry
      where acl_entry.grantee = 0
        and acl_entry.privilege_type = 'EXECUTE'
    )
    or obj_description(v_function_oid, 'pg_proc') is null
  then
    raise exception 'feed_media_storage_provider_postcondition_failed'
      using errcode = '23514';
  end if;
end;
$$;

-- Reservation shape, indexes, RLS, ACLs, and both mutation RPCs are verified
-- separately so a future edit cannot weaken the atomic quota boundary while
-- leaving the media-column postcondition green.
do $$
declare
  v_anonymous_can_write boolean;
  v_authenticated_can_write boolean;
  v_byte_size_attnum smallint;
  v_column_count integer;
  v_commented_column_count integer;
  v_constraint_count integer;
  v_created_default text;
  v_function_acl aclitem[];
  v_function_config text[];
  v_function_oid oid;
  v_function_owner oid;
  v_function_return_type oid;
  v_function_security_definer boolean;
  v_function_signature text;
  v_function_volatility "char";
  v_expires_at_attnum smallint;
  v_post_attnum smallint;
  v_post_index_shape_count integer;
  v_provider_attnum smallint;
  v_provider_index_shape_count integer;
  v_reservation_acl aclitem[];
  v_reservation_owner oid;
  v_reservation_table regclass;
  v_rls_enabled boolean;
  v_service_role_can_execute boolean;
  v_service_role_can_mutate boolean;
  v_service_role_can_select boolean;
begin
  v_reservation_table := to_regclass(
    'feed.feed_media_storage_reservation'
  );

  if v_reservation_table is null then
    raise exception 'feed_media_storage_reservation_postcondition_failed'
      using errcode = '23514';
  end if;

  select
    relation.relacl,
    relation.relowner,
    relation.relrowsecurity
  into
    v_reservation_acl,
    v_reservation_owner,
    v_rls_enabled
  from pg_class relation
  where relation.oid = v_reservation_table;

  select count(*)
  into v_column_count
  from (
    values
      ('id', 'uuid'::regtype::oid, true),
      ('post_id', 'uuid'::regtype::oid, true),
      ('storage_provider', 'text'::regtype::oid, true),
      ('byte_size', 'bigint'::regtype::oid, true),
      ('created_at', 'timestamp with time zone'::regtype::oid, true),
      ('expires_at', 'timestamp with time zone'::regtype::oid, true)
  ) as target(attname, atttypid, attnotnull)
  join pg_attribute attribute
    on attribute.attrelid = v_reservation_table
   and attribute.attname = target.attname
   and attribute.atttypid = target.atttypid
   and attribute.attnotnull = target.attnotnull
   and attribute.attnum > 0
   and not attribute.attisdropped;

  select pg_get_expr(default_row.adbin, default_row.adrelid)
  into v_created_default
  from pg_attrdef default_row
  join pg_attribute attribute
    on attribute.attrelid = default_row.adrelid
   and attribute.attnum = default_row.adnum
  where default_row.adrelid = v_reservation_table
    and attribute.attname = 'created_at';

  select count(*)
  into v_constraint_count
  from pg_constraint constraint_row
  where constraint_row.conrelid = v_reservation_table
    and constraint_row.convalidated
    and constraint_row.conname in (
      'feed_media_storage_reservation_byte_size_check',
      'feed_media_storage_reservation_expiry_check',
      'feed_media_storage_reservation_provider_check'
    );

  select count(*)
  into v_commented_column_count
  from pg_attribute attribute
  where attribute.attrelid = v_reservation_table
    and attribute.attnum > 0
    and not attribute.attisdropped
    and col_description(attribute.attrelid, attribute.attnum) is not null;

  select attribute.attnum::smallint
  into v_post_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_reservation_table
    and attribute.attname = 'post_id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_provider_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_reservation_table
    and attribute.attname = 'storage_provider'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_expires_at_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_reservation_table
    and attribute.attname = 'expires_at'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_byte_size_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_reservation_table
    and attribute.attname = 'byte_size'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select count(*)
  into v_provider_index_shape_count
  from pg_index index_row
  where index_row.indexrelid = to_regclass(
      'feed.feed_media_storage_reservation_provider_expiry_idx'
    )
    and index_row.indrelid = v_reservation_table
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 2
    and index_row.indnatts = 3
    and index_row.indpred is null
    and array(
      select indexed_attribute.attnum
      from unnest(index_row.indkey::smallint[]) with ordinality
        as indexed_attribute(attnum, position)
      order by indexed_attribute.position
    ) = array[
      v_provider_attnum,
      v_expires_at_attnum,
      v_byte_size_attnum
    ]::smallint[];

  select count(*)
  into v_post_index_shape_count
  from pg_index index_row
  where index_row.indexrelid = to_regclass(
      'feed.feed_media_storage_reservation_post_idx'
    )
    and index_row.indrelid = v_reservation_table
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 1
    and index_row.indnatts = 1
    and index_row.indpred is null
    and array(
      select indexed_attribute.attnum
      from unnest(index_row.indkey::smallint[]) with ordinality
        as indexed_attribute(attnum, position)
      order by indexed_attribute.position
    ) = array[v_post_attnum]::smallint[];

  v_anonymous_can_write :=
    has_table_privilege('anon', v_reservation_table, 'SELECT')
    or has_table_privilege('anon', v_reservation_table, 'INSERT')
    or has_table_privilege('anon', v_reservation_table, 'UPDATE')
    or has_table_privilege('anon', v_reservation_table, 'DELETE')
    or has_table_privilege('anon', v_reservation_table, 'TRUNCATE');
  v_authenticated_can_write :=
    has_table_privilege('authenticated', v_reservation_table, 'SELECT')
    or has_table_privilege('authenticated', v_reservation_table, 'INSERT')
    or has_table_privilege('authenticated', v_reservation_table, 'UPDATE')
    or has_table_privilege('authenticated', v_reservation_table, 'DELETE')
    or has_table_privilege('authenticated', v_reservation_table, 'TRUNCATE');
  v_service_role_can_select := has_table_privilege(
    'service_role',
    v_reservation_table,
    'SELECT'
  );
  v_service_role_can_mutate :=
    has_table_privilege('service_role', v_reservation_table, 'INSERT')
    or has_table_privilege('service_role', v_reservation_table, 'UPDATE')
    or has_table_privilege('service_role', v_reservation_table, 'DELETE')
    or has_table_privilege('service_role', v_reservation_table, 'TRUNCATE');

  if v_column_count <> 6
    or v_created_default is distinct from 'now()'
    or v_constraint_count <> 3
    or v_commented_column_count <> 6
    or v_provider_index_shape_count <> 1
    or v_post_index_shape_count <> 1
    or obj_description(v_reservation_table, 'pg_class') is null
    or not coalesce(v_rls_enabled, false)
    or exists (
      select 1
      from pg_policy policy_row
      where policy_row.polrelid = v_reservation_table
    )
    or not exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conrelid = v_reservation_table
        and constraint_row.contype = 'f'
        and constraint_row.convalidated
        and constraint_row.conkey = array[v_post_attnum]::smallint[]
        and constraint_row.confrelid = 'feed.feed_post'::regclass
        and constraint_row.confdeltype = 'c'
    )
    or coalesce(v_anonymous_can_write, true)
    or coalesce(v_authenticated_can_write, true)
    or not coalesce(v_service_role_can_select, false)
    or coalesce(v_service_role_can_mutate, true)
    or exists (
      select 1
      from aclexplode(
        coalesce(
          v_reservation_acl,
          acldefault('r', v_reservation_owner)
        )
      ) acl_entry
      where acl_entry.grantee = 0
        and acl_entry.privilege_type in (
          'SELECT',
          'INSERT',
          'UPDATE',
          'DELETE',
          'TRUNCATE'
        )
    )
  then
    raise exception 'feed_media_storage_reservation_postcondition_failed'
      using errcode = '23514';
  end if;

  foreach v_function_signature in array array[
    'feed.reserve_media_storage(text,uuid,bigint,bigint,uuid)',
    'feed.release_media_storage_reservation(text,uuid)'
  ]
  loop
    v_function_oid := to_regprocedure(v_function_signature);

    if v_function_oid is null then
      raise exception 'feed_media_storage_reservation_rpc_missing: %',
        v_function_signature
        using errcode = '23514';
    end if;

    select
      procedure_row.proacl,
      procedure_row.proconfig,
      procedure_row.proowner,
      procedure_row.prorettype,
      procedure_row.prosecdef,
      procedure_row.provolatile
    into
      v_function_acl,
      v_function_config,
      v_function_owner,
      v_function_return_type,
      v_function_security_definer,
      v_function_volatility
    from pg_proc procedure_row
    where procedure_row.oid = v_function_oid;

    v_service_role_can_execute := has_function_privilege(
      'service_role',
      v_function_oid,
      'EXECUTE'
    );

    if v_function_return_type <> 'boolean'::regtype
      or v_function_volatility <> 'v'
      or not coalesce(v_function_security_definer, false)
      or not coalesce(
        v_function_config @> array['search_path=pg_catalog, feed'],
        false
      )
      or has_function_privilege('anon', v_function_oid, 'EXECUTE')
      or has_function_privilege(
        'authenticated',
        v_function_oid,
        'EXECUTE'
      )
      or not coalesce(v_service_role_can_execute, false)
      or exists (
        select 1
        from aclexplode(
          coalesce(v_function_acl, acldefault('f', v_function_owner))
        ) acl_entry
        where acl_entry.grantee = 0
          and acl_entry.privilege_type = 'EXECUTE'
      )
      or obj_description(v_function_oid, 'pg_proc') is null
    then
      raise exception 'feed_media_storage_reservation_rpc_postcondition_failed: %',
        v_function_signature
        using errcode = '23514';
    end if;
  end loop;
end;
$$;

-- The orphan queue is part of the quota, not merely an operations log. Verify
-- its exact covering indexes and service-only mutation boundary before commit.
do $$
declare
  v_active_index_shape_count integer;
  v_anonymous_has_access boolean;
  v_authenticated_has_access boolean;
  v_byte_size_attnum smallint;
  v_column_count integer;
  v_commented_column_count integer;
  v_constraint_count integer;
  v_default_count integer;
  v_delete_trigger_count integer;
  v_soft_delete_trigger_count integer;
  v_function_acl aclitem[];
  v_function_config text[];
  v_function_oid oid;
  v_function_owner oid;
  v_function_return_type oid;
  v_function_security_definer boolean;
  v_function_volatility "char";
  v_guard_account_attnum smallint;
  v_guard_index_shape_count integer;
  v_id_attnum smallint;
  v_next_attempt_attnum smallint;
  v_path_attnum smallint;
  v_provider_attnum smallint;
  v_queue_acl aclitem[];
  v_queue_owner oid;
  v_queue_table regclass;
  v_resolved_at_attnum smallint;
  v_retention_index_shape_count integer;
  v_retry_index_shape_count integer;
  v_rls_enabled boolean;
  v_service_role_can_execute boolean;
  v_service_role_can_mutate boolean;
  v_service_role_can_select boolean;
  v_target record;
begin
  v_queue_table := to_regclass('feed.media_storage_cleanup_queue');

  if v_queue_table is null then
    raise exception 'feed_media_storage_cleanup_postcondition_failed'
      using errcode = '23514';
  end if;

  select
    relation.relacl,
    relation.relowner,
    relation.relrowsecurity
  into
    v_queue_acl,
    v_queue_owner,
    v_rls_enabled
  from pg_class relation
  where relation.oid = v_queue_table;

  select count(*)
  into v_column_count
  from (
    values
      ('id', 'uuid'::regtype::oid, true),
      ('guard_account_id', 'uuid'::regtype::oid, false),
      ('storage_provider', 'text'::regtype::oid, true),
      ('storage_path', 'text'::regtype::oid, true),
      ('byte_size', 'bigint'::regtype::oid, true),
      ('reason', 'text'::regtype::oid, true),
      ('attempts', 'integer'::regtype::oid, true),
      ('next_attempt_at', 'timestamp with time zone'::regtype::oid, true),
      ('created_at', 'timestamp with time zone'::regtype::oid, true),
      ('updated_at', 'timestamp with time zone'::regtype::oid, true),
      ('resolved_at', 'timestamp with time zone'::regtype::oid, false)
  ) as target(attname, atttypid, attnotnull)
  join pg_attribute attribute
    on attribute.attrelid = v_queue_table
   and attribute.attname = target.attname
   and attribute.atttypid = target.atttypid
   and attribute.attnotnull = target.attnotnull
   and attribute.attnum > 0
   and not attribute.attisdropped;

  select count(*)
  into v_default_count
  from pg_attrdef default_row
  join pg_attribute attribute
    on attribute.attrelid = default_row.adrelid
   and attribute.attnum = default_row.adnum
  where default_row.adrelid = v_queue_table
    and attribute.attname in (
      'attempts',
      'created_at',
      'id',
      'next_attempt_at',
      'updated_at'
    );

  select count(*)
  into v_constraint_count
  from pg_constraint constraint_row
  where constraint_row.conrelid = v_queue_table
    and constraint_row.contype = 'c'
    and constraint_row.convalidated
    and constraint_row.conname in (
      'media_storage_cleanup_queue_attempts_check',
      'media_storage_cleanup_queue_byte_size_check',
      'media_storage_cleanup_queue_path_check',
      'media_storage_cleanup_queue_provider_check',
      'media_storage_cleanup_queue_reason_check',
      'media_storage_cleanup_queue_resolution_check'
    );

  select count(*)
  into v_commented_column_count
  from pg_attribute attribute
  where attribute.attrelid = v_queue_table
    and attribute.attnum > 0
    and not attribute.attisdropped
    and col_description(attribute.attrelid, attribute.attnum) is not null;

  select attribute.attnum::smallint
  into v_guard_account_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_queue_table
    and attribute.attname = 'guard_account_id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_provider_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_queue_table
    and attribute.attname = 'storage_provider'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_path_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_queue_table
    and attribute.attname = 'storage_path'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_byte_size_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_queue_table
    and attribute.attname = 'byte_size'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_next_attempt_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_queue_table
    and attribute.attname = 'next_attempt_at'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_id_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_queue_table
    and attribute.attname = 'id'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select attribute.attnum::smallint
  into v_resolved_at_attnum
  from pg_attribute attribute
  where attribute.attrelid = v_queue_table
    and attribute.attname = 'resolved_at'
    and attribute.attnum > 0
    and not attribute.attisdropped;

  select count(*)
  into v_active_index_shape_count
  from pg_index index_row
  where index_row.indexrelid = to_regclass(
      'feed.media_storage_cleanup_queue_active_object_uidx'
    )
    and index_row.indrelid = v_queue_table
    and index_row.indisunique
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 2
    and index_row.indnatts = 3
    and array(
      select indexed_attribute.attnum
      from unnest(index_row.indkey::smallint[]) with ordinality
        as indexed_attribute(attnum, position)
      order by indexed_attribute.position
    ) = array[
      v_provider_attnum,
      v_path_attnum,
      v_byte_size_attnum
    ]::smallint[]
    and pg_get_expr(index_row.indpred, index_row.indrelid)
      = '(resolved_at IS NULL)';

  select count(*)
  into v_retry_index_shape_count
  from pg_index index_row
  where index_row.indexrelid = to_regclass(
      'feed.media_storage_cleanup_queue_retry_idx'
    )
    and index_row.indrelid = v_queue_table
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 2
    and index_row.indnatts = 2
    and array(
      select indexed_attribute.attnum
      from unnest(index_row.indkey::smallint[]) with ordinality
        as indexed_attribute(attnum, position)
      order by indexed_attribute.position
    ) = array[v_next_attempt_attnum, v_id_attnum]::smallint[]
    and pg_get_expr(index_row.indpred, index_row.indrelid)
      = '((resolved_at IS NULL) AND (guard_account_id IS NULL))';

  select count(*)
  into v_guard_index_shape_count
  from pg_index index_row
  where index_row.indexrelid = to_regclass(
      'feed.media_storage_cleanup_queue_guard_account_idx'
    )
    and index_row.indrelid = v_queue_table
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 1
    and index_row.indnatts = 1
    and array(
      select indexed_attribute.attnum
      from unnest(index_row.indkey::smallint[]) with ordinality
        as indexed_attribute(attnum, position)
      order by indexed_attribute.position
    ) = array[v_guard_account_attnum]::smallint[]
    and pg_get_expr(index_row.indpred, index_row.indrelid)
      = '(guard_account_id IS NOT NULL)';

  select count(*)
  into v_retention_index_shape_count
  from pg_index index_row
  where index_row.indexrelid = to_regclass(
      'feed.media_storage_cleanup_queue_resolved_retention_idx'
    )
    and index_row.indrelid = v_queue_table
    and index_row.indisvalid
    and index_row.indisready
    and index_row.indnkeyatts = 2
    and index_row.indnatts = 2
    and array(
      select indexed_attribute.attnum
      from unnest(index_row.indkey::smallint[]) with ordinality
        as indexed_attribute(attnum, position)
      order by indexed_attribute.position
    ) = array[v_resolved_at_attnum, v_id_attnum]::smallint[]
    and pg_get_expr(index_row.indpred, index_row.indrelid)
      = '(resolved_at IS NOT NULL)';

  select count(*)
  into v_delete_trigger_count
  from pg_trigger trigger_row
  where trigger_row.tgrelid = 'feed.feed_post_media'::regclass
    and trigger_row.tgname = 'feed_post_media_delete_cleanup'
    and trigger_row.tgfoid = to_regprocedure(
      'feed.enqueue_deleted_feed_post_media_cleanup()'
    )
    and trigger_row.tgtype = 11
    and trigger_row.tgenabled = 'O'
    and not trigger_row.tgisinternal
    and obj_description(trigger_row.oid, 'pg_trigger') is not null;

  select count(*)
  into v_soft_delete_trigger_count
  from pg_trigger trigger_row
  where trigger_row.tgrelid = 'feed.feed_post'::regclass
    and trigger_row.tgname = 'feed_post_soft_delete_hide_media'
    and trigger_row.tgfoid = to_regprocedure(
      'feed.hide_feed_post_media_after_soft_delete()'
    )
    and trigger_row.tgtype = 17
    and trigger_row.tgenabled = 'O'
    and not trigger_row.tgisinternal
    and obj_description(trigger_row.oid, 'pg_trigger') is not null;

  v_anonymous_has_access :=
    has_table_privilege('anon', v_queue_table, 'SELECT')
    or has_table_privilege('anon', v_queue_table, 'INSERT')
    or has_table_privilege('anon', v_queue_table, 'UPDATE')
    or has_table_privilege('anon', v_queue_table, 'DELETE')
    or has_table_privilege('anon', v_queue_table, 'TRUNCATE');
  v_authenticated_has_access :=
    has_table_privilege('authenticated', v_queue_table, 'SELECT')
    or has_table_privilege('authenticated', v_queue_table, 'INSERT')
    or has_table_privilege('authenticated', v_queue_table, 'UPDATE')
    or has_table_privilege('authenticated', v_queue_table, 'DELETE')
    or has_table_privilege('authenticated', v_queue_table, 'TRUNCATE');
  v_service_role_can_select := has_table_privilege(
    'service_role',
    v_queue_table,
    'SELECT'
  );
  v_service_role_can_mutate :=
    has_table_privilege('service_role', v_queue_table, 'INSERT')
    or has_table_privilege('service_role', v_queue_table, 'UPDATE')
    or has_table_privilege('service_role', v_queue_table, 'DELETE')
    or has_table_privilege('service_role', v_queue_table, 'TRUNCATE');

  if v_column_count <> 11
    or v_default_count <> 5
    or v_constraint_count <> 6
    or v_commented_column_count <> 11
    or obj_description(v_queue_table, 'pg_class') is null
    or not coalesce(v_rls_enabled, false)
    or exists (
      select 1
      from pg_policy policy_row
      where policy_row.polrelid = v_queue_table
    )
    or v_active_index_shape_count <> 1
    or v_retry_index_shape_count <> 1
    or v_guard_index_shape_count <> 1
    or v_retention_index_shape_count <> 1
    or v_delete_trigger_count <> 1
    or v_soft_delete_trigger_count <> 1
    or not exists (
      select 1
      from pg_constraint constraint_row
      where constraint_row.conrelid = v_queue_table
        and constraint_row.contype = 'f'
        and constraint_row.convalidated
        and constraint_row.conkey =
          array[v_guard_account_attnum]::smallint[]
        and constraint_row.confrelid = 'identity.account'::regclass
        and constraint_row.confdeltype = 'n'
    )
    or coalesce(v_anonymous_has_access, true)
    or coalesce(v_authenticated_has_access, true)
    or not coalesce(v_service_role_can_select, false)
    or coalesce(v_service_role_can_mutate, true)
    or exists (
      select 1
      from aclexplode(coalesce(v_queue_acl, acldefault('r', v_queue_owner)))
        acl_entry
      where acl_entry.grantee = 0
        and acl_entry.privilege_type in (
          'SELECT',
          'INSERT',
          'UPDATE',
          'DELETE',
          'TRUNCATE'
        )
    )
  then
    raise exception 'feed_media_storage_cleanup_postcondition_failed'
      using errcode = '23514';
  end if;

  for v_target in
    select *
    from (
      values
        (
          'feed.enqueue_media_storage_cleanup(text,text,bigint,text)',
          'uuid'::regtype::oid,
          true
        ),
        (
          'feed.enqueue_account_media_storage_cleanup(uuid,text,text,bigint,text)',
          'uuid'::regtype::oid,
          true
        ),
        (
          'feed.resolve_media_storage_cleanup(text,text)',
          'boolean'::regtype::oid,
          true
        ),
        (
          'feed.prune_resolved_media_storage_cleanup(integer)',
          'integer'::regtype::oid,
          true
        ),
        (
          'feed.activate_feed_post_media(uuid,text[])',
          'boolean'::regtype::oid,
          true
        ),
        (
          'feed.enqueue_deleted_feed_post_media_cleanup()',
          'trigger'::regtype::oid,
          false
        ),
        (
          'feed.hide_feed_post_media_after_soft_delete()',
          'trigger'::regtype::oid,
          false
        )
    ) as targets(signature, return_type, service_execute)
  loop
    v_function_oid := to_regprocedure(v_target.signature);

    if v_function_oid is null then
      raise exception 'feed_media_storage_cleanup_rpc_missing: %',
        v_target.signature
        using errcode = '23514';
    end if;

    select
      procedure_row.proacl,
      procedure_row.proconfig,
      procedure_row.proowner,
      procedure_row.prorettype,
      procedure_row.prosecdef,
      procedure_row.provolatile
    into
      v_function_acl,
      v_function_config,
      v_function_owner,
      v_function_return_type,
      v_function_security_definer,
      v_function_volatility
    from pg_proc procedure_row
    where procedure_row.oid = v_function_oid;

    v_service_role_can_execute := has_function_privilege(
      'service_role',
      v_function_oid,
      'EXECUTE'
    );

    if v_function_return_type <> v_target.return_type
      or v_function_volatility <> 'v'
      or not coalesce(v_function_security_definer, false)
      or not coalesce(
        v_function_config @> array['search_path=pg_catalog, feed'],
        false
      )
      or has_function_privilege('anon', v_function_oid, 'EXECUTE')
      or has_function_privilege(
        'authenticated',
        v_function_oid,
        'EXECUTE'
      )
      or coalesce(v_service_role_can_execute, false)
        <> v_target.service_execute
      or exists (
        select 1
        from aclexplode(
          coalesce(v_function_acl, acldefault('f', v_function_owner))
        ) acl_entry
        where acl_entry.grantee = 0
          and acl_entry.privilege_type = 'EXECUTE'
      )
      or obj_description(v_function_oid, 'pg_proc') is null
    then
      raise exception 'feed_media_storage_cleanup_rpc_postcondition_failed: %',
        v_target.signature
        using errcode = '23514';
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';

commit;
