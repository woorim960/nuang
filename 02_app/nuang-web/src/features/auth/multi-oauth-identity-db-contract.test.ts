import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("multi OAuth identity database contract", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/202608020004_multi_oauth_identity_foundation.sql",
    ),
    "utf8",
  );

  it("resolves account and all provider identities in one service-only transaction", () => {
    expect(migration).toContain("resolve_account_for_auth_user");
    expect(migration).toContain("jsonb_array_elements(p_identities)");
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("identity_provider_not_allowed");
    expect(migration).toContain("multiple_accounts");
    expect(migration).toContain("on conflict (provider, issuer, provider_subject)");
    expect(migration).toContain(
      "revoke all on function identity.resolve_account_for_auth_user",
    );
    expect(migration).toContain("to service_role");
  });

  it("fails closed when one auth user points at multiple accounts", () => {
    expect(migration).toContain("auth_identity_account_consistency");
    expect(migration).toContain("supabase_user_account_conflict");
    expect(migration).toContain("v_account_count <> 1");
    expect(migration).not.toContain("order by ai.provider_linked_at asc\n  limit 1");
  });

  it("keeps provider controls and identity audit data private", () => {
    expect(migration).toContain("identity.provider_registry");
    expect(migration).toContain("identity.identity_feature_flag");
    expect(migration).toContain("audit.account_identity_event");
    expect(migration).toContain("identity.identity_integrity_audit");
    expect(migration).toContain("identity.account_fk_inventory");
    expect(migration).toContain(
      "revoke all on audit.account_identity_event from public, anon, authenticated",
    );
    expect(migration).not.toContain("email_encrypted");
    expect(migration).not.toContain("mobile_phone_encrypted");
  });

  it("deletes every linked auth user and blocks silent account recreation", () => {
    expect(migration).toContain("deleted_auth_identity_tombstone");
    expect(migration).toContain("array_agg(distinct ai.supabase_user_id");
    expect(migration).toContain("delete from auth.users");
    expect(migration).toContain("where id = any(v_auth_user_ids)");
    expect(migration).toContain("deleted_identity");
  });
});
