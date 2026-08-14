begin;

set local lock_timeout = '5s';

-- A trigger RECORD only exposes columns from its current table. A CASE that
-- mentions both client_attempt_id and local_result_id can therefore fail at
-- runtime even when the logically selected branch uses the valid column.
-- Resolve the table first and only then access fields that exist on its shape.
create or replace function assessment.guard_result_deletion_tombstone()
returns trigger
language plpgsql
set search_path = pg_catalog, assessment
as $$
declare
  v_kind text;
  v_local_result_id text;
  v_old_local_result_id text;
begin
  if tg_table_name = 'account_assessment_progress' then
    v_kind := 'core';
    v_local_result_id := new.client_attempt_id;
    if tg_op = 'UPDATE' then
      v_old_local_result_id := old.client_attempt_id;
    end if;
  elsif tg_table_name = 'free_topic_result' then
    v_kind := 'topic';
    v_local_result_id := new.local_result_id;
    if tg_op = 'UPDATE' then
      v_old_local_result_id := old.local_result_id;
    end if;
  elsif tg_table_name = 'lab_result' then
    v_kind := 'lab';
    v_local_result_id := new.local_result_id;
    if tg_op = 'UPDATE' then
      v_old_local_result_id := old.local_result_id;
    end if;
  else
    raise exception 'result_deletion_guard_invalid'
      using errcode = '22023';
  end if;

  if new.account_id is null or v_local_result_id is null then
    raise exception 'result_deletion_guard_invalid'
      using errcode = '22023';
  end if;

  if tg_op = 'UPDATE'
    and (
      old.account_id is distinct from new.account_id
      or v_old_local_result_id is distinct from v_local_result_id
    ) then
    raise exception 'persisted_result_key_immutable'
      using errcode = '22023';
  end if;

  if tg_op = 'INSERT' then
    perform assessment.lock_persisted_result_key(
      new.account_id,
      v_kind,
      v_local_result_id
    );
  end if;

  if tg_op = 'UPDATE'
    and old.deleted_at is null
    and new.deleted_at is not null then
    if not exists (
      select 1
      from assessment.result_deletion_tombstone tombstone
      where tombstone.account_id = new.account_id
        and tombstone.result_kind = v_kind
        and tombstone.local_result_id = v_local_result_id
    ) then
      if not pg_catalog.pg_try_advisory_xact_lock(
        assessment.persisted_result_lock_key(
          new.account_id,
          v_kind,
          v_local_result_id
        )
      ) then
        raise exception 'persisted_result_delete_retry'
          using errcode = '40001';
      end if;

      insert into assessment.result_deletion_tombstone (
        account_id,
        deleted_at,
        local_result_id,
        result_kind
      )
      values (
        new.account_id,
        new.deleted_at,
        v_local_result_id,
        v_kind
      )
      on conflict (account_id, result_kind, local_result_id)
      do update set deleted_at = excluded.deleted_at;
    end if;
    return new;
  end if;

  if exists (
    select 1
    from assessment.result_deletion_tombstone tombstone
    where tombstone.account_id = new.account_id
      and tombstone.result_kind = v_kind
      and tombstone.local_result_id = v_local_result_id
  ) then
    raise exception 'persisted_result_deleted'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regprocedure(
    'assessment.guard_result_deletion_tombstone()'
  ) is null then
    raise exception 'result_deletion_trigger_shape_fix_missing'
      using errcode = '23514';
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
