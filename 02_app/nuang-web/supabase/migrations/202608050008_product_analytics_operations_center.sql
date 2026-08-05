begin;

create index if not exists product_analytics_event_window_area_idx
  on consent.product_analytics_event (occurred_at desc, area, account_id);

-- Keep collection aligned with the exact optional-consent version understood by
-- the application. A stale materialized boolean must never authorize a write.
create or replace function consent.record_product_screen_view(
  p_account_id uuid,
  p_area text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, consent, identity, pg_temp
as $$
declare
  v_now timestamptz := statement_timestamp();
begin
  if p_area not in (
    'home', 'assessment', 'result', 'community', 'trait_map',
    'my', 'together', 'settings', 'other'
  ) then
    return 'invalid_area';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_account_id::text || ':screen_view:' || p_area, 0)
  );

  perform 1
    from identity.account account
    join consent.age_and_consent_status status
      on status.account_id = account.id
    where account.id = p_account_id
      and account.status = 'active'
      and account.deleted_at is null
      and status.analytics_opt_in = true
      and status.analytics_consent_version =
        'NUANG-ANALYTICS-PREFERENCE-2026-08-03'
    for share of account, status;

  if not found then
    return 'not_allowed';
  end if;

  if exists (
    select 1
    from consent.product_analytics_event event
    where event.account_id = p_account_id
      and event.event_name = 'screen_view'
      and event.area = p_area
      and event.occurred_at >= v_now - interval '5 minutes'
  ) then
    return 'duplicate';
  end if;

  insert into consent.product_analytics_event (
    account_id,
    event_name,
    area,
    occurred_at
  ) values (
    p_account_id,
    'screen_view',
    p_area,
    v_now
  );

  return 'recorded';
end;
$$;

create or replace function consent.enforce_quality_observation_analytics_consent()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, consent, identity, assessment, pg_temp
as $$
begin
  if new.account_id is null then
    raise exception 'analytics_consent_required' using errcode = '42501';
  end if;

  perform 1
  from identity.account account
  join consent.age_and_consent_status status
    on status.account_id = account.id
  where account.id = new.account_id
    and account.status = 'active'
    and account.deleted_at is null
    and status.analytics_opt_in = true
    and status.analytics_consent_version =
      'NUANG-ANALYTICS-PREFERENCE-2026-08-03'
  for share of account, status;

  if not found then
    raise exception 'analytics_consent_required' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function consent.admin_product_analytics_snapshot(
  target_admin_account_id uuid,
  target_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, consent, identity, assessment, report, sharing,
  comparison, public, pg_temp
as $$
declare
  v_now timestamptz := statement_timestamp();
  v_since timestamptz;
begin
  if target_days not in (7, 30, 90) then
    raise exception 'unsupported_analytics_window' using errcode = '22023';
  end if;

  if target_admin_account_id is null or not exists (
    select 1
    from identity.account account
    join identity.operator_account operator
      on operator.account_id = account.id
    where account.id = target_admin_account_id
      and account.status = 'active'
      and account.deleted_at is null
  ) then
    raise exception 'active_product_analytics_operator_required'
      using errcode = '42501';
  end if;

  v_since := date_trunc('day', v_now)
    - make_interval(days => target_days - 1);

  return (
    with eligible_accounts as (
      select account.id, account.created_at
      from identity.account account
      join consent.age_and_consent_status status
        on status.account_id = account.id
      where account.status = 'active'
        and account.deleted_at is null
        and status.analytics_opt_in = true
        and status.analytics_consent_version =
          'NUANG-ANALYTICS-PREFERENCE-2026-08-03'
    ), window_events as (
      select event.account_id, event.area, event.occurred_at
      from consent.product_analytics_event event
      join eligible_accounts eligible on eligible.id = event.account_id
      where event.event_name = 'screen_view'
        and event.occurred_at >= v_since
        and event.occurred_at <= v_now
    ), repeat_accounts as (
      select event.account_id
      from window_events event
      group by event.account_id
      having count(distinct event.occurred_at::date) >= 2
    ), new_eligible_accounts as (
      select eligible.id, eligible.created_at
      from eligible_accounts eligible
      where eligible.created_at >= v_since
        and eligible.created_at <= v_now
    ), completed_attempts as (
      select attempt.account_id,
        coalesce(attempt.completed_at, attempt.claimed_at) as completed_at
      from assessment.assessment_attempt attempt
      join eligible_accounts eligible on eligible.id = attempt.account_id
      where attempt.status in ('completed', 'claimed')
        and coalesce(attempt.completed_at, attempt.claimed_at) >= v_since
        and coalesce(attempt.completed_at, attempt.claimed_at) <= v_now
    ), activated_accounts as (
      select distinct account.id
      from new_eligible_accounts account
      join assessment.assessment_attempt attempt
        on attempt.account_id = account.id
      where attempt.status in ('completed', 'claimed')
        and coalesce(attempt.completed_at, attempt.claimed_at)
          between account.created_at and account.created_at + interval '24 hours'
    ), shared_accounts as (
      select distinct share.account_id
      from sharing.share_link share
      join eligible_accounts eligible on eligible.id = share.account_id
      where share.created_at >= v_since
        and share.created_at <= v_now
    ), compared_accounts as (
      select distinct comparison.viewer_account_id as account_id
      from comparison.public_comparison_report comparison
      join eligible_accounts eligible
        on eligible.id = comparison.viewer_account_id
      where comparison.created_at >= v_since
        and comparison.created_at <= v_now
        and comparison.deleted_at is null
    ), result_feedback as (
      select feedback.sentiment
      from report.core_result_feedback feedback
      join eligible_accounts eligible on eligible.id = feedback.account_id
      where feedback.created_at >= v_since
        and feedback.created_at <= v_now
    ), product_feedback as (
      select feedback.kind
      from public.product_feedback feedback
      where feedback.created_at >= v_since
        and feedback.created_at <= v_now
    ), area_stats as (
      select
        event.area,
        count(*)::bigint as views,
        count(distinct event.account_id)::bigint as unique_accounts
      from window_events event
      group by event.area
    ), days as (
      select generate_series(
        v_since::date,
        date_trunc('day', v_now)::date,
        interval '1 day'
      )::date as day
    ), daily_stats as (
      select
        day.day,
        count(event.account_id)::bigint as views,
        count(distinct event.account_id)::bigint as unique_accounts
      from days day
      left join window_events event
        on event.occurred_at >= day.day::timestamptz
        and event.occurred_at < (day.day + 1)::timestamptz
      group by day.day
      order by day.day
    )
    select jsonb_build_object(
      'schemaVersion', 1,
      'generatedAt', v_now,
      'windowDays', target_days,
      'retentionDays', 90,
      'summary', jsonb_build_object(
        'eligibleAccounts', (select count(*) from eligible_accounts),
        'newEligibleAccounts', (select count(*) from new_eligible_accounts),
        'activeAccounts', (select count(distinct account_id) from window_events),
        'totalScreenViews', (select count(*) from window_events),
        'repeatAccounts', (select count(*) from repeat_accounts),
        'assessmentViewers', (
          select count(distinct account_id)
          from window_events where area = 'assessment'
        ),
        'resultViewers', (
          select count(distinct account_id)
          from window_events where area = 'result'
        ),
        'completedAccounts', (
          select count(distinct account_id) from completed_attempts
        ),
        'completedAttempts', (select count(*) from completed_attempts),
        'activatedAccounts', (select count(*) from activated_accounts),
        'sharedAccounts', (select count(*) from shared_accounts),
        'comparedAccounts', (select count(*) from compared_accounts),
        'resultFeedbackCount', (select count(*) from result_feedback),
        'resultFitCount', (
          select count(*) from result_feedback where sentiment = 'fit'
        ),
        'resultDependsCount', (
          select count(*) from result_feedback where sentiment = 'depends'
        ),
        'resultNotFitCount', (
          select count(*) from result_feedback where sentiment = 'not_fit'
        ),
        'bugFeedbackCount', (
          select count(*) from product_feedback where kind = 'bug'
        ),
        'usabilityFeedbackCount', (
          select count(*) from product_feedback where kind = 'usability'
        ),
        'ideaFeedbackCount', (
          select count(*) from product_feedback where kind = 'idea'
        ),
        'lastEventAt', (select max(occurred_at) from window_events)
      ),
      'areas', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'area', area.area,
            'views', area.views,
            'uniqueAccounts', area.unique_accounts
          )
          order by area.views desc, area.area
        )
        from area_stats area
      ), '[]'::jsonb),
      'daily', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'day', daily.day,
            'views', daily.views,
            'uniqueAccounts', daily.unique_accounts
          )
          order by daily.day
        )
        from daily_stats daily
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function consent.admin_product_analytics_snapshot(uuid, integer)
  from public, anon, authenticated;
grant execute on function consent.admin_product_analytics_snapshot(uuid, integer)
  to service_role;

comment on function consent.admin_product_analytics_snapshot(uuid, integer) is
  'Operator-only aggregate product analytics snapshot. Returns no account identifiers, paths, answers, result payloads, content, IP addresses or user agents.';

notify pgrst, 'reload schema';

commit;
