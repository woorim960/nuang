begin;

create extension if not exists pg_cron with schema extensions;

-- pg_cron does not prune cron.job_run_details automatically. Keep enough
-- history for incident review while preventing one-minute jobs from growing
-- the free-tier database indefinitely. The pg_cron schedule uses UTC, so
-- 19:07 UTC runs at 04:07 KST on the following calendar day.
do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'nuang-cron-run-history-prune'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'nuang-cron-run-history-prune',
    '7 19 * * *',
    $command$
      delete from cron.job_run_details
      where end_time < now() - interval '14 days';
    $command$
  );
end;
$$;

commit;
