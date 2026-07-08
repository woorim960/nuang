create schema if not exists comparison;

create table comparison.public_comparison_report (
  id uuid primary key default gen_random_uuid(),
  viewer_account_id uuid not null references identity.account(id) on delete cascade,
  viewer_result_report_id uuid not null references report.result_report(id) on delete cascade,
  viewer_public_snapshot_id uuid references profile.profile_public_snapshot(id) on delete set null,
  target_public_snapshot_id uuid not null references profile.profile_public_snapshot(id) on delete restrict,
  target_public_code_id uuid references profile.profile_public_code(id) on delete set null,
  policy_version text not null,
  report_payload jsonb not null,
  access_status text not null default 'active' check (access_status in ('active', 'stale', 'disabled', 'deleted')),
  target_snapshot_status_required text not null default 'active' check (target_snapshot_status_required = 'active'),
  reevaluate_on_visibility_change boolean not null default true,
  viewer_result_deletion_disables_report boolean not null default true,
  created_at timestamptz not null default now(),
  stale_at timestamptz,
  disabled_at timestamptz,
  deleted_at timestamptz
);

create index public_comparison_viewer_idx
on comparison.public_comparison_report(viewer_account_id, created_at desc);

create index public_comparison_viewer_result_idx
on comparison.public_comparison_report(viewer_result_report_id);

create index public_comparison_target_snapshot_idx
on comparison.public_comparison_report(target_public_snapshot_id, access_status);

create index public_comparison_target_code_idx
on comparison.public_comparison_report(target_public_code_id)
where target_public_code_id is not null;

create index public_comparison_access_status_idx
on comparison.public_comparison_report(access_status, created_at desc);

alter table comparison.public_comparison_report enable row level security;

create policy "public comparison viewer own read"
on comparison.public_comparison_report
for select
using (viewer_account_id = identity.current_account_id());
