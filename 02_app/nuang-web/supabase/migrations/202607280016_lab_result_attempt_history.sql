-- Preserve every odd-trait lab completion as an append-only result.
-- Migration 014 initially used one row per (account, lab slug). This follow-up
-- gives every completion a stable client-generated idempotency key instead.

alter table assessment.lab_result
  add column if not exists local_result_id text;

-- Existing rows predate client result ids. Give each one a deterministic,
-- collision-free legacy id so the new not-null and unique constraints can be
-- applied without rewriting or deleting the original result.
update assessment.lab_result
set local_result_id = 'legacy_lab_' || id::text
where local_result_id is null
   or btrim(local_result_id) = '';

alter table assessment.lab_result
  alter column local_result_id set not null;

alter table assessment.lab_result
  drop constraint if exists lab_result_account_id_lab_slug_key;

alter table assessment.lab_result
  drop constraint if exists lab_result_local_result_id_check;

alter table assessment.lab_result
  add constraint lab_result_local_result_id_check
  check (
    char_length(local_result_id) between 8 and 128
    and local_result_id = btrim(local_result_id)
  );

alter table assessment.lab_result
  drop constraint if exists lab_result_account_local_result_key;

alter table assessment.lab_result
  add constraint lab_result_account_local_result_key
  unique (account_id, local_result_id);

create index if not exists lab_result_account_slug_completed_idx
on assessment.lab_result(account_id, lab_slug, completed_at desc)
where deleted_at is null;

comment on column assessment.lab_result.local_result_id is
  'Client-generated idempotency key created once per completed lab attempt. Re-sending the same completion updates only that attempt; a retest creates a new row.';
