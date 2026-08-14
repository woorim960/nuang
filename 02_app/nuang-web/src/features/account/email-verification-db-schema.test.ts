import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const tableMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260727000401_private_email_verification.sql",
  ),
  "utf8",
);
const grantMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607270005_private_email_verification_service_grant.sql",
  ),
  "utf8",
);

describe("private email verification storage", () => {
  it("keeps verification challenges unavailable to browser roles", () => {
    expect(tableMigration).toContain(
      "alter table identity.email_verification_challenge enable row level security",
    );
    expect(grantMigration).toContain("from public, anon, authenticated");
    expect(grantMigration).not.toMatch(/\bto\s+(anon|authenticated)\b/i);
  });

  it("grants only the server operations used by the verification routes", () => {
    expect(grantMigration).toContain("grant select, insert, update");
    expect(grantMigration).toContain(
      "on table identity.email_verification_challenge",
    );
    expect(grantMigration).toContain("to service_role");
    expect(grantMigration).not.toMatch(/\bdelete\b/i);
  });
});
