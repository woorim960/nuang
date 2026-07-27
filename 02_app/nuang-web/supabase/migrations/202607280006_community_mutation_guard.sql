begin;

alter table feed.community_write_bucket
drop constraint if exists community_write_bucket_action_check;

alter table feed.community_write_bucket
add constraint community_write_bucket_action_check
check (
  action in (
    'create_post',
    'create_comment',
    'report_content',
    'report_profile',
    'react',
    'bookmark',
    'not_interested',
    'vote_poll',
    'follow_profile'
  )
);

create or replace function feed.check_community_mutation_guard(
  p_account_id uuid,
  p_action text,
  p_body text default null,
  p_target_type text default null,
  p_target_id uuid default null,
  p_target_key text default null
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
  v_target_valid boolean := false;
begin
  if p_account_id is null
     or not exists (
       select 1
       from identity.account
       where id = p_account_id
         and status = 'active'
         and deleted_at is null
     ) then
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
    when 'report_profile' then
      v_bucket_seconds := 3600;
      v_limit := 10;
    when 'react' then
      v_bucket_seconds := 600;
      v_limit := 120;
    when 'bookmark' then
      v_bucket_seconds := 600;
      v_limit := 60;
    when 'not_interested' then
      v_bucket_seconds := 600;
      v_limit := 60;
    when 'vote_poll' then
      v_bucket_seconds := 600;
      v_limit := 60;
    when 'follow_profile' then
      v_bucket_seconds := 600;
      v_limit := 60;
    else
      return 'target_invalid';
  end case;

  if p_action in (
    'create_comment',
    'report_content',
    'report_profile',
    'react',
    'bookmark',
    'not_interested',
    'vote_poll',
    'follow_profile'
  ) then
    v_target_valid := case
      when p_target_type = 'feed_seed_card'
        and p_action in ('create_comment', 'react', 'bookmark', 'not_interested')
        then p_target_id is null
          and p_target_key is not null
          and char_length(trim(p_target_key)) between 4 and 128
      when p_target_type = 'feed_post'
        and p_action in ('create_comment', 'report_content', 'react', 'bookmark', 'not_interested')
        then p_target_key is null
          and exists (
            select 1
            from feed.feed_post
            where id = p_target_id
              and moderation_status = 'published'
              and visibility in ('public', 'profile_public')
              and deleted_at is null
          )
      when p_target_type = 'feed_comment'
        and p_action in ('report_content', 'react')
        then p_target_key is null
          and exists (
            select 1
            from feed.feed_comment as comment
            where comment.id = p_target_id
              and comment.moderation_status = 'published'
              and comment.deleted_at is null
              and (
                (
                  comment.target_type = 'feed_seed_card'
                  and comment.post_id is null
                  and comment.target_key is not null
                )
                or (
                  comment.target_type = 'feed_post'
                  and comment.target_key is null
                  and exists (
                    select 1
                    from feed.feed_post as parent_post
                    where parent_post.id = comment.post_id
                      and parent_post.moderation_status = 'published'
                      and parent_post.visibility in ('public', 'profile_public')
                      and parent_post.deleted_at is null
                  )
                )
              )
          )
      when p_target_type = 'feed_poll'
        and p_action = 'vote_poll'
        then p_target_key is null
          and exists (
            select 1
            from feed.feed_poll as poll
            join feed.feed_post as poll_post
              on poll_post.id = poll.post_id
            where poll.id = p_target_id
              and poll.status = 'active'
              and poll.deleted_at is null
              and poll_post.moderation_status = 'published'
              and poll_post.visibility in ('public', 'profile_public')
              and poll_post.deleted_at is null
          )
      when p_target_type = 'public_profile'
        and p_action in ('follow_profile', 'report_profile')
        then p_target_key is null
          and exists (
            select 1
            from profile.profile_public_snapshot
            where id = p_target_id
              and status = 'active'
              and revoked_at is null
              and deleted_at is null
          )
      else false
    end;

    if not v_target_valid then
      return 'target_invalid';
    end if;
  elsif p_target_type is not null
     or p_target_id is not null
     or p_target_key is not null then
    return 'target_invalid';
  end if;

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

revoke all on function feed.check_community_mutation_guard(
  uuid,
  text,
  text,
  text,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function feed.check_community_mutation_guard(
  uuid,
  text,
  text,
  text,
  uuid,
  text
) to service_role;

comment on function feed.check_community_mutation_guard(
  uuid,
  text,
  text,
  text,
  uuid,
  text
) is
'Validates active public mutation targets and applies per-account community write quotas. Service-role only.';

notify pgrst, 'reload schema';

commit;
