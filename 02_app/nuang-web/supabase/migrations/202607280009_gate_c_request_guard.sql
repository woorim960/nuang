begin;

create table if not exists public.research_gate_c_request_bucket (
  subject_hash text not null,
  action text not null
    check (action in ('start_session', 'complete_session', 'withdraw_submission')),
  bucket_kind text not null check (bucket_kind in ('ten_minute', 'day')),
  bucket_start timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (subject_hash, action, bucket_kind, bucket_start)
);

alter table public.research_gate_c_request_bucket enable row level security;

revoke all on table public.research_gate_c_request_bucket
from public, anon, authenticated;
grant select, insert, update, delete
on table public.research_gate_c_request_bucket to service_role;

create or replace function public.check_gate_c_request_guard(
  p_subject_hash text,
  p_action text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_short_limit integer;
  v_daily_limit integer;
  v_short_count integer;
  v_daily_count integer;
  v_short_start timestamptz;
  v_day_start timestamptz;
begin
  if p_subject_hash is null
    or char_length(p_subject_hash) <> 64
    or p_subject_hash !~ '^[0-9a-f]+$' then
    return 'invalid_subject';
  end if;

  case p_action
    when 'start_session' then
      v_short_limit := 5;
      v_daily_limit := 20;
    when 'complete_session' then
      v_short_limit := 10;
      v_daily_limit := 30;
    when 'withdraw_submission' then
      v_short_limit := 5;
      v_daily_limit := 10;
    else
      return 'invalid_action';
  end case;

  v_short_start := to_timestamp(
    floor(extract(epoch from now()) / 600) * 600
  );
  v_day_start := date_trunc('day', now());

  insert into public.research_gate_c_request_bucket (
    subject_hash,
    action,
    bucket_kind,
    bucket_start,
    request_count,
    updated_at
  )
  values (
    p_subject_hash,
    p_action,
    'ten_minute',
    v_short_start,
    1,
    now()
  )
  on conflict (subject_hash, action, bucket_kind, bucket_start)
  do update set
    request_count = public.research_gate_c_request_bucket.request_count + 1,
    updated_at = now()
  returning request_count into v_short_count;

  insert into public.research_gate_c_request_bucket (
    subject_hash,
    action,
    bucket_kind,
    bucket_start,
    request_count,
    updated_at
  )
  values (
    p_subject_hash,
    p_action,
    'day',
    v_day_start,
    1,
    now()
  )
  on conflict (subject_hash, action, bucket_kind, bucket_start)
  do update set
    request_count = public.research_gate_c_request_bucket.request_count + 1,
    updated_at = now()
  returning request_count into v_daily_count;

  delete from public.research_gate_c_request_bucket
  where bucket_start < now() - interval '8 days';

  if v_short_count > v_short_limit or v_daily_count > v_daily_limit then
    return 'rate_limited';
  end if;

  return null;
end;
$$;

revoke all on function public.check_gate_c_request_guard(text, text)
from public, anon, authenticated;
grant execute on function public.check_gate_c_request_guard(text, text)
to service_role;

comment on table public.research_gate_c_request_bucket is
  'Hashed, short-lived request counters for anonymous Gate C abuse protection. It stores no raw IP address or research response.';
comment on function public.check_gate_c_request_guard(text, text) is
  'Applies ten-minute and daily anonymous Gate C request quotas. Service-role only.';

notify pgrst, 'reload schema';

commit;
