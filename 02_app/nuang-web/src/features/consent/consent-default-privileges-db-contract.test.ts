import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202608140007_consent_default_privileges_guard.sql",
  ),
  "utf8",
);
const normalizedMigration = migration.toLowerCase().replace(/\s+/g, " ");

describe("consent default privileges database contract", () => {
  it("removes the built-in global public execute default for postgres functions", () => {
    expect(normalizedMigration).toContain(
      "alter default privileges for role postgres revoke all on functions from public, anon, authenticated;",
    );
    expect(normalizedMigration).not.toContain(
      "alter default privileges for role postgres revoke all on tables",
    );
    expect(normalizedMigration).not.toContain(
      "alter default privileges for role postgres revoke all on sequences",
    );
  });

  it("removes consent-specific defaults for future tables, sequences and functions", () => {
    for (const objectType of ["tables", "sequences", "functions"]) {
      expect(normalizedMigration).toContain(
        `alter default privileges for role postgres in schema consent revoke all on ${objectType} from public, anon, authenticated;`,
      );
    }
  });

  it("fails closed against effective global and consent-schema ACLs", () => {
    expect(migration).toContain("pg_catalog.pg_default_acl");
    expect(migration).toContain("pg_catalog.acldefault");
    expect(migration).toContain("pg_catalog.aclexplode");
    expect(migration).toContain("default_acl.defaclnamespace = 0::oid");
    expect(migration).toContain("default_acl.defaclnamespace = v_consent_oid");
    expect(migration).toContain("('r'::\"char\", 'table')");
    expect(migration).toContain("('S'::\"char\", 'sequence')");
    expect(migration).toContain("('f'::\"char\", 'function')");
    expect(migration).toContain(
      "where grantee in (0::oid, v_anon_oid, v_authenticated_oid)",
    );
    expect(migration).toContain("using errcode = '42501'");
  });
});
