create unique index if not exists assessment_attempt_account_local_result_unique_idx
on assessment.assessment_attempt(account_id, local_result_id)
where local_result_id is not null;
