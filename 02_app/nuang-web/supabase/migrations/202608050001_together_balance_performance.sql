begin;

-- Hot-path lookups that are not covered by the original composite keys.
create index if not exists together_balance_round_item_room_order_idx
  on together_balance.round_item(room_id, round_id, display_order);

create index if not exists together_balance_round_completion_room_participant_idx
  on together_balance.round_completion(room_id, participant_id, round_id);

-- The join screen only needs the immutable pack snapshot already attached to the
-- room. Returning it here avoids loading the full item pool before a participant
-- has joined.
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
    'packTitle', template_version.title_snapshot,
    'packDescription', template_version.description_snapshot,
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

-- Resolve the room, participant, item, and round inside Postgres and delegate to
-- the existing idempotent writer. This replaces the former nine HTTP/database
-- round trips for every answer with one transaction.
create or replace function together_balance.save_response_by_item_key(
  p_join_code_hash text,
  p_join_token_hash text,
  p_item_key text,
  p_option_key text,
  p_idempotency_key uuid,
  p_client_sequence integer,
  p_response_ms integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room_id uuid;
  v_participant_id uuid;
  v_item_id uuid;
  v_round_id uuid;
  v_response_id uuid;
begin
  if p_join_code_hash !~ '^[0-9a-f]{64}$'
     or p_join_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'together_balance_participant_authorization_failed';
  end if;
  if p_option_key not in ('a', 'b') then
    raise exception 'together_balance_response_option_invalid';
  end if;

  select room.id, participant.id
  into v_room_id, v_participant_id
  from together_balance.room
  join together_balance.participant
    on participant.room_id = room.id
    and participant.join_token_hash = p_join_token_hash
    and participant.status in ('joined', 'completed')
  where room.join_code_hash = p_join_code_hash
    and room.initialization_status = 'ready'
    and room.lifecycle_status = 'active'
    and room.expires_at > now();

  if v_room_id is null or v_participant_id is null then
    raise exception 'together_balance_participant_authorization_failed';
  end if;

  select item.id, round_item.round_id
  into v_item_id, v_round_id
  from together_balance.room
  join together_balance.item
    on item.template_version_id = room.template_version_id
    and item.item_key = p_item_key
  join together_balance.round_item
    on round_item.room_id = room.id
    and round_item.item_id = item.id
  join together_balance.round
    on round.id = round_item.round_id
    and round.room_id = room.id
    and round.status in ('open', 'result_open')
  where room.id = v_room_id;

  if v_item_id is null or v_round_id is null then
    raise exception 'together_balance_response_item_not_found';
  end if;

  v_response_id := together_balance.save_response(
    v_room_id,
    v_round_id,
    v_participant_id,
    p_join_token_hash,
    v_item_id,
    p_option_key,
    p_idempotency_key,
    p_client_sequence,
    p_response_ms
  );

  return jsonb_build_object(
    'responseId', v_response_id,
    'roomId', v_room_id,
    'participantId', v_participant_id,
    'itemId', v_item_id,
    'roundId', v_round_id
  );
end;
$$;

-- Complete every unfinished round and the game in the same database transaction.
-- The application only computes a snapshot when this RPC reports that a result
-- can actually be shown.
create or replace function together_balance.complete_participant_game(
  p_join_code_hash text,
  p_join_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, together_balance
as $$
declare
  v_room_id uuid;
  v_participant_id uuid;
  v_template_version_id uuid;
  v_participant_status text;
  v_result_status text;
  v_round record;
begin
  select room.id, participant.id, room.template_version_id, participant.status
  into v_room_id, v_participant_id, v_template_version_id, v_participant_status
  from together_balance.room
  join together_balance.participant
    on participant.room_id = room.id
    and participant.join_token_hash = p_join_token_hash
    and participant.status in ('joined', 'completed')
  where room.join_code_hash = p_join_code_hash
    and room.initialization_status = 'ready'
    and room.lifecycle_status = 'active'
    and room.expires_at > now();

  if v_room_id is null or v_participant_id is null then
    raise exception 'together_balance_participant_authorization_failed';
  end if;

  if v_participant_status <> 'completed' then
    for v_round in
      select round_record.id
      from together_balance.round as round_record
      where round_record.room_id = v_room_id
        and not exists (
          select 1
          from together_balance.round_completion
          where round_completion.round_id = round_record.id
            and round_completion.participant_id = v_participant_id
        )
      order by round_record.round_number
    loop
      perform together_balance.complete_round(
        v_room_id,
        v_round.id,
        v_participant_id,
        p_join_token_hash
      );
    end loop;

    perform together_balance.complete_game(
      v_room_id,
      v_participant_id,
      p_join_token_hash
    );
  end if;

  select result_status
  into v_result_status
  from together_balance.room
  where id = v_room_id;

  return jsonb_build_object(
    'roomId', v_room_id,
    'participantId', v_participant_id,
    'templateVersionId', v_template_version_id,
    'resultStatus', v_result_status
  );
end;
$$;

revoke all on function together_balance.get_room_join_preview(text)
  from public, anon, authenticated;
revoke all on function together_balance.save_response_by_item_key(
  text, text, text, text, uuid, integer, integer
) from public, anon, authenticated;
revoke all on function together_balance.complete_participant_game(text, text)
  from public, anon, authenticated;

grant execute on function together_balance.get_room_join_preview(text)
  to service_role;
grant execute on function together_balance.save_response_by_item_key(
  text, text, text, text, uuid, integer, integer
) to service_role;
grant execute on function together_balance.complete_participant_game(text, text)
  to service_role;

notify pgrst, 'reload schema';

commit;
