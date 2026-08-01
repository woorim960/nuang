create table if not exists identity.operator_account (
  account_id uuid primary key references identity.account(id) on delete cascade,
  role_label text not null default '뉴앙 운영자'
    check (role_label = '뉴앙 운영자'),
  source text not null default 'admin_allowlist'
    check (source in ('admin_allowlist', 'bootstrap_migration')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table identity.operator_account is
  'Server-controlled public operator badge membership. This table is never a source of administrator authorization.';

alter table identity.operator_account enable row level security;

revoke all on identity.operator_account from public, anon, authenticated;
grant all on identity.operator_account to service_role;

create index if not exists operator_account_updated_idx
on identity.operator_account(updated_at desc);

-- Backfill the initial operator requested for the MVP. Future operators are
-- synchronized from ADMIN_BOOTSTRAP_EMAILS whenever they access the app.
insert into identity.operator_account (
  account_id,
  role_label,
  source,
  updated_at
)
select distinct
  auth_identity.account_id,
  '뉴앙 운영자',
  'bootstrap_migration',
  now()
from auth.users as auth_user
join identity.auth_identity as auth_identity
  on auth_identity.supabase_user_id = auth_user.id
where lower(coalesce(auth_user.email, '')) = 'woorimprog@gmail.com'
  and auth_identity.revoked_at is null
on conflict (account_id) do update
set
  role_label = excluded.role_label,
  source = excluded.source,
  updated_at = excluded.updated_at;
