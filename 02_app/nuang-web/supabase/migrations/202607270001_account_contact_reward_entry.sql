-- Keep a member's private contact in identity, never in the public community
-- profile or research response store. Event entries reference the account and
-- a one-way contact hash only.

alter table identity.contact_profile
  add column if not exists mobile_phone_ciphertext text,
  add column if not exists mobile_phone_lookup_hash text,
  add column if not exists mobile_phone_status text not null default 'missing',
  add column if not exists mobile_phone_source text,
  add column if not exists mobile_phone_consent_version text,
  add column if not exists mobile_phone_registered_at timestamptz,
  add column if not exists mobile_phone_updated_at timestamptz,
  add column if not exists mobile_phone_verified_at timestamptz;

alter table identity.contact_profile
  drop constraint if exists contact_profile_mobile_phone_hash_check,
  add constraint contact_profile_mobile_phone_hash_check
    check (
      mobile_phone_lookup_hash is null
      or mobile_phone_lookup_hash ~ '^[a-f0-9]{64}$'
    ),
  drop constraint if exists contact_profile_mobile_phone_status_check,
  add constraint contact_profile_mobile_phone_status_check
    check (mobile_phone_status in ('missing', 'unverified', 'verified')),
  drop constraint if exists contact_profile_mobile_phone_source_check,
  add constraint contact_profile_mobile_phone_source_check
    check (
      mobile_phone_source is null
      or mobile_phone_source in ('profile', 'event_entry', 'provider')
    ),
  drop constraint if exists contact_profile_mobile_phone_consistency_check,
  add constraint contact_profile_mobile_phone_consistency_check
    check (
      (
        mobile_phone_status = 'missing'
        and mobile_phone_ciphertext is null
        and mobile_phone_lookup_hash is null
      )
      or (
        mobile_phone_status in ('unverified', 'verified')
        and mobile_phone_ciphertext is not null
        and mobile_phone_lookup_hash is not null
        and mobile_phone_consent_version is not null
        and mobile_phone_registered_at is not null
        and mobile_phone_updated_at is not null
      )
    );

create unique index if not exists contact_profile_mobile_phone_unique_idx
on identity.contact_profile (mobile_phone_lookup_hash)
where mobile_phone_lookup_hash is not null;

comment on column identity.contact_profile.mobile_phone_ciphertext is
  'Private account phone encrypted with account-bound AES-256-GCM. Never include in public profile snapshots.';
comment on column identity.contact_profile.mobile_phone_lookup_hash is
  'One-way normalized phone lookup hash used for duplicate prevention.';
comment on column identity.contact_profile.mobile_phone_status is
  'MVP stores unverified; verified is reserved for the post-MVP SMS verification flow.';

alter table public.research_gate_c_reward_entry
  add column if not exists account_id uuid
    references identity.account(id) on delete cascade;

alter table public.research_gate_c_reward_entry
  alter column contact_ciphertext drop not null,
  alter column withdrawal_secret_hash drop not null;

create unique index if not exists research_gate_c_reward_account_unique_idx
on public.research_gate_c_reward_entry (campaign_id, account_id)
where account_id is not null;

comment on column public.research_gate_c_reward_entry.account_id is
  'Authenticated member that entered the campaign. Research responses remain in the separate anonymous Gate C store.';
comment on column public.research_gate_c_reward_entry.contact_lookup_hash is
  'Snapshot of the member private contact hash for campaign duplicate prevention. The encrypted phone remains only in identity.contact_profile.';
comment on table public.research_gate_c_reward_entry is
  'Account-linked campaign entry store separated from anonymous Gate C responses. It stores no raw research response, participant code, public receipt id, or encrypted phone; the private phone remains only in identity.contact_profile.';
