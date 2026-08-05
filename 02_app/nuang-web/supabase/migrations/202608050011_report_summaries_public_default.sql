begin;

-- Regular assessment result summaries are social profile content by default.
-- Direct responses, raw scores, sensitive assessments, identity and help records
-- remain private and are never copied into the public report projection.
alter table profile.profile_report_visibility
  alter column visibility set default 'profile_public';

comment on table profile.profile_report_visibility is
  'Explicit per-report opt-out. Missing rows mean profile_public for core, topic, and lab result summaries; an explicit private row always wins.';

update profile.profile_visibility_setting
set
  policy_version = 'profile-visibility.v0.2',
  visibility = 'public',
  updated_at = now()
where field_id in ('quick_core_result', 'lab_results')
  and visibility = 'private';

create or replace function profile.save_community_profile_visibility(
  p_account_id uuid,
  p_code_visible boolean,
  p_details_visible boolean,
  p_comparison_enabled boolean,
  p_expected_revision integer,
  p_policy_version text
)
returns table(revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_included_fields jsonb;
  v_revision integer;
begin
  if not p_code_visible and p_details_visible then
    raise exception 'INVALID_VISIBILITY_DEPENDENCY';
  end if;

  if not p_details_visible and p_comparison_enabled then
    raise exception 'INVALID_COMPARISON_DEPENDENCY';
  end if;

  update profile.community_profile
  set
    code_visibility = case when p_code_visible then 'public' else 'private' end,
    detail_visibility = case when p_details_visible then 'public' else 'private' end,
    comparison_enabled = p_comparison_enabled,
    revision = profile.community_profile.revision + 1,
    updated_at = now()
  where account_id = p_account_id
    and revision = p_expected_revision
    and deleted_at is null
  returning profile.community_profile.revision into v_revision;

  if v_revision is null then
    raise exception 'REVISION_CONFLICT';
  end if;

  insert into profile.profile_visibility_setting (
    account_id,
    policy_version,
    field_id,
    visibility,
    comparison_use,
    updated_at
  )
  select
    p_account_id,
    p_policy_version,
    setting.field_id,
    setting.visibility,
    setting.comparison_use,
    now()
  from (
    values
      ('display_profile', 'public', 'allowed'),
      ('representative_profile', case when p_code_visible then 'public' else 'private' end, 'allowed'),
      ('core_domain_map', case when p_details_visible then 'public' else 'private' end, 'allowed'),
      ('core_facet_summary', case when p_details_visible then 'public' else 'private' end, 'allowed'),
      ('quick_core_result', 'public', 'hidden'),
      ('lab_results', 'public', 'hidden'),
      ('direct_responses', 'private', 'blocked'),
      ('raw_scores', 'private', 'blocked'),
      ('sensitive_assessments', 'private', 'blocked'),
      ('crisis_help_interactions', 'private', 'blocked'),
      ('demographics', 'private', 'hidden'),
      ('account_identity', 'private', 'blocked')
  ) as setting(field_id, visibility, comparison_use)
  on conflict (account_id, field_id) do update
  set
    policy_version = excluded.policy_version,
    visibility = excluded.visibility,
    comparison_use = excluded.comparison_use,
    updated_at = excluded.updated_at;

  v_included_fields := jsonb_build_array('display_profile');
  if p_code_visible then
    v_included_fields := v_included_fields || jsonb_build_array('representative_profile');
  end if;
  if p_details_visible then
    v_included_fields := v_included_fields || jsonb_build_array('core_domain_map', 'core_facet_summary');
  end if;

  update profile.profile_public_snapshot
  set
    visibility_policy_version = p_policy_version,
    snapshot_payload = jsonb_set(
      snapshot_payload,
      '{visibility,includedFields}',
      v_included_fields,
      true
    )
  where account_id = p_account_id
    and status = 'active'
    and deleted_at is null;

  insert into audit.visibility_audit_event (
    account_id,
    actor_account_id,
    event_type,
    target_table,
    target_id,
    metadata
  )
  select
    p_account_id,
    p_account_id,
    'profile_visibility_updated',
    'profile.community_profile',
    community_profile.id,
    jsonb_build_object(
      'policyVersion', p_policy_version,
      'codeVisible', p_code_visible,
      'detailsVisible', p_details_visible,
      'comparisonEnabled', p_comparison_enabled,
      'revision', v_revision
    )
  from profile.community_profile as community_profile
  where community_profile.account_id = p_account_id;

  return query select v_revision;
end;
$$;

revoke all on function profile.save_community_profile_visibility(uuid, boolean, boolean, boolean, integer, text) from public;
grant execute on function profile.save_community_profile_visibility(uuid, boolean, boolean, boolean, integer, text) to service_role;

notify pgrst, 'reload schema';

commit;
