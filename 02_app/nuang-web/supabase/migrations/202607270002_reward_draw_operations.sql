create table if not exists public.research_gate_c_reward_draw (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null unique,
  entrant_count integer not null check (entrant_count >= 0),
  winner_count integer not null check (winner_count >= 0),
  draw_nonce text not null check (draw_nonce ~ '^[a-f0-9]{64}$'),
  selection_method text not null default 'sha256_nonce_v1'
    check (selection_method in ('sha256_nonce_v1')),
  executed_by_account_id uuid not null references identity.account(id),
  executed_at timestamptz not null default now()
);

alter table public.research_gate_c_reward_draw enable row level security;

revoke all on public.research_gate_c_reward_draw
from public, anon, authenticated;

grant select, insert, update
on public.research_gate_c_reward_draw
to service_role;

comment on table public.research_gate_c_reward_draw is
  'Immutable reward draw receipt. A random nonce and SHA-256 ordering make the selected entry ids reproducible for an audit without exposing member contact data.';

create or replace function public.draw_gate_c_reward_winners(
  p_campaign_id text,
  p_winner_count integer,
  p_admin_account_id uuid
)
returns table (
  draw_id uuid,
  entrant_count integer,
  winner_count integer,
  executed_at timestamptz
)
language plpgsql
security definer
set search_path = public, audit, identity, pg_temp
as $$
declare
  v_draw public.research_gate_c_reward_draw%rowtype;
  v_entrant_count integer;
  v_nonce text;
  v_selected_ids uuid[];
begin
  if p_admin_account_id is null then
    raise exception 'admin account is required';
  end if;
  if p_winner_count < 1 or p_winner_count > 100 then
    raise exception 'winner count must be between 1 and 100';
  end if;

  select *
  into v_draw
  from public.research_gate_c_reward_draw
  where campaign_id = p_campaign_id;

  if found then
    return query
      select v_draw.id, v_draw.entrant_count, v_draw.winner_count, v_draw.executed_at;
    return;
  end if;

  select count(*)
  into v_entrant_count
  from public.research_gate_c_reward_entry
  where campaign_id = p_campaign_id
    and status = 'entered'
    and account_id is not null;

  if v_entrant_count = 0 then
    raise exception 'no eligible reward entries';
  end if;

  v_nonce := encode(gen_random_bytes(32), 'hex');

  select coalesce(array_agg(candidate.id order by candidate.sort_key), '{}'::uuid[])
  into v_selected_ids
  from (
    select
      entry.id,
      digest(entry.id::text || ':' || v_nonce, 'sha256') as sort_key
    from public.research_gate_c_reward_entry entry
    where entry.campaign_id = p_campaign_id
      and entry.status = 'entered'
      and entry.account_id is not null
    order by sort_key
    limit least(p_winner_count, v_entrant_count)
  ) candidate;

  insert into public.research_gate_c_reward_draw (
    campaign_id,
    entrant_count,
    winner_count,
    draw_nonce,
    executed_by_account_id
  )
  values (
    p_campaign_id,
    v_entrant_count,
    cardinality(v_selected_ids),
    v_nonce,
    p_admin_account_id
  )
  returning * into v_draw;

  update public.research_gate_c_reward_entry
  set
    status = case
      when id = any(v_selected_ids) then 'winner'
      else 'not_selected'
    end,
    updated_at = now()
  where campaign_id = p_campaign_id
    and status = 'entered';

  insert into audit.admin_audit_log (
    admin_account_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    p_admin_account_id,
    'reward_draw_executed',
    'public.research_gate_c_reward_draw',
    v_draw.id,
    jsonb_build_object(
      'campaign_id', p_campaign_id,
      'entrant_count', v_draw.entrant_count,
      'winner_count', v_draw.winner_count,
      'selection_method', v_draw.selection_method
    )
  );

  return query
    select v_draw.id, v_draw.entrant_count, v_draw.winner_count, v_draw.executed_at;
end;
$$;

revoke all on function public.draw_gate_c_reward_winners(text, integer, uuid)
from public, anon, authenticated;

grant execute on function public.draw_gate_c_reward_winners(text, integer, uuid)
to service_role;
