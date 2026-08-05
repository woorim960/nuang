create table if not exists scoring.account_trait_profile (
  account_id uuid primary key references identity.account(id) on delete cascade,
  profile_code text not null check (profile_code ~ '^[EI][RN][GA][KM][CQ]$'),
  profile_name text not null,
  domains jsonb not null default '[]'::jsonb,
  alternative_codes text[] not null default '{}',
  source text not null check (source in ('core_only', 'core_and_topics')),
  base_result_report_id uuid not null references report.result_report(id) on delete cascade,
  topic_count integer not null default 0 check (topic_count >= 0),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  version text not null,
  updated_at timestamptz not null default now()
);

create index if not exists account_trait_profile_updated_idx
on scoring.account_trait_profile (updated_at desc);

alter table scoring.account_trait_profile enable row level security;

revoke all on scoring.account_trait_profile from public, anon, authenticated;
grant select on scoring.account_trait_profile to authenticated;
grant all on scoring.account_trait_profile to service_role;

drop policy if exists "account trait profile own read"
on scoring.account_trait_profile;

create policy "account trait profile own read"
on scoring.account_trait_profile
for select
to authenticated
using (account_id = identity.current_account_id());

comment on table scoring.account_trait_profile is
  'Current representative NUANG code recalculated from the latest core baseline and latest result per free-topic slug. Odd-lab and together-game results are excluded by design.';

comment on column scoring.account_trait_profile.domains is
  'Five ordered dynamic domain scores with evidence counts, weights, boundaries and stability changes.';

comment on column scoring.account_trait_profile.topic_count is
  'Count of distinct free-topic assessments contributing usable representative-code evidence.';
