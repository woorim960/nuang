begin;

create schema if not exists identity;
create schema if not exists audit;

create table if not exists identity.provider_registry (
  provider text primary key,
  issuer text not null unique,
  display_name text not null,
  enabled boolean not null default false,
  sign_in_enabled boolean not null default false,
  link_enabled boolean not null default false,
  verified_email_claim_supported boolean not null default false,
  verified_phone_claim_supported boolean not null default false,
  automatic_link_level text not null default 'none'
    check (automatic_link_level in ('none', 'same_auth_user', 'verified_email')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into identity.provider_registry (
  provider,
  issuer,
  display_name,
  enabled,
  sign_in_enabled,
  link_enabled,
  verified_email_claim_supported,
  verified_phone_claim_supported,
  automatic_link_level
)
values
  ('google', 'https://accounts.google.com', 'Google', true, true, false, true, false, 'same_auth_user'),
  ('kakao', 'https://kauth.kakao.com', '카카오', true, true, false, true, false, 'same_auth_user'),
  ('email', 'supabase:email', '이메일', true, true, false, true, false, 'same_auth_user'),
  ('naver', 'https://nid.naver.com', '네이버', false, false, false, false, false, 'none')
on conflict (provider) do update
set
  issuer = excluded.issuer,
  display_name = excluded.display_name,
  verified_email_claim_supported = excluded.verified_email_claim_supported,
  verified_phone_claim_supported = excluded.verified_phone_claim_supported,
  updated_at = now();

create table if not exists identity.identity_feature_flag (
  feature_key text primary key,
  enabled boolean not null default false,
  description text not null,
  updated_at timestamptz not null default now()
);

insert into identity.identity_feature_flag (feature_key, enabled, description)
values
  ('identity_resolver', true, '원자적 다중 OAuth 계정 판정'),
  ('manual_provider_link', false, '로그인 상태의 다른 OAuth 연결'),
  ('verified_email_discovery', false, '서로 다른 auth user 간 인증 이메일 후보 발견'),
  ('verified_phone_discovery', false, 'SMS 인증 휴대전화 후보 발견'),
  ('account_merge', false, '데이터가 있는 두 계정의 원자적 통합'),
  ('account_recovery', false, '모든 OAuth 접근 상실 시 복구')
on conflict (feature_key) do nothing;

alter table identity.account
  drop constraint if exists account_status_check;

alter table identity.account
  add constraint account_status_check
    check (status in ('active', 'deleted', 'suspended', 'merged'));

alter table identity.auth_identity
  drop constraint if exists auth_identity_provider_check;

alter table identity.auth_identity
  drop constraint if exists auth_identity_provider_provider_subject_key;

alter table identity.auth_identity
  drop constraint if exists auth_identity_supabase_user_id_provider_key;

alter table identity.auth_identity
  add column if not exists supabase_identity_id text,
  add column if not exists issuer text,
  add column if not exists status text,
  add column if not exists linked_via text,
  add column if not exists linked_at timestamptz,
  add column if not exists last_authenticated_at timestamptz;

update identity.auth_identity
set
  supabase_identity_id = coalesce(supabase_identity_id, id::text),
  issuer = coalesce(
    issuer,
    case provider
      when 'google' then 'https://accounts.google.com'
      when 'kakao' then 'https://kauth.kakao.com'
      when 'naver' then 'https://nid.naver.com'
      when 'email' then 'supabase:email'
      else null
    end
  ),
  status = coalesce(status, case when revoked_at is null then 'active' else 'revoked' end),
  linked_via = coalesce(linked_via, 'legacy_migration'),
  linked_at = coalesce(linked_at, provider_linked_at),
  last_authenticated_at = coalesce(last_authenticated_at, last_login_at, provider_linked_at)
where
  supabase_identity_id is null
  or issuer is null
  or status is null
  or linked_via is null
  or linked_at is null
  or last_authenticated_at is null;

alter table identity.auth_identity
  alter column supabase_identity_id set not null,
  alter column issuer set not null,
  alter column status set default 'active',
  alter column status set not null,
  alter column linked_via set default 'same_auth_user',
  alter column linked_via set not null,
  alter column linked_at set default now(),
  alter column linked_at set not null;

alter table identity.auth_identity
  drop constraint if exists auth_identity_status_check;

alter table identity.auth_identity
  add constraint auth_identity_status_check
    check (status in ('active', 'revoked', 'quarantined'));

alter table identity.auth_identity
  drop constraint if exists auth_identity_linked_via_check;

alter table identity.auth_identity
  add constraint auth_identity_linked_via_check
    check (linked_via in (
      'legacy_migration',
      'same_auth_user',
      'verified_email',
      'verified_phone',
      'manual_oauth',
      'account_merge',
      'recovery'
    ));

alter table identity.auth_identity
  drop constraint if exists auth_identity_provider_registry_fkey;

alter table identity.auth_identity
  add constraint auth_identity_provider_registry_fkey
    foreign key (provider) references identity.provider_registry(provider)
    on update cascade;

create unique index if not exists auth_identity_active_provider_subject_uidx
  on identity.auth_identity(provider, issuer, provider_subject)
  where status = 'active' and revoked_at is null;

create unique index if not exists auth_identity_active_supabase_identity_uidx
  on identity.auth_identity(supabase_identity_id)
  where status = 'active' and revoked_at is null;

create index if not exists auth_identity_active_auth_user_idx
  on identity.auth_identity(supabase_user_id, account_id)
  where status = 'active' and revoked_at is null;

create table if not exists identity.account_alias (
  source_account_id uuid primary key references identity.account(id) on delete cascade,
  canonical_account_id uuid not null references identity.account(id) on delete cascade,
  reason text not null default 'account_merge',
  created_at timestamptz not null default now(),
  check (source_account_id <> canonical_account_id)
);

create table if not exists identity.identity_resolution_conflict (
  id uuid primary key default gen_random_uuid(),
  supabase_user_id uuid not null,
  account_ids uuid[] not null,
  provider_keys text[] not null default '{}',
  reason_code text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  correlation_id text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (cardinality(account_ids) > 1)
);

create index if not exists identity_resolution_conflict_open_idx
  on identity.identity_resolution_conflict(created_at desc)
  where status = 'open';

create table if not exists identity.deleted_auth_identity_tombstone (
  provider text not null references identity.provider_registry(provider),
  issuer text not null,
  provider_subject text not null,
  deleted_at timestamptz not null default now(),
  reason_code text not null default 'self_account_deletion',
  primary key (provider, issuer, provider_subject)
);

create table if not exists audit.account_identity_event (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  outcome text not null check (outcome in ('started', 'succeeded', 'failed', 'blocked')),
  actor_account_id uuid references identity.account(id) on delete set null,
  actor_auth_user_id uuid,
  provider_keys text[] not null default '{}',
  reason_code text,
  correlation_id text,
  inventory_counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists account_identity_event_created_idx
  on audit.account_identity_event(created_at desc);

alter table identity.provider_registry enable row level security;
alter table identity.identity_feature_flag enable row level security;
alter table identity.account_alias enable row level security;
alter table identity.identity_resolution_conflict enable row level security;
alter table identity.deleted_auth_identity_tombstone enable row level security;
alter table audit.account_identity_event enable row level security;

revoke all on identity.provider_registry from public, anon, authenticated;
revoke all on identity.identity_feature_flag from public, anon, authenticated;
revoke all on identity.account_alias from public, anon, authenticated;
revoke all on identity.identity_resolution_conflict from public, anon, authenticated;
revoke all on identity.deleted_auth_identity_tombstone from public, anon, authenticated;
revoke all on audit.account_identity_event from public, anon, authenticated;

grant select, insert, update on identity.provider_registry to service_role;
grant select, insert, update on identity.identity_feature_flag to service_role;
grant select, insert, update on identity.account_alias to service_role;
grant select, insert, update on identity.identity_resolution_conflict to service_role;
grant select, insert on identity.deleted_auth_identity_tombstone to service_role;
grant select, insert on audit.account_identity_event to service_role;

create or replace function identity.assert_auth_user_account_consistency()
returns trigger
language plpgsql
security definer
set search_path = identity, pg_temp
as $$
declare
  v_account_count integer;
begin
  if new.status <> 'active' or new.revoked_at is not null then
    return new;
  end if;

  select count(distinct ai.account_id)
  into v_account_count
  from identity.auth_identity ai
  where ai.supabase_user_id = new.supabase_user_id
    and ai.status = 'active'
    and ai.revoked_at is null;

  if v_account_count > 1 then
    raise exception 'supabase_user_account_conflict'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists auth_identity_account_consistency
  on identity.auth_identity;

create constraint trigger auth_identity_account_consistency
after insert or update of account_id, supabase_user_id, status, revoked_at
on identity.auth_identity
deferrable initially immediate
for each row
execute function identity.assert_auth_user_account_consistency();

create or replace function identity.resolve_canonical_account_id(
  p_account_id uuid
)
returns uuid
language plpgsql
stable
security definer
set search_path = identity, pg_temp
as $$
declare
  v_current uuid := p_account_id;
  v_next uuid;
  v_seen uuid[] := array[]::uuid[];
  v_depth integer := 0;
begin
  if p_account_id is null then
    return null;
  end if;

  loop
    if v_current = any(v_seen) or v_depth > 16 then
      return null;
    end if;

    v_seen := array_append(v_seen, v_current);
    select aa.canonical_account_id
    into v_next
    from identity.account_alias aa
    where aa.source_account_id = v_current;

    if v_next is null then
      return v_current;
    end if;

    v_current := v_next;
    v_depth := v_depth + 1;
  end loop;
end;
$$;

create or replace function identity.current_account_id()
returns uuid
language plpgsql
stable
security definer
set search_path = identity, public, auth, pg_temp
as $$
declare
  v_account_id uuid;
  v_account_count integer;
begin
  select
    min(identity.resolve_canonical_account_id(ai.account_id)::text)::uuid,
    count(distinct identity.resolve_canonical_account_id(ai.account_id))
  into v_account_id, v_account_count
  from identity.auth_identity ai
  where ai.supabase_user_id = auth.uid()
    and ai.status = 'active'
    and ai.revoked_at is null;

  if v_account_count <> 1 then
    return null;
  end if;

  return v_account_id;
end;
$$;

create or replace function identity.read_auth_user_access_status(
  p_supabase_user_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = identity, pg_temp
as $$
declare
  v_active_identity_count integer;
  v_account_count integer;
  v_account_id uuid;
  v_status text;
begin
  select
    count(*),
    count(distinct identity.resolve_canonical_account_id(ai.account_id)),
    min(identity.resolve_canonical_account_id(ai.account_id)::text)::uuid
  into v_active_identity_count, v_account_count, v_account_id
  from identity.auth_identity ai
  where ai.supabase_user_id = p_supabase_user_id
    and ai.status = 'active'
    and ai.revoked_at is null;

  if v_active_identity_count = 0 then
    return 'new';
  end if;

  if v_account_count <> 1 or v_account_id is null then
    return 'conflict';
  end if;

  select a.status into v_status
  from identity.account a
  where a.id = v_account_id;

  return coalesce(v_status, 'conflict');
end;
$$;

create or replace function identity.resolve_account_for_auth_user(
  p_supabase_user_id uuid,
  p_identities jsonb,
  p_correlation_id text default null,
  p_linked_via text default 'same_auth_user'
)
returns table (
  account_id uuid,
  resolution text,
  identities_synced integer
)
language plpgsql
security definer
set search_path = identity, audit, public, pg_temp
as $$
declare
  v_account_ids uuid[];
  v_account_id uuid;
  v_created boolean := false;
  v_existing_matches integer := 0;
  v_identity_count integer;
  v_provider_keys text[];
  v_entry jsonb;
begin
  if p_supabase_user_id is null
    or jsonb_typeof(p_identities) <> 'array'
    or jsonb_array_length(p_identities) < 1
    or jsonb_array_length(p_identities) > 16 then
    raise exception 'identity_payload_invalid' using errcode = '22023';
  end if;

  if p_linked_via not in ('same_auth_user', 'manual_oauth') then
    raise exception 'identity_link_method_not_allowed' using errcode = '22023';
  end if;

  if not coalesce((
    select iff.enabled
    from identity.identity_feature_flag iff
    where iff.feature_key = 'identity_resolver'
  ), false) then
    raise exception 'identity_resolver_disabled' using errcode = '55000';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_identities) as entry(value)
    left join identity.provider_registry pr
      on pr.provider = entry.value->>'provider'
     and pr.issuer = entry.value->>'issuer'
    where nullif(entry.value->>'provider', '') is null
      or nullif(entry.value->>'issuer', '') is null
      or nullif(entry.value->>'provider_subject', '') is null
      or nullif(entry.value->>'supabase_identity_id', '') is null
      or pr.provider is null
      or not pr.enabled
      or not pr.sign_in_enabled
  ) then
    raise exception 'identity_provider_not_allowed' using errcode = '22023';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_identities)
  ) <> (
    select count(*)
    from (
      select distinct
        entry.value->>'provider',
        entry.value->>'issuer',
        entry.value->>'provider_subject',
        entry.value->>'supabase_identity_id'
      from jsonb_array_elements(p_identities) as entry(value)
    ) deduplicated
  ) then
    raise exception 'identity_payload_duplicate' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('nuang:auth-user:' || p_supabase_user_id::text, 0)
  );

  for v_entry in
    select entry.value
    from jsonb_array_elements(p_identities) as entry(value)
    order by
      entry.value->>'provider',
      entry.value->>'issuer',
      entry.value->>'provider_subject'
  loop
    perform pg_advisory_xact_lock(hashtextextended(
      'nuang:identity:'
        || (v_entry->>'provider') || ':'
        || (v_entry->>'issuer') || ':'
        || (v_entry->>'provider_subject'),
      0
    ));
  end loop;

  select array_agg(distinct dai.provider order by dai.provider)
  into v_provider_keys
  from identity.deleted_auth_identity_tombstone dai
  join jsonb_array_elements(p_identities) as entry(value)
    on dai.provider = entry.value->>'provider'
   and dai.issuer = entry.value->>'issuer'
   and dai.provider_subject = entry.value->>'provider_subject';

  if coalesce(cardinality(v_provider_keys), 0) > 0 then
    if p_correlation_id is not null then
      insert into audit.account_identity_event (
        event_type,
        outcome,
        actor_auth_user_id,
        provider_keys,
        reason_code,
        correlation_id
      ) values (
        'account_resolve',
        'blocked',
        p_supabase_user_id,
        v_provider_keys,
        'deleted_identity',
        p_correlation_id
      );
    end if;

    return query select null::uuid, 'deleted'::text, 0;
    return;
  end if;

  select array_agg(distinct candidate.account_id order by candidate.account_id)
  into v_account_ids
  from (
    select identity.resolve_canonical_account_id(ai.account_id) as account_id
    from identity.auth_identity ai
    where ai.supabase_user_id = p_supabase_user_id
      and ai.status = 'active'
      and ai.revoked_at is null
    union
    select identity.resolve_canonical_account_id(ai.account_id) as account_id
    from identity.auth_identity ai
    join jsonb_array_elements(p_identities) as entry(value)
      on ai.provider = entry.value->>'provider'
     and ai.issuer = entry.value->>'issuer'
     and ai.provider_subject = entry.value->>'provider_subject'
    where ai.status = 'active'
      and ai.revoked_at is null
  ) candidate
  where candidate.account_id is not null;

  select array_agg(distinct entry.value->>'provider' order by entry.value->>'provider')
  into v_provider_keys
  from jsonb_array_elements(p_identities) as entry(value);

  if coalesce(cardinality(v_account_ids), 0) > 1 then
    insert into identity.identity_resolution_conflict (
      supabase_user_id,
      account_ids,
      provider_keys,
      reason_code,
      correlation_id
    ) values (
      p_supabase_user_id,
      v_account_ids,
      coalesce(v_provider_keys, '{}'),
      'multiple_accounts',
      p_correlation_id
    );

    insert into audit.account_identity_event (
      event_type,
      outcome,
      actor_auth_user_id,
      provider_keys,
      reason_code,
      correlation_id,
      inventory_counts
    ) values (
      'account_resolve',
      'blocked',
      p_supabase_user_id,
      coalesce(v_provider_keys, '{}'),
      'multiple_accounts',
      p_correlation_id,
      jsonb_build_object('candidate_account_count', cardinality(v_account_ids))
    );

    return query select null::uuid, 'conflict'::text, 0;
    return;
  end if;

  if coalesce(cardinality(v_account_ids), 0) = 0 then
    insert into identity.account default values
    returning id into v_account_id;
    v_created := true;
  else
    v_account_id := v_account_ids[1];
  end if;

  select count(*)
  into v_existing_matches
  from identity.auth_identity ai
  join jsonb_array_elements(p_identities) as entry(value)
    on ai.provider = entry.value->>'provider'
   and ai.issuer = entry.value->>'issuer'
   and ai.provider_subject = entry.value->>'provider_subject'
   and ai.supabase_identity_id = entry.value->>'supabase_identity_id'
  where ai.account_id = v_account_id
    and ai.supabase_user_id = p_supabase_user_id
    and ai.status = 'active'
    and ai.revoked_at is null;

  for v_entry in select entry.value from jsonb_array_elements(p_identities) as entry(value)
  loop
    insert into identity.auth_identity (
      account_id,
      supabase_user_id,
      supabase_identity_id,
      provider,
      issuer,
      provider_subject,
      status,
      linked_via,
      linked_at,
      provider_linked_at,
      last_authenticated_at,
      last_login_at,
      revoked_at
    ) values (
      v_account_id,
      p_supabase_user_id,
      v_entry->>'supabase_identity_id',
      v_entry->>'provider',
      v_entry->>'issuer',
      v_entry->>'provider_subject',
      'active',
      p_linked_via,
      now(),
      now(),
      now(),
      now(),
      null
    )
    on conflict (provider, issuer, provider_subject)
      where status = 'active' and revoked_at is null
    do update set
      account_id = excluded.account_id,
      supabase_user_id = excluded.supabase_user_id,
      supabase_identity_id = excluded.supabase_identity_id,
      status = 'active',
      last_authenticated_at = now(),
      last_login_at = now(),
      revoked_at = null;
  end loop;

  v_identity_count := jsonb_array_length(p_identities);

  if p_correlation_id is not null then
    insert into audit.account_identity_event (
      event_type,
      outcome,
      actor_account_id,
      actor_auth_user_id,
      provider_keys,
      reason_code,
      correlation_id,
      inventory_counts
    ) values (
      'account_resolve',
      'succeeded',
      v_account_id,
      p_supabase_user_id,
      coalesce(v_provider_keys, '{}'),
      case when v_created then 'account_created' else 'account_resolved' end,
      p_correlation_id,
      jsonb_build_object('identity_count', v_identity_count)
    );
  end if;

  return query
  select
    v_account_id,
    case
      when v_created then 'created'
      when v_existing_matches < v_identity_count then 'synced'
      else 'existing'
    end,
    v_identity_count;
end;
$$;

create or replace function public.delete_own_nuang_account(
  p_account_id uuid,
  p_supabase_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, identity, auth, audit, pg_temp
as $$
declare
  v_account_ids uuid[];
  v_auth_user_ids uuid[];
  v_deleted_accounts integer;
  v_deleted_users integer;
  v_expected_users integer;
  v_expected_accounts integer;
begin
  if not exists (
    select 1
    from identity.auth_identity ai
    where identity.resolve_canonical_account_id(ai.account_id) = p_account_id
      and ai.supabase_user_id = p_supabase_user_id
      and ai.status = 'active'
      and ai.revoked_at is null
  ) then
    raise exception 'account_identity_mismatch'
      using errcode = '42501';
  end if;

  select
    array_agg(distinct ai.supabase_user_id order by ai.supabase_user_id),
    array_agg(distinct ai.account_id order by ai.account_id)
  into v_auth_user_ids, v_account_ids
  from identity.auth_identity ai
  where identity.resolve_canonical_account_id(ai.account_id) = p_account_id;

  v_expected_users := coalesce(cardinality(v_auth_user_ids), 0);
  if v_account_ids is null or not (p_account_id = any(v_account_ids)) then
    v_account_ids := array_append(coalesce(v_account_ids, '{}'), p_account_id);
  end if;
  v_expected_accounts := coalesce(cardinality(v_account_ids), 0);
  if v_expected_users < 1 then
    raise exception 'linked_auth_users_missing' using errcode = 'P0001';
  end if;

  insert into identity.deleted_auth_identity_tombstone (
    provider,
    issuer,
    provider_subject,
    deleted_at,
    reason_code
  )
  select distinct
    ai.provider,
    ai.issuer,
    ai.provider_subject,
    now(),
    'self_account_deletion'
  from identity.auth_identity ai
  where identity.resolve_canonical_account_id(ai.account_id) = p_account_id
  on conflict (provider, issuer, provider_subject) do nothing;

  insert into audit.account_identity_event (
    event_type,
    outcome,
    actor_account_id,
    actor_auth_user_id,
    provider_keys,
    reason_code,
    inventory_counts
  )
  select
    'account_delete',
    'started',
    p_account_id,
    p_supabase_user_id,
    coalesce(array_agg(distinct ai.provider order by ai.provider), '{}'),
    'self_service',
    jsonb_build_object('linked_auth_user_count', v_expected_users)
  from identity.auth_identity ai
  where identity.resolve_canonical_account_id(ai.account_id) = p_account_id;

  delete from identity.account_alias
  where source_account_id = any(v_account_ids)
     or canonical_account_id = any(v_account_ids);

  delete from identity.account
  where id = any(v_account_ids);
  get diagnostics v_deleted_accounts = row_count;

  if v_deleted_accounts <> v_expected_accounts then
    raise exception 'account_delete_failed' using errcode = 'P0001';
  end if;

  delete from auth.users
  where id = any(v_auth_user_ids);
  get diagnostics v_deleted_users = row_count;

  if v_deleted_users <> v_expected_users then
    raise exception 'auth_user_delete_failed' using errcode = 'P0001';
  end if;

  insert into audit.account_identity_event (
    event_type,
    outcome,
    actor_auth_user_id,
    reason_code,
    inventory_counts
  ) values (
    'account_delete',
    'succeeded',
    p_supabase_user_id,
    'self_service',
    jsonb_build_object('deleted_auth_user_count', v_deleted_users)
  );

  return true;
end;
$$;

create or replace view identity.identity_integrity_audit
with (security_invoker = true)
as
select 'orphan_account'::text as check_key, count(*)::bigint as affected_count
from identity.account a
where a.status = 'active'
  and not exists (
    select 1 from identity.auth_identity ai
    where ai.account_id = a.id
      and ai.status = 'active'
      and ai.revoked_at is null
  )
union all
select 'supabase_user_multiple_accounts', count(*)::bigint
from (
  select ai.supabase_user_id
  from identity.auth_identity ai
  where ai.status = 'active' and ai.revoked_at is null
  group by ai.supabase_user_id
  having count(distinct identity.resolve_canonical_account_id(ai.account_id)) > 1
) conflicts
union all
select 'disabled_or_unknown_provider', count(*)::bigint
from identity.auth_identity ai
left join identity.provider_registry pr on pr.provider = ai.provider
where pr.provider is null or not pr.enabled
union all
select 'identity_required_field_missing', count(*)::bigint
from identity.auth_identity ai
where nullif(ai.supabase_identity_id, '') is null
   or nullif(ai.issuer, '') is null
   or nullif(ai.provider_subject, '') is null
union all
select 'auth_user_orphan', count(*)::bigint
from identity.auth_identity ai
left join auth.users au on au.id = ai.supabase_user_id
where au.id is null;

create or replace view identity.account_fk_inventory
with (security_invoker = true)
as
select
  ns.nspname::text as schema_name,
  cls.relname::text as table_name,
  att.attname::text as column_name,
  pg_get_constraintdef(con.oid)::text as constraint_definition
from pg_constraint con
join pg_class cls on cls.oid = con.conrelid
join pg_namespace ns on ns.oid = cls.relnamespace
join unnest(con.conkey) with ordinality as key(attnum, ordinality) on true
join pg_attribute att on att.attrelid = con.conrelid and att.attnum = key.attnum
where con.contype = 'f'
  and con.confrelid = 'identity.account'::regclass
order by ns.nspname, cls.relname, att.attname;

revoke all on identity.identity_integrity_audit from public, anon, authenticated;
revoke all on identity.account_fk_inventory from public, anon, authenticated;
grant select on identity.identity_integrity_audit to service_role;
grant select on identity.account_fk_inventory to service_role;

revoke all on function identity.assert_auth_user_account_consistency()
from public, anon, authenticated;
revoke all on function identity.resolve_canonical_account_id(uuid)
from public, anon, authenticated;
revoke all on function identity.read_auth_user_access_status(uuid)
from public, anon, authenticated;
revoke all on function identity.resolve_account_for_auth_user(uuid, jsonb, text, text)
from public, anon, authenticated;
revoke all on function public.delete_own_nuang_account(uuid, uuid)
from public, anon, authenticated;

grant execute on function identity.resolve_canonical_account_id(uuid)
to service_role;
grant execute on function identity.read_auth_user_access_status(uuid)
to service_role;
grant execute on function identity.resolve_account_for_auth_user(uuid, jsonb, text, text)
to service_role;
grant execute on function public.delete_own_nuang_account(uuid, uuid)
to service_role;

comment on view identity.identity_integrity_audit is
  'Release 0 count-only identity audit. It intentionally exposes no provider subject or contact value.';
comment on view identity.account_fk_inventory is
  'Account foreign-key catalog used before a future merge. It contains schema metadata only.';
comment on function identity.resolve_account_for_auth_user(uuid, jsonb, text, text) is
  'Service-role only atomic account resolver. Inputs must come from server-side Supabase getUser().';
comment on table identity.deleted_auth_identity_tombstone is
  'Private service-only guard preventing deleted OAuth identities from silently recreating empty accounts.';

notify pgrst, 'reload schema';

commit;
