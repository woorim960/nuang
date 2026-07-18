create schema if not exists feed;

create table feed.feed_post (
  id uuid primary key default gen_random_uuid(),
  author_account_id uuid not null references identity.account(id) on delete cascade,
  source text not null check (
    source in (
      'daily_mood',
      'daily_question',
      'trait_card',
      'map_reflection',
      'free_text'
    )
  ),
  source_id text,
  body text not null check (char_length(trim(body)) between 1 and 800),
  visibility text not null default 'public' check (
    visibility in ('public', 'profile_public', 'private_draft')
  ),
  moderation_status text not null default 'pending_review' check (
    moderation_status in ('pending_review', 'published', 'limited', 'removed')
  ),
  attachment_payload jsonb not null default '[]'::jsonb,
  public_projection_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  limited_at timestamptz,
  removed_at timestamptz,
  deleted_at timestamptz,
  check (jsonb_typeof(attachment_payload) = 'array'),
  check (jsonb_typeof(public_projection_payload) = 'object')
);

create table feed.feed_comment (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references feed.feed_post(id) on delete cascade,
  author_account_id uuid not null references identity.account(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 400),
  moderation_status text not null default 'pending_review' check (
    moderation_status in ('pending_review', 'published', 'limited', 'removed')
  ),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  limited_at timestamptz,
  removed_at timestamptz,
  deleted_at timestamptz
);

create table feed.feed_reaction (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  target_type text not null check (target_type in ('feed_post', 'feed_comment')),
  target_id uuid not null,
  reaction text not null check (reaction in ('like', 'same', 'curious', 'support')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (account_id, target_type, target_id, reaction)
);

create table feed.feed_bookmark (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  post_id uuid not null references feed.feed_post(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (account_id, post_id)
);

create index feed_post_visible_idx
on feed.feed_post(moderation_status, visibility, published_at desc, created_at desc)
where deleted_at is null;

create index feed_post_author_idx
on feed.feed_post(author_account_id, created_at desc);

create index feed_comment_post_idx
on feed.feed_comment(post_id, created_at desc)
where deleted_at is null;

create index feed_reaction_target_idx
on feed.feed_reaction(target_type, target_id, created_at desc)
where deleted_at is null;

create index feed_bookmark_account_idx
on feed.feed_bookmark(account_id, created_at desc)
where deleted_at is null;

alter table feed.feed_post enable row level security;
alter table feed.feed_comment enable row level security;
alter table feed.feed_reaction enable row level security;
alter table feed.feed_bookmark enable row level security;

create policy "feed published post read"
on feed.feed_post
for select
using (
  moderation_status = 'published'
  and visibility in ('public', 'profile_public')
  and deleted_at is null
);

create policy "feed own post read"
on feed.feed_post
for select
using (author_account_id = identity.current_account_id());

create policy "feed published comment read"
on feed.feed_comment
for select
using (
  moderation_status = 'published'
  and deleted_at is null
);

create policy "feed own comment read"
on feed.feed_comment
for select
using (author_account_id = identity.current_account_id());

create policy "feed own reaction read"
on feed.feed_reaction
for select
using (account_id = identity.current_account_id());

create policy "feed own bookmark read"
on feed.feed_bookmark
for select
using (account_id = identity.current_account_id());
