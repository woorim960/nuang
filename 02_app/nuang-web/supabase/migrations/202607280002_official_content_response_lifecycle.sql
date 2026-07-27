begin;

alter table feed.official_community_content
  add column if not exists is_featured boolean not null default false,
  add column if not exists response_closes_at timestamptz;

with latest_published as (
  select distinct on (content_type) id
  from feed.official_community_content
  where lifecycle_status = 'published'
  order by content_type, published_at desc nulls last, updated_at desc
)
update feed.official_community_content content
set is_featured = exists (
  select 1 from latest_published latest where latest.id = content.id
);

create unique index if not exists official_community_content_featured_type_uidx
on feed.official_community_content(content_type)
where is_featured = true and lifecycle_status = 'published';

create or replace function feed.normalize_official_content_feature()
returns trigger
language plpgsql
set search_path = feed, public, pg_temp
as $$
begin
  if new.lifecycle_status <> 'published' then
    new.is_featured := false;
  end if;
  return new;
end;
$$;

drop trigger if exists normalize_official_content_feature_trigger
on feed.official_community_content;
create trigger normalize_official_content_feature_trigger
before insert or update of lifecycle_status, is_featured
on feed.official_community_content
for each row execute function feed.normalize_official_content_feature();

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

  if not found then raise exception 'community_content_not_found'; end if;
  if content_record.lifecycle_status not in ('draft', 'scheduled') then
    raise exception 'community_content_not_publishable';
  end if;
  if content_record.response_closes_at is not null
    and content_record.response_closes_at <= now() then
    raise exception 'community_content_response_close_is_past';
  end if;

  update feed.official_community_content
  set is_featured = false, updated_at = now()
  where content_type = content_record.content_type
    and lifecycle_status = 'published'
    and is_featured = true
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
      insert into feed.feed_poll (post_id, prompt_id, question, status)
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

    delete from feed.feed_poll_option where poll_id = resolved_poll_id;
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
    is_featured = true,
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

create or replace function public.close_due_official_community_content()
returns integer
language plpgsql
security definer
set search_path = feed, audit, public, pg_temp
as $$
declare
  due_content record;
  closed_count integer := 0;
begin
  for due_content in
    select id, poll_id, updated_by_account_id, created_by_account_id
    from feed.official_community_content
    where lifecycle_status = 'published'
      and response_closes_at is not null
      and response_closes_at <= now()
    order by response_closes_at
    for update skip locked
  loop
    update feed.feed_poll
    set status = 'closed', closed_at = coalesce(closed_at, now())
    where id = due_content.poll_id;

    update feed.official_community_content
    set
      lifecycle_status = 'closed',
      closed_at = coalesce(closed_at, now()),
      updated_at = now()
    where id = due_content.id;

    insert into audit.admin_audit_log (
      admin_account_id,
      action,
      target_table,
      target_id,
      metadata
    )
    values (
      coalesce(due_content.updated_by_account_id, due_content.created_by_account_id),
      'community_content_auto_closed',
      'feed.official_community_content',
      due_content.id,
      jsonb_build_object('source', 'scheduled_job')
    );
    closed_count := closed_count + 1;
  end loop;
  return closed_count;
end;
$$;

revoke all on function public.close_due_official_community_content()
from public, anon, authenticated;
grant execute on function public.close_due_official_community_content()
to service_role;

create or replace function feed.reject_closed_official_comment()
returns trigger
language plpgsql
set search_path = feed, public, pg_temp
as $$
begin
  if new.post_id is not null and exists (
    select 1
    from feed.official_community_content content
    where content.post_id = new.post_id
      and (
        content.lifecycle_status in ('closed', 'archived')
        or (
          content.response_closes_at is not null
          and content.response_closes_at <= now()
        )
      )
  ) then
    raise exception 'official_content_response_closed';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_closed_official_comment_trigger
on feed.feed_comment;
create trigger reject_closed_official_comment_trigger
before insert on feed.feed_comment
for each row execute function feed.reject_closed_official_comment();

create or replace function feed.reject_closed_poll_vote()
returns trigger
language plpgsql
set search_path = feed, public, pg_temp
as $$
begin
  if not exists (
    select 1
    from feed.feed_poll poll
    where poll.id = new.poll_id
      and poll.status = 'active'
      and poll.deleted_at is null
  ) or not exists (
    select 1
    from feed.feed_poll_option option
    where option.id = new.option_id and option.poll_id = new.poll_id
  ) or exists (
    select 1
    from feed.official_community_content content
    where content.poll_id = new.poll_id
      and (
        content.lifecycle_status in ('closed', 'archived')
        or (
          content.response_closes_at is not null
          and content.response_closes_at <= now()
        )
      )
  ) then
    raise exception 'feed_poll_closed_or_option_invalid';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_closed_poll_vote_trigger
on feed.feed_poll_vote;
create trigger reject_closed_poll_vote_trigger
before insert or update of option_id, poll_id
on feed.feed_poll_vote
for each row execute function feed.reject_closed_poll_vote();

do $$
declare
  schedule_missing boolean := false;
begin
  begin
    execute 'create extension if not exists pg_cron with schema extensions';
  exception
    when others then
      raise notice 'pg_cron is unavailable; response closing remains available manually. %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    execute $query$
      select not exists (
        select 1 from cron.job
        where jobname = 'nuang-close-due-community-content'
      )
    $query$ into schedule_missing;
  end if;

  if schedule_missing then
    execute $schedule$
      select cron.schedule(
        'nuang-close-due-community-content',
        '* * * * *',
        'select public.close_due_official_community_content();'
      )
    $schedule$;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
