import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("self-service account deletion database contract", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/202608050010_account_deletion_reregistration.sql",
    ),
    "utf8",
  );

  it("verifies ownership and atomically removes every linked auth user", () => {
    expect(migration).toContain("identity.auth_identity");
    expect(migration).toContain("ai.supabase_user_id = p_supabase_user_id");
    expect(migration).toContain("array_agg(distinct ai.supabase_user_id");
    expect(migration).toContain("delete from identity.account");
    expect(migration).toContain("delete from auth.users");
    expect(migration).toContain("where id = any(v_auth_user_ids)");
    expect(migration).toContain("grant execute");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("revoke all");
  });

  it("allows re-registration without retaining provider subjects", () => {
    expect(migration).toContain(
      "delete from identity.deleted_auth_identity_tombstone",
    );
    expect(migration).not.toContain(
      "insert into identity.deleted_auth_identity_tombstone",
    );
    expect(migration).toContain("actor_auth_user_id = null");
    expect(migration).toContain("provider_keys = '{}'");
    expect(migration).toContain("self_service_anonymized");
  });

  it("anonymizes operational provenance instead of blocking deletion", () => {
    expect(migration).toContain("alter column %I drop not null");
    expect(migration).toContain("on delete %s");
    expect(migration).toContain("then 'cascade'");
    expect(migration).toContain("else 'set null'");
    expect(migration).toContain("old.published_by is not null");
    expect(migration).toContain("new.published_by is null");
    expect(migration).toContain(
      "(to_jsonb(new) - 'published_by') = (to_jsonb(old) - 'published_by')",
    );
  });
});
