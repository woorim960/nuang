drop function if exists public.claim_assessment_result_atomic(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text,
  jsonb,
  jsonb
);

create or replace function public.claim_assessment_result_atomic(
  p_account_id uuid,
  p_local_result_id text,
  p_assessment_slug text,
  p_assessment_kind text,
  p_completed_at timestamptz,
  p_measurement_release_id text,
  p_item_release_version text,
  p_code_scheme_version text,
  p_scoring_release_id text,
  p_scoring_version text,
  p_responses jsonb,
  p_score_payload jsonb,
  p_profile_code text,
  p_profile_name text,
  p_summary jsonb,
  p_share_summary jsonb
)
returns table (
  assessment_attempt_id uuid,
  claimed_at timestamptz,
  result_report_id uuid,
  profile_code text,
  profile_name text
)
language plpgsql
security definer
set search_path = public, identity, assessment, scoring, report, pg_temp
as $$
declare
  v_attempt assessment.assessment_attempt%rowtype;
  v_report report.result_report%rowtype;
  v_response_count integer;
begin
  if p_assessment_kind not in ('quick', 'full') then
    raise exception 'invalid_assessment_kind'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_responses) is distinct from 'array'
    or jsonb_array_length(p_responses) = 0 then
    raise exception 'invalid_assessment_responses'
      using errcode = '22023';
  end if;

  select count(distinct response.value->>'itemId')
    into v_response_count
  from jsonb_array_elements(p_responses) response(value)
  where nullif(btrim(response.value->>'itemId'), '') is not null
    and (
      (
        coalesce((response.value->>'skipped')::boolean, false)
        and response.value->>'value' is null
      )
      or (
        not coalesce((response.value->>'skipped')::boolean, false)
        and (response.value->>'value')::integer between 1 and 5
      )
    );

  if v_response_count <> jsonb_array_length(p_responses) then
    raise exception 'invalid_assessment_responses'
      using errcode = '22023';
  end if;

  select attempt.*
    into v_attempt
  from assessment.assessment_attempt attempt
  where attempt.account_id = p_account_id
    and attempt.local_result_id = p_local_result_id
  limit 1;

  if found then
    select result.*
      into v_report
    from report.result_report result
    where result.account_id = p_account_id
      and result.attempt_id = v_attempt.id
      and result.deleted_at is null
    order by result.created_at desc
    limit 1;

    if not found then
      raise exception 'incomplete_existing_result_claim'
        using errcode = 'P0001';
    end if;

    return query
    select
      v_attempt.id,
      v_attempt.claimed_at,
      v_report.id,
      v_report.profile_code,
      v_report.profile_name;
    return;
  end if;

  begin
    insert into assessment.assessment_attempt (
      account_id,
      assessment_kind,
      assessment_slug,
      claimed_at,
      code_scheme_version,
      completed_at,
      item_release_version,
      local_result_id,
      measurement_release_id,
      scoring_release_id,
      scoring_version,
      status
    )
    values (
      p_account_id,
      p_assessment_kind,
      p_assessment_slug,
      now(),
      p_code_scheme_version,
      p_completed_at,
      p_item_release_version,
      p_local_result_id,
      p_measurement_release_id,
      p_scoring_release_id,
      p_scoring_version,
      'claimed'
    )
    returning * into v_attempt;

    insert into assessment.assessment_response (
      account_id,
      answered_at,
      attempt_id,
      item_id,
      skipped,
      value
    )
    select
      p_account_id,
      (response.value->>'answeredAt')::timestamptz,
      v_attempt.id,
      response.value->>'itemId',
      coalesce((response.value->>'skipped')::boolean, false),
      case
        when coalesce((response.value->>'skipped')::boolean, false) then null
        else (response.value->>'value')::smallint
      end
    from jsonb_array_elements(p_responses) response(value);

    insert into scoring.score_snapshot (
      account_id,
      attempt_id,
      code_scheme_version,
      measurement_release_id,
      score_payload,
      scoring_release_id,
      scoring_version
    )
    values (
      p_account_id,
      v_attempt.id,
      p_code_scheme_version,
      p_measurement_release_id,
      p_score_payload,
      p_scoring_release_id,
      p_scoring_version
    );

    insert into report.result_report (
      account_id,
      attempt_id,
      code_scheme_version,
      measurement_release_id,
      profile_code,
      profile_name,
      report_kind,
      scoring_release_id,
      share_summary,
      summary
    )
    values (
      p_account_id,
      v_attempt.id,
      p_code_scheme_version,
      p_measurement_release_id,
      p_profile_code,
      p_profile_name,
      p_assessment_kind,
      p_scoring_release_id,
      p_share_summary,
      p_summary
    )
    returning * into v_report;
  exception
    when unique_violation then
      select attempt.*
        into v_attempt
      from assessment.assessment_attempt attempt
      where attempt.account_id = p_account_id
        and attempt.local_result_id = p_local_result_id
      limit 1;

      if not found then
        raise;
      end if;

      select result.*
        into v_report
      from report.result_report result
      where result.account_id = p_account_id
        and result.attempt_id = v_attempt.id
        and result.deleted_at is null
      order by result.created_at desc
      limit 1;

      if not found then
        raise exception 'incomplete_concurrent_result_claim'
          using errcode = 'P0001';
      end if;
  end;

  return query
  select
    v_attempt.id,
    v_attempt.claimed_at,
    v_report.id,
    v_report.profile_code,
    v_report.profile_name;
end;
$$;

revoke all on function public.claim_assessment_result_atomic(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.claim_assessment_result_atomic(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb,
  jsonb
) to service_role;

comment on function public.claim_assessment_result_atomic(
  uuid,
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb,
  jsonb
) is
  'Atomically stores one server-scored assessment attempt, its validated response snapshot, score, and report.';
