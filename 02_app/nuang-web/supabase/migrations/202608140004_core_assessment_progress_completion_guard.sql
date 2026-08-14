-- Re-versioned after the production history audit found this guard unapplied.
-- A completed cross-device snapshot is historical evidence. It may be
-- soft-deleted by account/result lifecycle work, but its answers, release and
-- completion state must never be rewritten by a stale or compromised client.

create or replace function assessment.guard_completed_assessment_progress()
returns trigger
language plpgsql
set search_path = assessment, public, pg_temp
as $$
begin
  if old.state = 'completed'
    and (
      new.attempt_payload is distinct from old.attempt_payload
      or new.assessment_id is distinct from old.assessment_id
      or new.assessment_mode is distinct from old.assessment_mode
      or new.client_attempt_id is distinct from old.client_attempt_id
      or new.client_created_at is distinct from old.client_created_at
      or new.client_updated_at is distinct from old.client_updated_at
      or new.completed_at is distinct from old.completed_at
      or new.release_id is distinct from old.release_id
      or new.state is distinct from old.state
    ) then
    raise exception 'core_assessment_progress_revision_conflict'
      using errcode = '40001';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_completed_assessment_progress
on assessment.account_assessment_progress;

create trigger guard_completed_assessment_progress
before update on assessment.account_assessment_progress
for each row
execute function assessment.guard_completed_assessment_progress();

revoke all on function assessment.guard_completed_assessment_progress()
from public, anon, authenticated;

grant execute on function assessment.guard_completed_assessment_progress()
to service_role;

comment on function assessment.guard_completed_assessment_progress() is
  'Prevents completed account progress snapshots from being rewritten or regressed while allowing lifecycle soft deletion.';
