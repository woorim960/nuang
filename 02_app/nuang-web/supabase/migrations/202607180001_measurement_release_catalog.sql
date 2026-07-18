create table if not exists scoring.code_scheme_release (
  code_scheme_version text primary key,
  status text not null check (status in ('candidate', 'validated', 'active', 'retired')),
  positions jsonb not null check (jsonb_typeof(positions) = 'array' and jsonb_array_length(positions) = 5),
  validation_gates jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

create unique index if not exists code_scheme_release_one_active_idx
on scoring.code_scheme_release ((status))
where status = 'active';

create table if not exists assessment.item_bank_release (
  item_bank_release_id text primary key,
  code_scheme_version text not null references scoring.code_scheme_release(code_scheme_version),
  status text not null check (status in ('candidate', 'beta', 'validated', 'active', 'retired')),
  source_protocol_version text not null,
  item_count integer not null check (item_count > 0),
  validation_gates jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  activated_at timestamptz
);

create unique index if not exists item_bank_release_one_active_idx
on assessment.item_bank_release ((status))
where status = 'active';

create table if not exists assessment.item_revision (
  item_revision_id text primary key,
  source_candidate_id text not null,
  domain_id text not null check (domain_id in ('SE', 'OE', 'RO', 'SM', 'ER')),
  facet_id text not null,
  keyed_direction text not null check (keyed_direction in ('HIGH', 'LOW')),
  context_label text not null,
  prompt_text text not null,
  evidence_role text not null,
  response_layer text not null,
  score_role text not null,
  candidate_status text not null,
  source_file text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (char_length(context_label) between 1 and 120),
  check (char_length(prompt_text) between 1 and 240)
);

create table if not exists assessment.item_release_member (
  item_bank_release_id text not null references assessment.item_bank_release(item_bank_release_id) on delete cascade,
  item_revision_id text not null references assessment.item_revision(item_revision_id),
  order_index integer not null check (order_index > 0),
  item_id text not null,
  scoring_key text not null check (scoring_key in ('direct', 'reverse')),
  primary key (item_bank_release_id, item_revision_id),
  unique (item_bank_release_id, order_index),
  unique (item_bank_release_id, item_id)
);

alter table scoring.code_scheme_release enable row level security;
alter table assessment.item_bank_release enable row level security;
alter table assessment.item_revision enable row level security;
alter table assessment.item_release_member enable row level security;

revoke all on scoring.code_scheme_release from anon, authenticated;
revoke all on assessment.item_bank_release from anon, authenticated;
revoke all on assessment.item_revision from anon, authenticated;
revoke all on assessment.item_release_member from anon, authenticated;

grant select, insert, update, delete on scoring.code_scheme_release to service_role;
grant select, insert, update, delete on assessment.item_bank_release to service_role;
grant select, insert, update, delete on assessment.item_revision to service_role;
grant select, insert, update, delete on assessment.item_release_member to service_role;

create or replace function assessment.activate_item_bank_release(target_release_id text)
returns void
language plpgsql
security definer
set search_path = assessment, scoring, public
as $$
declare
  target_release assessment.item_bank_release%rowtype;
  target_scheme scoring.code_scheme_release%rowtype;
  gate_status text;
begin
  select * into target_release
  from assessment.item_bank_release
  where item_bank_release_id = target_release_id
  for update;

  if not found then
    raise exception 'Unknown item bank release: %', target_release_id;
  end if;
  if target_release.status <> 'validated' then
    raise exception 'Item bank release must be validated before activation';
  end if;

  select * into target_scheme
  from scoring.code_scheme_release
  where code_scheme_version = target_release.code_scheme_version
  for update;

  if target_scheme.status <> 'validated' then
    raise exception 'Code scheme must be validated before activation';
  end if;

  foreach gate_status in array array['cognitive_review', 'quantitative_pilot', 'reliability_and_structure'] loop
    if coalesce(target_release.validation_gates ->> gate_status, 'not_started') <> 'passed' then
      raise exception 'Item bank validation gate has not passed: %', gate_status;
    end if;
    if coalesce(target_scheme.validation_gates ->> gate_status, 'not_started') <> 'passed' then
      raise exception 'Code scheme validation gate has not passed: %', gate_status;
    end if;
  end loop;

  update assessment.item_bank_release
  set status = 'retired'
  where status = 'active';
  update scoring.code_scheme_release
  set status = 'retired'
  where status = 'active';

  update scoring.code_scheme_release
  set status = 'active', activated_at = now()
  where code_scheme_version = target_release.code_scheme_version;
  update assessment.item_bank_release
  set status = 'active', activated_at = now()
  where item_bank_release_id = target_release_id;
end;
$$;

revoke all on function assessment.activate_item_bank_release(text) from public, anon, authenticated;
grant execute on function assessment.activate_item_bank_release(text) to service_role;

insert into scoring.code_scheme_release (
  code_scheme_version,
  status,
  positions,
  validation_gates,
  notes
) values (
  'NUANG-CODE-5AXIS-CANDIDATE-1.0',
  'candidate',
  '[
    {"codePosition":1,"domainId":"SE","lowSymbol":"I","highSymbol":"E","label":"사람 사이 에너지"},
    {"codePosition":2,"domainId":"OE","lowSymbol":"R","highSymbol":"N","label":"생각과 탐색"},
    {"codePosition":3,"domainId":"RO","lowSymbol":"G","highSymbol":"A","label":"관계에서 먼저 보는 것"},
    {"codePosition":4,"domainId":"SM","lowSymbol":"M","highSymbol":"K","label":"일상을 꾸리는 방식"},
    {"codePosition":5,"domainId":"ER","lowSymbol":"C","highSymbol":"Q","label":"걱정과 감정 반응"}
  ]'::jsonb,
  '{"cognitive_review":"not_started","quantitative_pilot":"not_started","reliability_and_structure":"not_started"}'::jsonb,
  'Owner-approved design contract. Candidate only; not authorized for customer scoring.'
)
on conflict (code_scheme_version) do update set
  positions = excluded.positions,
  notes = excluded.notes;
