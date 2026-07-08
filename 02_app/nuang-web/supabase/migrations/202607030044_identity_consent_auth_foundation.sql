create extension if not exists pgcrypto;

create schema if not exists identity;
create schema if not exists consent;
create schema if not exists content;
create schema if not exists assessment;
create schema if not exists scoring;
create schema if not exists report;
create schema if not exists sharing;
create schema if not exists audit;

create table identity.account (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'active' check (status in ('active', 'deleted', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table identity.auth_identity (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  supabase_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google', 'kakao', 'naver', 'email')),
  provider_subject text not null,
  provider_linked_at timestamptz not null default now(),
  last_login_at timestamptz,
  revoked_at timestamptz,
  unique (provider, provider_subject),
  unique (supabase_user_id, provider)
);

create table identity.contact_profile (
  account_id uuid primary key references identity.account(id) on delete cascade,
  email_hash text,
  email_encrypted text,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

create table identity.provider_profile_snapshot (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  provider text not null check (provider in ('google', 'kakao', 'naver')),
  provider_subject text not null,
  email_hash text,
  email_encrypted text,
  display_name text,
  avatar_url text,
  age_band text check (age_band in ('14-18', '19-24', '25-34', '35-44', '45+')),
  age_source text check (age_source in ('self_declared', 'provider_age_range', 'provider_birthyear_derived')),
  scopes_granted text[] not null default '{}',
  fetched_at timestamptz not null default now(),
  expires_at timestamptz
);

create table consent.age_and_consent_status (
  account_id uuid primary key references identity.account(id) on delete cascade,
  is_14_or_older boolean not null default false,
  age_band text check (age_band in ('14-18', '19-24', '25-34', '35-44', '45+')),
  age_source text not null default 'self_declared' check (age_source in ('self_declared', 'provider_age_range', 'provider_birthyear_derived')),
  provider_age_hint text,
  declared_at timestamptz,
  policy_version text not null,
  required_terms_version text not null,
  required_privacy_version text not null,
  analytics_opt_in boolean not null default false,
  marketing_opt_in boolean not null default false,
  updated_at timestamptz not null default now()
);

create table consent.consent_record (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  consent_type text not null,
  consent_version text not null,
  status text not null check (status in ('granted', 'revoked')),
  source text not null default 'account_gate',
  recorded_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create table assessment.assessment_attempt (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  local_result_id text,
  assessment_slug text not null,
  assessment_kind text not null check (assessment_kind in ('quick', 'full')),
  item_release_version text not null,
  scoring_version text not null,
  status text not null default 'completed' check (status in ('started', 'completed', 'claimed', 'deleted')),
  started_at timestamptz,
  completed_at timestamptz,
  claimed_at timestamptz not null default now()
);

create table assessment.assessment_response (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references assessment.assessment_attempt(id) on delete cascade,
  account_id uuid not null references identity.account(id) on delete cascade,
  item_id text not null,
  value smallint check (value between 1 and 5),
  skipped boolean not null default false,
  answered_at timestamptz not null default now(),
  unique (attempt_id, item_id)
);

create table scoring.score_snapshot (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  attempt_id uuid not null references assessment.assessment_attempt(id) on delete cascade,
  scoring_version text not null,
  score_payload jsonb not null,
  created_at timestamptz not null default now()
);

create table report.result_report (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  attempt_id uuid not null references assessment.assessment_attempt(id) on delete cascade,
  report_kind text not null check (report_kind in ('quick', 'full')),
  profile_code text not null,
  profile_name text not null,
  summary jsonb not null,
  share_summary jsonb not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table sharing.share_link (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  result_report_id uuid not null references report.result_report(id) on delete cascade,
  token_hash text not null unique,
  scope text not null default 'summary' check (scope in ('summary')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table audit.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_account_id uuid references identity.account(id),
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index auth_identity_account_idx on identity.auth_identity(account_id);
create index auth_identity_supabase_user_idx on identity.auth_identity(supabase_user_id);
create index provider_profile_account_idx on identity.provider_profile_snapshot(account_id, fetched_at desc);
create index consent_record_account_idx on consent.consent_record(account_id, recorded_at desc);
create index assessment_attempt_account_idx on assessment.assessment_attempt(account_id, completed_at desc);
create index assessment_response_attempt_idx on assessment.assessment_response(attempt_id);
create index score_snapshot_account_idx on scoring.score_snapshot(account_id, created_at desc);
create index result_report_account_idx on report.result_report(account_id, created_at desc);
create index share_link_account_status_idx on sharing.share_link(account_id, status, expires_at);
create index share_link_token_hash_idx on sharing.share_link(token_hash);
create index admin_audit_log_admin_idx on audit.admin_audit_log(admin_account_id, created_at desc);

alter table identity.account enable row level security;
alter table identity.auth_identity enable row level security;
alter table identity.contact_profile enable row level security;
alter table identity.provider_profile_snapshot enable row level security;
alter table consent.age_and_consent_status enable row level security;
alter table consent.consent_record enable row level security;
alter table assessment.assessment_attempt enable row level security;
alter table assessment.assessment_response enable row level security;
alter table scoring.score_snapshot enable row level security;
alter table report.result_report enable row level security;
alter table sharing.share_link enable row level security;
alter table audit.admin_audit_log enable row level security;

create or replace function identity.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = identity, public, auth
as $$
  select ai.account_id
  from identity.auth_identity ai
  where ai.supabase_user_id = auth.uid()
    and ai.revoked_at is null
  order by ai.provider_linked_at asc
  limit 1
$$;

create policy "account own read"
on identity.account
for select
using (id = identity.current_account_id());

create policy "auth identity own read"
on identity.auth_identity
for select
using (supabase_user_id = auth.uid());

create policy "contact profile own read"
on identity.contact_profile
for select
using (account_id = identity.current_account_id());

create policy "provider snapshot own read"
on identity.provider_profile_snapshot
for select
using (account_id = identity.current_account_id());

create policy "age consent status own read"
on consent.age_and_consent_status
for select
using (account_id = identity.current_account_id());

create policy "consent record own read"
on consent.consent_record
for select
using (account_id = identity.current_account_id());

create policy "assessment attempt own read"
on assessment.assessment_attempt
for select
using (account_id = identity.current_account_id());

create policy "score snapshot own read"
on scoring.score_snapshot
for select
using (account_id = identity.current_account_id());

create policy "result report own read"
on report.result_report
for select
using (account_id = identity.current_account_id());

create policy "share link own read"
on sharing.share_link
for select
using (account_id = identity.current_account_id());

create policy "share link own revoke"
on sharing.share_link
for update
using (account_id = identity.current_account_id())
with check (account_id = identity.current_account_id());
