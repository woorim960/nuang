begin;

create table if not exists trait_map.guide_review_release (
  id uuid primary key default gen_random_uuid(),
  release_id text not null unique,
  content_digest text not null check (content_digest ~ '^[a-f0-9]{16}$'),
  expected_profile_count integer not null check (expected_profile_count > 0),
  expected_unit_count integer not null check (expected_unit_count > 0),
  ai_beta_status text not null default 'approved'
    check (ai_beta_status in ('approved', 'blocked')),
  human_review_status text not null default 'not_started'
    check (human_review_status in ('not_started', 'in_review', 'approved', 'changes_requested')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trait_map.guide_human_review_decision (
  id uuid primary key default gen_random_uuid(),
  release_id text not null references trait_map.guide_review_release(release_id) on delete restrict,
  profile_code text not null check (profile_code ~ '^[EIRNAGKMCQ]{5}$'),
  guide_version text not null,
  profile_content_digest text not null check (profile_content_digest ~ '^[a-f0-9]{16}$'),
  unit_key text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{16}$'),
  review_role text not null check (review_role in (
    'personality_psychologist',
    'psychometrician',
    'research_methodologist',
    'korean_plain_language_editor',
    'safety_privacy_reviewer',
    'product_content_designer',
    'data_quality_engineer'
  )),
  status text not null check (status in ('approved', 'changes_requested', 'hold')),
  note text,
  reviewer_account_id uuid not null references identity.account(id) on delete restrict,
  reviewer_ref text not null,
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (release_id, unit_key, review_role)
);

create table if not exists trait_map.guide_profile_approval (
  id uuid primary key default gen_random_uuid(),
  release_id text not null references trait_map.guide_review_release(release_id) on delete restrict,
  profile_code text not null check (profile_code ~ '^[EIRNAGKMCQ]{5}$'),
  guide_version text not null,
  profile_content_digest text not null check (profile_content_digest ~ '^[a-f0-9]{16}$'),
  expected_unit_count integer not null check (expected_unit_count > 0),
  status text not null default 'in_review'
    check (status in ('in_review', 'approved', 'changes_requested')),
  note text,
  approved_by_account_id uuid references identity.account(id) on delete restrict,
  approved_by_ref text,
  approved_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (release_id, profile_code)
);

create table if not exists trait_map.guide_deployment (
  id uuid primary key default gen_random_uuid(),
  release_id text not null references trait_map.guide_review_release(release_id) on delete restrict,
  content_digest text not null check (content_digest ~ '^[a-f0-9]{16}$'),
  channel text not null check (channel in ('beta_ai', 'mvp_human')),
  status text not null default 'deployed' check (status in ('deployed', 'rolled_back')),
  deployed_by_account_id uuid references identity.account(id) on delete restrict,
  deployed_by_ref text,
  deployed_at timestamptz,
  rolled_back_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (release_id, channel)
);

create index if not exists guide_human_review_profile_idx
  on trait_map.guide_human_review_decision(release_id, profile_code, status, review_role);
create index if not exists guide_profile_approval_status_idx
  on trait_map.guide_profile_approval(release_id, status, profile_code);

alter table trait_map.guide_review_release enable row level security;
alter table trait_map.guide_human_review_decision enable row level security;
alter table trait_map.guide_profile_approval enable row level security;
alter table trait_map.guide_deployment enable row level security;

create or replace function public.admin_manage_trait_map_guide_review_atomic(
  target_admin_account_id uuid,
  target_action text,
  target_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, trait_map, identity, audit
as $$
declare
  v_now timestamptz := now();
  v_release_id text := nullif(btrim(target_payload ->> 'releaseId'), '');
  v_content_digest text := nullif(btrim(target_payload ->> 'contentDigest'), '');
  v_profile_digest text := nullif(btrim(target_payload ->> 'profileContentDigest'), '');
  v_profile_code text := upper(nullif(btrim(target_payload ->> 'profileCode'), ''));
  v_guide_version text := nullif(btrim(target_payload ->> 'guideVersion'), '');
  v_unit_key text := nullif(btrim(target_payload ->> 'unitKey'), '');
  v_content_hash text := nullif(btrim(target_payload ->> 'contentHash'), '');
  v_review_role text := nullif(btrim(target_payload ->> 'reviewRole'), '');
  v_note text := nullif(btrim(target_payload ->> 'note'), '');
  v_expected_profiles integer := (target_payload ->> 'expectedProfileCount')::integer;
  v_expected_release_units integer := (target_payload ->> 'expectedReleaseUnitCount')::integer;
  v_expected_profile_units integer := (target_payload ->> 'expectedUnitCount')::integer;
  v_reviewer_ref text;
  v_release trait_map.guide_review_release%rowtype;
  v_target_id uuid;
  v_approved_count integer;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  select coalesce(
    (
      select provider_email
      from identity.provider_profile_snapshot
      where account_id = target_admin_account_id
        and provider_email is not null
      order by fetched_at desc
      limit 1
    ),
    target_admin_account_id::text
  ) into v_reviewer_ref;

  if v_release_id is null
     or v_content_digest !~ '^[a-f0-9]{16}$'
     or v_profile_digest !~ '^[a-f0-9]{16}$'
     or v_profile_code !~ '^[EIRNAGKMCQ]{5}$'
     or v_guide_version is null
     or v_expected_profiles <= 0
     or v_expected_release_units <= 0
     or v_expected_profile_units <= 0 then
    raise exception 'invalid_trait_map_guide_manifest';
  end if;

  insert into trait_map.guide_review_release (
    release_id,
    content_digest,
    expected_profile_count,
    expected_unit_count,
    ai_beta_status,
    human_review_status,
    updated_at
  ) values (
    v_release_id,
    v_content_digest,
    v_expected_profiles,
    v_expected_release_units,
    'approved',
    'in_review',
    v_now
  )
  on conflict (release_id) do nothing;

  select * into v_release
  from trait_map.guide_review_release
  where release_id = v_release_id
  for update;

  if v_release.content_digest <> v_content_digest
     or v_release.expected_profile_count <> v_expected_profiles
     or v_release.expected_unit_count <> v_expected_release_units then
    raise exception 'trait_map_guide_release_manifest_changed';
  end if;

  insert into trait_map.guide_profile_approval (
    release_id,
    profile_code,
    guide_version,
    profile_content_digest,
    expected_unit_count,
    status,
    updated_at
  ) values (
    v_release_id,
    v_profile_code,
    v_guide_version,
    v_profile_digest,
    v_expected_profile_units,
    'in_review',
    v_now
  )
  on conflict (release_id, profile_code) do update set
    updated_at = excluded.updated_at
  where trait_map.guide_profile_approval.guide_version = excluded.guide_version
    and trait_map.guide_profile_approval.profile_content_digest = excluded.profile_content_digest
    and trait_map.guide_profile_approval.expected_unit_count = excluded.expected_unit_count;

  if not found then
    raise exception 'trait_map_profile_manifest_changed';
  end if;

  if target_action in ('approve_unit', 'hold_unit', 'request_unit_changes') then
    if v_unit_key is null
       or v_content_hash !~ '^[a-f0-9]{16}$'
       or v_review_role is null
       or v_review_role not in (
         'personality_psychologist',
         'psychometrician',
         'research_methodologist',
         'korean_plain_language_editor',
         'safety_privacy_reviewer',
         'product_content_designer',
         'data_quality_engineer'
       ) then
      raise exception 'invalid_trait_map_guide_unit_review';
    end if;

    insert into trait_map.guide_human_review_decision (
      release_id,
      profile_code,
      guide_version,
      profile_content_digest,
      unit_key,
      content_hash,
      review_role,
      status,
      note,
      reviewer_account_id,
      reviewer_ref,
      reviewed_at,
      updated_at
    ) values (
      v_release_id,
      v_profile_code,
      v_guide_version,
      v_profile_digest,
      v_unit_key,
      v_content_hash,
      v_review_role,
      case
        when target_action = 'approve_unit' then 'approved'
        when target_action = 'hold_unit' then 'hold'
        else 'changes_requested'
      end,
      v_note,
      target_admin_account_id,
      v_reviewer_ref,
      v_now,
      v_now
    )
    on conflict (release_id, unit_key, review_role) do update set
      profile_code = excluded.profile_code,
      guide_version = excluded.guide_version,
      profile_content_digest = excluded.profile_content_digest,
      content_hash = excluded.content_hash,
      status = excluded.status,
      note = excluded.note,
      reviewer_account_id = excluded.reviewer_account_id,
      reviewer_ref = excluded.reviewer_ref,
      reviewed_at = excluded.reviewed_at,
      updated_at = excluded.updated_at
    returning id into v_target_id;

    update trait_map.guide_profile_approval
    set
      status = 'in_review',
      approved_by_account_id = null,
      approved_by_ref = null,
      approved_at = null,
      updated_at = v_now
    where release_id = v_release_id and profile_code = v_profile_code;

  elsif target_action = 'request_profile_changes' then
    update trait_map.guide_profile_approval
    set
      status = 'changes_requested',
      note = v_note,
      approved_by_account_id = null,
      approved_by_ref = null,
      approved_at = null,
      updated_at = v_now
    where release_id = v_release_id and profile_code = v_profile_code
    returning id into v_target_id;

  elsif target_action = 'approve_profile' then
    select count(*) into v_approved_count
    from trait_map.guide_human_review_decision
    where release_id = v_release_id
      and profile_code = v_profile_code
      and guide_version = v_guide_version
      and profile_content_digest = v_profile_digest
      and status = 'approved';

    if v_approved_count <> v_expected_profile_units * 7 then
      raise exception 'all_trait_map_guide_units_require_seven_human_approvals';
    end if;

    update trait_map.guide_profile_approval
    set
      status = 'approved',
      note = v_note,
      approved_by_account_id = target_admin_account_id,
      approved_by_ref = v_reviewer_ref,
      approved_at = v_now,
      updated_at = v_now
    where release_id = v_release_id and profile_code = v_profile_code
    returning id into v_target_id;

  elsif target_action = 'deploy_human_release' then
    if (
      select count(*)
      from trait_map.guide_profile_approval
      where release_id = v_release_id
        and status = 'approved'
        and profile_content_digest ~ '^[a-f0-9]{16}$'
    ) <> v_expected_profiles then
      raise exception 'all_trait_map_profiles_require_human_approval';
    end if;

    update trait_map.guide_deployment
    set status = 'rolled_back', rolled_back_at = v_now, updated_at = v_now
    where channel = 'mvp_human' and status = 'deployed';

    insert into trait_map.guide_deployment (
      release_id,
      content_digest,
      channel,
      status,
      deployed_by_account_id,
      deployed_by_ref,
      deployed_at,
      updated_at
    ) values (
      v_release_id,
      v_content_digest,
      'mvp_human',
      'deployed',
      target_admin_account_id,
      v_reviewer_ref,
      v_now,
      v_now
    )
    on conflict (release_id, channel) do update set
      content_digest = excluded.content_digest,
      status = excluded.status,
      deployed_by_account_id = excluded.deployed_by_account_id,
      deployed_by_ref = excluded.deployed_by_ref,
      deployed_at = excluded.deployed_at,
      rolled_back_at = null,
      updated_at = excluded.updated_at
    returning id into v_target_id;

    update trait_map.guide_review_release
    set human_review_status = 'approved', updated_at = v_now
    where release_id = v_release_id;

  else
    raise exception 'unsupported_trait_map_guide_review_action';
  end if;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  ) values (
    'trait_map_guide_' || target_action,
    target_admin_account_id,
    jsonb_build_object(
      'releaseId', v_release_id,
      'contentDigest', v_content_digest,
      'profileCode', v_profile_code,
      'guideVersion', v_guide_version,
      'profileContentDigest', v_profile_digest,
      'unitKey', v_unit_key,
      'contentHash', v_content_hash,
      'reviewRole', v_review_role,
      'note', v_note
    ),
    v_target_id,
    case
      when target_action like '%unit%' then 'trait_map.guide_human_review_decision'
      when target_action like '%profile%' then 'trait_map.guide_profile_approval'
      else 'trait_map.guide_deployment'
    end
  );

  return jsonb_build_object(
    'ok', true,
    'action', target_action,
    'releaseId', v_release_id,
    'profileCode', v_profile_code
  );
end;
$$;

revoke all on table trait_map.guide_review_release from public, anon, authenticated;
revoke all on table trait_map.guide_human_review_decision from public, anon, authenticated;
revoke all on table trait_map.guide_profile_approval from public, anon, authenticated;
revoke all on table trait_map.guide_deployment from public, anon, authenticated;

grant all on table trait_map.guide_review_release to service_role;
grant all on table trait_map.guide_human_review_decision to service_role;
grant all on table trait_map.guide_profile_approval to service_role;
grant all on table trait_map.guide_deployment to service_role;

revoke all on function public.admin_manage_trait_map_guide_review_atomic(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_manage_trait_map_guide_review_atomic(uuid, text, jsonb)
  to service_role;

notify pgrst, 'reload schema';

commit;
