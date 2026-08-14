begin;

set local lock_timeout = '5s';

-- Fail closed before installing the deletion boundary. Every persisted result
-- key must be an exact, trimmed client id so the writer and deleter always
-- derive the same advisory-lock key. The migration is one transaction, so a
-- failed preflight or validation leaves both schema and backfill untouched.
do $$
declare
  v_attempt_invalid bigint;
  v_lab_invalid bigint;
  v_progress_invalid bigint;
  v_topic_invalid bigint;
begin
  select count(*)
  into v_progress_invalid
  from assessment.account_assessment_progress
  where char_length(client_attempt_id) not between 6 and 128
    or client_attempt_id is distinct from btrim(client_attempt_id);

  select count(*)
  into v_attempt_invalid
  from assessment.assessment_attempt
  where local_result_id is not null
    and (
      char_length(local_result_id) not between 6 and 128
      or local_result_id is distinct from btrim(local_result_id)
    );

  select count(*)
  into v_topic_invalid
  from assessment.free_topic_result
  where char_length(local_result_id) not between 6 and 128
    or local_result_id is distinct from btrim(local_result_id);

  select count(*)
  into v_lab_invalid
  from assessment.lab_result
  where char_length(local_result_id) not between 6 and 128
    or local_result_id is distinct from btrim(local_result_id);

  if v_progress_invalid > 0
    or v_attempt_invalid > 0
    or v_topic_invalid > 0
    or v_lab_invalid > 0 then
    raise exception 'result_local_result_id_preflight_failed'
      using
        errcode = '23514',
        detail = pg_catalog.format(
          'progress=%s, attempt=%s, topic=%s, lab=%s',
          v_progress_invalid,
          v_attempt_invalid,
          v_topic_invalid,
          v_lab_invalid
        );
  end if;
end;
$$;

alter table assessment.account_assessment_progress
  drop constraint if exists account_assessment_progress_client_attempt_id_exact_check;
alter table assessment.account_assessment_progress
  add constraint account_assessment_progress_client_attempt_id_exact_check
  check (
    char_length(client_attempt_id) between 6 and 128
    and client_attempt_id = btrim(client_attempt_id)
  ) not valid;

alter table assessment.assessment_attempt
  drop constraint if exists assessment_attempt_local_result_id_exact_check;
alter table assessment.assessment_attempt
  add constraint assessment_attempt_local_result_id_exact_check
  check (
    local_result_id is null
    or (
      char_length(local_result_id) between 6 and 128
      and local_result_id = btrim(local_result_id)
    )
  ) not valid;

alter table assessment.free_topic_result
  drop constraint if exists free_topic_result_local_result_id_exact_check;
alter table assessment.free_topic_result
  add constraint free_topic_result_local_result_id_exact_check
  check (
    char_length(local_result_id) between 6 and 128
    and local_result_id = btrim(local_result_id)
  ) not valid;

-- Replace the earlier 8-character lab constraint with the shared persisted
-- result contract. This remains safe because the preflight ran first and the
-- transaction rolls back the drop if validation below finds any bad row.
alter table assessment.lab_result
  drop constraint if exists lab_result_local_result_id_check;
alter table assessment.lab_result
  drop constraint if exists lab_result_local_result_id_exact_check;
alter table assessment.lab_result
  add constraint lab_result_local_result_id_exact_check
  check (
    char_length(local_result_id) between 6 and 128
    and local_result_id = btrim(local_result_id)
  ) not valid;

alter table assessment.account_assessment_progress
  validate constraint account_assessment_progress_client_attempt_id_exact_check;
alter table assessment.assessment_attempt
  validate constraint assessment_attempt_local_result_id_exact_check;
alter table assessment.free_topic_result
  validate constraint free_topic_result_local_result_id_exact_check;
alter table assessment.lab_result
  validate constraint lab_result_local_result_id_exact_check;

create table if not exists assessment.result_deletion_tombstone (
  account_id uuid not null
    references identity.account(id) on delete cascade,
  result_kind text not null
    check (result_kind in ('core', 'topic', 'lab')),
  local_result_id text not null
    check (
      char_length(local_result_id) between 6 and 128
      and local_result_id = btrim(local_result_id)
    ),
  deleted_at timestamptz not null default now(),
  primary key (account_id, result_kind, local_result_id)
);

alter table assessment.result_deletion_tombstone enable row level security;

revoke all on assessment.result_deletion_tombstone
from public, anon, authenticated;

grant select, insert, update, delete
on assessment.result_deletion_tombstone
to service_role;

comment on table assessment.result_deletion_tombstone is
  'Service-only deletion boundary that prevents a late or retried client write from recreating a user-deleted result.';

-- Preserve the deletion boundary for rows that were soft-deleted before this
-- migration. Those ids must never become active through an idempotent retry.
insert into assessment.result_deletion_tombstone (
  account_id,
  deleted_at,
  local_result_id,
  result_kind
)
select account_id, deleted_at, client_attempt_id, 'core'
from assessment.account_assessment_progress
where deleted_at is not null
on conflict (account_id, result_kind, local_result_id) do nothing;

-- One canonical key derivation prevents blocking and fail-fast compatibility
-- locks from drifting to subtly different advisory-lock namespaces.
create or replace function assessment.persisted_result_lock_key(
  p_account_id uuid,
  p_result_kind text,
  p_local_result_id text
)
returns bigint
language plpgsql
immutable
parallel safe
set search_path = pg_catalog, assessment
as $$
begin
  if p_account_id is null
    or p_result_kind is null
    or p_result_kind not in ('core', 'topic', 'lab')
    or p_local_result_id is null
    or char_length(p_local_result_id) not between 6 and 128
    or p_local_result_id is distinct from btrim(p_local_result_id) then
    raise exception 'result_lock_invalid'
      using errcode = '22023';
  end if;

  return pg_catalog.hashtextextended(
    p_account_id::text || ':' || p_result_kind || ':' || p_local_result_id,
    0
  );
end;
$$;

revoke all on function assessment.persisted_result_lock_key(uuid, text, text)
from public, anon, authenticated;

grant execute on function assessment.persisted_result_lock_key(uuid, text, text)
to service_role;

-- Blocking acquisition is used by every current writer and deletion RPC,
-- always before a row read-for-update or row-changing DML.
create or replace function assessment.lock_persisted_result_key(
  p_account_id uuid,
  p_result_kind text,
  p_local_result_id text
)
returns void
language plpgsql
set search_path = pg_catalog, assessment
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(
    assessment.persisted_result_lock_key(
      p_account_id,
      p_result_kind,
      p_local_result_id
    )
  );
end;
$$;

revoke all on function assessment.lock_persisted_result_key(uuid, text, text)
from public, anon, authenticated;

grant execute on function assessment.lock_persisted_result_key(uuid, text, text)
to service_role;

insert into assessment.result_deletion_tombstone (
  account_id,
  deleted_at,
  local_result_id,
  result_kind
)
select account_id, coalesce(completed_at, claimed_at, now()), local_result_id, 'core'
from assessment.assessment_attempt
where status = 'deleted'
  and local_result_id is not null
on conflict (account_id, result_kind, local_result_id) do nothing;

insert into assessment.result_deletion_tombstone (
  account_id,
  deleted_at,
  local_result_id,
  result_kind
)
select account_id, deleted_at, local_result_id, 'topic'
from assessment.free_topic_result
where deleted_at is not null
on conflict (account_id, result_kind, local_result_id) do nothing;

insert into assessment.result_deletion_tombstone (
  account_id,
  deleted_at,
  local_result_id,
  result_kind
)
select account_id, deleted_at, local_result_id, 'lab'
from assessment.lab_result
where deleted_at is not null
on conflict (account_id, result_kind, local_result_id) do nothing;

-- The transaction must never proceed with a partial historical boundary.
-- This also guards future edits to the backfill queries from silently
-- omitting one persisted result family.
do $$
begin
  if exists (
    select 1
    from assessment.account_assessment_progress progress
    where progress.deleted_at is not null
      and not exists (
        select 1
        from assessment.result_deletion_tombstone tombstone
        where tombstone.account_id = progress.account_id
          and tombstone.result_kind = 'core'
          and tombstone.local_result_id = progress.client_attempt_id
      )
  ) or exists (
    select 1
    from assessment.assessment_attempt attempt
    where attempt.status = 'deleted'
      and attempt.local_result_id is not null
      and not exists (
        select 1
        from assessment.result_deletion_tombstone tombstone
        where tombstone.account_id = attempt.account_id
          and tombstone.result_kind = 'core'
          and tombstone.local_result_id = attempt.local_result_id
      )
  ) or exists (
    select 1
    from assessment.free_topic_result topic
    where topic.deleted_at is not null
      and not exists (
        select 1
        from assessment.result_deletion_tombstone tombstone
        where tombstone.account_id = topic.account_id
          and tombstone.result_kind = 'topic'
          and tombstone.local_result_id = topic.local_result_id
      )
  ) or exists (
    select 1
    from assessment.lab_result lab
    where lab.deleted_at is not null
      and not exists (
        select 1
        from assessment.result_deletion_tombstone tombstone
        where tombstone.account_id = lab.account_id
          and tombstone.result_kind = 'lab'
          and tombstone.local_result_id = lab.local_result_id
      )
  ) then
    raise exception 'result_deletion_tombstone_backfill_incomplete'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function assessment.guard_result_deletion_tombstone()
returns trigger
language plpgsql
set search_path = pg_catalog, assessment
as $$
declare
  v_kind text;
  v_local_result_id text;
  v_old_local_result_id text;
begin
  v_kind := case tg_table_name
    when 'account_assessment_progress' then 'core'
    when 'free_topic_result' then 'topic'
    when 'lab_result' then 'lab'
    else null
  end;
  v_local_result_id := case tg_table_name
    when 'account_assessment_progress' then new.client_attempt_id
    else new.local_result_id
  end;
  v_old_local_result_id := case
    when tg_op <> 'UPDATE' then null
    when tg_table_name = 'account_assessment_progress'
      then old.client_attempt_id
    else old.local_result_id
  end;

  if v_kind is null or new.account_id is null or v_local_result_id is null then
    raise exception 'result_deletion_guard_invalid'
      using errcode = '22023';
  end if;

  if tg_op = 'UPDATE'
    and (
      old.account_id is distinct from new.account_id
      or v_old_local_result_id is distinct from v_local_result_id
    ) then
    raise exception 'persisted_result_key_immutable'
      using errcode = '22023';
  end if;

  -- BEFORE INSERT runs before uniqueness/conflict row locking. Therefore both
  -- the topic INSERT and lab INSERT ... ON CONFLICT writer take the canonical
  -- logical-key lock before any row lock. UPDATE paths are either the core
  -- save RPC, the already-locked ON CONFLICT arm, or deletion RPCs; acquiring
  -- an advisory lock for the first time inside a BEFORE UPDATE row trigger
  -- would recreate the row-lock/advisory-lock inversion this migration fixes.
  if tg_op = 'INSERT' then
    perform assessment.lock_persisted_result_key(
      new.account_id,
      v_kind,
      v_local_result_id
    );
  end if;

  -- Current deletion RPCs create the tombstone before they lock/update the
  -- result row. During a DB-first rolling deploy, however, an older app
  -- instance can still issue a direct soft-delete UPDATE. Preserve that
  -- operation without waiting in reverse lock order: try the exact canonical
  -- advisory key and fail fast on contention, releasing this row lock so the
  -- canonical writer/deleter can finish. This compatibility path is safe to
  -- retain after rollout because it can never wait while holding a row lock.
  if tg_op = 'UPDATE'
    and old.deleted_at is null
    and new.deleted_at is not null then
    if not exists (
      select 1
      from assessment.result_deletion_tombstone tombstone
      where tombstone.account_id = new.account_id
        and tombstone.result_kind = v_kind
        and tombstone.local_result_id = v_local_result_id
    ) then
      if not pg_catalog.pg_try_advisory_xact_lock(
        assessment.persisted_result_lock_key(
          new.account_id,
          v_kind,
          v_local_result_id
        )
      ) then
        raise exception 'persisted_result_delete_retry'
          using errcode = '40001';
      end if;

      insert into assessment.result_deletion_tombstone (
        account_id,
        deleted_at,
        local_result_id,
        result_kind
      )
      values (
        new.account_id,
        new.deleted_at,
        v_local_result_id,
        v_kind
      )
      on conflict (account_id, result_kind, local_result_id)
      do update set deleted_at = excluded.deleted_at;
    end if;
    return new;
  end if;

  if exists (
    select 1
    from assessment.result_deletion_tombstone tombstone
    where tombstone.account_id = new.account_id
      and tombstone.result_kind = v_kind
      and tombstone.local_result_id = v_local_result_id
  ) then
    raise exception 'persisted_result_deleted'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_result_deletion_tombstone
on assessment.account_assessment_progress;
create trigger guard_result_deletion_tombstone
before insert or update on assessment.account_assessment_progress
for each row execute function assessment.guard_result_deletion_tombstone();

drop trigger if exists guard_result_deletion_tombstone
on assessment.free_topic_result;
create trigger guard_result_deletion_tombstone
before insert or update on assessment.free_topic_result
for each row execute function assessment.guard_result_deletion_tombstone();

drop trigger if exists guard_result_deletion_tombstone
on assessment.lab_result;
create trigger guard_result_deletion_tombstone
before insert or update on assessment.lab_result
for each row execute function assessment.guard_result_deletion_tombstone();

revoke all on function assessment.guard_result_deletion_tombstone()
from public, anon, authenticated;

grant execute on function assessment.guard_result_deletion_tombstone()
to service_role;

-- The original progress RPC locked "account:id" and only then updated a row
-- whose trigger locked "account:core:id". A deleter could hold the latter
-- while waiting for that row, producing a row-lock/advisory-lock cycle. Keep
-- the RPC contract and optimistic-revision semantics unchanged, but acquire
-- the canonical logical-key lock before SELECT ... FOR UPDATE or any DML.
create or replace function assessment.save_account_assessment_progress(
  p_account_id uuid,
  p_client_attempt_id text,
  p_expected_revision bigint,
  p_attempt jsonb
)
returns table (
  attempt_payload jsonb,
  revision bigint,
  restored boolean
)
language plpgsql
security definer
set search_path = assessment, identity, public, pg_temp
as $$
declare
  v_existing assessment.account_assessment_progress%rowtype;
  v_assessment_id text;
  v_release_id text;
  v_mode text;
  v_state text;
  v_client_created_at timestamptz;
  v_client_updated_at timestamptz;
  v_completed_at timestamptz;
begin
  if p_account_id is null
    or p_client_attempt_id is null
    or char_length(p_client_attempt_id) not between 6 and 128
    or p_client_attempt_id is distinct from btrim(p_client_attempt_id)
    or jsonb_typeof(p_attempt) is distinct from 'object'
    or p_attempt ->> 'id' is distinct from p_client_attempt_id then
    raise exception 'core_assessment_progress_invalid'
      using errcode = '22023';
  end if;

  v_assessment_id := p_attempt ->> 'assessmentId';
  v_release_id := p_attempt ->> 'releaseId';
  v_mode := p_attempt ->> 'mode';
  v_state := p_attempt ->> 'state';

  if v_assessment_id not in ('nu-core-quick', 'nu-core-full')
    or v_mode not in ('quick', 'full')
    or v_state not in ('in_progress', 'completed')
    or nullif(v_release_id, '') is null
    or char_length(v_release_id) > 120
    or jsonb_typeof(p_attempt -> 'responses') is distinct from 'object'
    or jsonb_typeof(p_attempt -> 'itemIds') is distinct from 'array' then
    raise exception 'core_assessment_progress_invalid'
      using errcode = '22023';
  end if;

  begin
    v_client_created_at := (p_attempt ->> 'createdAt')::timestamptz;
    v_client_updated_at := (p_attempt ->> 'updatedAt')::timestamptz;
    v_completed_at := case
      when p_attempt ? 'completedAt'
        then (p_attempt ->> 'completedAt')::timestamptz
      else null
    end;
  exception when others then
    raise exception 'core_assessment_progress_invalid'
      using errcode = '22023';
  end;

  if v_client_created_at > v_client_updated_at
    or (v_state = 'completed' and v_completed_at is null)
    or (v_state = 'in_progress' and v_completed_at is not null)
    or (
      v_completed_at is not null
      and (
        v_completed_at < v_client_created_at
        or v_completed_at > v_client_updated_at
      )
    ) then
    raise exception 'core_assessment_progress_invalid'
      using errcode = '22023';
  end if;

  -- This must remain before SELECT ... FOR UPDATE and before INSERT/UPDATE.
  perform assessment.lock_persisted_result_key(
    p_account_id,
    'core',
    p_client_attempt_id
  );

  -- Detect the terminal delete before optimistic-revision handling. Without
  -- this check a retry carrying an expected revision would report a generic
  -- revision conflict because deleted progress rows are intentionally hidden
  -- from the SELECT below.
  if exists (
    select 1
    from assessment.result_deletion_tombstone tombstone
    where tombstone.account_id = p_account_id
      and tombstone.result_kind = 'core'
      and tombstone.local_result_id = p_client_attempt_id
  ) then
    raise exception 'persisted_result_deleted'
      using errcode = 'P0001';
  end if;

  select progress.*
  into v_existing
  from assessment.account_assessment_progress progress
  where progress.account_id = p_account_id
    and progress.client_attempt_id = p_client_attempt_id
    and progress.deleted_at is null
  for update;

  if not found then
    if p_expected_revision is not null then
      raise exception 'core_assessment_progress_revision_conflict'
        using errcode = '40001';
    end if;

    insert into assessment.account_assessment_progress (
      account_id,
      assessment_id,
      assessment_mode,
      attempt_payload,
      client_attempt_id,
      client_created_at,
      client_updated_at,
      completed_at,
      release_id,
      revision,
      state
    )
    values (
      p_account_id,
      v_assessment_id,
      v_mode,
      p_attempt,
      p_client_attempt_id,
      v_client_created_at,
      v_client_updated_at,
      v_completed_at,
      v_release_id,
      1,
      v_state
    )
    returning * into v_existing;

    return query
    select v_existing.attempt_payload, v_existing.revision, false;
    return;
  end if;

  -- Exact retries are idempotent even if the caller still has an old revision.
  if v_existing.attempt_payload = p_attempt then
    return query
    select v_existing.attempt_payload, v_existing.revision, true;
    return;
  end if;

  if p_expected_revision is null
    or p_expected_revision <> v_existing.revision then
    raise exception 'core_assessment_progress_revision_conflict'
      using errcode = '40001';
  end if;

  update assessment.account_assessment_progress progress
  set
    assessment_id = v_assessment_id,
    assessment_mode = v_mode,
    attempt_payload = p_attempt,
    client_created_at = v_client_created_at,
    client_updated_at = v_client_updated_at,
    completed_at = v_completed_at,
    release_id = v_release_id,
    revision = progress.revision + 1,
    state = v_state,
    updated_at = now()
  where progress.id = v_existing.id
  returning * into v_existing;

  return query
  select v_existing.attempt_payload, v_existing.revision, false;
end;
$$;

revoke all on function assessment.save_account_assessment_progress(
  uuid,
  text,
  bigint,
  jsonb
)
from public, anon, authenticated;

grant execute on function assessment.save_account_assessment_progress(
  uuid,
  text,
  bigint,
  jsonb
)
to service_role;

comment on function assessment.save_account_assessment_progress(
  uuid,
  text,
  bigint,
  jsonb
) is
  'Service-role-only idempotent progress upsert with optimistic revision checks and a deletion-safe logical-key lock.';

-- Claiming also reads the idempotency row before its first INSERT. Lock the
-- logical key before that read so an existing-result fast path cannot race a
-- delete and a new claim cannot reach row/index locking ahead of the deleter.
create or replace function public.claim_assessment_result_atomic(
  p_account_id uuid,
  p_local_result_id text,
  p_assessment_slug text,
  p_assessment_kind text,
  p_completed_at timestamptz,
  p_measurement_release_id text,
  p_item_release_version text,
  p_code_scheme_version text,
  p_scoring_release_id text,
  p_scoring_version text,
  p_responses jsonb,
  p_score_payload jsonb,
  p_profile_code text,
  p_profile_name text,
  p_summary jsonb,
  p_share_summary jsonb
)
returns table (
  assessment_attempt_id uuid,
  claimed_at timestamptz,
  result_report_id uuid,
  profile_code text,
  profile_name text
)
language plpgsql
security definer
set search_path = public, identity, assessment, scoring, report, pg_temp
as $$
declare
  v_attempt assessment.assessment_attempt%rowtype;
  v_report report.result_report%rowtype;
  v_response_count integer;
begin
  if p_account_id is null
    or p_local_result_id is null
    or char_length(p_local_result_id) not between 6 and 128
    or p_local_result_id is distinct from btrim(p_local_result_id) then
    raise exception 'invalid_local_result_id'
      using errcode = '22023';
  end if;

  if p_assessment_kind not in ('quick', 'full') then
    raise exception 'invalid_assessment_kind'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_responses) is distinct from 'array'
    or jsonb_array_length(p_responses) = 0 then
    raise exception 'invalid_assessment_responses'
      using errcode = '22023';
  end if;

  select count(distinct response.value->>'itemId')
    into v_response_count
  from jsonb_array_elements(p_responses) response(value)
  where nullif(btrim(response.value->>'itemId'), '') is not null
    and (
      (
        coalesce((response.value->>'skipped')::boolean, false)
        and response.value->>'value' is null
      )
      or (
        not coalesce((response.value->>'skipped')::boolean, false)
        and (response.value->>'value')::integer between 1 and 5
      )
    );

  if v_response_count <> jsonb_array_length(p_responses) then
    raise exception 'invalid_assessment_responses'
      using errcode = '22023';
  end if;

  -- This must remain before the first assessment_attempt read or any DML.
  perform assessment.lock_persisted_result_key(
    p_account_id,
    'core',
    p_local_result_id
  );

  if exists (
    select 1
    from assessment.result_deletion_tombstone tombstone
    where tombstone.account_id = p_account_id
      and tombstone.result_kind = 'core'
      and tombstone.local_result_id = p_local_result_id
  ) then
    raise exception 'persisted_result_deleted'
      using errcode = 'P0001';
  end if;

  select attempt.*
    into v_attempt
  from assessment.assessment_attempt attempt
  where attempt.account_id = p_account_id
    and attempt.local_result_id = p_local_result_id
  limit 1;

  if found then
    select result.*
      into v_report
    from report.result_report result
    where result.account_id = p_account_id
      and result.attempt_id = v_attempt.id
      and result.deleted_at is null
    order by result.created_at desc
    limit 1;

    if not found then
      raise exception 'incomplete_existing_result_claim'
        using errcode = 'P0001';
    end if;

    return query
    select
      v_attempt.id,
      v_attempt.claimed_at,
      v_report.id,
      v_report.profile_code,
      v_report.profile_name;
    return;
  end if;

  begin
    insert into assessment.assessment_attempt (
      account_id,
      assessment_kind,
      assessment_slug,
      claimed_at,
      code_scheme_version,
      completed_at,
      item_release_version,
      local_result_id,
      measurement_release_id,
      scoring_release_id,
      scoring_version,
      status
    )
    values (
      p_account_id,
      p_assessment_kind,
      p_assessment_slug,
      now(),
      p_code_scheme_version,
      p_completed_at,
      p_item_release_version,
      p_local_result_id,
      p_measurement_release_id,
      p_scoring_release_id,
      p_scoring_version,
      'claimed'
    )
    returning * into v_attempt;

    insert into assessment.assessment_response (
      account_id,
      answered_at,
      attempt_id,
      item_id,
      skipped,
      value
    )
    select
      p_account_id,
      (response.value->>'answeredAt')::timestamptz,
      v_attempt.id,
      response.value->>'itemId',
      coalesce((response.value->>'skipped')::boolean, false),
      case
        when coalesce((response.value->>'skipped')::boolean, false) then null
        else (response.value->>'value')::smallint
      end
    from jsonb_array_elements(p_responses) response(value);

    insert into scoring.score_snapshot (
      account_id,
      attempt_id,
      code_scheme_version,
      measurement_release_id,
      score_payload,
      scoring_release_id,
      scoring_version
    )
    values (
      p_account_id,
      v_attempt.id,
      p_code_scheme_version,
      p_measurement_release_id,
      p_score_payload,
      p_scoring_release_id,
      p_scoring_version
    );

    insert into report.result_report (
      account_id,
      attempt_id,
      code_scheme_version,
      measurement_release_id,
      profile_code,
      profile_name,
      report_kind,
      scoring_release_id,
      share_summary,
      summary
    )
    values (
      p_account_id,
      v_attempt.id,
      p_code_scheme_version,
      p_measurement_release_id,
      p_profile_code,
      p_profile_name,
      p_assessment_kind,
      p_scoring_release_id,
      p_share_summary,
      p_summary
    )
    returning * into v_report;
  exception
    when unique_violation then
      select attempt.*
        into v_attempt
      from assessment.assessment_attempt attempt
      where attempt.account_id = p_account_id
        and attempt.local_result_id = p_local_result_id
      limit 1;

      if not found then
        raise;
      end if;

      select result.*
        into v_report
      from report.result_report result
      where result.account_id = p_account_id
        and result.attempt_id = v_attempt.id
        and result.deleted_at is null
      order by result.created_at desc
      limit 1;

      if not found then
        raise exception 'incomplete_concurrent_result_claim'
          using errcode = 'P0001';
      end if;
  end;

  return query
  select
    v_attempt.id,
    v_attempt.claimed_at,
    v_report.id,
    v_report.profile_code,
    v_report.profile_name;
end;
$$;

revoke all on function public.claim_assessment_result_atomic(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.claim_assessment_result_atomic(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb,
  jsonb
) to service_role;

comment on function public.claim_assessment_result_atomic(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb,
  jsonb
) is
  'Atomically stores one server-scored assessment result under the same deletion-safe logical-key lock used by core deletion.';

-- Result claiming writes assessment_attempt directly, so it needs the same
-- deletion boundary as the progress store. This separate trigger deliberately
-- avoids referring to deleted_at, which assessment_attempt does not have.
create or replace function assessment.guard_core_result_claim_tombstone()
returns trigger
language plpgsql
set search_path = pg_catalog, assessment
as $$
begin
  if tg_op = 'UPDATE'
    and (
      old.account_id is distinct from new.account_id
      or old.local_result_id is distinct from new.local_result_id
    ) then
    raise exception 'persisted_result_key_immutable'
      using errcode = '22023';
  end if;

  if new.account_id is null or new.local_result_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform assessment.lock_persisted_result_key(
      new.account_id,
      'core',
      new.local_result_id
    );
  end if;

  if exists (
    select 1
    from assessment.result_deletion_tombstone tombstone
    where tombstone.account_id = new.account_id
      and tombstone.result_kind = 'core'
      and tombstone.local_result_id = new.local_result_id
  ) then
    raise exception 'persisted_result_deleted'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_core_result_claim_tombstone
on assessment.assessment_attempt;
create trigger guard_core_result_claim_tombstone
before insert or update of account_id, local_result_id
on assessment.assessment_attempt
for each row execute function assessment.guard_core_result_claim_tombstone();

revoke all on function assessment.guard_core_result_claim_tombstone()
from public, anon, authenticated;

grant execute on function assessment.guard_core_result_claim_tombstone()
to service_role;

create or replace function assessment.delete_persisted_result(
  p_account_id uuid,
  p_result_kind text,
  p_local_result_id text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, assessment
as $$
declare
  v_deleted_count integer := 0;
begin
  if p_account_id is null
    or p_result_kind is null
    or p_result_kind not in ('topic', 'lab')
    or p_local_result_id is null
    or char_length(p_local_result_id) not between 6 and 128
    or p_local_result_id is distinct from btrim(p_local_result_id) then
    raise exception 'result_delete_invalid'
      using errcode = '22023';
  end if;

  perform assessment.lock_persisted_result_key(
    p_account_id,
    p_result_kind,
    p_local_result_id
  );

  insert into assessment.result_deletion_tombstone (
    account_id,
    local_result_id,
    result_kind
  )
  values (p_account_id, p_local_result_id, p_result_kind)
  on conflict (account_id, result_kind, local_result_id)
  do update set deleted_at = excluded.deleted_at;

  if p_result_kind = 'topic' then
    update assessment.free_topic_result
    set deleted_at = now(), updated_at = now()
    where account_id = p_account_id
      and local_result_id = p_local_result_id
      and deleted_at is null;
  else
    update assessment.lab_result
    set deleted_at = now(), updated_at = now()
    where account_id = p_account_id
      and local_result_id = p_local_result_id
      and deleted_at is null;
  end if;

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count > 0;
end;
$$;

revoke all on function assessment.delete_persisted_result(uuid, text, text)
from public, anon, authenticated;

grant execute on function assessment.delete_persisted_result(uuid, text, text)
to service_role;

create or replace function report.delete_result_for_account(
  p_account_id uuid,
  p_local_result_id text,
  p_result_report_id uuid
)
returns table (
  deleted boolean,
  deleted_local_result_id text,
  deleted_result_report_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, report, assessment, profile, comparison, sharing, public
as $$
declare
  v_attempt_id uuid;
  v_lock_local_result_id text;
  v_local_result_id text;
  v_report_lookup_local_result_id text;
  v_result_report_id uuid;
  v_snapshot_ids uuid[];
  v_progress_deleted_count integer := 0;
begin
  if p_account_id is null
    or (p_local_result_id is null and p_result_report_id is null)
    or (
      p_local_result_id is not null
      and (
        char_length(p_local_result_id) not between 6 and 128
        or p_local_result_id is distinct from btrim(p_local_result_id)
      )
    ) then
    raise exception 'result_delete_invalid'
      using errcode = '22023';
  end if;

  v_lock_local_result_id := p_local_result_id;

  -- A report id needs one initial read-only lookup to discover (or verify) the
  -- logical key. Supplying two identifiers for different results must fail;
  -- otherwise the function could lock one result and delete another.
  -- The authoritative report lookup is repeated after the lock.
  if p_result_report_id is not null then
    select aa.local_result_id
    into v_report_lookup_local_result_id
    from report.result_report rr
    join assessment.assessment_attempt aa on aa.id = rr.attempt_id
    where rr.id = p_result_report_id
      and rr.account_id = p_account_id
      and aa.account_id = p_account_id
      and rr.deleted_at is null
    limit 1;

    if found
      and p_local_result_id is not null
      and p_local_result_id is distinct from v_report_lookup_local_result_id then
      raise exception 'result_delete_identifier_mismatch'
        using errcode = '22023';
    end if;

    v_lock_local_result_id := coalesce(
      v_lock_local_result_id,
      v_report_lookup_local_result_id
    );
  end if;

  if v_lock_local_result_id is not null then
    perform assessment.lock_persisted_result_key(
      p_account_id,
      'core',
      v_lock_local_result_id
    );
  end if;

  -- Re-read after acquiring the same logical-key lock used by claim and
  -- progress writers. If a concurrent claim committed first, it is now
  -- visible and is deleted in this transaction; if deletion won first, the
  -- tombstone below makes the claim fail closed.
  select rr.id, rr.attempt_id, aa.local_result_id
  into v_result_report_id, v_attempt_id, v_local_result_id
  from report.result_report rr
  join assessment.assessment_attempt aa on aa.id = rr.attempt_id
  where rr.account_id = p_account_id
    and aa.account_id = p_account_id
    and rr.deleted_at is null
    and (p_result_report_id is null or rr.id = p_result_report_id)
    and (p_local_result_id is null or aa.local_result_id = p_local_result_id)
  order by rr.created_at desc
  limit 1;

  -- A dual-identifier miss is idempotent only when this logical result was
  -- already tombstoned by an earlier successful delete. Otherwise fail closed
  -- instead of treating an unknown/mismatched report id as permission to
  -- delete the local-id result.
  if p_result_report_id is not null
    and p_local_result_id is not null
    and v_result_report_id is null
    and not exists (
      select 1
      from assessment.result_deletion_tombstone tombstone
      where tombstone.account_id = p_account_id
        and tombstone.result_kind = 'core'
        and tombstone.local_result_id = p_local_result_id
    ) then
    raise exception 'result_delete_identifier_mismatch'
      using errcode = '22023';
  end if;

  v_local_result_id := coalesce(v_local_result_id, v_lock_local_result_id);

  if v_local_result_id is not null then

    insert into assessment.result_deletion_tombstone (
      account_id,
      local_result_id,
      result_kind
    )
    values (p_account_id, v_local_result_id, 'core')
    on conflict (account_id, result_kind, local_result_id)
    do update set deleted_at = excluded.deleted_at;

    update assessment.account_assessment_progress
    set deleted_at = now(), updated_at = now()
    where account_id = p_account_id
      and client_attempt_id = v_local_result_id
      and deleted_at is null;
    get diagnostics v_progress_deleted_count = row_count;
  end if;

  if v_result_report_id is null then
    return query
    select v_progress_deleted_count > 0, v_local_result_id, p_result_report_id;
    return;
  end if;

  select array_agg(pps.id)
  into v_snapshot_ids
  from profile.profile_public_snapshot pps
  where pps.result_report_id = v_result_report_id;

  if coalesce(cardinality(v_snapshot_ids), 0) > 0 then
    delete from comparison.public_comparison_report
    where target_public_snapshot_id = any(v_snapshot_ids);
  end if;

  delete from assessment.assessment_attempt
  where id = v_attempt_id
    and account_id = p_account_id;

  return query
  select true, v_local_result_id, v_result_report_id;
end;
$$;

revoke all on function report.delete_result_for_account(uuid, text, uuid)
from public, anon, authenticated;

grant execute on function report.delete_result_for_account(uuid, text, uuid)
to service_role;

comment on function assessment.delete_persisted_result(uuid, text, text) is
  'Atomically tombstones and soft-deletes one account-owned topic or lab result. A missing row is still tombstoned to defeat a late POST.';

comment on function report.delete_result_for_account(uuid, text, uuid) is
  'Deletes a core report and atomically tombstones its cross-device progress key so late sync and claim requests cannot recreate it.';

notify pgrst, 'reload schema';

commit;
