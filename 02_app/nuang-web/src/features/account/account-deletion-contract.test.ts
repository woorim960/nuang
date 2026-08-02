import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("self-service account deletion database contract", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/202608020004_multi_oauth_identity_foundation.sql",
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
    expect(migration).toContain("deleted_auth_identity_tombstone");
    expect(migration).toContain("grant execute");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("revoke all");
  });
});
