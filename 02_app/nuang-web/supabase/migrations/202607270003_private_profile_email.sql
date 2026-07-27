-- A profile email is a private member contact, separate from a social-login
-- provider email. Only masked values may leave the server.

alter table identity.contact_profile
  add column if not exists email_status text not null default 'missing',
  add column if not exists email_source text,
  add column if not exists email_registration_version text,
  add column if not exists email_registered_at timestamptz,
  add column if not exists email_updated_at timestamptz,
  add column if not exists email_verified_at timestamptz;

update identity.contact_profile
set
  email_status = 'unverified',
  email_registration_version = coalesce(
    email_registration_version,
    'LEGACY-PRIVATE-EMAIL'
  ),
  email_registered_at = coalesce(email_registered_at, updated_at),
  email_updated_at = coalesce(email_updated_at, updated_at)
where
  email_hash is not null
  and email_encrypted is not null
  and email_status = 'missing';

alter table identity.contact_profile
  drop constraint if exists contact_profile_email_hash_check,
  add constraint contact_profile_email_hash_check
    check (
      email_hash is null
      or email_hash ~ '^[a-f0-9]{64}$'
    ),
  drop constraint if exists contact_profile_email_status_check,
  add constraint contact_profile_email_status_check
    check (email_status in ('missing', 'unverified', 'verified')),
  drop constraint if exists contact_profile_email_source_check,
  add constraint contact_profile_email_source_check
    check (
      email_source is null
      or email_source in ('profile', 'event_entry', 'provider')
    ),
  drop constraint if exists contact_profile_email_consistency_check,
  add constraint contact_profile_email_consistency_check
    check (
      (
        email_status = 'missing'
        and email_encrypted is null
        and email_hash is null
      )
      or (
        email_status in ('unverified', 'verified')
        and email_encrypted is not null
        and email_hash is not null
        and email_registration_version is not null
        and email_registered_at is not null
        and email_updated_at is not null
      )
    );

create unique index if not exists contact_profile_email_unique_idx
on identity.contact_profile (email_hash)
where email_hash is not null;

comment on column identity.contact_profile.email_encrypted is
  'Private profile email encrypted with account-bound AES-256-GCM. It is separate from the authentication provider email and never public.';
comment on column identity.contact_profile.email_hash is
  'One-way normalized profile email lookup hash used for duplicate prevention.';
comment on column identity.contact_profile.email_status is
  'MVP stores unverified; verified is reserved for a post-MVP email verification flow.';
