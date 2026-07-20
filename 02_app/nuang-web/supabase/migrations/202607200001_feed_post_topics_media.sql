alter table feed.feed_post
  add column if not exists topic_category text,
  add column if not exists topic_tags text[] not null default '{}'::text[],
  add column if not exists topic_source text not null default 'manual';

alter table feed.feed_post
  drop constraint if exists feed_post_body_check;

alter table feed.feed_post
  add constraint feed_post_body_check
  check (char_length(trim(body)) between 0 and 800);

alter table feed.feed_post
  drop constraint if exists feed_post_topic_category_check;

alter table feed.feed_post
  add constraint feed_post_topic_category_check
  check (
    topic_category is null
    or topic_category in (
      'daily_life',
      'relationships',
      'preferences',
      'thoughts',
      'concerns_questions'
    )
  );

alter table feed.feed_post
  drop constraint if exists feed_post_topic_source_check;

alter table feed.feed_post
  add constraint feed_post_topic_source_check
  check (topic_source in ('manual', 'local_suggestion'));

alter table feed.feed_post
  drop constraint if exists feed_post_topic_tags_check;

alter table feed.feed_post
  add constraint feed_post_topic_tags_check
  check (
    cardinality(topic_tags) <= 8
    and array_position(topic_tags, null) is null
  );

create table if not exists feed.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references feed.feed_post(id) on delete cascade,
  bucket_id text not null default 'feed-media' check (bucket_id = 'feed-media'),
  storage_path text not null,
  sort_order smallint not null check (sort_order between 1 and 19),
  mime_type text not null check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp')
  ),
  byte_size integer not null check (byte_size between 1 and 8388608),
  width integer check (width is null or width between 1 and 12000),
  height integer check (height is null or height between 1 and 12000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (post_id, sort_order),
  unique (storage_path)
);

create index if not exists feed_post_topic_idx
on feed.feed_post(topic_category, published_at desc, created_at desc)
where deleted_at is null;

create index if not exists feed_post_media_post_idx
on feed.feed_post_media(post_id, sort_order)
where deleted_at is null;

alter table feed.feed_post_media enable row level security;

drop policy if exists "feed visible post media read" on feed.feed_post_media;
create policy "feed visible post media read"
on feed.feed_post_media
for select
using (
  deleted_at is null
  and exists (
    select 1
    from feed.feed_post post
    where post.id = feed_post_media.post_id
      and post.deleted_at is null
      and (
        (
          post.moderation_status = 'published'
          and post.visibility in ('public', 'profile_public')
        )
        or post.author_account_id = identity.current_account_id()
      )
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'feed-media',
  'feed-media',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

grant all on feed.feed_post_media to anon, authenticated, service_role;

notify pgrst, 'reload schema';
