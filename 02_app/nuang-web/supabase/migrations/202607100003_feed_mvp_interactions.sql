alter table if exists feed.feed_post
  drop constraint if exists feed_post_source_check;

alter table if exists feed.feed_post
  add constraint feed_post_source_check
  check (
    source in (
      'daily_mood',
      'daily_question',
      'trait_card',
      'map_reflection',
      'free_text',
      'balance_game',
      'report_share'
    )
  );

create table if not exists feed.feed_poll (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references feed.feed_post(id) on delete cascade,
  prompt_id text not null check (char_length(trim(prompt_id)) between 4 and 128),
  question text not null check (char_length(trim(question)) between 4 and 160),
  status text not null default 'active' check (status in ('active', 'closed', 'removed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  deleted_at timestamptz,
  unique (post_id)
);

create table if not exists feed.feed_poll_option (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references feed.feed_poll(id) on delete cascade,
  option_key text not null check (char_length(trim(option_key)) between 1 and 64),
  label text not null check (char_length(trim(label)) between 1 and 80),
  sort_order smallint not null check (sort_order between 1 and 8),
  created_at timestamptz not null default now(),
  unique (poll_id, id),
  unique (poll_id, option_key),
  unique (poll_id, sort_order)
);

create table if not exists feed.feed_poll_vote (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references feed.feed_poll(id) on delete cascade,
  option_id uuid not null,
  account_id uuid not null references identity.account(id) on delete cascade,
  nuang_code text check (nuang_code is null or char_length(trim(nuang_code)) between 5 and 16),
  profile_name text check (profile_name is null or char_length(trim(profile_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (poll_id, option_id) references feed.feed_poll_option(poll_id, id) on delete cascade
);

create unique index if not exists feed_poll_vote_active_account_idx
on feed.feed_poll_vote(poll_id, account_id)
where deleted_at is null;

create index if not exists feed_poll_post_idx
on feed.feed_poll(post_id)
where deleted_at is null;

create index if not exists feed_poll_vote_poll_idx
on feed.feed_poll_vote(poll_id, created_at desc)
where deleted_at is null;

create index if not exists feed_poll_vote_code_idx
on feed.feed_poll_vote(poll_id, nuang_code)
where deleted_at is null and nuang_code is not null;

alter table feed.feed_poll enable row level security;
alter table feed.feed_poll_option enable row level security;
alter table feed.feed_poll_vote enable row level security;

drop policy if exists "feed poll public read" on feed.feed_poll;
create policy "feed poll public read"
on feed.feed_poll
for select
using (status = 'active' and deleted_at is null);

drop policy if exists "feed poll option public read" on feed.feed_poll_option;
create policy "feed poll option public read"
on feed.feed_poll_option
for select
using (true);

drop policy if exists "feed own poll vote read" on feed.feed_poll_vote;
create policy "feed own poll vote read"
on feed.feed_poll_vote
for select
using (account_id = identity.current_account_id());

grant all on feed.feed_poll to anon, authenticated, service_role;
grant all on feed.feed_poll_option to anon, authenticated, service_role;
grant all on feed.feed_poll_vote to anon, authenticated, service_role;

notify pgrst, 'reload schema';
