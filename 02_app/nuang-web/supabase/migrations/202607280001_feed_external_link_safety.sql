begin;

create table if not exists feed.link_domain_policy (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique check (
    domain = lower(domain)
    and domain !~ '[/@:[:space:]]'
    and char_length(domain) between 3 and 253
  ),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  category text not null check (char_length(trim(category)) between 1 and 80),
  status text not null default 'verified' check (
    status in ('verified', 'blocked', 'suspended')
  ),
  allow_subdomains boolean not null default false,
  allow_preview boolean not null default false,
  source text not null default 'admin' check (
    source in ('admin', 'bundled_seed')
  ),
  verified_at timestamptz,
  review_due_at timestamptz,
  created_by_account_id uuid references identity.account(id),
  updated_by_account_id uuid references identity.account(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feed.feed_external_link (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references feed.feed_post(id) on delete cascade,
  comment_id uuid references feed.feed_comment(id) on delete cascade,
  original_url text not null check (char_length(original_url) between 4 and 2048),
  normalized_url text not null check (char_length(normalized_url) between 8 and 2048),
  hostname text not null check (
    hostname = lower(hostname)
    and char_length(hostname) between 1 and 253
  ),
  review_status text not null default 'pending' check (
    review_status in ('trusted', 'pending', 'approved', 'blocked')
  ),
  domain_policy_id uuid references feed.link_domain_policy(id) on delete set null,
  reviewed_by_account_id uuid references identity.account(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((post_id is not null)::integer + (comment_id is not null)::integer = 1)
);

create unique index if not exists feed_external_link_post_url_unique
on feed.feed_external_link(post_id, normalized_url)
where post_id is not null;

create unique index if not exists feed_external_link_comment_url_unique
on feed.feed_external_link(comment_id, normalized_url)
where comment_id is not null;

create index if not exists feed_external_link_review_queue_idx
on feed.feed_external_link(review_status, created_at)
where review_status = 'pending';

create index if not exists feed_external_link_hostname_idx
on feed.feed_external_link(hostname, review_status);

alter table feed.link_domain_policy enable row level security;
alter table feed.feed_external_link enable row level security;

revoke all on feed.link_domain_policy
from public, anon, authenticated;
revoke all on feed.feed_external_link
from public, anon, authenticated;

grant select, insert, update, delete
on feed.link_domain_policy
to service_role;
grant select, insert, update, delete
on feed.feed_external_link
to service_role;

comment on table feed.link_domain_policy is
  'Admin-managed exact-domain trust policy. A verified domain enables navigation only; it does not certify user-generated content hosted by that platform.';

comment on table feed.feed_external_link is
  'Per-post and per-comment external URLs. Unknown links remain non-clickable until a domain or individual URL is approved.';

notify pgrst, 'reload schema';

commit;
