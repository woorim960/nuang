import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/202607040091_public_profile_code_snapshot.sql",
  "utf8",
);

describe("public profile db schema draft", () => {
  it("defines visibility, public snapshot, and audit tables without public codes", () => {
    expect(migrationSql).toContain("create table profile.profile_visibility_setting");
    expect(migrationSql).toContain("create table profile.profile_public_snapshot");
    expect(migrationSql).toContain("create table audit.visibility_audit_event");
    expect(migrationSql).not.toContain("create table profile.profile_public_code");
  });

  it("does not keep a public code table, policy, or unique index in the active schema", () => {
    expect(migrationSql).not.toContain("profile_public_code_code_unique_idx");
    expect(migrationSql).not.toContain("public code own read");
    expect(migrationSql).not.toContain("public_code_issued");
    expect(migrationSql).not.toContain("public_code_revoked");
  });

  it("enables RLS without granting anonymous direct public reads", () => {
    [
      "profile.profile_visibility_setting",
      "profile.profile_public_snapshot",
      "audit.visibility_audit_event",
    ].forEach((tableName) => {
      expect(migrationSql).toContain(`alter table ${tableName} enable row level security`);
    });

    expect(migrationSql).not.toMatch(/to\s+anon/i);
  });
});
