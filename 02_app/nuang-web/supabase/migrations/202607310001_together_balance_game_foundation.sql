begin;

create schema if not exists together_balance;

revoke all on schema together_balance from public, anon, authenticated;
grant usage on schema together_balance to service_role;

create table together_balance.template (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null check (char_length(trim(title)) between 1 and 80),
  mode text not null check (mode in ('small_group', 'open_crowd')),
  scoring_template text not null check (
    scoring_template in (
      'taste_sync',
      'relationship_standard',
      'ideal_preference',
      'reciprocal_fit',
      'dilemma_fun',
      'discovery_only'
    )
  ),
  status text not null default 'draft' check (
    status in ('draft', 'published', 'retired')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table together_balance.template_version (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references together_balance.template(id) on delete restrict,
  version integer not null check (version > 0),
  scoring_version text not null
    check (char_length(trim(scoring_version)) between 3 and 80),
  scoring_template text not null check (
    scoring_template in (
      'taste_sync',
      'relationship_standard',
      'ideal_preference',
      'reciprocal_fit',
      'dilemma_fun',
      'discovery_only'
    )
  ),
  content_pool_version text not null
    check (char_length(trim(content_pool_version)) between 3 and 80),
  default_question_count smallint not null check (
    default_question_count in (8, 12, 16, 20, 24)
  ),
  min_question_count smallint not null check (
    min_question_count in (8, 12, 16, 20, 24)
  ),
  max_question_count smallint not null check (
    max_question_count in (8, 12, 16, 20, 24)
  ),
  status text not null default 'draft' check (
    status in ('draft', 'published', 'retired')
  ),
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (template_id, version),
  unique (id, template_id),
  check (
    min_question_count <= default_question_count
    and default_question_count <= max_question_count
  ),
  check (
    (status = 'published' and published_at is not null and retired_at is null)
    or status = 'draft'
    or (status = 'retired' and retired_at is not null)
  )
);

create table together_balance.session_recipe (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null
    references together_balance.template_version(id) on delete restrict,
  version integer not null check (version > 0),
  label text not null check (char_length(trim(label)) between 1 and 80),
  question_count smallint check (
    question_count is null
    or question_count in (8, 12, 16, 20, 24)
  ),
  round_size smallint not null default 8 check (round_size = 8),
  subtopic_quota jsonb not null default '{}'::jsonb
    check (jsonb_typeof(subtopic_quota) = 'object'),
  intensity_mix jsonb not null default '{}'::jsonb
    check (jsonb_typeof(intensity_mix) = 'object'),
  repeat_window_days smallint not null default 90
    check (repeat_window_days between 1 and 365),
  max_repeat_ratio numeric(4, 3) not null default 0.200
    check (max_repeat_ratio between 0 and 1),
  status text not null default 'draft' check (
    status in ('draft', 'published', 'retired')
  ),
  created_at timestamptz not null default now(),
  unique (template_version_id, version),
  unique (id, template_version_id)
);

create table together_balance.item (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null
    references together_balance.template_version(id) on delete restrict,
  item_key text not null check (item_key ~ '^[a-z0-9][a-z0-9_-]{2,79}$'),
  topic_id text not null check (char_length(trim(topic_id)) between 2 and 80),
  subtopic_id text not null check (char_length(trim(subtopic_id)) between 2 and 80),
  meaning_code text check (
    meaning_code is null
    or char_length(trim(meaning_code)) between 2 and 80
  ),
  prompt_role text not null check (
    prompt_role in ('preference', 'self_behavior', 'standard', 'taste')
  ),
  prompt text not null check (char_length(trim(prompt)) between 2 and 160),
  option_a_key text not null
    check (char_length(trim(option_a_key)) between 1 and 40),
  option_a_text text not null
    check (char_length(trim(option_a_text)) between 1 and 100),
  option_b_key text not null
    check (char_length(trim(option_b_key)) between 1 and 40),
  option_b_text text not null
    check (char_length(trim(option_b_text)) between 1 and 100),
  scored boolean not null default true,
  highlight_priority smallint not null default 0
    check (highlight_priority between 0 and 5),
  conversation_value smallint not null default 0
    check (conversation_value between 0 and 5),
  sensitivity_level text not null default 'general' check (
    sensitivity_level in ('general', 'personal', 'sensitive')
  ),
  intensity text not null default 'light' check (
    intensity in ('light', 'closer', 'serious')
  ),
  audience text not null default 'all_ages' check (
    audience in ('all_ages', 'adult')
  ),
  occasion text,
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, template_version_id),
  unique (template_version_id, item_key),
  check (option_a_key <> option_b_key),
  check (option_a_text <> option_b_text),
  check (retired_at is null or published_at is not null)
);

create table together_balance.room (
  id uuid primary key default gen_random_uuid(),
  room_name text not null check (char_length(trim(room_name)) between 1 and 60),
  join_code_hash text not null unique
    check (join_code_hash ~ '^[0-9a-f]{64}$'),
  owner_participant_id uuid not null,
  template_version_id uuid not null
    references together_balance.template_version(id) on delete restrict,
  session_recipe_id uuid not null
    references together_balance.session_recipe(id) on delete restrict,
  room_question_seed text not null
    check (room_question_seed ~ '^[0-9a-f]{32,128}$'),
  planned_question_count smallint check (
    planned_question_count is null
    or planned_question_count in (8, 12, 16, 20, 24)
  ),
  current_round_number smallint not null default 1
    check (current_round_number > 0),
  participation_mode text not null check (
    participation_mode in ('private_group', 'feed_group', 'open_crowd')
  ),
  visibility text not null check (
    visibility in ('unlisted', 'feed_public')
  ),
  capacity_mode text not null default 'fixed' check (
    capacity_mode in ('fixed', 'unbounded')
  ),
  target_participant_count smallint,
  hard_capacity smallint,
  join_status text not null default 'open' check (
    join_status in ('open', 'full', 'closed')
  ),
  result_status text not null default 'waiting' check (
    result_status in ('waiting', 'current', 'final')
  ),
  lifecycle_status text not null default 'active' check (
    lifecycle_status in ('active', 'closed', 'deleted', 'expired')
  ),
  initialization_status text not null default 'pending' check (
    initialization_status in ('pending', 'ready', 'failed')
  ),
  join_policy text not null check (
    join_policy in ('token_anyone', 'authenticated_feed')
  ),
  result_visibility text not null default 'participants' check (
    result_visibility in ('participants', 'anonymous_summary')
  ),
  answer_reveal_policy text not null default 'after_result_open' check (
    answer_reveal_policy in ('after_result_open', 'never')
  ),
  allow_late_join boolean not null default true,
  result_min_completed smallint not null default 2
    check (result_min_completed between 2 and 8),
  current_participant_count smallint not null default 1
    check (current_participant_count >= 0),
  completed_count smallint not null default 0
    check (completed_count >= 0),
  started_at timestamptz,
  closed_at timestamptz,
  recruitment_closed_at timestamptz,
  finalized_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, template_version_id),
  foreign key (session_recipe_id, template_version_id)
    references together_balance.session_recipe(id, template_version_id)
    on delete restrict,
  check (
    (
      participation_mode in ('private_group', 'feed_group')
      and capacity_mode = 'fixed'
      and target_participant_count between 2 and 8
      and hard_capacity = target_participant_count
      and result_min_completed <= target_participant_count
      and current_participant_count <= hard_capacity
    )
    or (
      participation_mode = 'open_crowd'
      and capacity_mode = 'unbounded'
      and target_participant_count is null
      and hard_capacity is null
    )
  ),
  check (
    (participation_mode = 'private_group'
      and visibility = 'unlisted'
      and join_policy = 'token_anyone')
    or
    (participation_mode = 'feed_group'
      and visibility = 'feed_public'
      and join_policy = 'authenticated_feed')
    or
    (participation_mode = 'open_crowd'
      and visibility = 'feed_public'
      and join_policy = 'authenticated_feed')
  ),
  check (
    (result_status = 'final' and finalized_at is not null)
    or result_status <> 'final'
  )
);

create table together_balance.participant (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references together_balance.room(id) on delete cascade,
  account_id uuid references identity.account(id) on delete cascade,
  nickname text not null check (char_length(trim(nickname)) between 1 and 24),
  avatar_seed text check (
    avatar_seed is null
    or char_length(trim(avatar_seed)) between 1 and 80
  ),
  current_round_number smallint not null default 1
    check (current_round_number > 0),
  join_token_hash text not null
    check (join_token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'reserved' check (
    status in ('reserved', 'joined', 'completed', 'left', 'expired', 'removed')
  ),
  seat_reserved_at timestamptz,
  seat_expires_at timestamptz,
  joined_at timestamptz,
  completed_at timestamptz,
  left_at timestamptz,
  removed_at timestamptz,
  removed_by uuid,
  pair_visibility_consent boolean not null default false,
  visibility_consent_version text,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, join_token_hash),
  unique (id, room_id),
  check (
    (status = 'reserved'
      and seat_reserved_at is not null
      and seat_expires_at is not null
      and joined_at is null)
    or
    (status in ('joined', 'completed')
      and joined_at is not null
      and seat_expires_at is null)
    or
    status in ('left', 'expired', 'removed')
  ),
  check (
    not pair_visibility_consent
    or visibility_consent_version is not null
  )
);

alter table together_balance.room
  add constraint together_balance_room_owner_fk
  foreign key (owner_participant_id, id)
  references together_balance.participant(id, room_id)
  on delete cascade
  deferrable initially deferred;

alter table together_balance.participant
  add constraint together_balance_participant_remover_fk
  foreign key (removed_by, room_id)
  references together_balance.participant(id, room_id)
  deferrable initially deferred;

create unique index together_balance_participant_active_account_idx
  on together_balance.participant(room_id, account_id)
  where account_id is not null
    and status in ('reserved', 'joined', 'completed');

create index together_balance_participant_room_status_idx
  on together_balance.participant(room_id, status, joined_at);

create index together_balance_participant_room_activity_idx
  on together_balance.participant(room_id, status, last_active_at);

create table together_balance.request_budget (
  action text not null check (
    action in (
      'create_room_short',
      'create_room_daily',
      'preview_room_short',
      'preview_room_daily',
      'join_room_short',
      'join_room_daily'
    )
  ),
  scope_hash text not null check (scope_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  expires_at timestamptz not null,
  primary key (action, scope_hash, window_started_at)
);

create index together_balance_request_budget_expiry_idx
  on together_balance.request_budget(expires_at);

create table together_balance.room_ban (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references together_balance.room(id) on delete cascade,
  account_id uuid references identity.account(id) on delete cascade,
  join_token_hash text check (
    join_token_hash is null
    or join_token_hash ~ '^[0-9a-f]{64}$'
  ),
  created_by_participant_id uuid not null,
  reason text not null default 'removed' check (
    reason in ('removed', 'moderation', 'block_relationship')
  ),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (created_by_participant_id, room_id)
    references together_balance.participant(id, room_id)
    on delete cascade,
  check (account_id is not null or join_token_hash is not null)
);

create unique index together_balance_room_ban_active_account_idx
  on together_balance.room_ban(room_id, account_id)
  where account_id is not null and revoked_at is null;

create unique index together_balance_room_ban_active_token_idx
  on together_balance.room_ban(room_id, join_token_hash)
  where join_token_hash is not null and revoked_at is null;

create index if not exists feed_profile_block_blocked_active_idx
  on feed.profile_block(blocked_account_id, blocker_account_id)
  where deleted_at is null;

create table together_balance.round (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references together_balance.room(id) on delete cascade,
  round_number smallint not null check (round_number > 0),
  status text not null default 'open' check (
    status in ('draft', 'open', 'result_open', 'finalized')
  ),
  question_count smallint not null check (question_count between 1 and 8),
  question_set_hash text not null
    check (question_set_hash ~ '^[0-9a-f]{64}$'),
  opened_at timestamptz,
  result_opened_at timestamptz,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (room_id, round_number),
  unique (id, room_id),
  check (
    (status = 'draft' and opened_at is null)
    or (status = 'open' and opened_at is not null)
    or (status = 'result_open'
      and opened_at is not null
      and result_opened_at is not null)
    or (status = 'finalized'
      and opened_at is not null
      and result_opened_at is not null
      and finalized_at is not null)
  )
);

create table together_balance.round_item (
  round_id uuid not null,
  room_id uuid not null,
  item_id uuid not null
    references together_balance.item(id) on delete restrict,
  display_order smallint not null check (display_order between 1 and 8),
  option_order_seed text not null
    check (option_order_seed ~ '^[0-9a-f]{16,128}$'),
  created_at timestamptz not null default now(),
  primary key (round_id, item_id),
  unique (round_id, display_order),
  foreign key (round_id, room_id)
    references together_balance.round(id, room_id) on delete cascade
);

create or replace function together_balance.guard_round_item()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_template_version_id uuid;
  v_item_template_version_id uuid;
  v_question_count integer;
  v_existing_count integer;
begin
  select room.template_version_id, round_record.question_count
  into v_template_version_id, v_question_count
  from together_balance.round as round_record
  join together_balance.room
    on room.id = round_record.room_id
  where round_record.id = new.round_id
    and round_record.room_id = new.room_id;

  select template_version_id
  into v_item_template_version_id
  from together_balance.item
  where id = new.item_id;

  if v_template_version_id is null
     or v_item_template_version_id is null
     or v_template_version_id <> v_item_template_version_id then
    raise exception 'together_balance_round_item_version_mismatch';
  end if;

  if tg_op = 'INSERT' then
    select count(*)
    into v_existing_count
    from together_balance.round_item
    where round_id = new.round_id;
  else
    select count(*)
    into v_existing_count
    from together_balance.round_item
    where round_id = new.round_id
      and not (
        round_id = old.round_id
        and item_id = old.item_id
      );
  end if;

  if v_existing_count >= v_question_count then
    raise exception 'together_balance_round_item_limit_exceeded';
  end if;

  return new;
end;
$$;

create trigger together_balance_round_item_guard
before insert or update
on together_balance.round_item
for each row execute function together_balance.guard_round_item();

create table together_balance.response (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  round_id uuid not null,
  participant_id uuid not null,
  item_id uuid not null,
  option_key text not null check (option_key in ('a', 'b', 'skipped')),
  idempotency_key uuid not null,
  client_sequence integer not null check (client_sequence >= 0),
  answered_at timestamptz not null default now(),
  response_ms integer check (response_ms is null or response_ms between 0 and 3600000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, participant_id, item_id),
  unique (participant_id, idempotency_key),
  foreign key (round_id, room_id)
    references together_balance.round(id, room_id) on delete cascade,
  foreign key (participant_id, room_id)
    references together_balance.participant(id, room_id) on delete cascade,
  foreign key (round_id, item_id)
    references together_balance.round_item(round_id, item_id) on delete restrict
);

create index together_balance_response_round_participant_idx
  on together_balance.response(round_id, participant_id);

create table together_balance.round_completion (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null,
  round_id uuid not null,
  participant_id uuid not null,
  answered_count smallint not null check (answered_count between 1 and 8),
  completed_at timestamptz not null default now(),
  unique (round_id, participant_id),
  foreign key (round_id, room_id)
    references together_balance.round(id, room_id) on delete cascade,
  foreign key (participant_id, room_id)
    references together_balance.participant(id, room_id) on delete cascade
);

create table together_balance.result_snapshot (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references together_balance.room(id) on delete cascade,
  snapshot_version integer not null check (snapshot_version > 0),
  snapshot_scope text not null check (
    snapshot_scope in ('round', 'cumulative')
  ),
  result_state text not null check (
    result_state in ('current', 'final')
  ),
  scoring_version text not null
    check (char_length(trim(scoring_version)) between 3 and 80),
  result_semantics_version text not null check (
    result_semantics_version in (
      'pairwise_group_compatibility_v1',
      'crowd_distribution_v1'
    )
  ),
  participant_set_hash text not null
    check (participant_set_hash ~ '^[0-9a-f]{64}$'),
  answer_cutoff_at timestamptz not null,
  group_score numeric(6, 3) check (group_score between 0 and 100),
  participant_count integer not null check (participant_count >= 2),
  pair_count integer not null check (pair_count >= 0),
  match_count integer check (match_count is null or match_count >= 0),
  compared_count integer check (compared_count is null or compared_count > 0),
  highlights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(highlights) = 'array'),
  computed_at timestamptz not null default now(),
  invalidated_at timestamptz,
  unique (room_id, snapshot_version),
  unique (id, room_id),
  check (
    (result_semantics_version = 'pairwise_group_compatibility_v1'
      and pair_count = participant_count * (participant_count - 1) / 2)
    or
    (result_semantics_version = 'crowd_distribution_v1' and pair_count = 0)
  )
);

create table together_balance.pair_result (
  snapshot_id uuid not null,
  room_id uuid not null,
  participant_low_id uuid not null,
  participant_high_id uuid not null,
  match_count integer not null check (match_count >= 0),
  compared_count integer not null check (compared_count > 0),
  raw_score numeric(8, 5) not null check (raw_score between 0 and 1),
  rounded_score smallint not null check (rounded_score between 0 and 100),
  topic_scores jsonb not null default '{}'::jsonb
    check (jsonb_typeof(topic_scores) = 'object'),
  highlights jsonb not null default '[]'::jsonb
    check (jsonb_typeof(highlights) = 'array'),
  created_at timestamptz not null default now(),
  primary key (snapshot_id, participant_low_id, participant_high_id),
  foreign key (snapshot_id, room_id)
    references together_balance.result_snapshot(id, room_id) on delete cascade,
  foreign key (participant_low_id, room_id)
    references together_balance.participant(id, room_id) on delete cascade,
  foreign key (participant_high_id, room_id)
    references together_balance.participant(id, room_id) on delete cascade,
  check (participant_low_id < participant_high_id),
  check (match_count <= compared_count),
  check (rounded_score = round(raw_score * 100))
);

create index together_balance_snapshot_room_idx
  on together_balance.result_snapshot(room_id, snapshot_version desc)
  where invalidated_at is null;

create index together_balance_pair_low_idx
  on together_balance.pair_result(room_id, participant_low_id, snapshot_id);

create index together_balance_pair_high_idx
  on together_balance.pair_result(room_id, participant_high_id, snapshot_id);

create or replace function together_balance.store_result_snapshot(
  p_room_id uuid,
  p_result_state text,
  p_scoring_version text,
  p_result_semantics_version text,
  p_participant_set_hash text,
  p_participant_ids jsonb,
  p_answer_cutoff_at timestamptz,
  p_group_score numeric,
  p_participant_count integer,
  p_pair_count integer,
  p_match_count integer,
  p_compared_count integer,
  p_highlights jsonb,
  p_pair_results jsonb,
  p_public_body text,
  p_public_projection jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_latest together_balance.result_snapshot%rowtype;
  v_snapshot_id uuid := gen_random_uuid();
  v_snapshot_version integer;
begin
  select *
  into v_room
  from together_balance.room
  where id = p_room_id
    and lifecycle_status <> 'deleted'
  for update;

  if not found then
    raise exception 'together_balance_room_not_found';
  end if;

  if p_result_state not in ('current', 'final')
     or p_result_state <> v_room.result_status then
    raise exception 'together_balance_result_state_mismatch';
  end if;

  if jsonb_typeof(p_participant_ids) <> 'array'
     or jsonb_array_length(p_participant_ids) <> p_participant_count
     or (
       select count(distinct participant_id)
       from jsonb_array_elements_text(p_participant_ids)
         as input_id(participant_id)
     ) <> p_participant_count
     or p_participant_count <> (
       select count(*)
       from together_balance.participant
       where room_id = p_room_id
         and status = 'completed'
     )
     or exists (
       select 1
       from together_balance.participant
       where room_id = p_room_id
         and status = 'completed'
         and id::text not in (
           select participant_id
           from jsonb_array_elements_text(p_participant_ids)
             as input_id(participant_id)
         )
     ) then
    raise exception 'together_balance_result_snapshot_stale';
  end if;

  if p_participant_count < 2
     or p_pair_count <> p_participant_count * (p_participant_count - 1) / 2
     or jsonb_typeof(p_pair_results) <> 'array'
     or jsonb_array_length(p_pair_results) <> p_pair_count then
    raise exception 'together_balance_result_pair_set_invalid';
  end if;

  if char_length(trim(p_public_body)) not between 1 and 10000
     or jsonb_typeof(p_public_projection) <> 'object' then
    raise exception 'together_balance_result_public_projection_invalid';
  end if;

  select *
  into v_latest
  from together_balance.result_snapshot
  where room_id = p_room_id
    and invalidated_at is null
  order by snapshot_version desc
  limit 1;

  if found
     and v_latest.result_state = 'final'
     and p_result_state <> 'final' then
    raise exception 'together_balance_result_state_regression';
  end if;

  if found
     and v_latest.participant_set_hash = p_participant_set_hash
     and v_latest.result_state = p_result_state then
    perform together_balance.sync_result_feed_snapshot(
      v_latest.id,
      p_public_body,
      p_public_projection
    );
    return v_latest.id;
  end if;

  v_snapshot_version := coalesce(v_latest.snapshot_version, 0) + 1;

  insert into together_balance.result_snapshot (
    id,
    room_id,
    snapshot_version,
    snapshot_scope,
    result_state,
    scoring_version,
    result_semantics_version,
    participant_set_hash,
    answer_cutoff_at,
    group_score,
    participant_count,
    pair_count,
    match_count,
    compared_count,
    highlights
  )
  values (
    v_snapshot_id,
    p_room_id,
    v_snapshot_version,
    'cumulative',
    p_result_state,
    p_scoring_version,
    p_result_semantics_version,
    p_participant_set_hash,
    p_answer_cutoff_at,
    p_group_score,
    p_participant_count,
    p_pair_count,
    p_match_count,
    p_compared_count,
    coalesce(p_highlights, '[]'::jsonb)
  );

  insert into together_balance.pair_result (
    snapshot_id,
    room_id,
    participant_low_id,
    participant_high_id,
    match_count,
    compared_count,
    raw_score,
    rounded_score,
    topic_scores,
    highlights
  )
  select
    v_snapshot_id,
    p_room_id,
    pair.participant_low_id,
    pair.participant_high_id,
    pair.match_count,
    pair.compared_count,
    pair.raw_score,
    pair.rounded_score,
    coalesce(pair.topic_scores, '{}'::jsonb),
    coalesce(pair.highlights, '[]'::jsonb)
  from jsonb_to_recordset(p_pair_results) as pair(
    participant_low_id uuid,
    participant_high_id uuid,
    match_count integer,
    compared_count integer,
    raw_score numeric,
    rounded_score smallint,
    topic_scores jsonb,
    highlights jsonb
  );

  perform together_balance.sync_result_feed_snapshot(
    v_snapshot_id,
    p_public_body,
    p_public_projection
  );

  return v_snapshot_id;
end;
$$;

alter table feed.feed_post
  drop constraint if exists feed_post_source_check;

alter table feed.feed_post
  add constraint feed_post_source_check
  check (
    source in (
      'daily_mood',
      'daily_question',
      'trait_card',
      'map_reflection',
      'free_text',
      'balance_game',
      'report_share',
      'together_balance_room_share',
      'together_balance_result_share'
    )
  );

create table together_balance.feed_share (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null
    references together_balance.room(id) on delete cascade,
  feed_post_id uuid not null unique
    references feed.feed_post(id) on delete cascade,
  share_kind text not null check (
    share_kind in ('recruitment', 'anonymous_result')
  ),
  snapshot_id uuid,
  status text not null default 'active' check (
    status in ('active', 'closed', 'removed')
  ),
  created_by_account_id uuid not null
    references identity.account(id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  deleted_at timestamptz,
  foreign key (snapshot_id, room_id)
    references together_balance.result_snapshot(id, room_id)
    on delete cascade,
  check (
    (share_kind = 'recruitment' and snapshot_id is null)
    or (share_kind = 'anonymous_result' and snapshot_id is not null)
  )
);

create unique index together_balance_feed_share_active_kind_idx
  on together_balance.feed_share(room_id, share_kind)
  where deleted_at is null and status = 'active';

create or replace function together_balance.guard_feed_share()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, together_balance, feed
as $$
declare
  v_room together_balance.room%rowtype;
  v_post feed.feed_post%rowtype;
  v_owner_account_id uuid;
begin
  select *
  into v_room
  from together_balance.room
  where id = new.room_id;

  select *
  into v_post
  from feed.feed_post
  where id = new.feed_post_id;

  select account_id
  into v_owner_account_id
  from together_balance.participant
  where id = v_room.owner_participant_id
    and room_id = v_room.id;

  if v_owner_account_id is null
     or new.created_by_account_id <> v_owner_account_id
     or v_post.author_account_id <> v_owner_account_id then
    raise exception 'together_balance_feed_share_owner_mismatch';
  end if;

  if v_room.id is null or v_post.id is null then
    raise exception 'together_balance_feed_share_target_missing';
  end if;

  if v_post.source_id is distinct from new.room_id::text then
    raise exception 'together_balance_feed_share_source_id_mismatch';
  end if;

  if new.share_kind = 'recruitment' then
    if v_room.participation_mode <> 'feed_group'
       or v_room.visibility <> 'feed_public'
       or v_post.source <> 'together_balance_room_share' then
      raise exception 'together_balance_feed_recruitment_boundary_violation';
    end if;
  elsif v_post.source <> 'together_balance_result_share' then
    raise exception 'together_balance_feed_result_boundary_violation';
  end if;

  return new;
end;
$$;

create trigger together_balance_feed_share_guard
before insert or update
on together_balance.feed_share
for each row execute function together_balance.guard_feed_share();

create or replace function together_balance.guard_feed_projection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, together_balance, feed
as $$
declare
  v_allowed_keys text[];
  v_key text;
begin
  if new.source not in (
    'together_balance_room_share',
    'together_balance_result_share'
  ) then
    return new;
  end if;

  if new.source_id is null
     or new.source_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or not exists (
       select 1
       from together_balance.room
       where id = new.source_id::uuid
     ) then
    raise exception 'together_balance_feed_source_invalid';
  end if;

  if new.source = 'together_balance_room_share' then
    v_allowed_keys := array[
      'roomName',
      'roomCode',
      'packSlug',
      'packTitle',
      'questionCount',
      'occupancy',
      'capacity',
      'recruitmentStatus'
    ];
  else
    v_allowed_keys := array[
      'roomName',
      'packSlug',
      'packTitle',
      'score',
      'scoreLabel',
      'highlight',
      'completedCount',
      'resultStatus'
    ];
  end if;

  for v_key in
    select jsonb_object_keys(new.public_projection_payload)
  loop
    if not (v_key = any(v_allowed_keys)) then
      raise exception 'together_balance_feed_projection_contains_private_key';
    end if;
  end loop;

  return new;
end;
$$;

create trigger together_balance_feed_projection_guard
before insert or update of source, source_id, public_projection_payload
on feed.feed_post
for each row execute function together_balance.guard_feed_projection();

create or replace function together_balance.sync_result_feed_snapshot(
  p_snapshot_id uuid,
  p_public_body text,
  p_public_projection jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, together_balance, feed
as $$
declare
  v_snapshot together_balance.result_snapshot%rowtype;
begin
  select *
  into v_snapshot
  from together_balance.result_snapshot
  where id = p_snapshot_id
    and invalidated_at is null;

  if not found then
    raise exception 'together_balance_result_snapshot_not_found';
  end if;

  update together_balance.feed_share
  set snapshot_id = p_snapshot_id
  where room_id = v_snapshot.room_id
    and share_kind = 'anonymous_result'
    and status = 'active'
    and deleted_at is null;

  update feed.feed_post as post
  set
    body = trim(p_public_body),
    public_projection_payload = p_public_projection
  from together_balance.feed_share
  where feed_share.room_id = v_snapshot.room_id
    and feed_share.snapshot_id = p_snapshot_id
    and feed_share.share_kind = 'anonymous_result'
    and feed_share.status = 'active'
    and feed_share.deleted_at is null
    and feed_share.feed_post_id = post.id;
end;
$$;

create or replace function together_balance.sync_recruitment_feed_state(
  p_room_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, together_balance, feed
as $$
declare
  v_room together_balance.room%rowtype;
  v_active_count integer;
  v_recruitment_status text;
begin
  select *
  into v_room
  from together_balance.room
  where id = p_room_id;

  if not found then
    return;
  end if;

  select count(*)
  into v_active_count
  from together_balance.participant
  where room_id = p_room_id
    and (
      status in ('joined', 'completed')
      or (status = 'reserved' and seat_expires_at > now())
    );

  v_recruitment_status := case
    when v_room.lifecycle_status <> 'active'
      or v_room.result_status = 'final'
      or v_room.recruitment_closed_at is not null
      or v_room.join_status = 'closed'
      then 'closed'
    when v_room.capacity_mode = 'fixed'
      and v_active_count >= v_room.hard_capacity
      then 'full'
    else 'open'
  end;

  update together_balance.room
  set
    current_participant_count = v_active_count,
    join_status = v_recruitment_status,
    updated_at = now()
  where id = p_room_id;

  update together_balance.feed_share
  set
    status = case
      when v_recruitment_status = 'open' then 'active'
      else 'closed'
    end,
    closed_at = case
      when v_recruitment_status = 'open' then null
      else coalesce(closed_at, now())
    end
  where room_id = p_room_id
    and share_kind = 'recruitment'
    and deleted_at is null
    and status <> 'removed';

  update feed.feed_post as post
  set public_projection_payload =
    post.public_projection_payload || jsonb_build_object(
      'roomName', v_room.room_name,
      'occupancy', v_active_count,
      'capacity', v_room.hard_capacity,
      'recruitmentStatus', v_recruitment_status
    )
  from together_balance.feed_share
  where feed_share.room_id = p_room_id
    and feed_share.feed_post_id = post.id
    and feed_share.share_kind = 'recruitment'
    and feed_share.deleted_at is null;
end;
$$;

create or replace function together_balance.after_feed_share_insert()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
begin
  if new.share_kind = 'recruitment' then
    perform together_balance.sync_recruitment_feed_state(new.room_id);
  end if;
  return new;
end;
$$;

create trigger together_balance_feed_share_sync
after insert
on together_balance.feed_share
for each row execute function together_balance.after_feed_share_insert();

create or replace function together_balance.consume_request_budget(
  p_action text,
  p_scope_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_count integer;
  v_window_started_at timestamptz;
begin
  if p_action not in (
       'create_room_short',
       'create_room_daily',
       'preview_room_short',
       'preview_room_daily',
       'join_room_short',
       'join_room_daily'
     )
     or p_scope_hash !~ '^[0-9a-f]{64}$'
     or p_limit not between 1 and 10000
     or p_window_seconds not between 10 and 86400 then
    raise exception 'together_balance_request_budget_invalid';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / p_window_seconds)
      * p_window_seconds
  );

  insert into together_balance.request_budget (
    action,
    scope_hash,
    window_started_at,
    request_count,
    expires_at
  )
  values (
    p_action,
    p_scope_hash,
    v_window_started_at,
    1,
    v_window_started_at
      + make_interval(secs => p_window_seconds)
      + interval '1 hour'
  )
  on conflict (action, scope_hash, window_started_at)
  do update set request_count =
    together_balance.request_budget.request_count + 1
  returning request_count into v_count;

  if v_count > p_limit then
    raise exception 'together_balance_rate_limited';
  end if;

  if random() < 0.01 then
    delete from together_balance.request_budget
    where expires_at < now();
  end if;

  return v_count;
end;
$$;

create or replace function together_balance.create_room(
  p_join_code_hash text,
  p_owner_join_token_hash text,
  p_owner_account_id uuid,
  p_owner_nickname text,
  p_room_name text,
  p_template_version_id uuid,
  p_session_recipe_id uuid,
  p_room_question_seed text,
  p_planned_question_count smallint,
  p_participation_mode text,
  p_target_participant_count smallint,
  p_visibility_consent_version text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, together_balance, identity
as $$
declare
  v_room_id uuid := gen_random_uuid();
  v_owner_participant_id uuid := gen_random_uuid();
  v_visibility text;
  v_join_policy text;
begin
  if p_join_code_hash !~ '^[0-9a-f]{64}$'
     or p_owner_join_token_hash !~ '^[0-9a-f]{64}$'
     or char_length(trim(p_visibility_consent_version)) not between 3 and 80 then
    raise exception 'together_balance_token_hash_invalid';
  end if;

  if p_participation_mode not in ('private_group', 'feed_group')
     or p_target_participant_count not between 2 and 8 then
    raise exception 'together_balance_room_configuration_invalid';
  end if;

  if p_planned_question_count is null
     or p_planned_question_count not in (8, 12, 16, 20, 24) then
    raise exception 'together_balance_question_count_invalid';
  end if;

  if not exists (
    select 1
    from together_balance.session_recipe
    where id = p_session_recipe_id
      and template_version_id = p_template_version_id
      and status = 'published'
  ) then
    raise exception 'together_balance_recipe_version_invalid';
  end if;

  if p_participation_mode = 'feed_group' and p_owner_account_id is null then
    raise exception 'together_balance_feed_room_requires_account';
  end if;

  if p_owner_account_id is not null
     and not exists (
       select 1
       from identity.account
       where id = p_owner_account_id
         and status = 'active'
         and deleted_at is null
     ) then
    raise exception 'together_balance_owner_account_invalid';
  end if;

  v_visibility := case
    when p_participation_mode = 'feed_group' then 'feed_public'
    else 'unlisted'
  end;
  v_join_policy := case
    when p_participation_mode = 'feed_group' then 'authenticated_feed'
    else 'token_anyone'
  end;

  set constraints together_balance_room_owner_fk deferred;

  insert into together_balance.room (
    id,
    room_name,
    join_code_hash,
    owner_participant_id,
    template_version_id,
    session_recipe_id,
    room_question_seed,
    planned_question_count,
    participation_mode,
    visibility,
    capacity_mode,
    target_participant_count,
    hard_capacity,
    join_policy
  )
  values (
    v_room_id,
    trim(p_room_name),
    p_join_code_hash,
    v_owner_participant_id,
    p_template_version_id,
    p_session_recipe_id,
    p_room_question_seed,
    p_planned_question_count,
    p_participation_mode,
    v_visibility,
    'fixed',
    p_target_participant_count,
    p_target_participant_count,
    v_join_policy
  );

  insert into together_balance.participant (
    id,
    room_id,
    account_id,
    nickname,
    join_token_hash,
    status,
    joined_at,
    pair_visibility_consent,
    visibility_consent_version,
    last_active_at
  )
  values (
    v_owner_participant_id,
    v_room_id,
    p_owner_account_id,
    trim(p_owner_nickname),
    p_owner_join_token_hash,
    'joined',
    now(),
    true,
    trim(p_visibility_consent_version),
    now()
  );

  return jsonb_build_object(
    'roomId', v_room_id,
    'ownerParticipantId', v_owner_participant_id
  );
end;
$$;

create or replace function together_balance.mark_room_ready(
  p_room_id uuid,
  p_owner_join_token_hash text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_item_count integer;
  v_round_count integer;
begin
  select *
  into v_room
  from together_balance.room
  where id = p_room_id
  for update;

  if not found
     or not exists (
       select 1
       from together_balance.participant
       where id = v_room.owner_participant_id
         and room_id = v_room.id
         and join_token_hash = p_owner_join_token_hash
         and status in ('joined', 'completed')
     ) then
    raise exception 'together_balance_owner_authorization_failed';
  end if;

  if v_room.initialization_status = 'ready' then
    return;
  end if;

  select count(*)
  into v_item_count
  from together_balance.round_item
  where room_id = p_room_id;

  select count(*)
  into v_round_count
  from together_balance.round
  where room_id = p_room_id;

  if v_room.planned_question_count is null
     or v_item_count <> v_room.planned_question_count
     or v_round_count <> ceil(v_room.planned_question_count::numeric / 8)::integer
     or exists (
       select 1
       from together_balance.round as round_record
       where round_record.room_id = p_room_id
         and (
           select count(*)
           from together_balance.round_item
           where round_id = round_record.id
         ) <> round_record.question_count
     ) then
    raise exception 'together_balance_room_initialization_incomplete';
  end if;

  update together_balance.room
  set
    initialization_status = 'ready',
    updated_at = now()
  where id = p_room_id;
end;
$$;

create or replace function together_balance.reserve_seat(
  p_join_code_hash text,
  p_join_token_hash text,
  p_nickname text,
  p_visibility_consent_version text,
  p_account_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, together_balance, identity
as $$
declare
  v_room together_balance.room%rowtype;
  v_participant_id uuid;
  v_active_count integer;
  v_existing together_balance.participant%rowtype;
begin
  if p_join_code_hash !~ '^[0-9a-f]{64}$'
     or p_join_token_hash !~ '^[0-9a-f]{64}$'
     or char_length(trim(p_visibility_consent_version)) not between 3 and 80 then
    raise exception 'together_balance_token_hash_invalid';
  end if;

  select *
  into v_room
  from together_balance.room
  where join_code_hash = p_join_code_hash
  for update;

  if not found then
    raise exception 'together_balance_room_not_found';
  end if;

  if v_room.initialization_status <> 'ready' then
    raise exception 'together_balance_room_initializing';
  end if;

  update together_balance.participant as target_participant
  set
    status = 'expired',
    left_at = coalesce(left_at, now()),
    updated_at = now()
  where room_id = v_room.id
    and status = 'reserved'
    and seat_expires_at <= now();

  update together_balance.participant as target_participant
  set
    status = 'expired',
    left_at = coalesce(left_at, now()),
    seat_expires_at = null,
    updated_at = now()
  where room_id = v_room.id
    and id <> v_room.owner_participant_id
    and status = 'joined'
    and last_active_at <= now() - interval '20 minutes'
    and not exists (
      select 1
      from together_balance.response
      where response.participant_id = target_participant.id
        and response.room_id = v_room.id
    );

  select *
  into v_existing
  from together_balance.participant
  where room_id = v_room.id
    and join_token_hash = p_join_token_hash;

  if found and v_existing.status in ('reserved', 'joined', 'completed') then
    return jsonb_build_object(
      'roomId', v_room.id,
      'participantId', v_existing.id,
      'seatExpiresAt', v_existing.seat_expires_at,
      'participantStatus', v_existing.status,
      'reused', true
    );
  end if;

  if v_room.lifecycle_status <> 'active'
     or v_room.join_status = 'closed'
     or v_room.recruitment_closed_at is not null
     or v_room.expires_at <= now() then
    raise exception 'together_balance_room_closed';
  end if;

  if v_room.participation_mode = 'feed_group' and p_account_id is null then
    raise exception 'together_balance_feed_room_requires_account';
  end if;

  if p_account_id is not null
     and not exists (
       select 1
       from identity.account
       where id = p_account_id
         and status = 'active'
         and deleted_at is null
     ) then
    raise exception 'together_balance_participant_account_invalid';
  end if;

  if v_room.participation_mode = 'feed_group' then
    if exists (
      select 1
      from feed.profile_block
      join together_balance.participant as existing_participant
        on existing_participant.room_id = v_room.id
        and existing_participant.account_id is not null
        and existing_participant.status in ('reserved', 'joined', 'completed')
      where profile_block.deleted_at is null
        and (
          (profile_block.blocker_account_id = p_account_id
            and profile_block.blocked_account_id = existing_participant.account_id)
          or
          (profile_block.blocker_account_id = existing_participant.account_id
            and profile_block.blocked_account_id = p_account_id)
        )
    ) then
      raise exception 'together_balance_block_relationship';
    end if;
  end if;

  if p_account_id is not null
     and exists (
       select 1
       from together_balance.participant
       where room_id = v_room.id
         and account_id = p_account_id
         and status in ('reserved', 'joined', 'completed')
     ) then
    raise exception 'together_balance_account_already_joined';
  end if;

  if exists (
    select 1
    from together_balance.room_ban
    where room_id = v_room.id
      and revoked_at is null
      and (
        join_token_hash = p_join_token_hash
        or (p_account_id is not null and account_id = p_account_id)
      )
  ) then
    raise exception 'together_balance_reentry_blocked';
  end if;

  select count(*)
  into v_active_count
  from together_balance.participant
  where room_id = v_room.id
    and status in ('reserved', 'joined', 'completed');

  if v_room.capacity_mode = 'fixed'
     and v_active_count >= v_room.hard_capacity then
    update together_balance.room
    set
      current_participant_count = v_active_count,
      join_status = 'full',
      updated_at = now()
    where id = v_room.id;
    raise exception 'together_balance_room_full';
  end if;

  if v_existing.id is not null then
    if v_existing.status = 'removed' then
      raise exception 'together_balance_participant_removed';
    end if;

    update together_balance.participant
    set
      account_id = coalesce(p_account_id, account_id),
      nickname = trim(p_nickname),
      status = 'reserved',
      seat_reserved_at = now(),
      seat_expires_at = now() + interval '15 minutes',
      joined_at = null,
      completed_at = null,
      left_at = null,
      removed_at = null,
      removed_by = null,
      pair_visibility_consent = true,
      visibility_consent_version = trim(p_visibility_consent_version),
      last_active_at = now(),
      updated_at = now()
    where id = v_existing.id
    returning id into v_participant_id;
  else
    insert into together_balance.participant (
      room_id,
      account_id,
      nickname,
      join_token_hash,
      status,
      seat_reserved_at,
      seat_expires_at,
      pair_visibility_consent,
      visibility_consent_version,
      last_active_at
    )
    values (
      v_room.id,
      p_account_id,
      trim(p_nickname),
      p_join_token_hash,
      'reserved',
      now(),
      now() + interval '15 minutes',
      true,
      trim(p_visibility_consent_version),
      now()
    )
    returning id into v_participant_id;
  end if;

  v_active_count := v_active_count + 1;

  update together_balance.room
  set
    current_participant_count = v_active_count,
    join_status = case
      when capacity_mode = 'fixed' and v_active_count >= hard_capacity then 'full'
      else 'open'
    end,
    updated_at = now()
  where id = v_room.id;

  perform together_balance.sync_recruitment_feed_state(v_room.id);

  return jsonb_build_object(
    'roomId', v_room.id,
    'participantId', v_participant_id,
    'seatExpiresAt', now() + interval '15 minutes',
    'participantStatus', 'reserved',
    'reused', false
  );
end;
$$;

create or replace function together_balance.confirm_seat(
  p_participant_id uuid,
  p_join_token_hash text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_participant together_balance.participant%rowtype;
begin
  select *
  into v_participant
  from together_balance.participant
  where id = p_participant_id
  for update;

  if not found
     or v_participant.join_token_hash <> p_join_token_hash then
    raise exception 'together_balance_seat_confirmation_invalid';
  end if;

  if v_participant.status in ('joined', 'completed') then
    update together_balance.participant
    set
      last_active_at = now(),
      updated_at = now()
    where id = p_participant_id;
    return;
  end if;

  if v_participant.status <> 'reserved'
     or v_participant.seat_expires_at <= now() then
    raise exception 'together_balance_seat_confirmation_invalid';
  end if;

  update together_balance.participant
  set
    status = 'joined',
    joined_at = now(),
    seat_expires_at = null,
    last_active_at = now(),
    updated_at = now()
  where id = p_participant_id;
end;
$$;

create or replace function together_balance.resize_room(
  p_room_id uuid,
  p_owner_participant_id uuid,
  p_owner_join_token_hash text,
  p_target_participant_count smallint
)
returns smallint
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_active_count integer;
begin
  if p_target_participant_count not between 2 and 8 then
    raise exception 'together_balance_capacity_out_of_range';
  end if;

  select *
  into v_room
  from together_balance.room
  where id = p_room_id
  for update;

  if not found
     or v_room.owner_participant_id <> p_owner_participant_id
     or not exists (
       select 1
       from together_balance.participant
       where id = p_owner_participant_id
         and room_id = p_room_id
         and join_token_hash = p_owner_join_token_hash
         and status in ('joined', 'completed')
     ) then
    raise exception 'together_balance_owner_authorization_failed';
  end if;

  if v_room.result_status <> 'waiting'
     or v_room.lifecycle_status <> 'active'
     or v_room.capacity_mode <> 'fixed' then
    raise exception 'together_balance_capacity_locked';
  end if;

  select count(*)
  into v_active_count
  from together_balance.participant
  where room_id = p_room_id
    and status in ('reserved', 'joined', 'completed');

  if p_target_participant_count < v_active_count then
    raise exception 'together_balance_capacity_below_occupancy';
  end if;

  update together_balance.room
  set
    target_participant_count = p_target_participant_count,
    hard_capacity = p_target_participant_count,
    current_participant_count = v_active_count,
    join_status = case
      when v_active_count >= p_target_participant_count then 'full'
      else 'open'
    end,
    updated_at = now()
  where id = p_room_id;

  perform together_balance.sync_recruitment_feed_state(p_room_id);

  return p_target_participant_count;
end;
$$;

create or replace function together_balance.remove_participant(
  p_room_id uuid,
  p_owner_participant_id uuid,
  p_owner_join_token_hash text,
  p_target_participant_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_target together_balance.participant%rowtype;
  v_active_count integer;
begin
  select *
  into v_room
  from together_balance.room
  where id = p_room_id
  for update;

  if not found
     or v_room.owner_participant_id <> p_owner_participant_id
     or not exists (
       select 1
       from together_balance.participant
       where id = p_owner_participant_id
         and room_id = p_room_id
         and join_token_hash = p_owner_join_token_hash
         and status in ('joined', 'completed')
     ) then
    raise exception 'together_balance_owner_authorization_failed';
  end if;

  if p_target_participant_id = p_owner_participant_id then
    raise exception 'together_balance_owner_removal_forbidden';
  end if;

  select *
  into v_target
  from together_balance.participant
  where id = p_target_participant_id
    and room_id = p_room_id
  for update;

  if not found then
    raise exception 'together_balance_participant_not_found';
  end if;

  if v_target.status = 'removed' then
    return;
  end if;

  if v_target.status = 'completed' then
    raise exception 'together_balance_completed_participant_locked';
  end if;

  insert into together_balance.room_ban (
    room_id,
    account_id,
    join_token_hash,
    created_by_participant_id,
    reason
  )
  select
    p_room_id,
    v_target.account_id,
    v_target.join_token_hash,
    p_owner_participant_id,
    'removed'
  where not exists (
    select 1
    from together_balance.room_ban
    where room_id = p_room_id
      and revoked_at is null
      and (
        join_token_hash = v_target.join_token_hash
        or (
          v_target.account_id is not null
          and account_id = v_target.account_id
        )
      )
  );

  update together_balance.participant
  set
    status = 'removed',
    seat_expires_at = null,
    left_at = coalesce(left_at, now()),
    removed_at = now(),
    removed_by = p_owner_participant_id,
    updated_at = now()
  where id = p_target_participant_id
    and room_id = p_room_id;

  select count(*)
  into v_active_count
  from together_balance.participant
  where room_id = p_room_id
    and status in ('reserved', 'joined', 'completed');

  update together_balance.room
  set
    current_participant_count = v_active_count,
    join_status = case
      when result_status = 'final' or lifecycle_status <> 'active' then 'closed'
      when capacity_mode = 'fixed' and v_active_count >= hard_capacity then 'full'
      else 'open'
    end,
    updated_at = now()
  where id = p_room_id;

  perform together_balance.sync_recruitment_feed_state(p_room_id);
end;
$$;

create or replace function together_balance.save_response(
  p_room_id uuid,
  p_round_id uuid,
  p_participant_id uuid,
  p_join_token_hash text,
  p_item_id uuid,
  p_option_key text,
  p_idempotency_key uuid,
  p_client_sequence integer,
  p_response_ms integer default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_existing together_balance.response%rowtype;
  v_response_id uuid;
begin
  if p_option_key not in ('a', 'b', 'skipped') then
    raise exception 'together_balance_response_option_invalid';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_participant_id::text || ':' || p_item_id::text, 0)
  );

  if not exists (
    select 1
    from together_balance.participant
    where id = p_participant_id
      and room_id = p_room_id
      and join_token_hash = p_join_token_hash
      and status in ('joined', 'completed')
  ) then
    raise exception 'together_balance_participant_authorization_failed';
  end if;

  if exists (
    select 1
    from together_balance.round_completion
    where round_id = p_round_id
      and participant_id = p_participant_id
  ) then
    raise exception 'together_balance_completed_response_locked';
  end if;

  if not exists (
    select 1
    from together_balance.round as round_record
    join together_balance.round_item
      on round_item.round_id = round_record.id
      and round_item.item_id = p_item_id
    where round_record.id = p_round_id
      and round_record.room_id = p_room_id
      and round_record.status in ('open', 'result_open')
  ) then
    raise exception 'together_balance_round_item_not_open';
  end if;

  select *
  into v_existing
  from together_balance.response
  where participant_id = p_participant_id
    and idempotency_key = p_idempotency_key;

  if found then
    update together_balance.participant
    set
      last_active_at = now(),
      updated_at = now()
    where id = p_participant_id;
    return v_existing.id;
  end if;

  select *
  into v_existing
  from together_balance.response
  where room_id = p_room_id
    and participant_id = p_participant_id
    and item_id = p_item_id
  for update;

  if found and p_client_sequence <= v_existing.client_sequence then
    update together_balance.participant
    set
      last_active_at = now(),
      updated_at = now()
    where id = p_participant_id;
    return v_existing.id;
  end if;

  insert into together_balance.response (
    room_id,
    round_id,
    participant_id,
    item_id,
    option_key,
    idempotency_key,
    client_sequence,
    response_ms,
    answered_at
  )
  values (
    p_room_id,
    p_round_id,
    p_participant_id,
    p_item_id,
    p_option_key,
    p_idempotency_key,
    p_client_sequence,
    p_response_ms,
    now()
  )
  on conflict (room_id, participant_id, item_id)
  do update set
    option_key = excluded.option_key,
    idempotency_key = excluded.idempotency_key,
    client_sequence = excluded.client_sequence,
    response_ms = excluded.response_ms,
    answered_at = excluded.answered_at,
    updated_at = now()
  where together_balance.response.client_sequence < excluded.client_sequence
  returning id into v_response_id;

  update together_balance.participant
  set
    last_active_at = now(),
    updated_at = now()
  where id = p_participant_id;

  return coalesce(v_response_id, v_existing.id);
end;
$$;

create or replace function together_balance.complete_round(
  p_room_id uuid,
  p_round_id uuid,
  p_participant_id uuid,
  p_join_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_round together_balance.round%rowtype;
  v_answered_count integer;
  v_round_completed_count integer;
  v_next_round_number integer;
begin
  select *
  into v_room
  from together_balance.room
  where id = p_room_id
  for update;

  select *
  into v_round
  from together_balance.round
  where id = p_round_id
    and room_id = p_room_id
  for update;

  if not found or v_round.status not in ('open', 'result_open') then
    raise exception 'together_balance_round_not_open';
  end if;

  if not exists (
    select 1
    from together_balance.participant
    where id = p_participant_id
      and room_id = p_room_id
      and join_token_hash = p_join_token_hash
      and status in ('joined', 'completed')
  ) then
    raise exception 'together_balance_participant_authorization_failed';
  end if;

  select count(*)
  into v_answered_count
  from together_balance.response
  where room_id = p_room_id
    and round_id = p_round_id
    and participant_id = p_participant_id;

  if v_answered_count <> v_round.question_count then
    raise exception 'together_balance_round_incomplete';
  end if;

  insert into together_balance.round_completion (
    room_id,
    round_id,
    participant_id,
    answered_count
  )
  values (
    p_room_id,
    p_round_id,
    p_participant_id,
    v_answered_count
  )
  on conflict (round_id, participant_id) do nothing;

  select count(*)
  into v_round_completed_count
  from together_balance.round_completion
  where round_id = p_round_id;

  if v_round_completed_count >= v_room.result_min_completed then
    update together_balance.round
    set
      status = case
        when v_round_completed_count >= v_room.target_participant_count
          then 'finalized'
        else 'result_open'
      end,
      result_opened_at = coalesce(result_opened_at, now()),
      finalized_at = case
        when v_round_completed_count >= v_room.target_participant_count
          then coalesce(finalized_at, now())
        else finalized_at
      end
    where id = p_round_id;
  end if;

  select min(round_number)
  into v_next_round_number
  from together_balance.round
  where room_id = p_room_id
    and round_number > v_round.round_number;

  update together_balance.participant
  set
    current_round_number = coalesce(v_next_round_number, current_round_number),
    last_active_at = now(),
    updated_at = now()
  where id = p_participant_id
    and room_id = p_room_id;

  return jsonb_build_object(
    'answeredCount', v_answered_count,
    'roundCompletedCount', v_round_completed_count,
    'roundResultStatus', case
      when v_round_completed_count >= v_room.target_participant_count then 'final'
      when v_round_completed_count >= v_room.result_min_completed then 'current'
      else 'waiting'
    end,
    'nextRoundNumber', v_next_round_number
  );
end;
$$;

create or replace function together_balance.complete_game(
  p_room_id uuid,
  p_participant_id uuid,
  p_join_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_question_count integer;
  v_answered_count integer;
  v_round_count integer;
  v_completed_round_count integer;
  v_completed_count integer;
  v_result_state text;
begin
  select *
  into v_room
  from together_balance.room
  where id = p_room_id
  for update;

  if not found
     or v_room.lifecycle_status <> 'active'
     or v_room.result_status = 'final' then
    raise exception 'together_balance_room_not_completable';
  end if;

  if not exists (
    select 1
    from together_balance.participant
    where id = p_participant_id
      and room_id = p_room_id
      and join_token_hash = p_join_token_hash
      and status in ('joined', 'completed')
  ) then
    raise exception 'together_balance_participant_authorization_failed';
  end if;

  select count(*)
  into v_question_count
  from together_balance.round_item
  where room_id = p_room_id;

  select count(*)
  into v_answered_count
  from together_balance.response
  where room_id = p_room_id
    and participant_id = p_participant_id;

  select count(*)
  into v_round_count
  from together_balance.round
  where room_id = p_room_id;

  select count(*)
  into v_completed_round_count
  from together_balance.round_completion
  where room_id = p_room_id
    and participant_id = p_participant_id;

  if v_question_count = 0
     or v_answered_count <> v_question_count
     or v_completed_round_count <> v_round_count
     or v_round_count <> ceil(v_question_count::numeric / 8)::integer
     or exists (
       select 1
       from together_balance.round
       where room_id = p_room_id
         and round_number < (
           select max(round_number)
           from together_balance.round
           where room_id = p_room_id
         )
         and question_count <> 8
     )
     or (
       v_room.planned_question_count is not null
       and v_question_count <> v_room.planned_question_count
     ) then
    raise exception 'together_balance_game_incomplete';
  end if;

  update together_balance.participant
  set
    status = 'completed',
    completed_at = coalesce(completed_at, now()),
    last_active_at = now(),
    updated_at = now()
  where id = p_participant_id
    and room_id = p_room_id;

  select count(*)
  into v_completed_count
  from together_balance.participant
  where room_id = p_room_id
    and status = 'completed';

  if v_completed_count >= v_room.target_participant_count then
    v_result_state := 'final';
  elsif v_completed_count >= v_room.result_min_completed then
    v_result_state := 'current';
  else
    v_result_state := 'waiting';
  end if;

  update together_balance.room
  set
    completed_count = v_completed_count,
    result_status = v_result_state,
    join_status = case
      when v_result_state = 'final' then 'closed'
      else join_status
    end,
    recruitment_closed_at = case
      when v_result_state = 'final' then coalesce(recruitment_closed_at, now())
      else recruitment_closed_at
    end,
    finalized_at = case
      when v_result_state = 'final' then coalesce(finalized_at, now())
      else finalized_at
    end,
    updated_at = now()
  where id = p_room_id;

  if v_result_state = 'final' then
    update together_balance.feed_share
    set
      status = 'closed',
      closed_at = coalesce(closed_at, now())
    where room_id = p_room_id
      and share_kind = 'recruitment'
      and status = 'active'
      and deleted_at is null;
  end if;

  perform together_balance.sync_recruitment_feed_state(p_room_id);

  return jsonb_build_object(
    'questionCount', v_question_count,
    'answeredCount', v_answered_count,
    'completedCount', v_completed_count,
    'resultStatus', v_result_state
  );
end;
$$;

create or replace function together_balance.finalize_room(
  p_room_id uuid,
  p_owner_participant_id uuid,
  p_owner_join_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_completed_count integer;
begin
  select *
  into v_room
  from together_balance.room
  where id = p_room_id
  for update;

  if not found
     or v_room.owner_participant_id <> p_owner_participant_id
     or not exists (
       select 1
       from together_balance.participant
       where id = p_owner_participant_id
         and room_id = p_room_id
         and join_token_hash = p_owner_join_token_hash
         and status in ('joined', 'completed')
     ) then
    raise exception 'together_balance_owner_authorization_failed';
  end if;

  if v_room.result_status = 'final'
     or v_room.lifecycle_status <> 'active' then
    raise exception 'together_balance_room_already_finalized';
  end if;

  select count(*)
  into v_completed_count
  from together_balance.participant
  where room_id = p_room_id
    and status = 'completed';

  if v_completed_count < v_room.result_min_completed then
    raise exception 'together_balance_not_enough_completed_participants';
  end if;

  update together_balance.participant as participant
  set
    status = case
      when participant.status = 'completed' then 'completed'
      when participant.status = 'reserved' then 'expired'
      else 'left'
    end,
    seat_expires_at = null,
    left_at = case
      when participant.status <> 'completed'
        then coalesce(participant.left_at, now())
      else participant.left_at
    end,
    updated_at = now()
  where participant.room_id = p_room_id
    and participant.status in ('reserved', 'joined', 'completed');

  update together_balance.round
  set
    status = 'finalized',
    result_opened_at = coalesce(result_opened_at, now()),
    finalized_at = coalesce(finalized_at, now())
  where room_id = p_room_id
    and status in ('open', 'result_open');

  update together_balance.room
  set
    join_status = 'closed',
    result_status = 'final',
    current_participant_count = v_completed_count,
    completed_count = v_completed_count,
    recruitment_closed_at = coalesce(recruitment_closed_at, now()),
    finalized_at = coalesce(finalized_at, now()),
    updated_at = now()
  where id = p_room_id;

  update together_balance.feed_share
  set
    status = 'closed',
    closed_at = coalesce(closed_at, now())
  where room_id = p_room_id
    and share_kind = 'recruitment'
    and status = 'active'
    and deleted_at is null;

  perform together_balance.sync_recruitment_feed_state(p_room_id);

  return jsonb_build_object(
    'roomId', p_room_id,
    'completedCount', v_completed_count,
    'resultStatus', 'final'
  );
end;
$$;

create or replace function together_balance.get_room_state(
  p_room_id uuid,
  p_participant_id uuid,
  p_join_token_hash text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_round together_balance.round%rowtype;
  v_participant_round_number smallint;
begin
  if not exists (
    select 1
    from together_balance.participant
    where id = p_participant_id
      and room_id = p_room_id
      and join_token_hash = p_join_token_hash
      and status in ('reserved', 'joined', 'completed')
  ) then
    raise exception 'together_balance_participant_authorization_failed';
  end if;

  select *
  into v_room
  from together_balance.room
  where id = p_room_id
    and lifecycle_status <> 'deleted';

  if not found then
    raise exception 'together_balance_room_not_found';
  end if;

  select current_round_number
  into v_participant_round_number
  from together_balance.participant
  where id = p_participant_id
    and room_id = p_room_id;

  select *
  into v_round
  from together_balance.round
  where room_id = p_room_id
    and round_number = v_participant_round_number;

  return jsonb_build_object(
    'roomId', v_room.id,
    'roomName', v_room.room_name,
    'participationMode', v_room.participation_mode,
    'joinStatus', v_room.join_status,
    'resultStatus', v_room.result_status,
    'lifecycleStatus', v_room.lifecycle_status,
    'targetParticipantCount', v_room.target_participant_count,
    'currentParticipantCount', v_room.current_participant_count,
    'completedCount', v_room.completed_count,
    'currentRound', case
      when v_round.id is null then null
      else jsonb_build_object(
        'id', v_round.id,
        'roundNumber', v_round.round_number,
        'status', v_round.status,
        'questionCount', v_round.question_count
      )
    end,
    'participants', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', participant.id,
          'nickname', participant.nickname,
          'avatarSeed', participant.avatar_seed,
          'status', participant.status,
          'isOwner', participant.id = v_room.owner_participant_id,
          'completedCurrentRound', exists (
            select 1
            from together_balance.round_completion
            where round_id = v_round.id
              and participant_id = participant.id
          )
        )
        order by participant.joined_at nulls last, participant.created_at
      )
      from together_balance.participant as participant
      where participant.room_id = p_room_id
        and participant.status in ('reserved', 'joined', 'completed')
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', item.id,
          'itemKey', item.item_key,
          'displayOrder', round_item.display_order,
          'prompt', item.prompt,
          'optionAKey', item.option_a_key,
          'optionAText', item.option_a_text,
          'optionBKey', item.option_b_key,
          'optionBText', item.option_b_text,
          'optionOrderSeed', round_item.option_order_seed
        )
        order by round_item.display_order
      )
      from together_balance.round_item
      join together_balance.item
        on item.id = round_item.item_id
      where round_item.round_id = v_round.id
    ), '[]'::jsonb),
    'myResponses', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'itemId', response.item_id,
          'optionKey', response.option_key,
          'clientSequence', response.client_sequence,
          'answeredAt', response.answered_at
        )
        order by response.answered_at
      )
      from together_balance.response
      where response.room_id = p_room_id
        and response.round_id = v_round.id
        and response.participant_id = p_participant_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function together_balance.get_room_join_preview(
  p_join_code_hash text
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, together_balance
as $$
declare
  v_preview jsonb;
begin
  if p_join_code_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'together_balance_token_hash_invalid';
  end if;

  select jsonb_build_object(
    'roomId', room.id,
    'roomName', room.room_name,
    'ownerNickname', owner_participant.nickname,
    'templateVersionId', room.template_version_id,
    'packSlug', template.slug,
    'packTitle', template.title,
    'participationMode', room.participation_mode,
    'requiresAccount', room.join_policy = 'authenticated_feed',
    'joinStatus', case
      when room.lifecycle_status <> 'active'
        or room.expires_at <= now()
        or room.recruitment_closed_at is not null
        then 'closed'
      when room.capacity_mode = 'fixed'
        and occupancy.active_count >= room.hard_capacity
        then 'full'
      else room.join_status
    end,
    'currentParticipantCount', occupancy.active_count,
    'targetParticipantCount', room.target_participant_count,
    'plannedQuestionCount', room.planned_question_count,
    'expiresAt', room.expires_at
  )
  into v_preview
  from together_balance.room
  join together_balance.template_version
    on template_version.id = room.template_version_id
  join together_balance.template
    on template.id = template_version.template_id
  join together_balance.participant as owner_participant
    on owner_participant.id = room.owner_participant_id
    and owner_participant.room_id = room.id
  cross join lateral (
    select count(*)::integer as active_count
    from together_balance.participant
    where participant.room_id = room.id
      and (
        participant.status in ('joined', 'completed')
        or (
          participant.status = 'reserved'
          and participant.seat_expires_at > now()
        )
      )
  ) as occupancy
  where room.join_code_hash = p_join_code_hash
    and room.lifecycle_status <> 'deleted'
    and room.initialization_status = 'ready';

  if v_preview is null then
    raise exception 'together_balance_room_not_found';
  end if;

  return v_preview;
end;
$$;

create or replace function together_balance.get_result_state(
  p_room_id uuid,
  p_participant_id uuid,
  p_join_token_hash text,
  p_snapshot_id uuid default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = pg_catalog, together_balance
as $$
declare
  v_room together_balance.room%rowtype;
  v_snapshot together_balance.result_snapshot%rowtype;
begin
  if not exists (
    select 1
    from together_balance.participant
    where id = p_participant_id
      and room_id = p_room_id
      and join_token_hash = p_join_token_hash
      and status = 'completed'
  ) then
    raise exception 'together_balance_participant_authorization_failed';
  end if;

  select *
  into v_room
  from together_balance.room
  where id = p_room_id
    and lifecycle_status <> 'deleted';

  if not found or v_room.result_status = 'waiting' then
    raise exception 'together_balance_result_not_open';
  end if;

  select *
  into v_snapshot
  from together_balance.result_snapshot
  where room_id = p_room_id
    and invalidated_at is null
    and (p_snapshot_id is null or id = p_snapshot_id)
  order by snapshot_version desc
  limit 1;

  if not found then
    raise exception 'together_balance_result_snapshot_not_found';
  end if;

  return jsonb_build_object(
    'snapshotId', v_snapshot.id,
    'snapshotVersion', v_snapshot.snapshot_version,
    'resultState', v_snapshot.result_state,
    'resultSemanticsVersion', v_snapshot.result_semantics_version,
    'groupScore', v_snapshot.group_score,
    'participantCount', v_snapshot.participant_count,
    'pairCount', v_snapshot.pair_count,
    'matchCount', v_snapshot.match_count,
    'comparedCount', v_snapshot.compared_count,
    'highlights', v_snapshot.highlights,
    'computedAt', v_snapshot.computed_at,
    'myPairResults', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'otherParticipantId', other_participant.id,
          'otherNickname', other_participant.nickname,
          'otherAvatarSeed', other_participant.avatar_seed,
          'matchCount', pair_result.match_count,
          'comparedCount', pair_result.compared_count,
          'rawScore', pair_result.raw_score,
          'roundedScore', pair_result.rounded_score,
          'topicScores', pair_result.topic_scores,
          'highlights', pair_result.highlights
        )
        order by other_participant.nickname, other_participant.id
      )
      from together_balance.pair_result
      join together_balance.participant as other_participant
        on other_participant.room_id = pair_result.room_id
        and other_participant.id = case
          when pair_result.participant_low_id = p_participant_id
            then pair_result.participant_high_id
          else pair_result.participant_low_id
        end
      where pair_result.snapshot_id = v_snapshot.id
        and pair_result.room_id = p_room_id
        and exists (
          select 1
          from together_balance.participant as viewer_participant
          where viewer_participant.id = p_participant_id
            and viewer_participant.room_id = p_room_id
            and viewer_participant.pair_visibility_consent
        )
        and other_participant.pair_visibility_consent
        and p_participant_id in (
          pair_result.participant_low_id,
          pair_result.participant_high_id
        )
    ), '[]'::jsonb)
  );
end;
$$;

alter table together_balance.template enable row level security;
alter table together_balance.template_version enable row level security;
alter table together_balance.session_recipe enable row level security;
alter table together_balance.item enable row level security;
alter table together_balance.room enable row level security;
alter table together_balance.participant enable row level security;
alter table together_balance.request_budget enable row level security;
alter table together_balance.room_ban enable row level security;
alter table together_balance.round enable row level security;
alter table together_balance.round_item enable row level security;
alter table together_balance.response enable row level security;
alter table together_balance.round_completion enable row level security;
alter table together_balance.result_snapshot enable row level security;
alter table together_balance.pair_result enable row level security;
alter table together_balance.feed_share enable row level security;

revoke all on all tables in schema together_balance
  from public, anon, authenticated;
revoke all on all routines in schema together_balance
  from public, anon, authenticated;
revoke all on all sequences in schema together_balance
  from public, anon, authenticated;

grant select, insert, update, delete on all tables in schema together_balance
  to service_role;
grant usage, select on all sequences in schema together_balance
  to service_role;
grant execute on all routines in schema together_balance
  to service_role;

comment on schema together_balance is
  'Server-mediated balance game domain. Raw room and participant tokens are never stored.';
comment on column together_balance.room.join_code_hash is
  'Lowercase SHA-256 digest of the room join secret; never the raw secret.';
comment on column together_balance.participant.join_token_hash is
  'Lowercase SHA-256 digest used by server routes to authorize one room participant.';
comment on table together_balance.response is
  'Private answer rows. Browser roles have no grants or RLS read policy.';
comment on table together_balance.feed_share is
  'Typed bridge that keeps recruitment and anonymous result cards separate from legacy feed polls.';

notify pgrst, 'reload schema';

commit;
