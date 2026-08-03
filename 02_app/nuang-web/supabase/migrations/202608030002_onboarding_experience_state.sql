begin;

create table if not exists identity.account_experience_state (
  account_id uuid primary key references identity.account(id) on delete cascade,
  onboarding_first_seen_at timestamptz,
  onboarding_completed_at timestamptz,
  onboarding_last_seen_guide_version integer not null default 0
    check (onboarding_last_seen_guide_version >= 0),
  updated_at timestamptz not null default now(),
  check (
    onboarding_completed_at is null
    or onboarding_first_seen_at is null
    or onboarding_completed_at >= onboarding_first_seen_at
  )
);

alter table identity.account_experience_state enable row level security;
revoke all on identity.account_experience_state from public, anon, authenticated;
grant select, insert, update, delete on identity.account_experience_state
  to service_role;

create or replace function identity.record_onboarding_experience(
  p_account_id uuid,
  p_state text,
  p_guide_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, identity, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_account_status text;
  v_row identity.account_experience_state%rowtype;
begin
  if p_state not in ('seen', 'completed') then
    raise exception 'unsupported_onboarding_state' using errcode = '22023';
  end if;
  if p_guide_version < 1 or p_guide_version > 10000 then
    raise exception 'invalid_onboarding_guide_version' using errcode = '22023';
  end if;

  select account.status
  into v_account_status
  from identity.account account
  where account.id = p_account_id
  for update;

  if v_account_status is distinct from 'active' then
    raise exception 'account_not_active' using errcode = '42501';
  end if;

  insert into identity.account_experience_state (
    account_id,
    onboarding_first_seen_at,
    onboarding_completed_at,
    onboarding_last_seen_guide_version,
    updated_at
  ) values (
    p_account_id,
    v_now,
    case when p_state = 'completed' then v_now else null end,
    p_guide_version,
    v_now
  )
  on conflict (account_id) do update
  set
    onboarding_first_seen_at = case
      when account_experience_state.onboarding_first_seen_at is null
        then excluded.onboarding_first_seen_at
      else least(
        account_experience_state.onboarding_first_seen_at,
        excluded.onboarding_first_seen_at
      )
    end,
    onboarding_completed_at = case
      when excluded.onboarding_completed_at is null
        then account_experience_state.onboarding_completed_at
      when account_experience_state.onboarding_completed_at is null
        then excluded.onboarding_completed_at
      else greatest(
        account_experience_state.onboarding_completed_at,
        excluded.onboarding_completed_at
      )
    end,
    onboarding_last_seen_guide_version = greatest(
      account_experience_state.onboarding_last_seen_guide_version,
      excluded.onboarding_last_seen_guide_version
    ),
    updated_at = v_now
  returning * into v_row;

  return jsonb_build_object(
    'seen', v_row.onboarding_first_seen_at is not null,
    'firstSeenAt', v_row.onboarding_first_seen_at,
    'completedAt', v_row.onboarding_completed_at,
    'guideVersion', v_row.onboarding_last_seen_guide_version
  );
end;
$$;

revoke all on function identity.record_onboarding_experience(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function identity.record_onboarding_experience(uuid, text, integer)
  to service_role;

comment on table identity.account_experience_state is
  'Account-level durable product journey state. Onboarding first-seen status is independent from guide content version so existing users are never auto-enrolled into a redesigned guide.';
comment on function identity.record_onboarding_experience(uuid, text, integer) is
  'Service-only idempotent onboarding state writer. Preserves earliest first-seen time, latest completion time and highest viewed guide version.';

commit;
