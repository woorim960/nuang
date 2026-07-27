import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("self-service account deletion database contract", () => {
  const migration = readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/202607280010_self_account_deletion.sql",
    ),
    "utf8",
  );

  it("verifies account ownership and removes both product and auth accounts atomically", () => {
    expect(migration).toContain("identity.auth_identity");
    expect(migration).toContain("supabase_user_id = p_supabase_user_id");
    expect(migration).toContain("delete from identity.account");
    expect(migration).toContain("delete from auth.users");
    expect(migration).toContain("grant execute");
    expect(migration).toContain("to service_role");
    expect(migration).toContain("revoke all");
  });
});
