begin;

-- Keep the one-minute retry cadence while avoiding an external serverless
-- invocation when the indexed outbox has no due work. A zero return value means
-- that no pg_net request was queued.
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
  if not exists (
    select 1
    from public.advertising_mail_outbox as outbox
    where (
        (
          outbox.status in ('pending', 'retry')
          and outbox.next_attempt_at <= now()
        )
        or (
          outbox.status = 'sending'
          and outbox.claimed_at < now() - interval '15 minutes'
        )
      )
      and outbox.attempt_count < 5
  ) then
    return 0;
  end if;

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

-- Marketing also prepares biennial consent confirmations in the HTTP worker.
-- The final EXISTS branch preserves that behavior by invoking the worker when
-- a confirmation is due but has not been materialized in the outbox yet.
create or replace function public.invoke_marketing_email_outbox_drain()
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, consent, vault, net
as $$
declare
  app_origin text;
  cron_secret text;
  request_id bigint;
begin
  if (now() at time zone 'Asia/Seoul')::time < time '08:00'
    or (now() at time zone 'Asia/Seoul')::time >= time '21:00' then
    return 0;
  end if;

  if exists (
    select 1
    from consent.marketing_channel_control
    where channel = 'email'
      and emergency_paused = true
  ) then
    return 0;
  end if;

  if not (
    exists (
      select 1
      from consent.marketing_campaign_recipient as recipient
      join consent.marketing_campaign as campaign
        on campaign.id = recipient.campaign_id
      where campaign.status in ('queued', 'sending')
        and recipient.control_version = campaign.control_version
        and coalesce(campaign.scheduled_at, now()) <= now()
        and (
          (
            recipient.status in ('queued', 'retry')
            and recipient.next_attempt_at <= now()
          )
          or (
            recipient.status = 'sending'
            and recipient.claimed_at < now() - interval '15 minutes'
          )
        )
        and recipient.attempt_count < 5
    )
    or exists (
      select 1
      from consent.marketing_consent_confirmation_outbox as outbox
      where (
          (
            outbox.status in ('queued', 'retry')
            and outbox.next_attempt_at <= now()
          )
          or (
            outbox.status = 'sending'
            and outbox.claimed_at < now() - interval '15 minutes'
          )
        )
        and outbox.attempt_count < 5
    )
    or exists (
      select 1
      from consent.resolve_marketing_audience('email') as audience
      cross join lateral (
        select coalesce(
          max(outbox.sent_at),
          audience.consent_recorded_at
        ) as last_notice_at
        from consent.marketing_consent_confirmation_outbox as outbox
        where outbox.account_id = audience.account_id
          and outbox.status in ('sent', 'delivered')
      ) as anchor
      where anchor.last_notice_at <= now() - interval '2 years'
        and not exists (
          select 1
          from consent.marketing_consent_confirmation_outbox as existing
          where existing.account_id = audience.account_id
            and existing.cycle_due_on =
              (anchor.last_notice_at + interval '2 years')::date
        )
    )
  ) then
    return 0;
  end if;

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
    url := app_origin || '/api/internal/marketing/outbox/drain',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret,
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function public.invoke_marketing_email_outbox_drain()
from public, anon, authenticated, service_role;
grant execute on function public.invoke_marketing_email_outbox_drain()
to postgres;

commit;
