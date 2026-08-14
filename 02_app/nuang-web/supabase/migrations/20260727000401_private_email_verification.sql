-- Re-versioned to keep every Supabase migration version unique.
-- Server-only verification challenges for a member's private profile email.
-- Raw codes and raw email addresses are never stored in this table.

create table if not exists identity.email_verification_challenge (
  id uuid primary key,
  account_id uuid not null references identity.account(id) on delete cascade,
  email_hash text not null,
  code_hash text not null,
  status text not null default 'requested',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  provider_message_id text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_verification_challenge_email_hash_check
    check (email_hash ~ '^[a-f0-9]{64}$'),
  constraint email_verification_challenge_code_hash_check
    check (code_hash ~ '^[a-f0-9]{64}$'),
  constraint email_verification_challenge_status_check
    check (
      status in (
        'requested',
        'sent',
        'verified',
        'expired',
        'locked',
        'failed'
      )
    ),
  constraint email_verification_challenge_attempts_check
    check (
      attempt_count >= 0
      and max_attempts between 1 and 10
      and attempt_count <= max_attempts
    ),
  constraint email_verification_challenge_expiry_check
    check (expires_at > requested_at)
);

create index if not exists email_verification_challenge_account_idx
on identity.email_verification_challenge (account_id, requested_at desc);

create index if not exists email_verification_challenge_email_idx
on identity.email_verification_challenge (email_hash, requested_at desc);

alter table identity.email_verification_challenge enable row level security;

comment on table identity.email_verification_challenge is
  'Server-only, short-lived verification state for private profile email. Stores HMAC hashes only; service-role routes enforce account binding, expiry, cooldown and attempt limits.';
