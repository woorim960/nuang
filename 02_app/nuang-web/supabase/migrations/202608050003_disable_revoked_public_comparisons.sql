begin;

create or replace function comparison.disable_reports_for_snapshot_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, comparison
as $$
begin
  if old.status is distinct from new.status
     or old.deleted_at is distinct from new.deleted_at
     or old.visibility_policy_version is distinct from new.visibility_policy_version
     or old.snapshot_payload is distinct from new.snapshot_payload then
    update comparison.public_comparison_report
    set
      access_status = 'disabled',
      disabled_at = coalesce(disabled_at, now())
    where target_public_snapshot_id = new.id
      and access_status = 'active'
      and reevaluate_on_visibility_change = true;
  end if;

  return new;
end;
$$;

drop trigger if exists disable_public_comparison_on_snapshot_change
  on profile.profile_public_snapshot;
create trigger disable_public_comparison_on_snapshot_change
after update of status, deleted_at, visibility_policy_version, snapshot_payload
on profile.profile_public_snapshot
for each row
execute function comparison.disable_reports_for_snapshot_change();

create or replace function comparison.disable_reports_for_profile_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, comparison, profile
as $$
begin
  if old.comparison_enabled is distinct from new.comparison_enabled
     or old.code_visibility is distinct from new.code_visibility
     or old.detail_visibility is distinct from new.detail_visibility then
    update comparison.public_comparison_report as comparison_report
    set
      access_status = 'disabled',
      disabled_at = coalesce(comparison_report.disabled_at, now())
    from profile.profile_public_snapshot as target_snapshot
    where target_snapshot.id = comparison_report.target_public_snapshot_id
      and target_snapshot.account_id = new.account_id
      and comparison_report.access_status = 'active'
      and comparison_report.reevaluate_on_visibility_change = true;
  end if;

  return new;
end;
$$;

drop trigger if exists disable_public_comparison_on_profile_change
  on profile.community_profile;
create trigger disable_public_comparison_on_profile_change
after update of comparison_enabled, code_visibility, detail_visibility
on profile.community_profile
for each row
execute function comparison.disable_reports_for_profile_change();

-- Close reports that were already outside the target's current public scope
-- before these triggers existed.
update comparison.public_comparison_report as comparison_report
set
  access_status = 'disabled',
  disabled_at = coalesce(comparison_report.disabled_at, now())
from profile.profile_public_snapshot as target_snapshot
left join profile.community_profile as target_profile
  on target_profile.account_id = target_snapshot.account_id
  and target_profile.status = 'active'
  and target_profile.deleted_at is null
where comparison_report.target_public_snapshot_id = target_snapshot.id
  and comparison_report.access_status = 'active'
  and comparison_report.reevaluate_on_visibility_change = true
  and (
    target_snapshot.status <> 'active'
    or target_snapshot.deleted_at is not null
    or target_profile.account_id is null
    or target_profile.comparison_enabled is not true
    or target_profile.code_visibility <> 'public'
    or target_profile.detail_visibility <> 'public'
  );

revoke all on function comparison.disable_reports_for_snapshot_change()
  from public, anon, authenticated;
revoke all on function comparison.disable_reports_for_profile_change()
  from public, anon, authenticated;
grant execute on function comparison.disable_reports_for_snapshot_change()
  to service_role;
grant execute on function comparison.disable_reports_for_profile_change()
  to service_role;

commit;
