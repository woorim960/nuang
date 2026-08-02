import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202608020005_multi_oauth_link_and_recovery.sql",
  ),
  "utf8",
);
const correctiveMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202608020006_multi_oauth_service_grants_and_audit.sql",
  ),
  "utf8",
);

describe("multi OAuth link and recovery DB contract", () => {
  it("keeps link intents short-lived, one-time and service-role only", () => {
    expect(migration).toContain("create table if not exists identity.identity_link_intent");
    expect(migration).toContain("nonce_hash text not null");
    expect(migration).toContain("consumed_at timestamptz");
    expect(migration).toContain("expires_at timestamptz not null");
    expect(migration).toContain(
      "revoke all on identity.identity_link_intent from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update on identity.identity_link_intent to service_role",
    );
    expect(migration).not.toMatch(/access_token|refresh_token|oauth_code/i);
  });

  it("keeps private tables inaccessible to browser roles while granting the server its minimum operations", () => {
    for (const table of [
      "identity.identity_link_intent",
      "identity.account_identifier",
      "identity.account_merge_case",
      "identity.account_alias",
      "identity.phone_verification_challenge",
    ]) {
      expect(correctiveMigration).toContain(
        `revoke all on ${table} from public, anon, authenticated`,
      );
    }
    expect(correctiveMigration).toContain(
      "grant select, insert, update on identity.identity_link_intent to service_role",
    );
    expect(correctiveMigration).toContain(
      "grant select on identity.account_identifier to service_role",
    );
  });

  it("exposes only the count audit view without granting auth.users to the service role", () => {
    expect(correctiveMigration).toContain(
      "alter view identity.identity_integrity_audit",
    );
    expect(correctiveMigration).toContain("set (security_invoker = false)");
    expect(correctiveMigration).toContain(
      "grant select on identity.identity_integrity_audit to service_role",
    );
    expect(correctiveMigration).not.toMatch(/grant\s+select\s+on\s+auth\.users/i);
  });

  it("reserves only verified identifiers and allows unverified ownership challenges", () => {
    expect(migration).toContain("drop index if exists identity.contact_profile_email_unique_idx");
    expect(migration).toContain(
      "drop index if exists identity.contact_profile_mobile_phone_unique_idx",
    );
    expect(migration).toMatch(
      /contact_profile_verified_email_unique_idx[\s\S]*email_status = 'verified'/,
    );
    expect(migration).toMatch(
      /account_identifier_verified_unique_idx[\s\S]*where status = 'verified'/,
    );
    expect(migration).toContain("finalize_verified_account_identifier");
    expect(migration).toContain("existing_account_candidate");
  });

  it("prepares merge and SMS contracts without enabling an unsafe merge or fake delivery", () => {
    expect(migration).toContain("identity.account_merge_case");
    expect(migration).toContain("status text not null default 'proof_required'");
    expect(migration).toContain("identity.phone_verification_challenge");
    expect(migration).not.toMatch(/twilio|solapi|aligo|send_sms|sms_provider_api/i);
    expect(migration).toContain("revoke all on identity.account_merge_case");
    expect(migration).toContain("revoke all on identity.phone_verification_challenge");
  });

  it("moves private contact provenance to account security without deleting legacy rows", () => {
    expect(migration).toContain("'account_security'");
    expect(migration).toContain("'profile'");
    expect(migration).toContain("'event_entry'");
  });
});
