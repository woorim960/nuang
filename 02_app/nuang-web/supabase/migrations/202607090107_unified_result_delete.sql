create or replace function report.delete_result_for_account(
  p_account_id uuid,
  p_local_result_id text,
  p_result_report_id uuid
)
returns table (
  deleted boolean,
  deleted_local_result_id text,
  deleted_result_report_id uuid
)
language plpgsql
security definer
set search_path = report, assessment, profile, comparison, sharing, public
as $$
declare
  v_attempt_id uuid;
  v_local_result_id text;
  v_result_report_id uuid;
  v_snapshot_ids uuid[];
begin
  select rr.id, rr.attempt_id, aa.local_result_id
  into v_result_report_id, v_attempt_id, v_local_result_id
  from report.result_report rr
  join assessment.assessment_attempt aa on aa.id = rr.attempt_id
  where rr.account_id = p_account_id
    and aa.account_id = p_account_id
    and rr.deleted_at is null
    and (
      (p_result_report_id is not null and rr.id = p_result_report_id)
      or
      (p_local_result_id is not null and aa.local_result_id = p_local_result_id)
    )
  order by rr.created_at desc
  limit 1;

  if v_result_report_id is null then
    return query
    select false, p_local_result_id, p_result_report_id;
    return;
  end if;

  select array_agg(pps.id)
  into v_snapshot_ids
  from profile.profile_public_snapshot pps
  where pps.result_report_id = v_result_report_id;

  if coalesce(cardinality(v_snapshot_ids), 0) > 0 then
    delete from comparison.public_comparison_report
    where target_public_snapshot_id = any(v_snapshot_ids);
  end if;

  delete from assessment.assessment_attempt
  where id = v_attempt_id
    and account_id = p_account_id;

  return query
  select true, v_local_result_id, v_result_report_id;
end;
$$;

revoke all on function report.delete_result_for_account(uuid, text, uuid)
from public, anon, authenticated;

grant execute on function report.delete_result_for_account(uuid, text, uuid)
to service_role;
