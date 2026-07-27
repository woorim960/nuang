begin;

create table if not exists feed.official_community_content (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (
    content_type in ('balance_game', 'daily_question')
  ),
  prompt_key text not null unique check (
    char_length(trim(prompt_key)) between 8 and 128
  ),
  title text not null check (char_length(trim(title)) between 2 and 80),
  prompt text not null check (char_length(trim(prompt)) between 4 and 160),
  body text not null default '' check (char_length(body) <= 800),
  options jsonb not null default '[]'::jsonb check (
    jsonb_typeof(options) = 'array'
  ),
  lifecycle_status text not null default 'draft' check (
    lifecycle_status in ('draft', 'scheduled', 'published', 'closed', 'archived')
  ),
  scheduled_for timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  archived_at timestamptz,
  post_id uuid unique references feed.feed_post(id) on delete set null,
  poll_id uuid unique references feed.feed_poll(id) on delete set null,
  revision integer not null default 1 check (revision > 0),
  created_by_account_id uuid references identity.account(id),
  updated_by_account_id uuid references identity.account(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (content_type = 'daily_question' and jsonb_array_length(options) = 0)
    or
    (content_type = 'balance_game' and jsonb_array_length(options) = 2)
  ),
  check (
    lifecycle_status <> 'scheduled'
    or scheduled_for is not null
  )
);

create index if not exists official_community_content_status_idx
on feed.official_community_content(content_type, lifecycle_status, scheduled_for, updated_at desc);

alter table feed.official_community_content enable row level security;

revoke all on feed.official_community_content
from public, anon, authenticated;

grant select, insert, update, delete
on feed.official_community_content
to service_role;

comment on table feed.official_community_content is
  'Canonical operations record for NUANG-authored balance games and daily questions. Publishing synchronizes each record to the existing feed post and poll tables.';

insert into feed.official_community_content (
  content_type,
  prompt_key,
  title,
  prompt,
  body,
  options,
  lifecycle_status,
  published_at,
  post_id,
  poll_id
)
select
  'balance_game',
  poll.prompt_id,
  '갑자기 생긴 하루의 여유',
  poll.question,
  post.body,
  coalesce((
    select jsonb_agg(
      jsonb_build_object('key', option.option_key, 'label', option.label)
      order by option.sort_order
    )
    from feed.feed_poll_option option
    where option.poll_id = poll.id
  ), '[]'::jsonb),
  case when poll.status = 'active' then 'published' else 'closed' end,
  coalesce(post.published_at, poll.created_at),
  post.id,
  poll.id
from feed.feed_poll poll
join feed.feed_post post on post.id = poll.post_id
where post.source = 'balance_game'
  and poll.deleted_at is null
  and (
    select count(*)
    from feed.feed_poll_option option
    where option.poll_id = poll.id
  ) = 2
on conflict (prompt_key) do update
set
  post_id = excluded.post_id,
  poll_id = excluded.poll_id,
  updated_at = now();

create or replace function feed.publish_official_community_content(
  target_content_id uuid,
  target_actor_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = feed, identity, public, pg_temp
as $$
declare
  content_record feed.official_community_content%rowtype;
  resolved_post_id uuid;
  resolved_poll_id uuid;
begin
  select *
  into content_record
  from feed.official_community_content
  where id = target_content_id
  for update;

  if not found then
    raise exception 'community_content_not_found';
  end if;
  if content_record.lifecycle_status not in ('draft', 'scheduled') then
    raise exception 'community_content_not_publishable';
  end if;

  update feed.feed_poll
  set status = 'closed', closed_at = coalesce(closed_at, now())
  where id in (
    select existing.poll_id
    from feed.official_community_content existing
    where existing.content_type = content_record.content_type
      and existing.lifecycle_status = 'published'
      and existing.id <> content_record.id
      and existing.poll_id is not null
  );

  update feed.official_community_content
  set
    lifecycle_status = 'closed',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
  where content_type = content_record.content_type
    and lifecycle_status = 'published'
    and id <> content_record.id;

  resolved_post_id := content_record.post_id;
  if resolved_post_id is null then
    insert into feed.feed_post (
      author_account_id,
      source,
      source_id,
      body,
      visibility,
      moderation_status,
      attachment_payload,
      public_projection_payload,
      published_at
    )
    values (
      '4d3e7a61-7e8c-4a09-9f7a-3c607bd20801',
      content_record.content_type,
      content_record.prompt_key,
      case
        when content_record.content_type = 'daily_question' then content_record.prompt
        when trim(content_record.body) = '' then content_record.prompt
        else content_record.body
      end,
      'public',
      'published',
      '[]'::jsonb,
      jsonb_build_object(
        'authorHandle', 'nuang.official',
        'authorName', 'NUANG',
        'officialContentId', content_record.id,
        'officialContentTitle', content_record.title
      ),
      now()
    )
    returning id into resolved_post_id;
  else
    update feed.feed_post
    set
      source = content_record.content_type,
      source_id = content_record.prompt_key,
      body = case
        when content_record.content_type = 'daily_question' then content_record.prompt
        when trim(content_record.body) = '' then content_record.prompt
        else content_record.body
      end,
      visibility = 'public',
      moderation_status = 'published',
      limited_at = null,
      removed_at = null,
      published_at = coalesce(published_at, now()),
      public_projection_payload = public_projection_payload || jsonb_build_object(
        'authorHandle', 'nuang.official',
        'authorName', 'NUANG',
        'officialContentId', content_record.id,
        'officialContentTitle', content_record.title
      )
    where id = resolved_post_id;
  end if;

  if content_record.content_type = 'balance_game' then
    resolved_poll_id := content_record.poll_id;
    if resolved_poll_id is null then
      insert into feed.feed_poll (
        post_id,
        prompt_id,
        question,
        status
      )
      values (
        resolved_post_id,
        content_record.prompt_key,
        content_record.prompt,
        'active'
      )
      returning id into resolved_poll_id;
    else
      update feed.feed_poll
      set
        prompt_id = content_record.prompt_key,
        question = content_record.prompt,
        status = 'active',
        closed_at = null,
        deleted_at = null
      where id = resolved_poll_id;
    end if;

    delete from feed.feed_poll_option
    where poll_id = resolved_poll_id;

    insert into feed.feed_poll_option (
      poll_id,
      option_key,
      label,
      sort_order
    )
    select
      resolved_poll_id,
      option_value ->> 'key',
      option_value ->> 'label',
      option_order::smallint
    from jsonb_array_elements(content_record.options)
      with ordinality as option_row(option_value, option_order);
  else
    resolved_poll_id := null;
  end if;

  update feed.official_community_content
  set
    lifecycle_status = 'published',
    scheduled_for = null,
    published_at = now(),
    closed_at = null,
    archived_at = null,
    post_id = resolved_post_id,
    poll_id = resolved_poll_id,
    updated_by_account_id = target_actor_account_id,
    updated_at = now()
  where id = content_record.id;

  return jsonb_build_object(
    'contentId', content_record.id,
    'postId', resolved_post_id,
    'pollId', resolved_poll_id
  );
end;
$$;

revoke all on function feed.publish_official_community_content(uuid, uuid)
from public, anon, authenticated;

create or replace function public.get_admin_community_content_dashboard()
returns jsonb
language sql
stable
security definer
set search_path = feed, public
as $$
  select jsonb_build_object(
    'counts',
    jsonb_build_object(
      'draft', count(*) filter (where content.lifecycle_status = 'draft'),
      'scheduled', count(*) filter (where content.lifecycle_status = 'scheduled'),
      'published', count(*) filter (where content.lifecycle_status = 'published'),
      'closed', count(*) filter (where content.lifecycle_status = 'closed'),
      'archived', count(*) filter (where content.lifecycle_status = 'archived')
    ),
    'items',
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', content.id,
        'contentType', content.content_type,
        'promptKey', content.prompt_key,
        'title', content.title,
        'prompt', content.prompt,
        'body', content.body,
        'options', content.options,
        'status', content.lifecycle_status,
        'scheduledFor', content.scheduled_for,
        'publishedAt', content.published_at,
        'closedAt', content.closed_at,
        'postId', content.post_id,
        'pollId', content.poll_id,
        'revision', content.revision,
        'voteCount', (
          select count(*)
          from feed.feed_poll_vote vote
          where vote.poll_id = content.poll_id
            and vote.deleted_at is null
        ),
        'replyCount', (
          select count(*)
          from feed.feed_comment reply
          where reply.post_id = content.post_id
            and reply.deleted_at is null
            and reply.moderation_status <> 'removed'
        ),
        'createdAt', content.created_at,
        'updatedAt', content.updated_at
      )
      order by
        case content.lifecycle_status
          when 'published' then 0
          when 'scheduled' then 1
          when 'draft' then 2
          when 'closed' then 3
          else 4
        end,
        coalesce(content.scheduled_for, content.updated_at) desc
    ), '[]'::jsonb)
  )
  from feed.official_community_content content;
$$;

revoke all on function public.get_admin_community_content_dashboard()
from public, anon, authenticated;
grant execute on function public.get_admin_community_content_dashboard()
to service_role;

create or replace function public.admin_manage_community_content(
  target_payload jsonb,
  target_admin_account_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = feed, audit, identity, public, pg_temp
as $$
declare
  target_action text := target_payload ->> 'action';
  target_content_id uuid;
  content_record feed.official_community_content%rowtype;
  result_payload jsonb;
  schedule_at timestamptz;
begin
  if target_admin_account_id is null or not exists (
    select 1 from identity.account
    where id = target_admin_account_id and status = 'active'
  ) then
    raise exception 'active_admin_account_required';
  end if;

  if target_payload ? 'contentId' then
    target_content_id := (target_payload ->> 'contentId')::uuid;
  end if;

  if target_action = 'create' then
    insert into feed.official_community_content (
      content_type,
      prompt_key,
      title,
      prompt,
      body,
      options,
      created_by_account_id,
      updated_by_account_id
    )
    values (
      target_payload ->> 'contentType',
      'official_' || (target_payload ->> 'contentType') || '_' ||
        replace(gen_random_uuid()::text, '-', ''),
      target_payload ->> 'title',
      target_payload ->> 'prompt',
      coalesce(target_payload ->> 'body', ''),
      coalesce(target_payload -> 'options', '[]'::jsonb),
      target_admin_account_id,
      target_admin_account_id
    )
    returning * into content_record;
    target_content_id := content_record.id;

  elsif target_action = 'update' then
    update feed.official_community_content
    set
      content_type = target_payload ->> 'contentType',
      title = target_payload ->> 'title',
      prompt = target_payload ->> 'prompt',
      body = coalesce(target_payload ->> 'body', ''),
      options = coalesce(target_payload -> 'options', '[]'::jsonb),
      revision = revision + 1,
      updated_by_account_id = target_admin_account_id,
      updated_at = now()
    where id = target_content_id
      and lifecycle_status in ('draft', 'scheduled')
    returning * into content_record;
    if not found then raise exception 'community_content_not_editable'; end if;

  elsif target_action = 'schedule' then
    schedule_at := (target_payload ->> 'scheduledFor')::timestamptz;
    if schedule_at <= now() + interval '1 minute' then
      raise exception 'community_content_schedule_too_soon';
    end if;
    update feed.official_community_content
    set
      lifecycle_status = 'scheduled',
      scheduled_for = schedule_at,
      updated_by_account_id = target_admin_account_id,
      updated_at = now()
    where id = target_content_id
      and lifecycle_status in ('draft', 'scheduled')
    returning * into content_record;
    if not found then raise exception 'community_content_not_schedulable'; end if;

  elsif target_action = 'publish' then
    result_payload := feed.publish_official_community_content(
      target_content_id,
      target_admin_account_id
    );
    select * into content_record
    from feed.official_community_content where id = target_content_id;

  elsif target_action = 'close' then
    update feed.feed_poll
    set status = 'closed', closed_at = coalesce(closed_at, now())
    where id = (
      select poll_id from feed.official_community_content
      where id = target_content_id
    );
    update feed.official_community_content
    set
      lifecycle_status = 'closed',
      closed_at = now(),
      updated_by_account_id = target_admin_account_id,
      updated_at = now()
    where id = target_content_id
      and lifecycle_status in ('published', 'scheduled')
    returning * into content_record;
    if not found then raise exception 'community_content_not_closable'; end if;

  elsif target_action = 'archive' then
    update feed.feed_poll
    set status = 'removed', deleted_at = coalesce(deleted_at, now())
    where id = (
      select poll_id from feed.official_community_content
      where id = target_content_id
    );
    update feed.feed_post
    set moderation_status = 'removed', removed_at = coalesce(removed_at, now())
    where id = (
      select post_id from feed.official_community_content
      where id = target_content_id
    );
    update feed.official_community_content
    set
      lifecycle_status = 'archived',
      archived_at = now(),
      scheduled_for = null,
      updated_by_account_id = target_admin_account_id,
      updated_at = now()
    where id = target_content_id
      and lifecycle_status <> 'archived'
    returning * into content_record;
    if not found then raise exception 'community_content_not_archivable'; end if;

  elsif target_action = 'duplicate' then
    select * into content_record
    from feed.official_community_content where id = target_content_id;
    if not found then raise exception 'community_content_not_found'; end if;
    insert into feed.official_community_content (
      content_type,
      prompt_key,
      title,
      prompt,
      body,
      options,
      created_by_account_id,
      updated_by_account_id
    )
    values (
      content_record.content_type,
      'official_' || content_record.content_type || '_' ||
        replace(gen_random_uuid()::text, '-', ''),
      left(content_record.title || ' 복사본', 80),
      content_record.prompt,
      content_record.body,
      content_record.options,
      target_admin_account_id,
      target_admin_account_id
    )
    returning * into content_record;
    target_content_id := content_record.id;

  elsif target_action = 'delete_draft' then
    select * into content_record
    from feed.official_community_content
    where id = target_content_id and lifecycle_status = 'draft'
    for update;
    if not found then raise exception 'community_content_draft_not_found'; end if;

  else
    raise exception 'unsupported_community_content_action';
  end if;

  insert into audit.admin_audit_log (
    admin_account_id,
    action,
    target_table,
    target_id,
    metadata
  )
  values (
    target_admin_account_id,
    'community_content_' || target_action,
    'feed.official_community_content',
    target_content_id,
    jsonb_build_object(
      'content_type', content_record.content_type,
      'previous_or_current_status', content_record.lifecycle_status,
      'prompt_key', content_record.prompt_key,
      'revision', content_record.revision
    )
  );

  if target_action = 'delete_draft' then
    delete from feed.official_community_content where id = target_content_id;
  end if;

  return coalesce(result_payload, '{}'::jsonb) || jsonb_build_object(
    'contentId', target_content_id,
    'ok', true
  );
end;
$$;

revoke all on function public.admin_manage_community_content(jsonb, uuid)
from public, anon, authenticated;
grant execute on function public.admin_manage_community_content(jsonb, uuid)
to service_role;

create or replace function public.publish_due_official_community_content()
returns integer
language plpgsql
security definer
set search_path = feed, audit, public, pg_temp
as $$
declare
  due_content record;
  published_count integer := 0;
begin
  for due_content in
    select id, created_by_account_id
    from feed.official_community_content
    where lifecycle_status = 'scheduled'
      and scheduled_for <= now()
    order by scheduled_for
    for update skip locked
  loop
    begin
      perform feed.publish_official_community_content(
        due_content.id,
        due_content.created_by_account_id
      );
      insert into audit.admin_audit_log (
        admin_account_id,
        action,
        target_table,
        target_id,
        metadata
      )
      values (
        due_content.created_by_account_id,
        'community_content_auto_published',
        'feed.official_community_content',
        due_content.id,
        jsonb_build_object('source', 'scheduled_job')
      );
      published_count := published_count + 1;
    exception when others then
      raise warning 'Unable to publish scheduled community content %: %',
        due_content.id, sqlerrm;
    end;
  end loop;
  return published_count;
end;
$$;

revoke all on function public.publish_due_official_community_content()
from public, anon, authenticated;
grant execute on function public.publish_due_official_community_content()
to service_role;

do $$
declare
  schedule_missing boolean := false;
begin
  begin
    execute 'create extension if not exists pg_cron with schema extensions';
  exception
    when others then
      raise notice 'pg_cron is unavailable; scheduled content can still be published manually. %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $query$
      select not exists (
        select 1 from cron.job
        where jobname = 'nuang-publish-due-community-content'
      )
    $query$ into schedule_missing;
  end if;

  if schedule_missing then
    execute $schedule$
      select cron.schedule(
        'nuang-publish-due-community-content',
        '* * * * *',
        'select public.publish_due_official_community_content();'
      )
    $schedule$;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
