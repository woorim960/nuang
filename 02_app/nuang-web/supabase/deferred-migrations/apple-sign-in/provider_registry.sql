begin;

insert into identity.provider_registry (
  provider,
  issuer,
  display_name,
  enabled,
  sign_in_enabled,
  link_enabled,
  verified_email_claim_supported,
  verified_phone_claim_supported,
  automatic_link_level
)
values (
  'apple',
  'https://appleid.apple.com',
  'Apple',
  true,
  true,
  false,
  true,
  false,
  'same_auth_user'
)
on conflict (provider) do update
set
  issuer = excluded.issuer,
  display_name = excluded.display_name,
  enabled = excluded.enabled,
  sign_in_enabled = excluded.sign_in_enabled,
  link_enabled = excluded.link_enabled,
  verified_email_claim_supported = excluded.verified_email_claim_supported,
  verified_phone_claim_supported = excluded.verified_phone_claim_supported,
  automatic_link_level = excluded.automatic_link_level,
  updated_at = now();

alter table identity.provider_profile_snapshot
  drop constraint if exists provider_profile_snapshot_provider_check;

alter table identity.provider_profile_snapshot
  add constraint provider_profile_snapshot_provider_check
    check (provider in ('apple', 'google', 'kakao', 'naver'));

commit;
