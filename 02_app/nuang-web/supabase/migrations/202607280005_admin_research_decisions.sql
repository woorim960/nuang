begin;

create table if not exists public.research_gate_c_item_decision (
  id uuid primary key default gen_random_uuid(),
  protocol_version text not null,
  candidate_set_id text not null,
  study_item_id text not null,
  decision_state text not null
    check (decision_state in ('reviewing', 'keep', 'revise', 'exclude')),
  note text check (note is null or char_length(note) <= 1000),
  decided_by_account_id uuid not null references identity.account(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (protocol_version, candidate_set_id, study_item_id),
  foreign key (protocol_version, candidate_set_id, study_item_id)
    references public.research_gate_c_item_review_queue(
      protocol_version,
      candidate_set_id,
      study_item_id
    )
    on delete cascade
);

create table if not exists public.research_trait_map_section_decision (
  id uuid primary key default gen_random_uuid(),
  guide_version text not null,
  profile_code text not null,
  chapter_id text not null,
  section_key text not null,
  decision_state text not null
    check (decision_state in ('reviewing', 'keep', 'revise')),
  note text check (note is null or char_length(note) <= 1000),
  decided_by_account_id uuid not null references identity.account(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (guide_version, profile_code, chapter_id, section_key)
);

create index if not exists research_gate_c_item_decision_state_idx
on public.research_gate_c_item_decision (decision_state, updated_at desc);

create index if not exists research_trait_map_section_decision_state_idx
on public.research_trait_map_section_decision (decision_state, updated_at desc);

alter table public.research_gate_c_item_decision enable row level security;
alter table public.research_trait_map_section_decision enable row level security;

revoke all on public.research_gate_c_item_decision
from public, anon, authenticated;
revoke all on public.research_trait_map_section_decision
from public, anon, authenticated;

grant select, insert, update, delete
on public.research_gate_c_item_decision
to service_role;
grant select, insert, update, delete
on public.research_trait_map_section_decision
to service_role;

create or replace function public.admin_manage_research_decision(
  target_admin_account_id uuid,
  target_scope text,
  target_action text,
  target_identity jsonb,
  target_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_decision_id uuid;
  v_state text;
  v_now timestamptz := now();
begin
  if target_admin_account_id is null or not exists (
    select 1
    from identity.account
    where id = target_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  if target_note is not null and char_length(target_note) > 1000 then
    raise exception 'research_decision_note_too_long';
  end if;

  v_state := case target_action
    when 'start_review' then 'reviewing'
    when 'keep' then 'keep'
    when 'revise' then 'revise'
    when 'exclude' then 'exclude'
    else null
  end;
  if v_state is null then
    raise exception 'unsupported_research_decision_action';
  end if;

  if target_scope = 'gate_c_item' then
    if v_state = 'exclude'
       or v_state in ('reviewing', 'keep', 'revise') then
      if not exists (
        select 1
        from public.research_gate_c_item_review_queue
        where protocol_version = target_identity ->> 'protocolVersion'
          and candidate_set_id = target_identity ->> 'candidateSetId'
          and study_item_id = target_identity ->> 'studyItemId'
      ) then
        raise exception 'gate_c_review_item_not_found';
      end if;

      insert into public.research_gate_c_item_decision (
        protocol_version,
        candidate_set_id,
        study_item_id,
        decision_state,
        note,
        decided_by_account_id,
        updated_at
      )
      values (
        target_identity ->> 'protocolVersion',
        target_identity ->> 'candidateSetId',
        target_identity ->> 'studyItemId',
        v_state,
        nullif(trim(target_note), ''),
        target_admin_account_id,
        v_now
      )
      on conflict (protocol_version, candidate_set_id, study_item_id)
      do update set
        decision_state = excluded.decision_state,
        note = excluded.note,
        decided_by_account_id = excluded.decided_by_account_id,
        updated_at = excluded.updated_at
      returning id into v_decision_id;
    end if;
  elsif target_scope = 'trait_map_section' then
    if v_state = 'exclude' then
      raise exception 'trait_map_section_cannot_be_excluded';
    end if;
    if not exists (
      select 1
      from public.research_trait_map_section_feedback
      where guide_version = target_identity ->> 'guideVersion'
        and profile_code = target_identity ->> 'profileCode'
        and chapter_id = target_identity ->> 'chapterId'
        and section_key = target_identity ->> 'sectionKey'
    ) then
      raise exception 'trait_map_feedback_section_not_found';
    end if;

    insert into public.research_trait_map_section_decision (
      guide_version,
      profile_code,
      chapter_id,
      section_key,
      decision_state,
      note,
      decided_by_account_id,
      updated_at
    )
    values (
      target_identity ->> 'guideVersion',
      target_identity ->> 'profileCode',
      target_identity ->> 'chapterId',
      target_identity ->> 'sectionKey',
      v_state,
      nullif(trim(target_note), ''),
      target_admin_account_id,
      v_now
    )
    on conflict (guide_version, profile_code, chapter_id, section_key)
    do update set
      decision_state = excluded.decision_state,
      note = excluded.note,
      decided_by_account_id = excluded.decided_by_account_id,
      updated_at = excluded.updated_at
    returning id into v_decision_id;
  else
    raise exception 'unsupported_research_decision_scope';
  end if;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  )
  values (
    'research_' || target_scope || '_' || target_action,
    target_admin_account_id,
    jsonb_build_object(
      'decisionState', v_state,
      'identity', target_identity,
      'note', nullif(trim(target_note), '')
    ),
    v_decision_id,
    case
      when target_scope = 'gate_c_item'
        then 'public.research_gate_c_item_decision'
      else 'public.research_trait_map_section_decision'
    end
  );

  return jsonb_build_object(
    'decisionId', v_decision_id,
    'decisionState', v_state,
    'ok', true
  );
end;
$$;

revoke all on function public.admin_manage_research_decision(
  uuid, text, text, jsonb, text
) from public, anon, authenticated;

grant execute on function public.admin_manage_research_decision(
  uuid, text, text, jsonb, text
) to service_role;

notify pgrst, 'reload schema';

commit;
