-- Account-scoped core assessment progress.
--
-- This store is deliberately separate from assessment.assessment_attempt:
-- the latter remains the canonical completed-result/claim boundary, while
-- this table synchronizes a validated local-first runner snapshot across
-- devices. Raw responses are private and are never exposed through direct
-- browser table grants.

create table if not exists assessment.account_assessment_progress (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  client_attempt_id text not null
    check (char_length(client_attempt_id) between 6 and 128),
  assessment_id text not null
    check (assessment_id in ('nu-core-quick', 'nu-core-full')),
  release_id text not null check (char_length(release_id) between 1 and 120),
  assessment_mode text not null check (assessment_mode in ('quick', 'full')),
  state text not null check (state in ('in_progress', 'completed')),
  revision bigint not null default 1 check (revision >= 1),
  attempt_payload jsonb not null
    check (jsonb_typeof(attempt_payload) = 'object'),
  client_created_at timestamptz not null,
  client_updated_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (account_id, client_attempt_id),
  check (
    (state = 'completed' and completed_at is not null)
    or (state = 'in_progress' and completed_at is null)
  ),
  check (client_created_at <= client_updated_at),
  check (
    completed_at is null
    or (completed_at >= client_created_at and completed_at <= client_updated_at)
  ),
  check (attempt_payload ->> 'id' = client_attempt_id),
  check (attempt_payload ->> 'assessmentId' = assessment_id),
  check (attempt_payload ->> 'releaseId' = release_id),
  check (attempt_payload ->> 'mode' = assessment_mode),
  check (attempt_payload ->> 'state' = state),
  check (jsonb_typeof(attempt_payload -> 'responses') = 'object'),
  check (jsonb_typeof(attempt_payload -> 'itemIds') = 'array')
);

create index if not exists account_assessment_progress_account_activity_idx
on assessment.account_assessment_progress (
  account_id,
  state,
  client_updated_at desc,
  updated_at desc
)
where deleted_at is null;

create index if not exists account_assessment_progress_account_release_idx
on assessment.account_assessment_progress (
  account_id,
  assessment_id,
  release_id,
  client_updated_at desc,
  updated_at desc
)
where deleted_at is null;

alter table assessment.account_assessment_progress enable row level security;

revoke all on assessment.account_assessment_progress
from public, anon, authenticated;

grant select, insert, update, delete
on assessment.account_assessment_progress
to service_role;

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

  -- Serialize the logical account/client-attempt key, including first insert.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_account_id::text || ':' || p_client_attempt_id,
      0
    )
  );

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

comment on table assessment.account_assessment_progress is
  'Private, account-scoped local-first core assessment runner snapshots. Completed result reports remain canonical in report.result_report.';

comment on column assessment.account_assessment_progress.attempt_payload is
  'Validated private runner snapshot that may contain raw answers. Never expose through public/profile/feed projections or application logs.';

comment on function assessment.save_account_assessment_progress(
  uuid,
  text,
  bigint,
  jsonb
) is
  'Service-role-only idempotent progress upsert with optimistic revision checks.';
