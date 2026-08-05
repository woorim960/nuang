begin;

create table if not exists public.assessment_content_entry (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('core', 'topic', 'lab', 'together')),
  subtype text not null check (subtype in (
    'core_quick', 'core_precision', 'free_topic', 'odd_lab',
    'balance_pack', 'friend_match'
  )),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 500),
  status text not null default 'draft' check (
    status in ('draft', 'in_review', 'published', 'paused', 'archived')
  ),
  source_origin text not null default 'operator' check (
    source_origin in ('builtin', 'operator')
  ),
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  working_revision integer not null default 1 check (working_revision > 0),
  published_release_id uuid,
  has_unpublished_changes boolean not null default true,
  display_order integer not null default 1000,
  created_by uuid not null references identity.account(id),
  updated_by uuid not null references identity.account(id),
  reviewed_by uuid references identity.account(id),
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  published_at timestamptz,
  paused_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz
);

-- 공개 주소는 보관 후에도 과거 결과와 공유 링크가 참조하므로 다시 쓰지 않는다.
create unique index if not exists assessment_content_entry_slug_uidx
on public.assessment_content_entry(category, slug);

create index if not exists assessment_content_entry_queue_idx
on public.assessment_content_entry(status, category, display_order, updated_at desc)
where deleted_at is null;

create table if not exists public.assessment_content_release (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.assessment_content_entry(id),
  release_number integer not null check (release_number > 0),
  release_key text not null,
  document jsonb not null check (jsonb_typeof(document) = 'object'),
  content_hash text not null check (char_length(content_hash) = 64),
  change_note text not null check (char_length(btrim(change_note)) between 5 and 1000),
  published_by uuid not null references identity.account(id),
  published_at timestamptz not null default now(),
  retired_at timestamptz,
  unique(entry_id, release_number),
  unique(release_key)
);

alter table public.assessment_content_entry
  drop constraint if exists assessment_content_entry_published_release_id_fkey;
alter table public.assessment_content_entry
  add constraint assessment_content_entry_published_release_id_fkey
  foreign key (published_release_id)
  references public.assessment_content_release(id);

alter table if exists assessment.free_topic_result
  add column if not exists assessment_content_release_id uuid
  references public.assessment_content_release(id) on delete restrict;
alter table if exists assessment.lab_result
  add column if not exists assessment_content_release_id uuid
  references public.assessment_content_release(id) on delete restrict;
alter table if exists assessment.assessment_attempt
  add column if not exists assessment_content_release_id uuid
  references public.assessment_content_release(id) on delete restrict;
alter table if exists assessment.account_assessment_progress
  add column if not exists assessment_content_release_id uuid
  references public.assessment_content_release(id) on delete restrict;

create or replace function public.sync_assessment_progress_content_release()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.assessment_content_release_id := nullif(
    new.attempt_payload ->> 'assessmentContentReleaseId',
    ''
  )::uuid;
  return new;
exception when invalid_text_representation then
  raise exception 'assessment_content_release_id_invalid';
end;
$$;

drop trigger if exists account_assessment_progress_content_release_trigger
on assessment.account_assessment_progress;
create trigger account_assessment_progress_content_release_trigger
before insert or update of attempt_payload
on assessment.account_assessment_progress
for each row execute function public.sync_assessment_progress_content_release();
alter table if exists assessment.quality_observation
  add column if not exists assessment_content_release_id uuid
  references public.assessment_content_release(id) on delete restrict;
alter table if exists together_balance.template_version
  add column if not exists assessment_content_release_id uuid
  references public.assessment_content_release(id) on delete restrict;
alter table if exists together_balance.template_version
  add column if not exists title_snapshot text;
alter table if exists together_balance.template_version
  add column if not exists description_snapshot text;
alter table if exists together_balance.template_version
  add column if not exists result_semantics text;
alter table if exists together_balance.item
  add column if not exists relationship_audience text not null default 'all'
  check (relationship_audience in ('all', 'friends', 'couple', 'family', 'team'));
alter table if exists together_balance.item
  add column if not exists phase text not null default 'familiar'
  check (phase in ('familiar', 'everyday', 'conversation'));

update together_balance.template_version version set
  title_snapshot = coalesce(version.title_snapshot, template.title),
  description_snapshot = coalesce(
    version.description_snapshot,
    template.title || ' 밸런스 게임이에요.'
  ),
  result_semantics = coalesce(version.result_semantics, case
    when version.scoring_template = 'relationship_standard' then 'relationship_standard_sync'
    when version.scoring_template = 'ideal_preference' then 'ideal_preference_similarity'
    when version.scoring_template = 'dilemma_fun' then 'choice_chemistry'
    else version.scoring_template
  end)
from together_balance.template template
where template.id = version.template_id;

alter table if exists together_balance.template_version
  alter column title_snapshot set not null;
alter table if exists together_balance.template_version
  alter column description_snapshot set not null;
alter table if exists together_balance.template_version
  alter column result_semantics set not null;

create or replace function public.guard_together_balance_published_content()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    if (tg_table_name = 'template_version' and old.status = 'published')
      or (tg_table_name = 'item' and old.published_at is not null)
      or (tg_table_name = 'session_recipe' and old.status = 'published') then
      raise exception 'together_balance_published_content_is_immutable';
    end if;
    return old;
  end if;
  if (tg_table_name = 'template_version' and old.status = 'published')
    or (tg_table_name = 'item' and old.published_at is not null)
    or (tg_table_name = 'session_recipe' and old.status = 'published') then
    raise exception 'together_balance_published_content_is_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists together_balance_template_version_immutable_trigger
on together_balance.template_version;
create trigger together_balance_template_version_immutable_trigger
before update or delete on together_balance.template_version
for each row execute function public.guard_together_balance_published_content();

drop trigger if exists together_balance_item_immutable_trigger
on together_balance.item;
create trigger together_balance_item_immutable_trigger
before update or delete on together_balance.item
for each row execute function public.guard_together_balance_published_content();

drop trigger if exists together_balance_session_recipe_immutable_trigger
on together_balance.session_recipe;
create trigger together_balance_session_recipe_immutable_trigger
before update or delete on together_balance.session_recipe
for each row execute function public.guard_together_balance_published_content();

create index if not exists assessment_content_release_entry_idx
on public.assessment_content_release(entry_id, release_number desc);

alter table public.assessment_content_entry enable row level security;
alter table public.assessment_content_release enable row level security;

revoke all on public.assessment_content_entry from public, anon, authenticated;
revoke all on public.assessment_content_release from public, anon, authenticated;
grant select, insert, update, delete on public.assessment_content_entry to service_role;
grant select, insert on public.assessment_content_release to service_role;

create or replace function public.guard_assessment_content_release_immutability()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'assessment_content_release_is_immutable';
  end if;
  if (to_jsonb(new) - 'retired_at') <> (to_jsonb(old) - 'retired_at') then
    raise exception 'assessment_content_release_is_immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists assessment_content_release_immutable_trigger
on public.assessment_content_release;
create trigger assessment_content_release_immutable_trigger
before update or delete on public.assessment_content_release
for each row execute function public.guard_assessment_content_release_immutability();

create or replace function public.assert_assessment_content_operator(
  target_account_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, identity
as $$
begin
  if not exists (
    select 1
    from identity.account account
    join identity.operator_account operator
      on operator.account_id = account.id
    where account.id = target_account_id
      and account.status = 'active'
      and account.deleted_at is null
  ) then
    raise exception 'assessment_content_operator_required';
  end if;
end;
$$;

create or replace function public.admin_upsert_assessment_content(
  target_admin_account_id uuid,
  target_entry_id uuid,
  target_category text,
  target_subtype text,
  target_slug text,
  target_title text,
  target_summary text,
  target_document jsonb,
  target_display_order integer,
  target_source_origin text,
  target_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, audit
as $$
declare
  v_entry public.assessment_content_entry%rowtype;
  v_before jsonb;
begin
  perform public.assert_assessment_content_operator(target_admin_account_id);

  if target_category not in ('core', 'topic', 'lab', 'together')
    or target_subtype not in (
      'core_quick', 'core_precision', 'free_topic', 'odd_lab',
      'balance_pack', 'friend_match'
    )
    or target_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(btrim(coalesce(target_title, ''))) not between 1 and 120
    or char_length(coalesce(target_summary, '')) > 500
    or jsonb_typeof(target_document) <> 'object'
    or target_source_origin not in ('builtin', 'operator') then
    raise exception 'assessment_content_invalid';
  end if;

  if target_entry_id is null then
    insert into public.assessment_content_entry (
      category, subtype, slug, title, summary, document, display_order,
      source_origin, created_by, updated_by
    ) values (
      target_category, target_subtype, target_slug, btrim(target_title),
      coalesce(target_summary, ''), target_document,
      greatest(coalesce(target_display_order, 1000), 0),
      target_source_origin, target_admin_account_id, target_admin_account_id
    ) returning * into v_entry;

    insert into audit.admin_audit_log (
      admin_account_id, action, target_table, target_id, metadata
    ) values (
      target_admin_account_id, 'assessment_content_created',
      'public.assessment_content_entry', v_entry.id,
      jsonb_build_object(
        'category', v_entry.category,
        'subtype', v_entry.subtype,
        'slug', v_entry.slug,
        'workingRevision', v_entry.working_revision
      )
    );
  else
    select * into v_entry
    from public.assessment_content_entry
    where id = target_entry_id and deleted_at is null
    for update;

    if not found then raise exception 'assessment_content_not_found'; end if;
    if target_expected_revision is null
      or v_entry.working_revision <> target_expected_revision then
      raise exception 'assessment_content_revision_conflict';
    end if;
    if v_entry.published_release_id is not null and (
      v_entry.category <> target_category
      or v_entry.subtype <> target_subtype
      or v_entry.slug <> target_slug
    ) then
      raise exception 'assessment_content_identity_locked';
    end if;

    v_before := jsonb_build_object(
      'title', v_entry.title,
      'summary', v_entry.summary,
      'status', v_entry.status,
      'workingRevision', v_entry.working_revision
    );

    update public.assessment_content_entry set
      category = target_category,
      subtype = target_subtype,
      slug = target_slug,
      title = btrim(target_title),
      summary = coalesce(target_summary, ''),
      document = target_document,
      display_order = greatest(coalesce(target_display_order, 1000), 0),
      working_revision = working_revision + 1,
      has_unpublished_changes = true,
      reviewed_by = null,
      reviewed_at = null,
      review_note = null,
      status = case when status = 'in_review' then 'draft' else status end,
      updated_by = target_admin_account_id,
      updated_at = now()
    where id = target_entry_id
    returning * into v_entry;

    insert into audit.admin_audit_log (
      admin_account_id, action, target_table, target_id, metadata
    ) values (
      target_admin_account_id, 'assessment_content_updated',
      'public.assessment_content_entry', v_entry.id,
      jsonb_build_object(
        'before', v_before,
        'after', jsonb_build_object(
          'title', v_entry.title,
          'summary', v_entry.summary,
          'status', v_entry.status,
          'workingRevision', v_entry.working_revision
        )
      )
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'entryId', v_entry.id,
    'revision', v_entry.working_revision,
    'status', v_entry.status
  );
end;
$$;

create or replace function public.admin_rollback_assessment_content(
  target_admin_account_id uuid,
  target_entry_id uuid,
  target_release_id uuid,
  target_note text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, audit
as $$
declare
  v_entry public.assessment_content_entry%rowtype;
  v_release public.assessment_content_release%rowtype;
  v_note text := nullif(btrim(target_note), '');
begin
  perform public.assert_assessment_content_operator(target_admin_account_id);
  if v_note is null or char_length(v_note) not between 5 and 1000 then
    raise exception 'assessment_content_note_required';
  end if;

  select * into v_entry
  from public.assessment_content_entry
  where id = target_entry_id and deleted_at is null
  for update;
  if not found then raise exception 'assessment_content_not_found'; end if;

  select * into v_release
  from public.assessment_content_release
  where id = target_release_id and entry_id = target_entry_id;
  if not found or v_entry.published_release_id = target_release_id then
    raise exception 'assessment_content_rollback_unavailable';
  end if;

  update public.assessment_content_release set retired_at = now()
  where entry_id = target_entry_id
    and id = v_entry.published_release_id
    and retired_at is null;
  update public.assessment_content_release set retired_at = null
  where id = target_release_id;

  update public.assessment_content_entry set
    document = v_release.document,
    title = v_release.document ->> 'title',
    summary = v_release.document ->> 'description',
    published_release_id = target_release_id,
    status = 'published',
    has_unpublished_changes = false,
    working_revision = working_revision + 1,
    review_note = v_note,
    published_at = now(),
    paused_at = null,
    updated_by = target_admin_account_id,
    updated_at = now()
  where id = target_entry_id
  returning * into v_entry;

  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id, 'assessment_content_rollback',
    'public.assessment_content_entry', target_entry_id,
    jsonb_build_object(
      'note', v_note,
      'releaseId', target_release_id,
      'releaseKey', v_release.release_key,
      'workingRevision', v_entry.working_revision
    )
  );

  return jsonb_build_object(
    'ok', true,
    'entryId', target_entry_id,
    'releaseId', target_release_id,
    'status', v_entry.status,
    'revision', v_entry.working_revision
  );
end;
$$;

create or replace function public.admin_manage_assessment_content(
  target_admin_account_id uuid,
  target_entry_id uuid,
  target_action text,
  target_note text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, audit, extensions
as $$
declare
  v_entry public.assessment_content_entry%rowtype;
  v_release_id uuid;
  v_release_number integer;
  v_note text := nullif(btrim(target_note), '');
  v_hash text;
begin
  perform public.assert_assessment_content_operator(target_admin_account_id);
  if target_action not in (
    'submit_review', 'return_draft', 'publish', 'pause',
    'archive', 'restore'
  ) then raise exception 'assessment_content_action_invalid'; end if;
  if v_note is null or char_length(v_note) not between 5 and 1000 then
    raise exception 'assessment_content_note_required';
  end if;

  select * into v_entry
  from public.assessment_content_entry
  where id = target_entry_id
  for update;
  if not found then raise exception 'assessment_content_not_found'; end if;

  if target_action = 'submit_review' then
    if v_entry.deleted_at is not null or v_entry.status not in ('draft', 'published', 'paused')
      or not v_entry.has_unpublished_changes then
      raise exception 'assessment_content_review_unavailable';
    end if;
    update public.assessment_content_entry set
      status = 'in_review', review_note = v_note,
      reviewed_by = target_admin_account_id, reviewed_at = now(),
      updated_by = target_admin_account_id, updated_at = now()
    where id = v_entry.id returning * into v_entry;

  elsif target_action = 'return_draft' then
    if v_entry.status <> 'in_review' then
      raise exception 'assessment_content_return_unavailable';
    end if;
    update public.assessment_content_entry set
      status = 'draft', review_note = v_note,
      reviewed_by = null, reviewed_at = null,
      updated_by = target_admin_account_id, updated_at = now()
    where id = v_entry.id returning * into v_entry;

  elsif target_action = 'publish' then
    if v_entry.status <> 'in_review' or not v_entry.has_unpublished_changes then
      raise exception 'assessment_content_publish_unavailable';
    end if;
    select coalesce(max(release_number), 0) + 1 into v_release_number
    from public.assessment_content_release
    where entry_id = v_entry.id;
    v_hash := encode(
      extensions.digest(convert_to(v_entry.document::text, 'UTF8'), 'sha256'),
      'hex'
    );
    insert into public.assessment_content_release (
      entry_id, release_number, release_key, document, content_hash,
      change_note, published_by
    ) values (
      v_entry.id, v_release_number,
      v_entry.category || ':' || v_entry.slug || ':v' || v_release_number,
      v_entry.document, v_hash, v_note, target_admin_account_id
    ) returning id into v_release_id;

    update public.assessment_content_release set retired_at = now()
    where entry_id = v_entry.id and id <> v_release_id and retired_at is null;
    update public.assessment_content_entry set
      status = 'published', published_release_id = v_release_id,
      has_unpublished_changes = false, published_at = now(), paused_at = null,
      updated_by = target_admin_account_id, updated_at = now()
    where id = v_entry.id returning * into v_entry;

  elsif target_action = 'pause' then
    if v_entry.status <> 'published' or v_entry.published_release_id is null then
      raise exception 'assessment_content_pause_unavailable';
    end if;
    update public.assessment_content_entry set
      status = 'paused', paused_at = now(), review_note = v_note,
      updated_by = target_admin_account_id, updated_at = now()
    where id = v_entry.id returning * into v_entry;

  elsif target_action = 'archive' then
    if v_entry.status = 'archived' or v_entry.deleted_at is not null then
      raise exception 'assessment_content_archive_unavailable';
    end if;
    update public.assessment_content_entry set
      status = 'archived', archived_at = now(), deleted_at = now(),
      review_note = v_note, updated_by = target_admin_account_id,
      updated_at = now()
    where id = v_entry.id returning * into v_entry;

  elsif target_action = 'restore' then
    if v_entry.status <> 'archived' or v_entry.deleted_at is null then
      raise exception 'assessment_content_restore_unavailable';
    end if;
    update public.assessment_content_entry set
      status = case when published_release_id is null then 'draft' else 'paused' end,
      archived_at = null, deleted_at = null, review_note = v_note,
      paused_at = case when published_release_id is null then null else now() end,
      updated_by = target_admin_account_id, updated_at = now()
    where id = v_entry.id returning * into v_entry;
  end if;

  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id, 'assessment_content_' || target_action,
    'public.assessment_content_entry', v_entry.id,
    jsonb_build_object(
      'category', v_entry.category,
      'slug', v_entry.slug,
      'note', v_note,
      'releaseId', v_release_id,
      'status', v_entry.status,
      'workingRevision', v_entry.working_revision
    )
  );

  return jsonb_build_object(
    'ok', true,
    'entryId', v_entry.id,
    'releaseId', v_release_id,
    'status', v_entry.status
  );
end;
$$;

create or replace function public.admin_reorder_assessment_content(
  target_admin_account_id uuid,
  target_ordered_entry_ids uuid[],
  target_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, audit
as $$
declare
  v_reason text := nullif(btrim(target_reason), '');
  v_count integer;
begin
  perform public.assert_assessment_content_operator(target_admin_account_id);
  if v_reason is null or char_length(v_reason) not between 5 and 500 then
    raise exception 'assessment_content_note_required';
  end if;
  if coalesce(array_length(target_ordered_entry_ids, 1), 0) = 0 then
    raise exception 'assessment_content_order_empty';
  end if;
  update public.assessment_content_entry entry set
    display_order = ordering.position * 10,
    updated_by = target_admin_account_id,
    updated_at = now()
  from unnest(target_ordered_entry_ids) with ordinality ordering(id, position)
  where entry.id = ordering.id and entry.deleted_at is null;
  get diagnostics v_count = row_count;
  if v_count <> array_length(target_ordered_entry_ids, 1) then
    raise exception 'assessment_content_order_mismatch';
  end if;
  insert into audit.admin_audit_log (
    admin_account_id, action, target_table, target_id, metadata
  ) values (
    target_admin_account_id, 'assessment_content_reordered',
    'public.assessment_content_entry',
    target_ordered_entry_ids[1],
    jsonb_build_object(
      'count', v_count,
      'entryIds', to_jsonb(target_ordered_entry_ids),
      'reason', v_reason
    )
  );
  return jsonb_build_object('ok', true, 'updated', v_count);
end;
$$;

revoke all on function public.assert_assessment_content_operator(uuid)
from public, anon, authenticated;
revoke all on function public.admin_upsert_assessment_content(
  uuid, uuid, text, text, text, text, text, jsonb, integer, text, integer
) from public, anon, authenticated;
revoke all on function public.admin_manage_assessment_content(
  uuid, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.admin_reorder_assessment_content(
  uuid, uuid[], text
) from public, anon, authenticated;
revoke all on function public.admin_rollback_assessment_content(
  uuid, uuid, uuid, text
) from public, anon, authenticated;

grant execute on function public.admin_upsert_assessment_content(
  uuid, uuid, text, text, text, text, text, jsonb, integer, text, integer
) to service_role;
grant execute on function public.admin_manage_assessment_content(
  uuid, uuid, text, text
) to service_role;
grant execute on function public.admin_reorder_assessment_content(
  uuid, uuid[], text
) to service_role;
grant execute on function public.admin_rollback_assessment_content(
  uuid, uuid, uuid, text
) to service_role;

comment on table public.assessment_content_entry is
  'Operator-managed assessment working copies. Built-in content is virtual until first save.';
comment on table public.assessment_content_release is
  'Immutable published assessment snapshots used for rollback and historical result continuity.';

notify pgrst, 'reload schema';

commit;
