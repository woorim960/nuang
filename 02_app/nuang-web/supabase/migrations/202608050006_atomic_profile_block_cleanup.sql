create or replace function feed.set_profile_block(
  p_blocker_account_id uuid,
  p_blocked_account_id uuid,
  p_target_public_snapshot_id uuid,
  p_blocked boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if p_blocker_account_id = p_blocked_account_id then
    raise exception using errcode = 'P0001', message = 'cannot_target_self';
  end if;

  if not exists (
    select 1
    from profile.profile_public_snapshot as target_snapshot
    where target_snapshot.id = p_target_public_snapshot_id
      and target_snapshot.account_id = p_blocked_account_id
      and target_snapshot.status = 'active'
      and target_snapshot.deleted_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'profile_not_found';
  end if;

  insert into feed.profile_block (
    blocked_account_id,
    blocker_account_id,
    created_at,
    deleted_at,
    target_public_snapshot_id,
    updated_at
  ) values (
    p_blocked_account_id,
    p_blocker_account_id,
    v_now,
    case when p_blocked then null else v_now end,
    p_target_public_snapshot_id,
    v_now
  )
  on conflict (blocker_account_id, blocked_account_id) do update
  set
    deleted_at = excluded.deleted_at,
    target_public_snapshot_id = excluded.target_public_snapshot_id,
    updated_at = excluded.updated_at;

  if p_blocked then
    update feed.profile_follow
    set deleted_at = v_now, updated_at = v_now
    where deleted_at is null
      and (
        (follower_account_id = p_blocker_account_id and target_account_id = p_blocked_account_id)
        or
        (follower_account_id = p_blocked_account_id and target_account_id = p_blocker_account_id)
      );

    update feed.activity_notification
    set deleted_at = v_now
    where deleted_at is null
      and (
        (recipient_account_id = p_blocker_account_id and actor_account_id = p_blocked_account_id)
        or
        (recipient_account_id = p_blocked_account_id and actor_account_id = p_blocker_account_id)
      );
  end if;

  return p_blocked;
end;
$$;

revoke all on function feed.set_profile_block(uuid, uuid, uuid, boolean) from public;
grant execute on function feed.set_profile_block(uuid, uuid, uuid, boolean) to service_role;

notify pgrst, 'reload schema';
