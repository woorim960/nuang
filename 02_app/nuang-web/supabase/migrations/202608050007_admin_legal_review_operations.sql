begin;

create table if not exists public.admin_legal_release (
  id uuid primary key default gen_random_uuid(),
  release_key text not null unique
    check (char_length(release_key) between 3 and 120),
  policy_version text not null
    check (char_length(policy_version) between 3 and 120),
  terms_version text not null
    check (char_length(terms_version) between 3 and 120),
  privacy_version text not null
    check (char_length(privacy_version) between 3 and 120),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'changes_requested', 'approved', 'superseded')),
  owner_label text
    check (owner_label is null or char_length(owner_label) <= 120),
  reviewer_label text
    check (reviewer_label is null or char_length(reviewer_label) <= 160),
  source_commit_sha text
    check (source_commit_sha is null or char_length(source_commit_sha) <= 80),
  approval_evidence_ref text
    check (approval_evidence_ref is null or char_length(approval_evidence_ref) <= 500),
  approved_by_label text
    check (approved_by_label is null or char_length(approved_by_label) <= 160),
  approved_by_account_id uuid references identity.account(id),
  approved_at timestamptz,
  change_summary text
    check (change_summary is null or char_length(change_summary) <= 2000),
  updated_by_account_id uuid references identity.account(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_legal_review_item (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.admin_legal_release(id) on delete cascade,
  item_key text not null check (char_length(item_key) between 3 and 120),
  status text not null default 'pending'
    check (status in ('pending', 'ready', 'in_review', 'changes_requested', 'approved', 'not_applicable')),
  owner_label text
    check (owner_label is null or char_length(owner_label) <= 120),
  evidence_ref text
    check (evidence_ref is null or char_length(evidence_ref) <= 500),
  note text
    check (note is null or char_length(note) <= 1500),
  reviewed_at timestamptz,
  updated_by_account_id uuid references identity.account(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (release_id, item_key)
);

create index if not exists admin_legal_release_status_idx
on public.admin_legal_release (status, updated_at desc);

create index if not exists admin_legal_review_item_release_status_idx
on public.admin_legal_review_item (release_id, status, updated_at desc);

alter table public.admin_legal_release enable row level security;
alter table public.admin_legal_review_item enable row level security;

revoke all on public.admin_legal_release
from public, anon, authenticated;
revoke all on public.admin_legal_review_item
from public, anon, authenticated;

grant select, insert, update, delete
on public.admin_legal_release
to service_role;
grant select, insert, update, delete
on public.admin_legal_review_item
to service_role;

insert into public.admin_legal_release (
  release_key,
  policy_version,
  terms_version,
  privacy_version,
  status
)
values (
  'NUANG-MVP-LEGAL-2026-08',
  'policy.v1.0',
  'policy.v1.0',
  'policy.v1.0',
  'draft'
)
on conflict (release_key) do nothing;

insert into public.admin_legal_review_item (
  release_id,
  item_key,
  status
)
select release.id, item.item_key, 'pending'
from public.admin_legal_release release
cross join (
  values
    ('operator_identity'),
    ('service_scope'),
    ('age_and_minors'),
    ('community_restrictions'),
    ('user_content_rights'),
    ('termination_liability_disputes'),
    ('personal_data_inventory'),
    ('purpose_and_consent'),
    ('public_visibility'),
    ('retention_and_deletion'),
    ('processors_and_overseas'),
    ('rights_contact_security'),
    ('research_participation'),
    ('oauth_identity'),
    ('marketing_and_advertising')
) item(item_key)
where release.release_key = 'NUANG-MVP-LEGAL-2026-08'
on conflict (release_id, item_key) do nothing;

create or replace function public.admin_manage_legal_review(
  target_admin_account_id uuid,
  target_action text,
  target_release_id uuid,
  target_item_key text default null,
  target_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, identity, audit
as $$
declare
  v_release public.admin_legal_release%rowtype;
  v_item_id uuid;
  v_item_status text;
  v_now timestamptz := now();
begin
  if target_admin_account_id is null or not exists (
    select 1
    from identity.account
    where id = target_admin_account_id
      and status = 'active'
      and deleted_at is null
  ) then
    raise exception 'active_admin_account_required';
  end if;

  select * into v_release
  from public.admin_legal_release
  where id = target_release_id
  for update;

  if not found then
    raise exception 'legal_release_not_found';
  end if;

  if target_action = 'update_release' then
    if v_release.status in ('approved', 'superseded') then
      raise exception 'locked_legal_release';
    end if;

    update public.admin_legal_release
    set
      owner_label = nullif(btrim(coalesce(target_payload ->> 'ownerLabel', '')), ''),
      reviewer_label = nullif(btrim(coalesce(target_payload ->> 'reviewerLabel', '')), ''),
      source_commit_sha = nullif(btrim(coalesce(target_payload ->> 'sourceCommitSha', '')), ''),
      approval_evidence_ref = nullif(btrim(coalesce(target_payload ->> 'approvalEvidenceRef', '')), ''),
      change_summary = nullif(btrim(coalesce(target_payload ->> 'changeSummary', '')), ''),
      updated_by_account_id = target_admin_account_id,
      updated_at = v_now
    where id = target_release_id;

  elsif target_action = 'update_item' then
    if v_release.status in ('approved', 'superseded') then
      raise exception 'locked_legal_release';
    end if;

    v_item_status := target_payload ->> 'status';
    if v_item_status not in (
      'pending',
      'ready',
      'in_review',
      'changes_requested',
      'approved',
      'not_applicable'
    ) then
      raise exception 'invalid_legal_item_status';
    end if;

    if v_item_status = 'approved'
       and nullif(btrim(coalesce(target_payload ->> 'evidenceRef', '')), '') is null then
      raise exception 'approved_legal_item_evidence_required';
    end if;

    if v_item_status = 'not_applicable'
       and nullif(btrim(coalesce(target_payload ->> 'note', '')), '') is null then
      raise exception 'not_applicable_legal_item_note_required';
    end if;

    update public.admin_legal_review_item
    set
      status = v_item_status,
      owner_label = nullif(btrim(coalesce(target_payload ->> 'ownerLabel', '')), ''),
      evidence_ref = nullif(btrim(coalesce(target_payload ->> 'evidenceRef', '')), ''),
      note = nullif(btrim(coalesce(target_payload ->> 'note', '')), ''),
      reviewed_at = case
        when v_item_status in ('approved', 'not_applicable') then v_now
        else null
      end,
      updated_by_account_id = target_admin_account_id,
      updated_at = v_now
    where release_id = target_release_id
      and item_key = target_item_key
    returning id into v_item_id;

    if v_item_id is null then
      raise exception 'legal_review_item_not_found';
    end if;

  elsif target_action = 'start_review' then
    if v_release.status not in ('draft', 'changes_requested') then
      raise exception 'legal_release_cannot_start_review';
    end if;
    if exists (
      select 1
      from public.admin_legal_review_item
      where release_id = target_release_id
        and status not in ('ready', 'approved', 'not_applicable')
    ) then
      raise exception 'legal_review_items_not_ready';
    end if;
    if nullif(btrim(coalesce(v_release.owner_label, '')), '') is null
       or nullif(btrim(coalesce(v_release.reviewer_label, '')), '') is null
       or nullif(btrim(coalesce(v_release.source_commit_sha, '')), '') is null then
      raise exception 'legal_review_metadata_required';
    end if;

    update public.admin_legal_release
    set status = 'in_review', updated_by_account_id = target_admin_account_id, updated_at = v_now
    where id = target_release_id;

    update public.admin_legal_review_item
    set status = case when status = 'ready' then 'in_review' else status end,
        updated_by_account_id = target_admin_account_id,
        updated_at = v_now
    where release_id = target_release_id;

  elsif target_action = 'request_changes' then
    if v_release.status <> 'in_review' then
      raise exception 'legal_release_not_in_review';
    end if;
    update public.admin_legal_release
    set status = 'changes_requested', updated_by_account_id = target_admin_account_id, updated_at = v_now
    where id = target_release_id;

  elsif target_action = 'approve_release' then
    if v_release.status <> 'in_review' then
      raise exception 'legal_release_not_in_review';
    end if;
    if coalesce((target_payload ->> 'approvalConfirmed')::boolean, false) is not true then
      raise exception 'legal_approval_attestation_required';
    end if;
    if exists (
      select 1
      from public.admin_legal_review_item
      where release_id = target_release_id
        and status not in ('approved', 'not_applicable')
    ) then
      raise exception 'legal_review_items_not_approved';
    end if;
    if nullif(btrim(coalesce(v_release.reviewer_label, '')), '') is null
       or nullif(btrim(coalesce(v_release.approval_evidence_ref, '')), '') is null
       or nullif(btrim(coalesce(v_release.source_commit_sha, '')), '') is null
       or nullif(btrim(coalesce(target_payload ->> 'approvedByLabel', '')), '') is null then
      raise exception 'legal_approval_evidence_required';
    end if;

    update public.admin_legal_release
    set
      status = 'approved',
      approved_by_label = nullif(btrim(target_payload ->> 'approvedByLabel'), ''),
      approved_by_account_id = target_admin_account_id,
      approved_at = v_now,
      updated_by_account_id = target_admin_account_id,
      updated_at = v_now
    where id = target_release_id;

  elsif target_action = 'reopen' then
    if v_release.status <> 'approved' then
      raise exception 'only_approved_legal_release_can_reopen';
    end if;
    update public.admin_legal_release
    set
      status = 'changes_requested',
      approved_by_label = null,
      approved_by_account_id = null,
      approved_at = null,
      updated_by_account_id = target_admin_account_id,
      updated_at = v_now
    where id = target_release_id;

  else
    raise exception 'unsupported_legal_review_action';
  end if;

  insert into audit.admin_audit_log (
    action,
    admin_account_id,
    metadata,
    target_id,
    target_table
  )
  values (
    'legal_review_' || target_action,
    target_admin_account_id,
    jsonb_build_object(
      'itemKey', target_item_key,
      'changedFields', coalesce(
        (
          select jsonb_agg(field_name order by field_name)
          from jsonb_object_keys(target_payload) as fields(field_name)
        ),
        '[]'::jsonb
      ),
      'status', target_payload ->> 'status',
      'releaseKey', v_release.release_key
    ),
    coalesce(v_item_id, target_release_id),
    case
      when target_action = 'update_item' then 'public.admin_legal_review_item'
      else 'public.admin_legal_release'
    end
  );

  return jsonb_build_object('ok', true, 'releaseId', target_release_id);
end;
$$;

revoke all on function public.admin_manage_legal_review(
  uuid, text, uuid, text, jsonb
) from public, anon, authenticated;

grant execute on function public.admin_manage_legal_review(
  uuid, text, uuid, text, jsonb
) to service_role;

notify pgrst, 'reload schema';

commit;
