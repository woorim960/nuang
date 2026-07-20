create table if not exists public.research_gate_c_session (
  id uuid primary key default gen_random_uuid(),
  public_receipt_id uuid not null unique default gen_random_uuid(),
  participant_code text not null unique,
  protocol_version text not null,
  candidate_set_id text not null,
  form_id text not null check (form_id in ('FORM_A', 'FORM_B', 'FORM_C', 'FORM_D', 'FORM_E')),
  study_mode text not null default 'self_administered_signal'
    check (study_mode = 'self_administered_signal'),
  consent_version text not null,
  age_band text not null
    check (age_band in ('18_19', '20_24', '25_29', '30_34', '35_39', '40_plus')),
  life_context text not null
    check (life_context in ('student', 'employed', 'self_employed', 'care_or_housework', 'transition', 'other')),
  assessment_experience text not null
    check (assessment_experience in ('first_time', 'sometimes', 'often')),
  session_secret_hash text not null,
  withdrawal_secret_hash text not null,
  status text not null default 'started'
    check (status in ('started', 'completed')),
  quality_status text not null default 'pending'
    check (quality_status in ('pending', 'included', 'excluded')),
  exclusion_reasons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(exclusion_reasons) = 'array'),
  client_duration_ms integer check (client_duration_ms between 0 and 7200000),
  response_count integer not null default 0 check (response_count between 0 and 12),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  retention_until timestamptz not null default (now() + interval '1 year'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.research_gate_c_item_response (
  session_id uuid not null references public.research_gate_c_session(id) on delete cascade,
  study_item_id text not null,
  order_index integer not null check (order_index between 1 and 12),
  first_choice jsonb not null
    check (first_choice ->> 'kind' in ('scale', 'unsure')),
  final_choice jsonb not null
    check (final_choice ->> 'kind' in ('scale', 'unsure')),
  response_changed boolean not null default false,
  change_count integer not null default 0 check (change_count between 0 and 20),
  first_answer_elapsed_ms integer not null check (first_answer_elapsed_ms between 0 and 1800000),
  confusion_flag boolean not null default false,
  confusion_note text check (char_length(confusion_note) <= 300),
  unsure_reason text
    check (unsure_reason is null or unsure_reason in ('NO_EXPERIENCE', 'CONTEXT_VARIES', 'WORDING_UNCLEAR', 'PREFER_NOT_TO_ANSWER')),
  created_at timestamptz not null default now(),
  primary key (session_id, study_item_id),
  unique (session_id, order_index)
);

create table if not exists public.research_gate_c_item_review_queue (
  protocol_version text not null,
  candidate_set_id text not null,
  study_item_id text not null,
  observation_count integer not null default 0,
  recommendation_status text not null
    check (recommendation_status in ('insufficient_data', 'monitor', 'review_required')),
  reason_codes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(reason_codes) = 'array'),
  metrics jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metrics) = 'object'),
  review_state text not null default 'awaiting_human_review'
    check (review_state = 'awaiting_human_review'),
  updated_at timestamptz not null default now(),
  primary key (protocol_version, candidate_set_id, study_item_id)
);

create table if not exists public.research_gate_c_analysis_snapshot (
  id uuid primary key default gen_random_uuid(),
  protocol_version text not null,
  candidate_set_id text not null,
  started_session_count integer not null default 0,
  completed_session_count integer not null default 0,
  included_session_count integer not null default 0,
  excluded_session_count integer not null default 0,
  item_metrics jsonb not null default '[]'::jsonb
    check (jsonb_typeof(item_metrics) = 'array'),
  publication_state text not null default 'review_only'
    check (publication_state = 'review_only'),
  generated_at timestamptz not null default now(),
  unique (protocol_version, candidate_set_id)
);

create index if not exists research_gate_c_session_status_idx
on public.research_gate_c_session (status, quality_status, completed_at desc);

create index if not exists research_gate_c_session_retention_idx
on public.research_gate_c_session (retention_until);

create index if not exists research_gate_c_response_item_idx
on public.research_gate_c_item_response (study_item_id);

alter table public.research_gate_c_session enable row level security;
alter table public.research_gate_c_item_response enable row level security;
alter table public.research_gate_c_item_review_queue enable row level security;
alter table public.research_gate_c_analysis_snapshot enable row level security;

revoke all on public.research_gate_c_session from public, anon, authenticated;
revoke all on public.research_gate_c_item_response from public, anon, authenticated;
revoke all on public.research_gate_c_item_review_queue from public, anon, authenticated;
revoke all on public.research_gate_c_analysis_snapshot from public, anon, authenticated;

grant select, insert, update, delete on public.research_gate_c_session to service_role;
grant select, insert, update, delete on public.research_gate_c_item_response to service_role;
grant select, insert, update, delete on public.research_gate_c_item_review_queue to service_role;
grant select, insert, update, delete on public.research_gate_c_analysis_snapshot to service_role;

create or replace function public.complete_gate_c_public_session(
  target_session_id uuid,
  supplied_session_secret_hash text,
  supplied_client_duration_ms integer,
  supplied_quality_status text,
  supplied_exclusion_reasons jsonb,
  supplied_responses jsonb
)
returns table (public_receipt_id uuid, participant_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_session public.research_gate_c_session%rowtype;
begin
  if jsonb_typeof(supplied_responses) <> 'array'
    or jsonb_array_length(supplied_responses) <> 12 then
    raise exception 'Exactly 12 Gate C responses are required';
  end if;

  select * into target_session
  from public.research_gate_c_session
  where id = target_session_id
  for update;

  if not found then
    raise exception 'Unknown Gate C session';
  end if;
  if target_session.status <> 'started' then
    raise exception 'Gate C session is already complete';
  end if;
  if target_session.session_secret_hash <> supplied_session_secret_hash then
    raise exception 'Gate C session secret does not match';
  end if;
  if supplied_quality_status not in ('included', 'excluded') then
    raise exception 'Unknown Gate C quality status';
  end if;

  insert into public.research_gate_c_item_response (
    session_id,
    study_item_id,
    order_index,
    first_choice,
    final_choice,
    response_changed,
    change_count,
    first_answer_elapsed_ms,
    confusion_flag,
    confusion_note,
    unsure_reason
  )
  select
    target_session_id,
    response ->> 'studyItemId',
    (response ->> 'orderIndex')::integer,
    response -> 'firstChoice',
    response -> 'finalChoice',
    coalesce((response ->> 'responseChanged')::boolean, false),
    coalesce((response ->> 'changeCount')::integer, 0),
    (response ->> 'firstAnswerElapsedMs')::integer,
    coalesce((response ->> 'confusionFlag')::boolean, false),
    nullif(response ->> 'confusionNote', ''),
    nullif(response ->> 'unsureReason', '')
  from jsonb_array_elements(supplied_responses) as response;

  update public.research_gate_c_session
  set
    status = 'completed',
    quality_status = supplied_quality_status,
    exclusion_reasons = supplied_exclusion_reasons,
    client_duration_ms = supplied_client_duration_ms,
    response_count = 12,
    completed_at = now(),
    updated_at = now()
  where id = target_session_id;

  return query
  select target_session.public_receipt_id, target_session.participant_code;
end;
$$;

create or replace function public.withdraw_gate_c_public_session(
  target_public_receipt_id uuid,
  supplied_withdrawal_secret_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.research_gate_c_session
  where public_receipt_id = target_public_receipt_id
    and withdrawal_secret_hash = supplied_withdrawal_secret_hash;

  get diagnostics deleted_count = row_count;
  return deleted_count = 1;
end;
$$;

revoke all on function public.complete_gate_c_public_session(uuid, text, integer, text, jsonb, jsonb)
from public, anon, authenticated;
revoke all on function public.withdraw_gate_c_public_session(uuid, text)
from public, anon, authenticated;

grant execute on function public.complete_gate_c_public_session(uuid, text, integer, text, jsonb, jsonb)
to service_role;
grant execute on function public.withdraw_gate_c_public_session(uuid, text)
to service_role;

comment on table public.research_gate_c_session is
  'Pseudonymous self-administered Gate C wording signals. Contains no name, email, phone, exact birthdate, or raw IP address.';

comment on table public.research_gate_c_item_review_queue is
  'Automatically refreshed item signals. Review-only and never activates or edits customer assessment releases.';

comment on table public.research_gate_c_analysis_snapshot is
  'Aggregate Gate C field-signal snapshot. publication_state is permanently review_only in this migration.';
