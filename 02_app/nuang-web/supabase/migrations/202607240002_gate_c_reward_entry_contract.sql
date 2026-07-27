create table if not exists public.research_gate_c_reward_entry (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null check (char_length(campaign_id) between 3 and 80),
  receipt_lookup_hash text not null
    check (receipt_lookup_hash ~ '^[a-f0-9]{64}$'),
  contact_method text not null
    check (contact_method in ('mobile_phone', 'email')),
  contact_ciphertext text not null
    check (char_length(contact_ciphertext) between 40 and 1000),
  contact_lookup_hash text not null
    check (contact_lookup_hash ~ '^[a-f0-9]{64}$'),
  consent_version text not null,
  consent_recorded_at timestamptz not null default now(),
  status text not null default 'entered'
    check (status in (
      'entered',
      'winner',
      'not_selected',
      'contacted',
      'invalid',
      'withdrawn'
    )),
  withdrawal_secret_hash text not null
    check (withdrawal_secret_hash ~ '^[a-f0-9]{64}$'),
  retention_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, receipt_lookup_hash),
  unique (campaign_id, contact_lookup_hash)
);

create index if not exists research_gate_c_reward_retention_idx
on public.research_gate_c_reward_entry (retention_until);

create index if not exists research_gate_c_reward_status_idx
on public.research_gate_c_reward_entry (campaign_id, status, created_at);

alter table public.research_gate_c_reward_entry enable row level security;

revoke all on public.research_gate_c_reward_entry
from public, anon, authenticated;

grant select, insert, update, delete
on public.research_gate_c_reward_entry
to service_role;

comment on table public.research_gate_c_reward_entry is
  'Campaign contact store separated from Gate C responses. It stores only keyed receipt/contact hashes and encrypted contact data; it never stores raw responses, participant codes, or public receipt ids.';

create or replace function public.purge_expired_gate_c_reward_entries()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.research_gate_c_reward_entry
  where retention_until <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_gate_c_reward_entries()
from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from cron.job
    where jobname = 'nuang-gate-c-reward-retention'
  ) then
    perform cron.schedule(
      'nuang-gate-c-reward-retention',
      '29 3 * * *',
      'select public.purge_expired_gate_c_reward_entries();'
    );
  end if;
end;
$$;
