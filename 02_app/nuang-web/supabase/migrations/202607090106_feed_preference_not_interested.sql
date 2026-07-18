create table if not exists feed.feed_preference (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  target_type text not null check (target_type in ('feed_post', 'feed_seed_card')),
  target_id uuid,
  target_key text,
  preference text not null check (preference in ('not_interested')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (
    (
      target_type = 'feed_post'
      and target_id is not null
      and target_key is null
    )
    or (
      target_type = 'feed_seed_card'
      and target_id is null
      and target_key is not null
      and char_length(trim(target_key)) between 4 and 128
    )
  )
);

create unique index if not exists feed_preference_post_active_unique_idx
on feed.feed_preference(account_id, target_type, target_id, preference)
where target_type = 'feed_post' and deleted_at is null;

create unique index if not exists feed_preference_seed_active_unique_idx
on feed.feed_preference(account_id, target_type, target_key, preference)
where target_type = 'feed_seed_card' and deleted_at is null;

create index if not exists feed_preference_account_idx
on feed.feed_preference(account_id, created_at desc)
where deleted_at is null;

alter table feed.feed_preference enable row level security;

drop policy if exists "feed own preference read" on feed.feed_preference;
create policy "feed own preference read"
on feed.feed_preference
for select
using (account_id = identity.current_account_id());

grant all on feed.feed_preference to anon, authenticated, service_role;

notify pgrst, 'reload schema';
