create or replace function comparison.create_public_comparison_report(
  p_id uuid,
  p_viewer_account_id uuid,
  p_viewer_result_report_id uuid,
  p_viewer_public_snapshot_id uuid,
  p_target_public_snapshot_id uuid,
  p_policy_version text,
  p_report_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_account_id uuid;
begin
  select target_snapshot.account_id
  into v_target_account_id
  from profile.profile_public_snapshot as target_snapshot
  join profile.community_profile as target_profile
    on target_profile.account_id = target_snapshot.account_id
   and target_profile.status = 'active'
   and target_profile.deleted_at is null
   and target_profile.comparison_enabled is true
   and target_profile.code_visibility = 'public'
   and target_profile.detail_visibility = 'public'
  where target_snapshot.id = p_target_public_snapshot_id
    and target_snapshot.status = 'active'
    and target_snapshot.deleted_at is null
    and target_snapshot.visibility_policy_version = p_policy_version;

  if v_target_account_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'target_comparison_scope_missing';
  end if;

  if not exists (
    select 1
    from report.result_report as viewer_report
    where viewer_report.id = p_viewer_result_report_id
      and viewer_report.account_id = p_viewer_account_id
      and viewer_report.report_kind = 'full'
      and viewer_report.deleted_at is null
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'viewer_full_core_missing';
  end if;

  if not exists (
    select 1
    from profile.profile_public_snapshot as viewer_snapshot
    where viewer_snapshot.id = p_viewer_public_snapshot_id
      and viewer_snapshot.account_id = p_viewer_account_id
      and viewer_snapshot.result_report_id = p_viewer_result_report_id
      and viewer_snapshot.status = 'active'
      and viewer_snapshot.deleted_at is null
      and viewer_snapshot.visibility_policy_version = p_policy_version
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'viewer_comparison_scope_missing';
  end if;

  insert into comparison.public_comparison_report (
    id,
    viewer_account_id,
    viewer_result_report_id,
    viewer_public_snapshot_id,
    target_public_snapshot_id,
    policy_version,
    report_payload
  ) values (
    p_id,
    p_viewer_account_id,
    p_viewer_result_report_id,
    p_viewer_public_snapshot_id,
    p_target_public_snapshot_id,
    p_policy_version,
    p_report_payload
  );

  insert into audit.visibility_audit_event (
    account_id,
    actor_account_id,
    event_type,
    target_table,
    target_id,
    metadata
  ) values (
    v_target_account_id,
    p_viewer_account_id,
    'public_comparison_created',
    'profile.profile_public_snapshot',
    p_target_public_snapshot_id,
    jsonb_build_object(
      'comparisonReportId', p_id,
      'policyVersion', p_policy_version
    )
  );

  return p_id;
end;
$$;

revoke all on function comparison.create_public_comparison_report(uuid, uuid, uuid, uuid, uuid, text, jsonb) from public;
grant execute on function comparison.create_public_comparison_report(uuid, uuid, uuid, uuid, uuid, text, jsonb) to service_role;

notify pgrst, 'reload schema';
