begin;

-- Release 2: one-time, account-bound manual OAuth link intents. The browser
-- receives only an HttpOnly cookie; raw OAuth codes and provider tokens never
-- enter application tables.
create table if not exists identity.identity_link_intent (
  id uuid primary key,
  account_id uuid not null references identity.account(id) on delete cascade,
  initiating_supabase_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null references identity.provider_registry(provider),
  action text not null check (action in ('link', 'merge', 'recovery')),
  nonce_hash text not null check (nonce_hash ~ '^[a-f0-9]{64}$'),
  return_path text not null check (
    char_length(return_path) between 1 and 500
    and return_path like '/%'
    and return_path not like '//%'
  ),
  request_origin text not null check (request_origin ~ '^https?://[^/]+$'),
  status text not null default 'pending'
    check (status in ('pending', 'consumed', 'expired', 'cancelled', 'conflict')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint identity_link_intent_expiry_check check (expires_at > created_at),
  constraint identity_link_intent_consumed_check check (
    (status = 'consumed' and consumed_at is not null)
    or (status <> 'consumed' and consumed_at is null)
  )
);

create index if not exists identity_link_intent_account_pending_idx
on identity.identity_link_intent (account_id, created_at desc)
where status = 'pending';

create index if not exists identity_link_intent_expiry_idx
on identity.identity_link_intent (expires_at)
where status = 'pending';

alter table identity.identity_link_intent enable row level security;
revoke all on identity.identity_link_intent from public, anon, authenticated;

comment on table identity.identity_link_intent is
  'Service-role only OAuth link/merge/recovery intent. Stores an HMAC nonce, exact account, auth user, provider, origin and ten-minute return contract; never stores OAuth tokens or raw codes.';

-- Release 3: verified discovery keys are separate from display contact data.
-- Unverified values are intentionally not unique: ownership must be proven
-- before Nuang reveals or reserves an identifier.
drop index if exists identity.contact_profile_email_unique_idx;
drop index if exists identity.contact_profile_mobile_phone_unique_idx;

create unique index if not exists contact_profile_verified_email_unique_idx
on identity.contact_profile (email_hash)
where email_hash is not null and email_status = 'verified';

create unique index if not exists contact_profile_verified_phone_unique_idx
on identity.contact_profile (mobile_phone_lookup_hash)
where mobile_phone_lookup_hash is not null and mobile_phone_status = 'verified';

alter table identity.contact_profile
  drop constraint if exists contact_profile_email_source_check,
  add constraint contact_profile_email_source_check check (
    email_source is null
    or email_source in ('profile', 'account_security', 'event_entry', 'provider')
  ),
  drop constraint if exists contact_profile_mobile_phone_source_check,
  add constraint contact_profile_mobile_phone_source_check check (
    mobile_phone_source is null
    or mobile_phone_source in ('profile', 'account_security', 'event_entry', 'provider')
  );

create table if not exists identity.account_identifier (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references identity.account(id) on delete cascade,
  kind text not null check (kind in ('email', 'phone')),
  lookup_hmac text not null check (lookup_hmac ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('verified', 'challenged', 'revoked')),
  verification_method text not null check (
    verification_method in ('provider_claim', 'email_otp', 'sms_otp', 'recovery_review')
  ),
  source_provider text references identity.provider_registry(provider),
  issuer text,
  verified_at timestamptz,
  last_confirmed_at timestamptz,
  changed_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_identifier_status_consistency_check check (
    (status = 'verified' and verified_at is not null and revoked_at is null)
    or (status = 'challenged' and verified_at is null and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

create unique index if not exists account_identifier_verified_unique_idx
on identity.account_identifier (kind, lookup_hmac)
where status = 'verified';

create index if not exists account_identifier_account_idx
on identity.account_identifier (account_id, kind, status);

alter table identity.account_identifier enable row level security;
revoke all on identity.account_identifier from public, anon, authenticated;

insert into identity.account_identifier (
  account_id,
  kind,
  lookup_hmac,
  status,
  verification_method,
  verified_at,
  last_confirmed_at,
  changed_at
)
select
  account_id,
  'email',
  email_hash,
  'verified',
  'email_otp',
  email_verified_at,
  email_verified_at,
  coalesce(email_updated_at, email_verified_at, now())
from identity.contact_profile
where email_status = 'verified'
  and email_hash is not null
  and email_verified_at is not null
on conflict do nothing;

-- Release 4: cases and aliases exist before any automatic merge is enabled.
-- The actual FK inventory/move remains feature-disabled until both OAuth
-- proofs and the zero-loss dry-run pass.
create table if not exists identity.account_merge_case (
  id uuid primary key default gen_random_uuid(),
  canonical_account_id uuid not null references identity.account(id),
  source_account_id uuid not null references identity.account(id),
  status text not null default 'proof_required' check (
    status in ('proof_required', 'ready', 'processing', 'completed', 'cancelled', 'blocked', 'rolled_back')
  ),
  idempotency_key uuid not null default gen_random_uuid() unique,
  inventory_summary jsonb not null default '{}'::jsonb,
  conflict_summary jsonb not null default '{}'::jsonb,
  risk_signals jsonb not null default '[]'::jsonb,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  rollback_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_merge_case_distinct_accounts_check
    check (canonical_account_id <> source_account_id)
);

create unique index if not exists account_merge_case_open_pair_idx
on identity.account_merge_case (
  least(canonical_account_id, source_account_id),
  greatest(canonical_account_id, source_account_id)
)
where status in ('proof_required', 'ready', 'processing');

alter table identity.account_alias
  add column if not exists merge_case_id uuid
    references identity.account_merge_case(id),
  add column if not exists revoked_at timestamptz;

alter table identity.account_merge_case enable row level security;
alter table identity.account_alias enable row level security;
revoke all on identity.account_merge_case from public, anon, authenticated;
revoke all on identity.account_alias from public, anon, authenticated;

-- SMS delivery is intentionally disabled until an approved vendor, rate
-- limits and CAPTCHA are configured. This table is only the server-side
-- challenge contract; no route marks a phone verified without delivery.
create table if not exists identity.phone_verification_challenge (
  id uuid primary key,
  account_id uuid not null references identity.account(id) on delete cascade,
  phone_lookup_hmac text not null check (phone_lookup_hmac ~ '^[a-f0-9]{64}$'),
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'requested' check (
    status in ('requested', 'sent', 'verified', 'expired', 'locked', 'failed')
  ),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  requested_at timestamptz not null default now(),
  sent_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  provider_message_id text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phone_verification_attempts_check
    check (attempt_count between 0 and max_attempts),
  constraint phone_verification_expiry_check check (expires_at > requested_at)
);

create index if not exists phone_verification_challenge_account_idx
on identity.phone_verification_challenge (account_id, requested_at desc);

alter table identity.phone_verification_challenge enable row level security;
revoke all on identity.phone_verification_challenge from public, anon, authenticated;

-- RLS bypass does not replace SQL object privileges. These tables stay
-- invisible to browser roles while the server's service-role client receives
-- only the operations required by the link/recovery workflows.
grant select, insert, update on identity.identity_link_intent to service_role;
grant select on identity.account_identifier to service_role;
grant select, insert, update on identity.account_merge_case to service_role;
grant select, insert, update on identity.account_alias to service_role;
grant select, insert, update on identity.phone_verification_challenge to service_role;

create or replace function identity.finalize_verified_account_identifier(
  p_account_id uuid,
  p_kind text,
  p_lookup_hmac text,
  p_verification_method text,
  p_verified_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = identity, public, pg_temp
as $$
declare
  v_existing_account_id uuid;
begin
  if p_kind not in ('email', 'phone')
    or p_lookup_hmac !~ '^[a-f0-9]{64}$'
    or p_verification_method not in ('provider_claim', 'email_otp', 'sms_otp', 'recovery_review')
  then
    raise exception 'invalid_identifier_verification'
      using errcode = '22023';
  end if;

  perform 1 from identity.account where id = p_account_id for update;
  if not found then
    raise exception 'account_not_found' using errcode = 'P0002';
  end if;

  select account_id
    into v_existing_account_id
  from identity.account_identifier
  where kind = p_kind
    and lookup_hmac = p_lookup_hmac
    and status = 'verified'
  limit 1
  for update;

  if v_existing_account_id is not null
    and v_existing_account_id <> p_account_id
  then
    insert into identity.account_merge_case (
      canonical_account_id,
      source_account_id,
      status,
      risk_signals
    )
    values (
      v_existing_account_id,
      p_account_id,
      'proof_required',
      jsonb_build_array('verified_identifier_match_requires_second_account_proof')
    )
    on conflict do nothing;
    return 'existing_account_candidate';
  end if;

  if p_kind = 'email' then
    update identity.contact_profile
    set email_status = 'verified',
        email_verified_at = p_verified_at,
        email_updated_at = p_verified_at,
        updated_at = p_verified_at
    where account_id = p_account_id
      and email_hash = p_lookup_hmac;
  else
    update identity.contact_profile
    set mobile_phone_status = 'verified',
        mobile_phone_verified_at = p_verified_at,
        mobile_phone_updated_at = p_verified_at,
        updated_at = p_verified_at
    where account_id = p_account_id
      and mobile_phone_lookup_hash = p_lookup_hmac;
  end if;

  if not found then
    raise exception 'contact_identifier_changed' using errcode = 'P0001';
  end if;

  insert into identity.account_identifier (
    account_id,
    kind,
    lookup_hmac,
    status,
    verification_method,
    verified_at,
    last_confirmed_at,
    changed_at,
    updated_at
  )
  values (
    p_account_id,
    p_kind,
    p_lookup_hmac,
    'verified',
    p_verification_method,
    p_verified_at,
    p_verified_at,
    p_verified_at,
    p_verified_at
  )
  on conflict (kind, lookup_hmac) where status = 'verified'
  do update set
    last_confirmed_at = excluded.last_confirmed_at,
    updated_at = excluded.updated_at;

  return 'verified';
end;
$$;

revoke all on function identity.finalize_verified_account_identifier(
  uuid,
  text,
  text,
  text,
  timestamptz
) from public, anon, authenticated;
grant execute on function identity.finalize_verified_account_identifier(
  uuid,
  text,
  text,
  text,
  timestamptz
) to service_role;

comment on function identity.finalize_verified_account_identifier(
  uuid,
  text,
  text,
  text,
  timestamptz
) is
  'Atomically reserves a verified identifier or records a proof-required merge candidate. Service role only; never accepts raw contact values.';

notify pgrst, 'reload schema';

commit;
