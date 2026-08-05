begin;

create table if not exists trait_map.guide_content_revision (
  id uuid primary key default gen_random_uuid(),
  release_id text not null references trait_map.guide_review_release(release_id) on delete restrict,
  profile_code text not null check (profile_code ~ '^[EIRNAGKMCQ]{5}$'),
  guide_version text not null,
  unit_key text not null,
  previous_content_hash text not null check (previous_content_hash ~ '^[a-f0-9]{16}$'),
  content_hash text not null check (content_hash ~ '^[a-f0-9]{16}$'),
  text text not null check (length(btrim(text)) between 2 and 2000),
  profile_content_digest text not null check (profile_content_digest ~ '^[a-f0-9]{16}$'),
  ai_review_status text not null check (ai_review_status in ('approved', 'blocked')),
  ai_review_summary jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  edited_by_account_id uuid not null references identity.account(id) on delete restrict,
  edited_by_ref text not null,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);

create unique index if not exists guide_content_revision_one_active_idx
  on trait_map.guide_content_revision(release_id, profile_code, unit_key)
  where is_active;
create index if not exists guide_content_revision_profile_history_idx
  on trait_map.guide_content_revision(release_id, profile_code, created_at desc);

alter table trait_map.guide_content_revision enable row level security;

create or replace function public.admin_publish_trait_map_guide_edit_atomic(
  target_admin_account_id uuid,
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
  v_release_digest text := nullif(btrim(target_payload ->> 'releaseContentDigest'), '');
  v_profile_code text := upper(nullif(btrim(target_payload ->> 'profileCode'), ''));
  v_guide_version text := nullif(btrim(target_payload ->> 'guideVersion'), '');
  v_unit_key text := nullif(btrim(target_payload ->> 'unitKey'), '');
  v_previous_hash text := nullif(btrim(target_payload ->> 'previousContentHash'), '');
  v_content_hash text := nullif(btrim(target_payload ->> 'contentHash'), '');
  v_text text := nullif(btrim(target_payload ->> 'text'), '');
  v_profile_digest text := nullif(btrim(target_payload ->> 'profileContentDigest'), '');
  v_expected_profiles integer := (target_payload ->> 'expectedProfileCount')::integer;
  v_expected_release_units integer := (target_payload ->> 'expectedReleaseUnitCount')::integer;
  v_expected_profile_units integer := (target_payload ->> 'expectedProfileUnitCount')::integer;
  v_ai_review_summary jsonb := coalesce(target_payload -> 'aiReviewSummary', '{}'::jsonb);
  v_reviewer_ref text;
  v_active_hash text;
  v_revision_id uuid;
  v_release trait_map.guide_review_release%rowtype;
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
     or v_release_digest !~ '^[a-f0-9]{16}$'
     or v_profile_code !~ '^[EIRNAGKMCQ]{5}$'
     or v_guide_version is null
     or v_unit_key is null
     or v_previous_hash !~ '^[a-f0-9]{16}$'
     or v_content_hash !~ '^[a-f0-9]{16}$'
     or v_text is null
     or length(v_text) > 2000
     or v_profile_digest !~ '^[a-f0-9]{16}$'
     or v_expected_profiles <= 0
     or v_expected_release_units <= 0
     or v_expected_profile_units <= 0
     or coalesce(v_ai_review_summary ->> 'approved', '') <> 'true' then
    raise exception 'invalid_trait_map_guide_edit';
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
    v_release_digest,
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

  if v_release.content_digest <> v_release_digest
     or v_release.expected_profile_count <> v_expected_profiles
     or v_release.expected_unit_count <> v_expected_release_units then
    raise exception 'trait_map_guide_release_manifest_changed';
  end if;

  select content_hash into v_active_hash
  from trait_map.guide_content_revision
  where release_id = v_release_id
    and profile_code = v_profile_code
    and unit_key = v_unit_key
    and is_active
  for update;

  if v_active_hash is not null and v_active_hash <> v_previous_hash then
    raise exception 'trait_map_guide_edit_stale';
  end if;

  update trait_map.guide_content_revision
  set is_active = false, superseded_at = v_now
  where release_id = v_release_id
    and profile_code = v_profile_code
    and unit_key = v_unit_key
    and is_active;

  insert into trait_map.guide_content_revision (
    release_id,
    profile_code,
    guide_version,
    unit_key,
    previous_content_hash,
    content_hash,
    text,
    profile_content_digest,
    ai_review_status,
    ai_review_summary,
    is_active,
    edited_by_account_id,
    edited_by_ref,
    created_at
  ) values (
    v_release_id,
    v_profile_code,
    v_guide_version,
    v_unit_key,
    v_previous_hash,
    v_content_hash,
    v_text,
    v_profile_digest,
    'approved',
    v_ai_review_summary,
    true,
    target_admin_account_id,
    v_reviewer_ref,
    v_now
  ) returning id into v_revision_id;

  update trait_map.guide_human_review_decision
  set profile_content_digest = v_profile_digest, updated_at = v_now
  where release_id = v_release_id
    and profile_code = v_profile_code
    and unit_key <> v_unit_key;

  delete from trait_map.guide_human_review_decision
  where release_id = v_release_id
    and profile_code = v_profile_code
    and unit_key = v_unit_key;

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
    guide_version = excluded.guide_version,
    profile_content_digest = excluded.profile_content_digest,
    expected_unit_count = excluded.expected_unit_count,
    status = 'in_review',
    note = null,
    approved_by_account_id = null,
    approved_by_ref = null,
    approved_at = null,
    updated_at = excluded.updated_at;

  update trait_map.guide_review_release
  set human_review_status = 'in_review', updated_at = v_now
  where release_id = v_release_id;

  update trait_map.guide_deployment
  set status = 'rolled_back', rolled_back_at = v_now, updated_at = v_now
  where release_id = v_release_id
    and channel = 'mvp_human'
    and status = 'deployed';

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  ) values (
    'trait_map_guide_publish_unit_edit',
    target_admin_account_id,
    jsonb_build_object(
      'releaseId', v_release_id,
      'profileCode', v_profile_code,
      'guideVersion', v_guide_version,
      'unitKey', v_unit_key,
      'previousContentHash', v_previous_hash,
      'contentHash', v_content_hash,
      'profileContentDigest', v_profile_digest,
      'invalidatedHumanReviewRoles', 7,
      'appliedToBeta', true,
      'aiReviewSummary', v_ai_review_summary
    ),
    v_revision_id,
    'trait_map.guide_content_revision'
  );

  return jsonb_build_object(
    'ok', true,
    'revisionId', v_revision_id,
    'profileCode', v_profile_code,
    'unitKey', v_unit_key,
    'contentHash', v_content_hash,
    'profileContentDigest', v_profile_digest,
    'invalidatedHumanReviewRoles', 7,
    'appliedToBeta', true
  );
end;
$$;

revoke all on table trait_map.guide_content_revision from public, anon, authenticated;
grant all on table trait_map.guide_content_revision to service_role;

revoke all on function public.admin_publish_trait_map_guide_edit_atomic(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_publish_trait_map_guide_edit_atomic(uuid, jsonb)
  to service_role;

notify pgrst, 'reload schema';

commit;
