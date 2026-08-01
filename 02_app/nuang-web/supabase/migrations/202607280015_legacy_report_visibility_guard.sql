-- Reports created with the retired five-letter code system remain available
-- to their owner, but must not become public merely because the new profile
-- report visibility table defaults to profile_public.

insert into profile.profile_report_visibility (
  account_id,
  source_kind,
  source_id,
  visibility
)
select
  report.account_id,
  'core',
  report.id,
  'private'
from report.result_report report
where report.deleted_at is null
  and report.profile_code !~ '^[EI][RN][GA][KM][CQ]$'
on conflict (account_id, source_kind, source_id) do nothing;
