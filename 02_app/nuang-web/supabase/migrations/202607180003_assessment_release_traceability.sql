alter table assessment.assessment_attempt
  add column if not exists measurement_release_id text,
  add column if not exists code_scheme_version text,
  add column if not exists scoring_release_id text;

update assessment.assessment_attempt
set
  measurement_release_id = coalesce(measurement_release_id, item_release_version),
  code_scheme_version = coalesce(code_scheme_version, 'NUANG-CODE-5AXIS-PROVISIONAL-0.9'),
  scoring_release_id = coalesce(
    scoring_release_id,
    case assessment_kind
      when 'full' then 'NUANG-CORE-FULL-SCORING-0.9'
      else 'NUANG-CORE-QUICK-SCORING-0.9'
    end
  )
where
  measurement_release_id is null
  or code_scheme_version is null
  or scoring_release_id is null;

alter table assessment.assessment_attempt
  alter column measurement_release_id set not null,
  alter column code_scheme_version set not null,
  alter column scoring_release_id set not null;

alter table scoring.score_snapshot
  add column if not exists measurement_release_id text,
  add column if not exists code_scheme_version text,
  add column if not exists scoring_release_id text;

update scoring.score_snapshot snapshot
set
  measurement_release_id = attempt.measurement_release_id,
  code_scheme_version = attempt.code_scheme_version,
  scoring_release_id = attempt.scoring_release_id
from assessment.assessment_attempt attempt
where snapshot.attempt_id = attempt.id
  and (
    snapshot.measurement_release_id is null
    or snapshot.code_scheme_version is null
    or snapshot.scoring_release_id is null
  );

alter table scoring.score_snapshot
  alter column measurement_release_id set not null,
  alter column code_scheme_version set not null,
  alter column scoring_release_id set not null;

alter table report.result_report
  add column if not exists measurement_release_id text,
  add column if not exists code_scheme_version text,
  add column if not exists scoring_release_id text;

update report.result_report report
set
  measurement_release_id = attempt.measurement_release_id,
  code_scheme_version = attempt.code_scheme_version,
  scoring_release_id = attempt.scoring_release_id
from assessment.assessment_attempt attempt
where report.attempt_id = attempt.id
  and (
    report.measurement_release_id is null
    or report.code_scheme_version is null
    or report.scoring_release_id is null
  );

alter table report.result_report
  alter column measurement_release_id set not null,
  alter column code_scheme_version set not null,
  alter column scoring_release_id set not null;

create index if not exists assessment_attempt_measurement_release_idx
on assessment.assessment_attempt(measurement_release_id, completed_at desc);

create index if not exists score_snapshot_measurement_release_idx
on scoring.score_snapshot(measurement_release_id, created_at desc);

create index if not exists result_report_measurement_release_idx
on report.result_report(measurement_release_id, created_at desc);
