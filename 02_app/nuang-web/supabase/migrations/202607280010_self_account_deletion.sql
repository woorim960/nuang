begin;

create or replace function public.delete_own_nuang_account(
  p_account_id uuid,
  p_supabase_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, identity, auth, pg_temp
as $$
declare
  v_deleted_accounts integer;
  v_deleted_users integer;
begin
  if not exists (
    select 1
    from identity.auth_identity
    where account_id = p_account_id
      and supabase_user_id = p_supabase_user_id
      and revoked_at is null
  ) then
    raise exception 'account_identity_mismatch'
      using errcode = '42501';
  end if;

  delete from identity.account
  where id = p_account_id;
  get diagnostics v_deleted_accounts = row_count;

  if v_deleted_accounts <> 1 then
    raise exception 'account_delete_failed'
      using errcode = 'P0001';
  end if;

  delete from auth.users
  where id = p_supabase_user_id;
  get diagnostics v_deleted_users = row_count;

  if v_deleted_users <> 1 then
    raise exception 'auth_user_delete_failed'
      using errcode = 'P0001';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_own_nuang_account(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.delete_own_nuang_account(uuid, uuid)
to service_role;

comment on function public.delete_own_nuang_account(uuid, uuid) is
  'Atomically deletes an authenticated Nuang account and Supabase auth user after server-side identity verification. Service-role only.';

notify pgrst, 'reload schema';

commit;
