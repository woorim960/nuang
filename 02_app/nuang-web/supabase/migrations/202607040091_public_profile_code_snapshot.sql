create schema if not exists profile;

create table profile.profile_visibility_setting (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  policy_version text not null,
  field_id text not null,
  visibility text not null check (visibility in ('public', 'private')),
  comparison_use text not null check (comparison_use in ('allowed', 'hidden', 'blocked')),
  updated_at timestamptz not null default now(),
  unique (account_id, field_id)
);

create table profile.profile_public_snapshot (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  result_report_id uuid not null references report.result_report(id) on delete cascade,
  visibility_policy_version text not null,
  snapshot_payload jsonb not null,
  status text not null default 'active' check (status in ('active', 'private', 'stale', 'deleted')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  revoked_at timestamptz,
  deleted_at timestamptz
);

create table profile.profile_public_code (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  public_snapshot_id uuid not null references profile.profile_public_snapshot(id) on delete cascade,
  code text not null,
  code_policy_version text not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'rotated', 'deleted')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  deleted_at timestamptz,
  check (code = upper(code)),
  check (code ~ '^NUANG-[A-HJ-NP-Z2-9]{5,8}$'),
  check (code ~ '[2-9]')
);

create table audit.visibility_audit_event (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references identity.account(id) on delete set null,
  actor_account_id uuid references identity.account(id) on delete set null,
  event_type text not null check (
    event_type in (
      'profile_visibility_updated',
      'public_snapshot_created',
      'public_snapshot_revoked',
      'public_code_issued',
      'public_code_revoked',
      'public_profile_resolved',
      'public_comparison_created',
      'out_of_scope_access_blocked'
    )
  ),
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index profile_public_code_code_unique_idx
on profile.profile_public_code(code)
where deleted_at is null;

create index profile_visibility_setting_account_idx
on profile.profile_visibility_setting(account_id, updated_at desc);

create index profile_public_snapshot_account_status_idx
on profile.profile_public_snapshot(account_id, status, created_at desc);

create index profile_public_snapshot_result_report_idx
on profile.profile_public_snapshot(result_report_id);

create index profile_public_code_account_status_idx
on profile.profile_public_code(account_id, status, created_at desc);

create index profile_public_code_snapshot_idx
on profile.profile_public_code(public_snapshot_id);

create index visibility_audit_account_idx
on audit.visibility_audit_event(account_id, created_at desc);

create index visibility_audit_target_idx
on audit.visibility_audit_event(target_table, target_id, created_at desc);

alter table profile.profile_visibility_setting enable row level security;
alter table profile.profile_public_snapshot enable row level security;
alter table profile.profile_public_code enable row level security;
alter table audit.visibility_audit_event enable row level security;

create policy "profile visibility own read"
on profile.profile_visibility_setting
for select
using (account_id = identity.current_account_id());

create policy "public snapshot own read"
on profile.profile_public_snapshot
for select
using (account_id = identity.current_account_id());

create policy "public code own read"
on profile.profile_public_code
for select
using (account_id = identity.current_account_id());

create policy "visibility audit own read"
on audit.visibility_audit_event
for select
using (
  account_id = identity.current_account_id()
  or actor_account_id = identity.current_account_id()
);
