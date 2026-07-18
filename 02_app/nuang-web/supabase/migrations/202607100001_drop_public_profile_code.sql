-- Public code was removed from the product UX.
-- Run this only after approving DB cleanup for an existing development database.

alter table if exists comparison.public_comparison_report
  drop column if exists target_public_code_id;

drop table if exists profile.profile_public_code cascade;

alter table if exists audit.visibility_audit_event
  drop constraint if exists visibility_audit_event_event_type_check;

alter table if exists audit.visibility_audit_event
  add constraint visibility_audit_event_event_type_check
  check (
    event_type in (
      'profile_visibility_updated',
      'public_snapshot_created',
      'public_snapshot_revoked',
      'public_profile_resolved',
      'public_comparison_created',
      'out_of_scope_access_blocked'
    )
  );
