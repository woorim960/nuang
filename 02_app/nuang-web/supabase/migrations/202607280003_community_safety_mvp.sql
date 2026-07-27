begin;

create table if not exists feed.content_report (
  id uuid primary key default gen_random_uuid(),
  reporter_account_id uuid not null references identity.account(id) on delete cascade,
  target_author_account_id uuid not null references identity.account(id) on delete cascade,
  post_id uuid references feed.feed_post(id) on delete cascade,
  comment_id uuid references feed.feed_comment(id) on delete cascade,
  reason text not null check (
    reason in (
      'spam',
      'harassment',
      'hate',
      'sexual_content',
      'violence',
      'privacy',
      'fraud',
      'self_harm',
      'other'
    )
  ),
  details text check (details is null or char_length(details) <= 500),
  severity text not null check (severity in ('low', 'medium', 'high')),
  status text not null default 'queued' check (
    status in ('queued', 'in_review', 'action_required', 'dismissed', 'resolved')
  ),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolved_at timestamptz,
  resolved_by_account_id uuid references identity.account(id),
  resolution_note text check (
    resolution_note is null or char_length(resolution_note) <= 500
  ),
  check ((post_id is not null)::integer + (comment_id is not null)::integer = 1),
  check (reporter_account_id <> target_author_account_id)
);

create index if not exists content_report_status_idx
on feed.content_report(status, severity desc, created_at asc);

create index if not exists content_report_post_idx
on feed.content_report(post_id, created_at desc)
where post_id is not null;

create index if not exists content_report_comment_idx
on feed.content_report(comment_id, created_at desc)
where comment_id is not null;

create unique index if not exists content_report_open_post_reporter_unique
on feed.content_report(reporter_account_id, post_id)
where post_id is not null
and status in ('queued', 'in_review', 'action_required');

create unique index if not exists content_report_open_comment_reporter_unique
on feed.content_report(reporter_account_id, comment_id)
where comment_id is not null
and status in ('queued', 'in_review', 'action_required');

with duplicate_profile_reports as (
  select
    id,
    row_number() over (
      partition by reporter_account_id, target_account_id
      order by created_at asc, id asc
    ) as duplicate_rank
  from feed.profile_report
  where status in ('queued', 'in_review', 'action_required')
)
update feed.profile_report
set
  status = 'dismissed',
  resolved_at = coalesce(resolved_at, now())
where id in (
  select id
  from duplicate_profile_reports
  where duplicate_rank > 1
);

create unique index if not exists profile_report_open_reporter_target_unique
on feed.profile_report(reporter_account_id, target_account_id)
where status in ('queued', 'in_review', 'action_required');

create table if not exists feed.community_write_bucket (
  account_id uuid not null references identity.account(id) on delete cascade,
  action text not null check (action in ('create_post', 'create_comment', 'report_content')),
  bucket_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (account_id, action, bucket_start)
);

create index if not exists community_write_bucket_cleanup_idx
on feed.community_write_bucket(bucket_start);

create or replace function feed.check_community_write_guard(
  p_account_id uuid,
  p_action text,
  p_body text default null
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_bucket_seconds integer;
  v_limit integer;
  v_bucket_start timestamptz;
  v_count integer;
  v_normalized_body text;
begin
  if p_account_id is null then
    return 'account_link_missing';
  end if;

  case p_action
    when 'create_post' then
      v_bucket_seconds := 600;
      v_limit := 6;
    when 'create_comment' then
      v_bucket_seconds := 600;
      v_limit := 30;
    when 'report_content' then
      v_bucket_seconds := 3600;
      v_limit := 10;
    else
      return null;
  end case;

  v_normalized_body := lower(
    regexp_replace(trim(coalesce(p_body, '')), '[[:space:]]+', ' ', 'g')
  );

  if p_action = 'create_post'
     and v_normalized_body <> ''
     and exists (
       select 1
       from feed.feed_post
       where author_account_id = p_account_id
         and lower(regexp_replace(trim(body), '[[:space:]]+', ' ', 'g')) = v_normalized_body
         and created_at >= now() - interval '5 minutes'
         and deleted_at is null
         and moderation_status <> 'removed'
     ) then
    return 'duplicate_content';
  end if;

  if p_action = 'create_comment'
     and v_normalized_body <> ''
     and exists (
       select 1
       from feed.feed_comment
       where author_account_id = p_account_id
         and lower(regexp_replace(trim(body), '[[:space:]]+', ' ', 'g')) = v_normalized_body
         and created_at >= now() - interval '2 minutes'
         and deleted_at is null
         and moderation_status <> 'removed'
     ) then
    return 'duplicate_content';
  end if;

  v_bucket_start := to_timestamp(
    floor(extract(epoch from now()) / v_bucket_seconds) * v_bucket_seconds
  );

  insert into feed.community_write_bucket (
    account_id,
    action,
    bucket_start,
    request_count,
    updated_at
  )
  values (
    p_account_id,
    p_action,
    v_bucket_start,
    1,
    now()
  )
  on conflict (account_id, action, bucket_start)
  do update set
    request_count = feed.community_write_bucket.request_count + 1,
    updated_at = now()
  returning request_count into v_count;

  delete from feed.community_write_bucket
  where bucket_start < now() - interval '2 days';

  if v_count > v_limit then
    return 'rate_limited';
  end if;

  return null;
end;
$$;

create or replace function feed.sync_external_link_target_moderation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, feed
as $$
declare
  v_has_pending boolean;
  v_has_blocked boolean;
  v_next_status text;
begin
  if new.post_id is not null then
    select
      coalesce(bool_or(review_status = 'pending'), false),
      coalesce(bool_or(review_status = 'blocked'), false)
    into v_has_pending, v_has_blocked
    from feed.feed_external_link
    where post_id = new.post_id;

    v_next_status := case
      when v_has_blocked then 'removed'
      when v_has_pending then 'pending_review'
      else 'published'
    end;

    update feed.feed_post
    set
      moderation_status = v_next_status,
      published_at = case
        when v_next_status = 'published' then coalesce(published_at, now())
        else published_at
      end,
      removed_at = case
        when v_next_status = 'removed' then coalesce(removed_at, now())
        when v_next_status = 'published' then null
        else removed_at
      end
    where id = new.post_id
      and deleted_at is null
      and moderation_status in ('pending_review', 'published', 'removed');
  elsif new.comment_id is not null then
    select
      coalesce(bool_or(review_status = 'pending'), false),
      coalesce(bool_or(review_status = 'blocked'), false)
    into v_has_pending, v_has_blocked
    from feed.feed_external_link
    where comment_id = new.comment_id;

    v_next_status := case
      when v_has_blocked then 'removed'
      when v_has_pending then 'pending_review'
      else 'published'
    end;

    update feed.feed_comment
    set
      moderation_status = v_next_status,
      published_at = case
        when v_next_status = 'published' then coalesce(published_at, now())
        else published_at
      end,
      removed_at = case
        when v_next_status = 'removed' then coalesce(removed_at, now())
        when v_next_status = 'published' then null
        else removed_at
      end
    where id = new.comment_id
      and deleted_at is null
      and moderation_status in ('pending_review', 'published', 'removed');
  end if;

  return new;
end;
$$;

drop trigger if exists feed_external_link_moderation_sync
on feed.feed_external_link;

create trigger feed_external_link_moderation_sync
after insert or update of review_status
on feed.feed_external_link
for each row
execute function feed.sync_external_link_target_moderation();

alter table feed.content_report enable row level security;
alter table feed.community_write_bucket enable row level security;

drop policy if exists "feed own content report read" on feed.content_report;
create policy "feed own content report read"
on feed.content_report
for select
using (reporter_account_id = identity.current_account_id());

revoke all on feed.content_report, feed.community_write_bucket
from public, anon, authenticated;
revoke all on function feed.check_community_write_guard(uuid, text, text)
from public, anon, authenticated;

grant select on feed.content_report to authenticated;
grant select, insert, update, delete
on feed.content_report, feed.community_write_bucket
to service_role;
grant execute on function feed.check_community_write_guard(uuid, text, text)
to service_role;

comment on table feed.content_report is
  'User reports for community posts and comments. Open duplicates are prevented per reporter and target.';

comment on function feed.check_community_write_guard(uuid, text, text) is
  'Server-side MVP write quota and short-window duplicate-content guard.';

notify pgrst, 'reload schema';

commit;
