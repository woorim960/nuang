create table if not exists feed.profile_follow (
  id uuid primary key default gen_random_uuid(),
  follower_account_id uuid not null references identity.account(id) on delete cascade,
  target_account_id uuid not null references identity.account(id) on delete cascade,
  target_public_snapshot_id uuid references profile.profile_public_snapshot(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (follower_account_id, target_account_id),
  check (follower_account_id <> target_account_id)
);

create table if not exists feed.activity_notification (
  id uuid primary key default gen_random_uuid(),
  recipient_account_id uuid not null references identity.account(id) on delete cascade,
  actor_account_id uuid references identity.account(id) on delete set null,
  actor_public_snapshot_id uuid references profile.profile_public_snapshot(id) on delete set null,
  event_type text not null check (
    event_type in ('follow', 'comment', 'reply', 'mention', 'reaction')
  ),
  actor_display_name text not null default '누군가',
  target_type text not null check (
    target_type in ('public_profile', 'feed_post', 'feed_comment')
  ),
  target_id uuid not null,
  preview_text text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  deleted_at timestamptz
);

create table if not exists feed.profile_block (
  id uuid primary key default gen_random_uuid(),
  blocker_account_id uuid not null references identity.account(id) on delete cascade,
  blocked_account_id uuid not null references identity.account(id) on delete cascade,
  target_public_snapshot_id uuid references profile.profile_public_snapshot(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (blocker_account_id, blocked_account_id),
  check (blocker_account_id <> blocked_account_id)
);

create table if not exists feed.profile_report (
  id uuid primary key default gen_random_uuid(),
  reporter_account_id uuid not null references identity.account(id) on delete cascade,
  target_account_id uuid not null references identity.account(id) on delete cascade,
  target_public_snapshot_id uuid references profile.profile_public_snapshot(id) on delete set null,
  reason text not null check (
    reason in ('privacy', 'harassment', 'sensitive_content', 'spam', 'other')
  ),
  details text check (details is null or char_length(details) <= 500),
  severity text not null check (severity in ('low', 'medium', 'high')),
  status text not null default 'queued' check (
    status in ('queued', 'in_review', 'action_required', 'dismissed', 'resolved')
  ),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolved_at timestamptz
);

create index if not exists profile_follow_target_idx
on feed.profile_follow(target_account_id, created_at desc)
where deleted_at is null;

create index if not exists profile_follow_follower_idx
on feed.profile_follow(follower_account_id, created_at desc)
where deleted_at is null;

create index if not exists activity_notification_recipient_idx
on feed.activity_notification(recipient_account_id, created_at desc)
where deleted_at is null;

create index if not exists profile_block_blocker_idx
on feed.profile_block(blocker_account_id, created_at desc)
where deleted_at is null;

create index if not exists profile_report_status_idx
on feed.profile_report(status, created_at asc);

alter table feed.profile_follow enable row level security;
alter table feed.activity_notification enable row level security;
alter table feed.profile_block enable row level security;
alter table feed.profile_report enable row level security;

drop policy if exists "feed own follow read" on feed.profile_follow;
create policy "feed own follow read"
on feed.profile_follow
for select
using (follower_account_id = identity.current_account_id());

drop policy if exists "feed own activity notification read" on feed.activity_notification;
create policy "feed own activity notification read"
on feed.activity_notification
for select
using (recipient_account_id = identity.current_account_id());

drop policy if exists "feed own profile block read" on feed.profile_block;
create policy "feed own profile block read"
on feed.profile_block
for select
using (blocker_account_id = identity.current_account_id());

drop policy if exists "feed own profile report read" on feed.profile_report;
create policy "feed own profile report read"
on feed.profile_report
for select
using (reporter_account_id = identity.current_account_id());

grant usage on schema feed to anon, authenticated, service_role;

grant all on table
  feed.profile_follow,
  feed.activity_notification,
  feed.profile_block,
  feed.profile_report
to anon, authenticated, service_role;

notify pgrst, 'reload schema';
