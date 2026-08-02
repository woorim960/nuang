begin;

-- Corrective migration for environments where 005 was already applied.
-- Browser roles remain revoked; only the trusted server role can access the
-- private workflow tables.
revoke all on identity.identity_link_intent from public, anon, authenticated;
revoke all on identity.account_identifier from public, anon, authenticated;
revoke all on identity.account_merge_case from public, anon, authenticated;
revoke all on identity.account_alias from public, anon, authenticated;
revoke all on identity.phone_verification_challenge from public, anon, authenticated;

grant select, insert, update on identity.identity_link_intent to service_role;
grant select on identity.account_identifier to service_role;
grant select, insert, update on identity.account_merge_case to service_role;
grant select, insert, update on identity.account_alias to service_role;
grant select, insert, update on identity.phone_verification_challenge to service_role;

-- The audit view returns count-only diagnostics and is itself restricted to
-- service_role. Definer evaluation is required because one check joins
-- auth.users, which must never be granted directly to the application role.
alter view identity.identity_integrity_audit
  set (security_invoker = false);

revoke all on identity.identity_integrity_audit from public, anon, authenticated;
grant select on identity.identity_integrity_audit to service_role;

notify pgrst, 'reload schema';

commit;
