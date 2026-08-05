begin;

-- Operator provenance must not prevent a person from exercising account
-- deletion. User-owned rows still cascade. Operational records keep their
-- content while the deleted operator reference is anonymized.
do $$
declare
  target record;
  delete_action text;
begin
  for target in
    select
      con.conname as constraint_name,
      ns.nspname as schema_name,
      cls.relname as table_name,
      att.attname as column_name
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace ns on ns.oid = cls.relnamespace
    join pg_attribute att
      on att.attrelid = con.conrelid
     and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'identity.account'::regclass
      and cardinality(con.conkey) = 1
      and con.confdeltype not in ('c', 'n')
  loop
    delete_action := case
      when target.schema_name = 'identity'
       and target.table_name = 'account_merge_case'
        then 'cascade'
      else 'set null'
    end;

    if delete_action = 'set null' then
      execute format(
        'alter table %I.%I alter column %I drop not null',
        target.schema_name,
        target.table_name,
        target.column_name
      );
    end if;

    execute format(
      'alter table %I.%I drop constraint %I',
      target.schema_name,
      target.table_name,
      target.constraint_name
    );
    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references identity.account(id) on delete %s',
      target.schema_name,
      target.table_name,
      target.constraint_name,
      target.column_name,
      delete_action
    );
  end loop;
end;
$$;

-- Published assessment payloads remain immutable. The only additional update
-- allowed is removing the deleted operator reference through ON DELETE SET
-- NULL; no assessment content, version, timestamps or retirement state may
-- change with it.
create or replace function public.guard_assessment_content_release_immutability()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'assessment_content_release_is_immutable';
  end if;

  if old.published_by is not null
    and new.published_by is null
    and (to_jsonb(new) - 'published_by') = (to_jsonb(old) - 'published_by')
  then
    return new;
  end if;

  if (to_jsonb(new) - 'retired_at') <> (to_jsonb(old) - 'retired_at') then
    raise exception 'assessment_content_release_is_immutable';
  end if;
  return new;
end;
$$;

-- Re-registration is allowed. Historical tombstones were an internal product
-- choice, not a statutory retention requirement, so they are permanently
-- removed and are no longer written during account deletion.
delete from identity.deleted_auth_identity_tombstone;
revoke insert, update, delete on identity.deleted_auth_identity_tombstone
from service_role;

create or replace function public.delete_own_nuang_account(
  p_account_id uuid,
  p_supabase_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, identity, auth, audit, pg_temp
as $$
declare
  v_account_ids uuid[];
  v_auth_user_ids uuid[];
  v_deleted_accounts integer;
  v_deleted_users integer;
  v_expected_users integer;
  v_expected_accounts integer;
begin
  if not exists (
    select 1
    from identity.auth_identity ai
    where identity.resolve_canonical_account_id(ai.account_id) = p_account_id
      and ai.supabase_user_id = p_supabase_user_id
      and ai.status = 'active'
      and ai.revoked_at is null
  ) then
    raise exception 'account_identity_mismatch'
      using errcode = '42501';
  end if;

  select
    array_agg(distinct ai.supabase_user_id order by ai.supabase_user_id),
    array_agg(distinct ai.account_id order by ai.account_id)
  into v_auth_user_ids, v_account_ids
  from identity.auth_identity ai
  where identity.resolve_canonical_account_id(ai.account_id) = p_account_id;

  v_expected_users := coalesce(cardinality(v_auth_user_ids), 0);
  if v_account_ids is null or not (p_account_id = any(v_account_ids)) then
    v_account_ids := array_append(coalesce(v_account_ids, '{}'), p_account_id);
  end if;
  v_expected_accounts := coalesce(cardinality(v_account_ids), 0);

  if v_expected_users < 1 then
    raise exception 'linked_auth_users_missing' using errcode = 'P0001';
  end if;

  -- Old identity audit rows may contain direct account or auth identifiers.
  -- Preserve only non-identifying operational facts.
  update audit.account_identity_event
  set actor_account_id = null,
      actor_auth_user_id = null,
      provider_keys = '{}',
      correlation_id = null
  where actor_account_id = any(v_account_ids)
     or actor_auth_user_id = any(v_auth_user_ids);

  delete from identity.account_alias
  where source_account_id = any(v_account_ids)
     or canonical_account_id = any(v_account_ids);

  delete from identity.account
  where id = any(v_account_ids);
  get diagnostics v_deleted_accounts = row_count;

  if v_deleted_accounts <> v_expected_accounts then
    raise exception 'account_delete_failed' using errcode = 'P0001';
  end if;

  delete from auth.users
  where id = any(v_auth_user_ids);
  get diagnostics v_deleted_users = row_count;

  if v_deleted_users <> v_expected_users then
    raise exception 'auth_user_delete_failed' using errcode = 'P0001';
  end if;

  -- This event proves that a deletion operation succeeded without retaining
  -- an account, provider subject, email, auth user ID, or correlation token.
  insert into audit.account_identity_event (
    event_type,
    outcome,
    reason_code,
    inventory_counts
  ) values (
    'account_delete',
    'succeeded',
    'self_service_anonymized',
    jsonb_build_object(
      'deleted_account_count', v_deleted_accounts,
      'deleted_auth_user_count', v_deleted_users
    )
  );

  return true;
end;
$$;

revoke all on function public.delete_own_nuang_account(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.delete_own_nuang_account(uuid, uuid)
to service_role;

comment on function public.delete_own_nuang_account(uuid, uuid) is
  'Deletes linked Nuang accounts, Auth users and user-owned data while anonymizing retained operational provenance. The same OAuth identity may register again as a new account.';
comment on table identity.deleted_auth_identity_tombstone is
  'Deprecated empty compatibility table. Account deletion no longer stores provider subjects or blocks re-registration.';

notify pgrst, 'reload schema';

commit;
