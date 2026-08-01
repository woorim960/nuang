-- Advertising inquiry mail retry scheduler.
--
-- Required Vault secrets (provisioned outside source control):
--   nuang_app_origin                 -> https://nuang.app
--   nuang_ad_outbox_cron_secret      -> same value as Vercel AD_OUTBOX_CRON_SECRET
--
-- The endpoint immediately returns when no pending/retry message is due. The
-- database outbox remains the source of truth for retry timing and locking.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create or replace function public.invoke_advertising_mail_outbox_retry()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  app_origin text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into app_origin
  from vault.decrypted_secrets
  where name = 'nuang_app_origin'
  order by created_at desc
  limit 1;

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'nuang_ad_outbox_cron_secret'
  order by created_at desc
  limit 1;

  app_origin := rtrim(coalesce(app_origin, ''), '/');
  cron_secret := btrim(coalesce(cron_secret, ''));

  if app_origin !~ '^https://[a-z0-9.-]+(?::[0-9]+)?$' then
    raise exception 'nuang_app_origin Vault secret is missing or invalid';
  end if;

  if char_length(cron_secret) < 32 then
    raise exception 'nuang_ad_outbox_cron_secret Vault secret is missing or invalid';
  end if;

  select net.http_post(
    url := app_origin || '/api/internal/advertising/outbox/drain',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_advertising_mail_outbox_retry()
from public, anon, authenticated, service_role;
grant execute on function public.invoke_advertising_mail_outbox_retry()
to postgres;

comment on function public.invoke_advertising_mail_outbox_retry() is
  'Queues the authenticated NUANG advertising mail outbox drain request. The endpoint sends only due pending/retry rows.';

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'nuang-advertising-mail-outbox-retry'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'nuang-advertising-mail-outbox-retry',
    '* * * * *',
    'select public.invoke_advertising_mail_outbox_retry();'
  );
end;
$$;
