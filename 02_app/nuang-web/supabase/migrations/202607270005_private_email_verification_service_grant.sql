-- Email verification challenges are server-only.
-- The table was created after the initial schema-wide API grants, so the
-- service role needs explicit privileges while client roles remain ungranted.

revoke all
on table identity.email_verification_challenge
from public, anon, authenticated;

grant select, insert, update
on table identity.email_verification_challenge
to service_role;
