begin;

create extension if not exists pg_cron with schema extensions;

create or replace function public.purge_expired_privacy_data(
  target_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, together_balance
as $$
declare
  v_ad_events bigint;
  v_ad_feedback bigint;
  v_ad_metrics bigint;
  v_ad_inquiries bigint;
  v_balance_rooms bigint;
  v_email_challenges bigint;
  v_link_intents bigint;
  v_phone_challenges bigint;
begin
  delete from identity.identity_link_intent
  where expires_at <= target_now;
  get diagnostics v_link_intents = row_count;

  delete from identity.email_verification_challenge
  where expires_at <= target_now;
  get diagnostics v_email_challenges = row_count;

  delete from identity.phone_verification_challenge
  where expires_at <= target_now;
  get diagnostics v_phone_challenges = row_count;

  delete from together_balance.room
  where expires_at <= target_now;
  get diagnostics v_balance_rooms = row_count;

  delete from public.advertising_event
  where occurred_at < target_now - interval '30 days';
  get diagnostics v_ad_events = row_count;

  delete from public.advertising_feedback
  where created_at < target_now - interval '30 days';
  get diagnostics v_ad_feedback = row_count;

  delete from public.advertising_metric_daily
  where metric_date < (target_now - interval '13 months')::date;
  get diagnostics v_ad_metrics = row_count;

  delete from public.advertising_inquiry
  where
    (status = 'spam' and closed_at < target_now - interval '90 days')
    or (
      status in ('closed', 'rejected')
      and closed_at < target_now - interval '1 year'
    );
  get diagnostics v_ad_inquiries = row_count;

  return jsonb_build_object(
    'advertisingEvents', v_ad_events,
    'advertisingFeedback', v_ad_feedback,
    'advertisingInquiries', v_ad_inquiries,
    'advertisingMetrics', v_ad_metrics,
    'balanceRooms', v_balance_rooms,
    'emailChallenges', v_email_challenges,
    'identityLinkIntents', v_link_intents,
    'phoneChallenges', v_phone_challenges
  );
end;
$$;

revoke all on function public.purge_expired_privacy_data(timestamptz)
from public, anon, authenticated;
grant execute on function public.purge_expired_privacy_data(timestamptz)
to service_role, postgres;

comment on function public.purge_expired_privacy_data(timestamptz) is
  'Daily physical deletion for expired auth intents, balance rooms, advertising raw events and closed non-contract inquiries. Contracted inquiries are intentionally excluded.';

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'nuang-privacy-retention-prune'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'nuang-privacy-retention-prune',
    '41 19 * * *',
    'select public.purge_expired_privacy_data(now());'
  );
end;
$$;

commit;
