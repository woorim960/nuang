begin;

create table if not exists assessment.quality_observation (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null,
  observation_index smallint not null check (observation_index between 0 and 39),
  assessment_slug text not null check (assessment_slug ~ '^[a-z0-9-]{2,80}$'),
  instrument_version text not null check (char_length(instrument_version) between 3 and 120),
  local_result_id text null check (char_length(local_result_id) between 6 and 128),
  request_fingerprint text not null
    check (request_fingerprint ~ '^[0-9a-f]{64}$'),
  observation_kind text not null check (observation_kind in ('item_experience', 'result_fit')),
  priority text not null check (priority in ('normal', 'medium', 'high')),
  signal_payload jsonb not null
    check (
      jsonb_typeof(signal_payload) = 'object'
      and octet_length(signal_payload::text) <= 2048
    ),
  review_status text not null default 'queued' check (review_status in ('queued', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (submission_id, observation_index)
);

comment on table assessment.quality_observation is
  'Privacy-minimized, bucketed signals used to improve public assessment items and reports.';

create index if not exists quality_observation_review_queue_idx
  on assessment.quality_observation (review_status, priority, created_at desc);
create index if not exists quality_observation_instrument_idx
  on assessment.quality_observation (assessment_slug, instrument_version, observation_kind);
create index if not exists quality_observation_fingerprint_idx
  on assessment.quality_observation (request_fingerprint, created_at desc);

alter table assessment.quality_observation enable row level security;
revoke all on assessment.quality_observation from public, anon, authenticated;
grant select, insert, update, delete on assessment.quality_observation to service_role;

create or replace view assessment.quality_observation_review_summary
with (security_invoker = true)
as
with normalized as (
  select
    assessment_slug,
    instrument_version,
    observation_kind,
    case
      when observation_kind = 'item_experience'
        then coalesce(signal_payload ->> 'questionId', 'unknown')
      else 'result'
    end as signal_group,
    case
      when observation_kind = 'item_experience' then
        coalesce(signal_payload ->> 'questionId', 'unknown') || ':' ||
        case
          when signal_payload ->> 'response' <> 'answered'
            then signal_payload ->> 'response'
          when signal_payload ->> 'revisionBucket' = 'multiple'
            then 'revised_multiple'
          when signal_payload ->> 'dwellBucket' = 'over_30s'
            then 'dwell_over_30s'
          else 'completed'
        end
      else
        'result:' || coalesce(
          'fit_' || nullif(signal_payload ->> 'fit', ''),
          'helpfulness_' || nullif(signal_payload ->> 'helpfulness', ''),
          'submitted'
        )
    end as signal_key,
    created_at
  from assessment.quality_observation
  where review_status in ('queued', 'reviewing')
),
totals as (
  select
    assessment_slug,
    instrument_version,
    observation_kind,
    signal_group,
    count(*)::bigint as sample_count
  from normalized
  group by assessment_slug, instrument_version, observation_kind, signal_group
),
signals as (
  select
    assessment_slug,
    instrument_version,
    observation_kind,
    signal_group,
    signal_key,
    count(*)::bigint as observation_count,
    min(created_at) as first_seen_at,
    max(created_at) as last_seen_at
  from normalized
  where
    signal_key not like '%:completed'
    and signal_key not in ('result:fit_high', 'result:fit_middle')
  group by
    assessment_slug,
    instrument_version,
    observation_kind,
    signal_group,
    signal_key
),
classified as (
  select
    signals.assessment_slug,
    signals.instrument_version,
    signals.observation_kind,
    signals.signal_key,
    signals.observation_count,
    totals.sample_count,
    round(
      signals.observation_count::numeric / nullif(totals.sample_count, 0),
      4
    ) as observation_rate,
    signals.first_seen_at,
    signals.last_seen_at,
    case
      when totals.sample_count < 30 then 'monitor'
      when
        signals.signal_key like '%:wording_unclear'
        and signals.observation_count >= 5
        and signals.observation_count::numeric / totals.sample_count >= 0.10
        then 'high'
      when
        signals.signal_key like '%:no_experience'
        and signals.observation_count >= 10
        and signals.observation_count::numeric / totals.sample_count >= 0.35
        then 'high'
      when
        signals.signal_key like '%:context_varies'
        and signals.observation_count::numeric / totals.sample_count >= 0.40
        then 'high'
      when
        signals.signal_key like '%:revised_multiple'
        and signals.observation_count::numeric / totals.sample_count >= 0.15
        then 'high'
      when
        signals.signal_key = 'result:fit_low'
        and signals.observation_count >= 10
        and signals.observation_count::numeric / totals.sample_count >= 0.20
        then 'high'
      when
        signals.signal_key like '%:wording_unclear'
        and signals.observation_count >= 5
        and signals.observation_count::numeric / totals.sample_count >= 0.07
        then 'medium'
      when
        signals.signal_key like '%:no_experience'
        and signals.observation_count >= 8
        and signals.observation_count::numeric / totals.sample_count >= 0.28
        then 'medium'
      when
        signals.signal_key like '%:context_varies'
        and signals.observation_count::numeric / totals.sample_count >= 0.32
        then 'medium'
      when
        signals.signal_key like '%:revised_multiple'
        and signals.observation_count::numeric / totals.sample_count >= 0.12
        then 'medium'
      when
        signals.signal_key like '%:dwell_over_30s'
        and signals.observation_count::numeric / totals.sample_count >= 0.15
        then 'medium'
      when
        signals.signal_key = 'result:fit_low'
        and signals.observation_count >= 8
        and signals.observation_count::numeric / totals.sample_count >= 0.15
        then 'medium'
      else 'normal'
    end as priority
  from signals
  inner join totals using (
    assessment_slug,
    instrument_version,
    observation_kind,
    signal_group
  )
)
select
  assessment_slug,
  instrument_version,
  observation_kind,
  signal_key,
  priority,
  case priority
    when 'high' then 3
    when 'medium' then 2
    when 'normal' then 1
    else 0
  end as priority_rank,
  observation_count,
  sample_count,
  observation_rate,
  first_seen_at,
  last_seen_at
from classified;

grant select on assessment.quality_observation_review_summary to service_role;

notify pgrst, 'reload schema';

commit;
