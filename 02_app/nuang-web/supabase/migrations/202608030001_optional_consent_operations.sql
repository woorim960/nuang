begin;

-- Canonical optional-consent state is materialized on the account status row,
-- while every meaningful transition is retained in consent_record.
alter table consent.age_and_consent_status
  add column if not exists analytics_consent_version text,
  add column if not exists analytics_consent_updated_at timestamptz,
  add column if not exists marketing_consent_version text,
  add column if not exists marketing_consent_updated_at timestamptz;

create index if not exists consent_record_latest_preference_idx
  on consent.consent_record (
    account_id,
    consent_type,
    recorded_at desc,
    id desc
  )
  where consent_type in ('analytics', 'marketing');

create table if not exists consent.product_analytics_event (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  event_name text not null check (event_name = 'screen_view'),
  area text not null check (
    area in (
      'home',
      'assessment',
      'result',
      'community',
      'trait_map',
      'my',
      'together',
      'settings',
      'other'
    )
  ),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists product_analytics_event_account_recent_idx
  on consent.product_analytics_event (account_id, area, occurred_at desc);
create index if not exists product_analytics_event_retention_idx
  on consent.product_analytics_event (occurred_at);

create table if not exists consent.marketing_suppression (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  channel text not null check (channel in ('email', 'mobile_phone', 'all')),
  reason text not null check (char_length(btrim(reason)) between 2 and 120),
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  check (removed_at is null or removed_at >= created_at)
);

create unique index if not exists marketing_suppression_active_idx
  on consent.marketing_suppression (account_id, channel)
  where removed_at is null;

create table if not exists consent.consent_integrity_migration_audit (
  id bigint generated always as identity primary key,
  migration_version text not null,
  phase text not null check (phase in ('before', 'after')),
  mismatch_count bigint not null check (mismatch_count >= 0),
  recorded_at timestamptz not null default now(),
  unique (migration_version, phase)
);

alter table consent.product_analytics_event enable row level security;
alter table consent.marketing_suppression enable row level security;
alter table consent.consent_integrity_migration_audit enable row level security;

-- New privacy-minimized assessment quality signals are account-linked only so
-- consent can be enforced atomically and account deletion can cascade. Legacy
-- rows remain nullable and are not retroactively attributed.
alter table assessment.quality_observation
  add column if not exists account_id uuid
    references identity.account(id) on delete cascade;
create index if not exists quality_observation_account_created_idx
  on assessment.quality_observation (account_id, created_at desc)
  where account_id is not null;

-- Record the number of rows where a pre-existing ledger disagreed with the
-- materialized boolean before the one-time reconciliation.
insert into consent.consent_integrity_migration_audit (
  migration_version,
  phase,
  mismatch_count
)
select
  '202608030001',
  'before',
  count(*)::bigint
from consent.age_and_consent_status status
cross join lateral (
  select
    analytics.status as analytics_status,
    marketing.status as marketing_status
  from
    lateral (
      select record.status
      from consent.consent_record record
      where record.account_id = status.account_id
        and record.consent_type = 'analytics'
      order by record.recorded_at desc, record.id desc
      limit 1
    ) analytics
    full join lateral (
      select record.status
      from consent.consent_record record
      where record.account_id = status.account_id
        and record.consent_type = 'marketing'
      order by record.recorded_at desc, record.id desc
      limit 1
    ) marketing on true
) latest
where
  (latest.analytics_status is not null and
    status.analytics_opt_in <> (latest.analytics_status = 'granted'))
  or
  (latest.marketing_status is not null and
    status.marketing_opt_in <> (latest.marketing_status = 'granted'))
on conflict (migration_version, phase) do nothing;

-- If no optional-consent ledger exists, preserve the legacy materialized
-- value as an explicit one-time backfill event. No contact or request data is
-- copied into metadata.
insert into consent.consent_record (
  account_id,
  consent_type,
  consent_version,
  status,
  source,
  recorded_at,
  revoked_at,
  metadata
)
select
  status.account_id,
  preference.consent_type,
  preference.consent_version,
  case when preference.enabled then 'granted' else 'revoked' end,
  'legacy_backfill',
  coalesce(status.updated_at, now()),
  case when preference.enabled then null else coalesce(status.updated_at, now()) end,
  jsonb_build_object(
    'surface', 'migration',
    'migrationVersion', '202608030001'
  )
from consent.age_and_consent_status status
cross join lateral (
  values
    (
      'analytics'::text,
      status.analytics_opt_in,
      'NUANG-ANALYTICS-PREFERENCE-2026-08-03'::text
    ),
    (
      'marketing'::text,
      status.marketing_opt_in,
      'NUANG-MARKETING-PREFERENCE-2026-07-27'::text
    )
) preference(consent_type, enabled, consent_version)
where not exists (
  select 1
  from consent.consent_record existing
  where existing.account_id = status.account_id
    and existing.consent_type = preference.consent_type
);

with latest as (
  select distinct on (record.account_id)
    record.account_id,
    record.consent_version,
    record.recorded_at,
    record.status
  from consent.consent_record record
  where record.consent_type = 'analytics'
  order by record.account_id, record.recorded_at desc, record.id desc
)
update consent.age_and_consent_status status
set
  analytics_opt_in = latest.status = 'granted',
  analytics_consent_version = latest.consent_version,
  analytics_consent_updated_at = latest.recorded_at
from latest
where latest.account_id = status.account_id;

with latest as (
  select distinct on (record.account_id)
    record.account_id,
    record.consent_version,
    record.recorded_at,
    record.status
  from consent.consent_record record
  where record.consent_type = 'marketing'
  order by record.account_id, record.recorded_at desc, record.id desc
)
update consent.age_and_consent_status status
set
  marketing_opt_in = latest.status = 'granted',
  marketing_consent_version = latest.consent_version,
  marketing_consent_updated_at = latest.recorded_at
from latest
where latest.account_id = status.account_id;

insert into consent.consent_integrity_migration_audit (
  migration_version,
  phase,
  mismatch_count
)
select
  '202608030001',
  'after',
  count(*)::bigint
from consent.age_and_consent_status status
cross join lateral (
  values
    ('analytics'::text, status.analytics_opt_in),
    ('marketing'::text, status.marketing_opt_in)
) preference(consent_type, enabled)
cross join lateral (
  select record.status
  from consent.consent_record record
  where record.account_id = status.account_id
    and record.consent_type = preference.consent_type
  order by record.recorded_at desc, record.id desc
  limit 1
) latest
where preference.enabled <> (latest.status = 'granted')
on conflict (migration_version, phase) do nothing;

create or replace function consent.set_optional_preference(
  p_account_id uuid,
  p_consent_type text,
  p_enabled boolean,
  p_consent_version text,
  p_source text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, consent, identity, pg_temp
as $$
declare
  v_account_status text;
  v_current_enabled boolean;
  v_current_version text;
  v_now timestamptz := clock_timestamp();
begin
  if p_consent_type not in ('analytics', 'marketing') then
    raise exception 'unsupported_optional_consent_type' using errcode = '22023';
  end if;
  if p_source not in ('account_gate', 'my_settings', 'account_merge') then
    raise exception 'unsupported_optional_consent_source' using errcode = '22023';
  end if;
  if p_consent_version is null or char_length(btrim(p_consent_version)) not between 3 and 120 then
    raise exception 'invalid_optional_consent_version' using errcode = '22023';
  end if;

  select account.status
  into v_account_status
  from identity.account account
  where account.id = p_account_id
  for update;

  if v_account_status is distinct from 'active' then
    raise exception 'account_not_active' using errcode = '42501';
  end if;

  if p_consent_type = 'analytics' then
    select status.analytics_opt_in, status.analytics_consent_version
    into v_current_enabled, v_current_version
    from consent.age_and_consent_status status
    where status.account_id = p_account_id
    for update;
  else
    select status.marketing_opt_in, status.marketing_consent_version
    into v_current_enabled, v_current_version
    from consent.age_and_consent_status status
    where status.account_id = p_account_id
    for update;
  end if;

  if not found then
    raise exception 'consent_status_missing' using errcode = 'P0001';
  end if;

  if v_current_enabled = p_enabled and v_current_version = p_consent_version then
    return jsonb_build_object(
      'changed', false,
      'enabled', v_current_enabled,
      'preference', p_consent_type,
      'updatedAt', case
        when p_consent_type = 'analytics' then (
          select analytics_consent_updated_at
          from consent.age_and_consent_status
          where account_id = p_account_id
        )
        else (
          select marketing_consent_updated_at
          from consent.age_and_consent_status
          where account_id = p_account_id
        )
      end,
      'version', v_current_version
    );
  end if;

  insert into consent.consent_record (
    account_id,
    consent_type,
    consent_version,
    status,
    source,
    recorded_at,
    revoked_at,
    metadata
  ) values (
    p_account_id,
    p_consent_type,
    p_consent_version,
    case when p_enabled then 'granted' else 'revoked' end,
    p_source,
    v_now,
    case when p_enabled then null else v_now end,
    jsonb_build_object(
      'surface', case when p_source = 'my_settings' then 'data_and_notifications' else 'login' end,
      'channel', case when p_consent_type = 'marketing' then 'account_contact' else 'product_analytics' end
    )
  );

  if p_consent_type = 'analytics' then
    update consent.age_and_consent_status
    set
      analytics_opt_in = p_enabled,
      analytics_consent_version = p_consent_version,
      analytics_consent_updated_at = v_now,
      updated_at = greatest(updated_at, v_now)
    where account_id = p_account_id;
  else
    update consent.age_and_consent_status
    set
      marketing_opt_in = p_enabled,
      marketing_consent_version = p_consent_version,
      marketing_consent_updated_at = v_now,
      updated_at = greatest(updated_at, v_now)
    where account_id = p_account_id;
  end if;

  return jsonb_build_object(
    'changed', true,
    'enabled', p_enabled,
    'preference', p_consent_type,
    'updatedAt', v_now,
    'version', p_consent_version
  );
end;
$$;

create or replace function consent.persist_account_consent(
  p_account_id uuid,
  p_is_14_or_older boolean,
  p_policy_version text,
  p_terms_version text,
  p_privacy_version text,
  p_analytics_requested boolean,
  p_analytics_version text,
  p_marketing_requested boolean,
  p_marketing_version text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, consent, identity, pg_temp
as $$
declare
  v_account_status text;
  v_is_initial boolean;
  v_now timestamptz := clock_timestamp();
begin
  if not p_is_14_or_older then
    raise exception 'required_age_declaration_missing' using errcode = '22023';
  end if;

  select account.status
  into v_account_status
  from identity.account account
  where account.id = p_account_id
  for update;

  if v_account_status is distinct from 'active' then
    raise exception 'account_not_active' using errcode = '42501';
  end if;

  select not exists (
    select 1
    from consent.age_and_consent_status status
    where status.account_id = p_account_id
  ) into v_is_initial;

  if v_is_initial then
    insert into consent.age_and_consent_status (
      account_id,
      is_14_or_older,
      age_band,
      age_source,
      declared_at,
      policy_version,
      required_terms_version,
      required_privacy_version,
      analytics_opt_in,
      analytics_consent_version,
      analytics_consent_updated_at,
      marketing_opt_in,
      marketing_consent_version,
      marketing_consent_updated_at,
      updated_at
    ) values (
      p_account_id,
      true,
      null,
      'self_declared',
      v_now,
      p_policy_version,
      p_terms_version,
      p_privacy_version,
      p_analytics_requested,
      p_analytics_version,
      v_now,
      p_marketing_requested,
      p_marketing_version,
      v_now,
      v_now
    );

    insert into consent.consent_record (
      account_id,
      consent_type,
      consent_version,
      status,
      source,
      recorded_at,
      revoked_at,
      metadata
    ) values
      (
        p_account_id,
        'analytics',
        p_analytics_version,
        case when p_analytics_requested then 'granted' else 'revoked' end,
        'account_gate',
        v_now,
        case when p_analytics_requested then null else v_now end,
        jsonb_build_object('surface', 'login', 'channel', 'product_analytics')
      ),
      (
        p_account_id,
        'marketing',
        p_marketing_version,
        case when p_marketing_requested then 'granted' else 'revoked' end,
        'account_gate',
        v_now,
        case when p_marketing_requested then null else v_now end,
        jsonb_build_object('surface', 'login', 'channel', 'account_contact')
      );
  else
    update consent.age_and_consent_status
    set
      is_14_or_older = true,
      age_source = 'self_declared',
      declared_at = v_now,
      policy_version = p_policy_version,
      required_terms_version = p_terms_version,
      required_privacy_version = p_privacy_version,
      updated_at = greatest(updated_at, v_now)
    where account_id = p_account_id;

    -- An unchecked optional box on a repeat sign-in means no change. Only an
    -- explicit checked request can grant a previously disabled preference.
    if p_analytics_requested then
      perform consent.set_optional_preference(
        p_account_id,
        'analytics',
        true,
        p_analytics_version,
        'account_gate'
      );
    end if;
    if p_marketing_requested then
      perform consent.set_optional_preference(
        p_account_id,
        'marketing',
        true,
        p_marketing_version,
        'account_gate'
      );
    end if;
  end if;

  insert into consent.consent_record (
    account_id,
    consent_type,
    consent_version,
    status,
    source,
    recorded_at,
    metadata
  )
  select
    p_account_id,
    required.consent_type,
    required.consent_version,
    'granted',
    'account_gate',
    v_now,
    jsonb_build_object('surface', 'login')
  from (
    values
      ('terms'::text, p_terms_version),
      ('privacy'::text, p_privacy_version)
  ) required(consent_type, consent_version)
  where not exists (
    select 1
    from consent.consent_record existing
    where existing.account_id = p_account_id
      and existing.consent_type = required.consent_type
      and existing.consent_version = required.consent_version
      and existing.status = 'granted'
  );

  return true;
end;
$$;

create or replace function consent.record_product_screen_view(
  p_account_id uuid,
  p_area text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, consent, identity, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
begin
  if p_area not in (
    'home', 'assessment', 'result', 'community', 'trait_map',
    'my', 'together', 'settings', 'other'
  ) then
    return 'invalid_area';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_account_id::text || ':screen_view:' || p_area, 0)
  );

  perform 1
    from identity.account account
    join consent.age_and_consent_status status
      on status.account_id = account.id
    where account.id = p_account_id
      and account.status = 'active'
      and status.analytics_opt_in = true
    for share of account, status;

  if not found then
    return 'not_allowed';
  end if;

  if exists (
    select 1
    from consent.product_analytics_event event
    where event.account_id = p_account_id
      and event.event_name = 'screen_view'
      and event.area = p_area
      and event.occurred_at >= v_now - interval '5 minutes'
  ) then
    return 'duplicate';
  end if;

  insert into consent.product_analytics_event (
    account_id,
    event_name,
    area,
    occurred_at
  ) values (
    p_account_id,
    'screen_view',
    p_area,
    v_now
  );

  return 'recorded';
end;
$$;

create or replace function consent.enforce_quality_observation_analytics_consent()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, consent, identity, assessment, pg_temp
as $$
begin
  if new.account_id is null then
    raise exception 'analytics_consent_required' using errcode = '42501';
  end if;

  perform 1
  from identity.account account
  join consent.age_and_consent_status status
    on status.account_id = account.id
  where account.id = new.account_id
    and account.status = 'active'
    and status.analytics_opt_in = true
  for share of account, status;

  if not found then
    raise exception 'analytics_consent_required' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists quality_observation_analytics_consent_guard
  on assessment.quality_observation;
create trigger quality_observation_analytics_consent_guard
before insert on assessment.quality_observation
for each row
execute function consent.enforce_quality_observation_analytics_consent();

create or replace function consent.delete_expired_product_analytics_events(
  p_now timestamptz default now()
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, consent, pg_temp
as $$
declare
  v_deleted bigint;
begin
  delete from consent.product_analytics_event
  where occurred_at < p_now - interval '90 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function consent.resolve_marketing_audience(
  p_channel text
)
returns table (
  account_id uuid,
  channel text,
  contact_verified_at timestamptz
)
language sql
stable
security definer
set search_path = pg_catalog, consent, identity, pg_temp
as $$
  select
    account.id,
    p_channel,
    case
      when p_channel = 'email' then contact.email_verified_at
      else contact.mobile_phone_verified_at
    end
  from identity.account account
  join consent.age_and_consent_status status
    on status.account_id = account.id
  join identity.contact_profile contact
    on contact.account_id = account.id
  where p_channel in ('email', 'mobile_phone')
    and account.status = 'active'
    and status.marketing_opt_in = true
    and status.marketing_consent_version = 'NUANG-MARKETING-PREFERENCE-2026-07-27'
    and (
      (p_channel = 'email'
        and contact.email_status = 'verified'
        and contact.email_verified_at is not null
        and contact.email_encrypted is not null)
      or
      (p_channel = 'mobile_phone'
        and contact.mobile_phone_status = 'verified'
        and contact.mobile_phone_verified_at is not null
        and contact.mobile_phone_ciphertext is not null)
    )
    and not exists (
      select 1
      from consent.marketing_suppression suppression
      where suppression.account_id = account.id
        and suppression.removed_at is null
        and suppression.channel in (p_channel, 'all')
    )
    and not exists (
      select 1
      from identity.account_merge_case merge_case
      where account.id in (
        merge_case.canonical_account_id,
        merge_case.source_account_id
      )
        and merge_case.status in ('proof_required', 'ready', 'processing')
    )
    and not exists (
      select 1
      from identity.identity_resolution_conflict conflict
      where conflict.status = 'open'
        and account.id = any(conflict.account_ids)
    );
$$;

-- Undo the historical schema-wide grants. Browser roles retain only their
-- RLS-protected read access to their own current status and ledger.
revoke all on all tables in schema consent from public, anon, authenticated;
revoke all on all sequences in schema consent from public, anon, authenticated;
revoke execute on all functions in schema consent from public, anon, authenticated;

grant select on consent.age_and_consent_status to authenticated;
grant select on consent.consent_record to authenticated;

grant select, insert, update, delete on consent.age_and_consent_status to service_role;
grant select, insert, update, delete on consent.consent_record to service_role;
grant select, insert, update, delete on consent.product_analytics_event to service_role;
grant select, insert, update, delete on consent.marketing_suppression to service_role;
grant select on consent.consent_integrity_migration_audit to service_role;
grant usage, select on all sequences in schema consent to service_role;

grant execute on function consent.set_optional_preference(uuid, text, boolean, text, text)
  to service_role;
grant execute on function consent.persist_account_consent(
  uuid, boolean, text, text, text, boolean, text, boolean, text
) to service_role;
grant execute on function consent.record_product_screen_view(uuid, text)
  to service_role;
grant execute on function consent.delete_expired_product_analytics_events(timestamptz)
  to service_role;
grant execute on function consent.delete_expired_product_analytics_events(timestamptz)
  to postgres;
grant execute on function consent.resolve_marketing_audience(text)
  to service_role;

alter default privileges in schema consent
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema consent
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema consent
  revoke execute on functions from public, anon, authenticated;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'nuang-product-analytics-retention'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'nuang-product-analytics-retention',
    '17 3 * * *',
    'select consent.delete_expired_product_analytics_events(now());'
  );
end;
$$;

comment on table consent.product_analytics_event is
  'Consent-gated screen_view events. Stores only a normalized service area and no path, query, hash, result, answer, content, IP or user-agent.';
comment on function consent.persist_account_consent(
  uuid, boolean, text, text, text, boolean, text, boolean, text
) is
  'Atomically persists required consent and initializes or explicitly grants optional preferences. An unchecked repeat sign-in preserves the existing preference.';
comment on function consent.resolve_marketing_audience(text) is
  'Service-only audience contract. Returns only active, consented, verified and unsuppressed account references; never raw contact values.';

commit;
