-- Original assessment reports stay in their canonical result tables.
-- This migration only adds the missing canonical lab-result store and a
-- per-result profile visibility override. No public report copy is created.

create table if not exists assessment.lab_result (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  lab_slug text not null,
  content_version text not null,
  completed_at timestamptz not null,
  profile_code_at_completion text
    check (
      profile_code_at_completion is null
      or profile_code_at_completion ~ '^[EI][RN][GA][KM][CQ]$'
    ),
  answers jsonb not null,
  result_payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (account_id, lab_slug)
);

alter table assessment.lab_result
  add column if not exists profile_code_at_completion text;

-- Keep this migration safe to rerun if an earlier attempt created the table
-- before the current code system was introduced.
alter table assessment.lab_result
  drop constraint if exists lab_result_profile_code_at_completion_check;

update assessment.lab_result
set profile_code_at_completion = null
where profile_code_at_completion is not null
  and profile_code_at_completion !~ '^[EI][RN][GA][KM][CQ]$';

alter table assessment.lab_result
  add constraint lab_result_profile_code_at_completion_check
  check (
    profile_code_at_completion is null
    or profile_code_at_completion ~ '^[EI][RN][GA][KM][CQ]$'
  );

create index if not exists lab_result_account_completed_idx
on assessment.lab_result(account_id, completed_at desc)
where deleted_at is null;

comment on table assessment.lab_result is
  'Canonical original report data for odd-trait lab assessments. Public profile reads render this original result and never a copied public report.';

alter table assessment.free_topic_result
  add column if not exists profile_code_at_completion text;

-- Earlier releases stored legacy five-letter codes such as SVODE in some
-- records. They cannot be translated mechanically into the current code
-- system, so keep the historical report itself and clear only that optional
-- code context before validating the new constraint.
alter table assessment.free_topic_result
  drop constraint if exists free_topic_result_profile_code_at_completion_check;

update assessment.free_topic_result
set profile_code_at_completion = null
where profile_code_at_completion is not null
  and profile_code_at_completion !~ '^[EI][RN][GA][KM][CQ]$';

alter table assessment.free_topic_result
  add constraint free_topic_result_profile_code_at_completion_check
  check (
    profile_code_at_completion is null
    or profile_code_at_completion ~ '^[EI][RN][GA][KM][CQ]$'
  );

comment on column assessment.free_topic_result.profile_code_at_completion is
  'The owner Nuang code frozen at assessment completion. Viewers must never replace it with their own or the owner current code.';

comment on column assessment.lab_result.profile_code_at_completion is
  'The owner Nuang code frozen at assessment completion. Viewers must never replace it with their own or the owner current code.';

-- Restore the historical code context for existing topic results when an
-- earlier canonical core report exists.
update assessment.free_topic_result topic
set profile_code_at_completion = (
  select core.profile_code
  from report.result_report core
  where core.account_id = topic.account_id
    and core.deleted_at is null
    and core.created_at <= topic.completed_at
    and core.profile_code ~ '^[EI][RN][GA][KM][CQ]$'
  order by
    case core.report_kind when 'full' then 0 else 1 end,
    core.created_at desc
  limit 1
)
where topic.profile_code_at_completion is null
  and exists (
    select 1
    from report.result_report core
    where core.account_id = topic.account_id
      and core.deleted_at is null
      and core.created_at <= topic.completed_at
      and core.profile_code ~ '^[EI][RN][GA][KM][CQ]$'
  );

create table if not exists profile.profile_report_visibility (
  account_id uuid not null references identity.account(id) on delete cascade,
  source_kind text not null check (source_kind in ('core', 'topic', 'lab')),
  source_id uuid not null,
  visibility text not null default 'profile_public'
    check (visibility in ('profile_public', 'private')),
  updated_at timestamptz not null default now(),
  primary key (account_id, source_kind, source_id)
);

create index if not exists profile_report_visibility_source_idx
on profile.profile_report_visibility(source_kind, source_id);

comment on table profile.profile_report_visibility is
  'Visibility override only. The report body always comes from the canonical source table. Missing rows mean profile_public.';

alter table assessment.lab_result enable row level security;
alter table profile.profile_report_visibility enable row level security;

drop policy if exists "lab result own read" on assessment.lab_result;
create policy "lab result own read"
on assessment.lab_result
for select
using (account_id = identity.current_account_id());

drop policy if exists "profile report visibility own read" on profile.profile_report_visibility;
create policy "profile report visibility own read"
on profile.profile_report_visibility
for select
using (account_id = identity.current_account_id());

grant usage on schema assessment, profile to authenticated, service_role;
grant select on assessment.lab_result to authenticated;
grant select on profile.profile_report_visibility to authenticated;
grant all on assessment.lab_result, profile.profile_report_visibility to service_role;
