create table if not exists profile.community_profile (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references identity.account(id) on delete cascade,
  handle text not null,
  display_name text not null,
  bio text not null default '',
  avatar_bucket text,
  avatar_object_path text,
  avatar_revision integer not null default 0,
  code_visibility text not null default 'public' check (code_visibility in ('public', 'private')),
  detail_visibility text not null default 'public' check (detail_visibility in ('public', 'private')),
  comparison_enabled boolean not null default true,
  status text not null default 'active' check (status in ('active', 'hidden', 'deleted')),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (char_length(display_name) between 2 and 20),
  check (char_length(handle) between 3 and 24),
  check (handle = lower(handle)),
  check (handle ~ '^[a-z0-9._]+$'),
  check (char_length(bio) <= 120),
  check (avatar_revision >= 0),
  check (revision >= 1),
  check (
    (avatar_bucket is null and avatar_object_path is null)
    or (avatar_bucket = 'profile-avatars' and avatar_object_path is not null)
  ),
  check (detail_visibility <> 'private' or comparison_enabled = false),
  check (code_visibility <> 'private' or detail_visibility = 'private')
);

create unique index if not exists community_profile_handle_unique_idx
on profile.community_profile(lower(handle))
where deleted_at is null;

create index if not exists community_profile_account_status_idx
on profile.community_profile(account_id, status, updated_at desc)
where deleted_at is null;

alter table profile.community_profile enable row level security;

drop policy if exists "community profile own read" on profile.community_profile;
create policy "community profile own read"
on profile.community_profile
for select
using (account_id = identity.current_account_id());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into profile.community_profile (
  account_id,
  handle,
  display_name,
  bio,
  status
)
select
  account.id,
  'nuang.' || left(replace(account.id::text, '-', ''), 5) || right(replace(account.id::text, '-', ''), 13),
  left(
    case
      when char_length(trim(coalesce(contact.display_name, ''))) between 2 and 20
        then trim(contact.display_name)
      when char_length(trim(coalesce(snapshot.snapshot_payload #>> '{displayProfile,displayName}', ''))) between 2 and 20
        then trim(snapshot.snapshot_payload #>> '{displayProfile,displayName}')
      else '뉴앙 사용자'
    end,
    20
  ),
  '',
  'active'
from identity.account as account
left join identity.contact_profile as contact
  on contact.account_id = account.id
left join lateral (
  select public_snapshot.snapshot_payload
  from profile.profile_public_snapshot as public_snapshot
  where public_snapshot.account_id = account.id
    and public_snapshot.status = 'active'
    and public_snapshot.deleted_at is null
  order by public_snapshot.created_at desc
  limit 1
) as snapshot on true
where account.deleted_at is null
on conflict (account_id) do nothing;

grant usage on schema profile to authenticated, service_role;
grant select on profile.community_profile to authenticated;
grant all on profile.community_profile to service_role;

create or replace function profile.save_community_profile_visibility(
  p_account_id uuid,
  p_code_visible boolean,
  p_details_visible boolean,
  p_comparison_enabled boolean,
  p_expected_revision integer,
  p_policy_version text
)
returns table(revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_included_fields jsonb;
  v_revision integer;
begin
  if not p_code_visible and p_details_visible then
    raise exception 'INVALID_VISIBILITY_DEPENDENCY';
  end if;

  if not p_details_visible and p_comparison_enabled then
    raise exception 'INVALID_COMPARISON_DEPENDENCY';
  end if;

  update profile.community_profile
  set
    code_visibility = case when p_code_visible then 'public' else 'private' end,
    detail_visibility = case when p_details_visible then 'public' else 'private' end,
    comparison_enabled = p_comparison_enabled,
    revision = profile.community_profile.revision + 1,
    updated_at = now()
  where account_id = p_account_id
    and revision = p_expected_revision
    and deleted_at is null
  returning profile.community_profile.revision into v_revision;

  if v_revision is null then
    raise exception 'REVISION_CONFLICT';
  end if;

  insert into profile.profile_visibility_setting (
    account_id,
    policy_version,
    field_id,
    visibility,
    comparison_use,
    updated_at
  )
  select
    p_account_id,
    p_policy_version,
    setting.field_id,
    setting.visibility,
    setting.comparison_use,
    now()
  from (
    values
      ('display_profile', 'public', 'allowed'),
      ('representative_profile', case when p_code_visible then 'public' else 'private' end, 'allowed'),
      ('core_domain_map', case when p_details_visible then 'public' else 'private' end, 'allowed'),
      ('core_facet_summary', case when p_details_visible then 'public' else 'private' end, 'allowed'),
      ('quick_core_result', 'private', 'hidden'),
      ('lab_results', 'private', 'hidden'),
      ('direct_responses', 'private', 'blocked'),
      ('raw_scores', 'private', 'blocked'),
      ('sensitive_assessments', 'private', 'blocked'),
      ('crisis_help_interactions', 'private', 'blocked'),
      ('demographics', 'private', 'hidden'),
      ('account_identity', 'private', 'blocked')
  ) as setting(field_id, visibility, comparison_use)
  on conflict (account_id, field_id) do update
  set
    policy_version = excluded.policy_version,
    visibility = excluded.visibility,
    comparison_use = excluded.comparison_use,
    updated_at = excluded.updated_at;

  v_included_fields := jsonb_build_array('display_profile');
  if p_code_visible then
    v_included_fields := v_included_fields || jsonb_build_array('representative_profile');
  end if;
  if p_details_visible then
    v_included_fields := v_included_fields || jsonb_build_array('core_domain_map', 'core_facet_summary');
  end if;

  update profile.profile_public_snapshot
  set
    visibility_policy_version = p_policy_version,
    snapshot_payload = jsonb_set(
      snapshot_payload,
      '{visibility,includedFields}',
      v_included_fields,
      true
    )
  where account_id = p_account_id
    and status = 'active'
    and deleted_at is null;

  insert into audit.visibility_audit_event (
    account_id,
    actor_account_id,
    event_type,
    target_table,
    target_id,
    metadata
  )
  select
    p_account_id,
    p_account_id,
    'profile_visibility_updated',
    'profile.community_profile',
    community_profile.id,
    jsonb_build_object(
      'policyVersion', p_policy_version,
      'codeVisible', p_code_visible,
      'detailsVisible', p_details_visible,
      'comparisonEnabled', p_comparison_enabled,
      'revision', v_revision
    )
  from profile.community_profile as community_profile
  where community_profile.account_id = p_account_id;

  return query select v_revision;
end;
$$;

revoke all on function profile.save_community_profile_visibility(uuid, boolean, boolean, boolean, integer, text) from public;
grant execute on function profile.save_community_profile_visibility(uuid, boolean, boolean, boolean, integer, text) to service_role;

notify pgrst, 'reload schema';
