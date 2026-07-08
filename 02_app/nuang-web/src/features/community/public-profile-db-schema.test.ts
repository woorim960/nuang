import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/202607040091_public_profile_code_snapshot.sql",
  "utf8",
);

describe("public profile db schema draft", () => {
  it("defines the visibility, public snapshot, public code, and audit tables", () => {
    expect(migrationSql).toContain("create table profile.profile_visibility_setting");
    expect(migrationSql).toContain("create table profile.profile_public_snapshot");
    expect(migrationSql).toContain("create table profile.profile_public_code");
    expect(migrationSql).toContain("create table audit.visibility_audit_event");
  });

  it("keeps public profile codes unique and separate from trait type codes", () => {
    expect(migrationSql).toContain("profile_public_code_code_unique_idx");
    expect(migrationSql).toContain("check (code = upper(code))");
    expect(migrationSql).toContain("check (code ~ '^NUANG-[A-HJ-NP-Z2-9]{5,8}$')");
    expect(migrationSql).toContain("check (code ~ '[2-9]')");
  });

  it("enables RLS without granting anonymous direct public reads", () => {
    [
      "profile.profile_visibility_setting",
      "profile.profile_public_snapshot",
      "profile.profile_public_code",
      "audit.visibility_audit_event",
    ].forEach((tableName) => {
      expect(migrationSql).toContain(`alter table ${tableName} enable row level security`);
    });

    expect(migrationSql).not.toMatch(/to\s+anon/i);
  });
});
