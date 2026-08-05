begin;

create or replace function profile.disable_account_public_surfaces(
  p_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, profile, comparison
as $$
begin
  if p_account_id is null then
    return;
  end if;

  update profile.profile_public_snapshot
  set
    status = 'private',
    revoked_at = coalesce(revoked_at, now())
  where account_id = p_account_id
    and status = 'active'
    and deleted_at is null;

  update comparison.public_comparison_report as comparison_report
  set
    access_status = 'disabled',
    disabled_at = coalesce(comparison_report.disabled_at, now())
  where comparison_report.access_status = 'active'
    and (
      comparison_report.viewer_account_id = p_account_id
      or exists (
        select 1
        from profile.profile_public_snapshot as target_snapshot
        where target_snapshot.id = comparison_report.target_public_snapshot_id
          and target_snapshot.account_id = p_account_id
      )
    );
end;
$$;

create or replace function profile.disable_public_surfaces_when_profile_inactive()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, profile
as $$
begin
  if (
    old.status is distinct from new.status
    or old.deleted_at is distinct from new.deleted_at
  ) and (
    new.status <> 'active'
    or new.deleted_at is not null
  ) then
    perform profile.disable_account_public_surfaces(new.account_id);
  end if;

  return new;
end;
$$;

drop trigger if exists disable_public_surfaces_on_profile_inactive
  on profile.community_profile;
create trigger disable_public_surfaces_on_profile_inactive
after update of status, deleted_at
on profile.community_profile
for each row
execute function profile.disable_public_surfaces_when_profile_inactive();

create or replace function profile.disable_public_surfaces_when_account_inactive()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, profile
as $$
begin
  if (
    old.status is distinct from new.status
    or old.deleted_at is distinct from new.deleted_at
  ) and (
    new.status <> 'active'
    or new.deleted_at is not null
  ) then
    perform profile.disable_account_public_surfaces(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists disable_public_surfaces_on_account_inactive
  on identity.account;
create trigger disable_public_surfaces_on_account_inactive
after update of status, deleted_at
on identity.account
for each row
execute function profile.disable_public_surfaces_when_account_inactive();

-- Repair accounts that were hidden, suspended, or deleted before the triggers
-- existed. The helper is idempotent, so accounts present in both sources are
-- safe to process once through UNION.
do $$
declare
  v_account_id uuid;
begin
  for v_account_id in
    select account_id
    from profile.community_profile
    where status <> 'active'
      or deleted_at is not null
    union
    select id
    from identity.account
    where status <> 'active'
      or deleted_at is not null
  loop
    perform profile.disable_account_public_surfaces(v_account_id);
  end loop;
end;
$$;

revoke all on function profile.disable_account_public_surfaces(uuid)
  from public, anon, authenticated;
revoke all on function profile.disable_public_surfaces_when_profile_inactive()
  from public, anon, authenticated;
revoke all on function profile.disable_public_surfaces_when_account_inactive()
  from public, anon, authenticated;

grant execute on function profile.disable_account_public_surfaces(uuid)
  to service_role;

notify pgrst, 'reload schema';

commit;
