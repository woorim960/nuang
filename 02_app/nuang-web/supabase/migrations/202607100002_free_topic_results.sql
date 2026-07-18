create table if not exists assessment.free_topic_result (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  local_result_id text not null,
  topic_slug text not null,
  category_id text not null,
  category_label text not null,
  completed_at timestamptz not null,
  result_summary jsonb not null default '{}'::jsonb,
  evidence_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (account_id, local_result_id)
);

create index if not exists free_topic_result_account_completed_idx
on assessment.free_topic_result(account_id, completed_at desc);

alter table assessment.free_topic_result enable row level security;

drop policy if exists "free topic result own read" on assessment.free_topic_result;
create policy "free topic result own read"
on assessment.free_topic_result
for select
using (account_id = identity.current_account_id());

grant usage on schema assessment to anon, authenticated, service_role;
grant select on assessment.free_topic_result to authenticated;
grant all on assessment.free_topic_result to service_role;
