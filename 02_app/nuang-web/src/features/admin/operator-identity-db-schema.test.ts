import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607280017_operator_identity_badge.sql",
  "utf8",
);

describe("operator identity badge database contract", () => {
  it("keeps the public badge membership server-controlled", () => {
    expect(migration).toContain(
      "create table if not exists identity.operator_account",
    );
    expect(migration).toContain(
      "alter table identity.operator_account enable row level security",
    );
    expect(migration).toContain(
      "revoke all on identity.operator_account from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant all on identity.operator_account to service_role",
    );
  });

  it("does not treat the badge table as the administrator permission source", () => {
    expect(migration).toContain(
      "This table is never a source of administrator authorization.",
    );
    expect(migration).not.toContain("grant select on identity.operator_account to authenticated");
  });
});
