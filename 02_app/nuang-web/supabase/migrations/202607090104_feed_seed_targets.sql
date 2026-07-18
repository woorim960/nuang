alter table feed.feed_comment
add column if not exists target_type text not null default 'feed_post',
add column if not exists target_key text;

alter table feed.feed_comment
alter column post_id drop not null;

alter table feed.feed_comment
drop constraint if exists feed_comment_target_type_check;

alter table feed.feed_comment
drop constraint if exists feed_comment_target_shape_check;

alter table feed.feed_comment
add constraint feed_comment_target_type_check
check (target_type in ('feed_post', 'feed_seed_card'));

alter table feed.feed_comment
add constraint feed_comment_target_shape_check
check (
  (
    target_type = 'feed_post'
    and post_id is not null
    and target_key is null
  )
  or (
    target_type = 'feed_seed_card'
    and post_id is null
    and target_key is not null
    and char_length(trim(target_key)) between 4 and 128
  )
);

alter table feed.feed_reaction
add column if not exists target_key text;

alter table feed.feed_reaction
alter column target_id drop not null;

alter table feed.feed_reaction
drop constraint if exists feed_reaction_target_type_check;

alter table feed.feed_reaction
drop constraint if exists feed_reaction_target_shape_check;

alter table feed.feed_reaction
add constraint feed_reaction_target_type_check
check (target_type in ('feed_post', 'feed_comment', 'feed_seed_card'));

alter table feed.feed_reaction
add constraint feed_reaction_target_shape_check
check (
  (
    target_type in ('feed_post', 'feed_comment')
    and target_id is not null
    and target_key is null
  )
  or (
    target_type = 'feed_seed_card'
    and target_id is null
    and target_key is not null
    and char_length(trim(target_key)) between 4 and 128
  )
);

alter table feed.feed_bookmark
add column if not exists target_type text not null default 'feed_post',
add column if not exists target_key text;

alter table feed.feed_bookmark
alter column post_id drop not null;

alter table feed.feed_bookmark
drop constraint if exists feed_bookmark_target_type_check;

alter table feed.feed_bookmark
drop constraint if exists feed_bookmark_target_shape_check;

alter table feed.feed_bookmark
add constraint feed_bookmark_target_type_check
check (target_type in ('feed_post', 'feed_seed_card'));

alter table feed.feed_bookmark
add constraint feed_bookmark_target_shape_check
check (
  (
    target_type = 'feed_post'
    and post_id is not null
    and target_key is null
  )
  or (
    target_type = 'feed_seed_card'
    and post_id is null
    and target_key is not null
    and char_length(trim(target_key)) between 4 and 128
  )
);

create index if not exists feed_comment_seed_target_idx
on feed.feed_comment(target_type, target_key, created_at desc)
where target_type = 'feed_seed_card' and deleted_at is null;

create unique index if not exists feed_reaction_seed_unique_idx
on feed.feed_reaction(account_id, target_type, target_key, reaction)
where target_type = 'feed_seed_card' and deleted_at is null;

create unique index if not exists feed_bookmark_seed_unique_idx
on feed.feed_bookmark(account_id, target_type, target_key)
where target_type = 'feed_seed_card' and deleted_at is null;
