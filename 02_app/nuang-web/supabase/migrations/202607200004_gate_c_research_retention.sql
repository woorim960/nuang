create extension if not exists pg_cron;

create or replace function public.purge_expired_gate_c_research()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.research_gate_c_session
  where retention_until <= now();

  get diagnostics deleted_count = row_count;

  if deleted_count > 0 then
    delete from public.research_gate_c_item_review_queue;
    delete from public.research_gate_c_analysis_snapshot;
  end if;

  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_gate_c_research()
from public, anon, authenticated;

select cron.schedule(
  'nuang-gate-c-retention',
  '17 3 * * *',
  'select public.purge_expired_gate_c_research();'
);

comment on function public.purge_expired_gate_c_research() is
  'Deletes expired pseudonymous Gate C sessions daily and invalidates derived aggregates until the next automatic refresh.';
