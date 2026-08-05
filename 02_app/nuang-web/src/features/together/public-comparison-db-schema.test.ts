import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/202607040095_public_comparison_report.sql",
  "utf8",
);
const revocationMigrationSql = readFileSync(
  "supabase/migrations/202608050003_disable_revoked_public_comparisons.sql",
  "utf8",
);
const atomicCreationMigrationSql = readFileSync(
  "supabase/migrations/202608050005_atomic_public_comparison_creation.sql",
  "utf8",
);
const serverSource = readFileSync(
  "src/features/together/server-public-comparisons.ts",
  "utf8",
);

describe("public comparison db schema draft", () => {
  it("defines the public comparison report table with snapshot links", () => {
    expect(migrationSql).toContain(
      "create table comparison.public_comparison_report",
    );
    expect(migrationSql).toContain("viewer_result_report_id uuid not null");
    expect(migrationSql).toContain("viewer_public_snapshot_id uuid");
    expect(migrationSql).toContain("target_public_snapshot_id uuid not null");
    expect(migrationSql).not.toContain("target_public_code_id");
    expect(migrationSql).not.toContain("profile.profile_public_code");
  });

  it("stores access revalidation flags and report status", () => {
    expect(migrationSql).toContain(
      "access_status text not null default 'active'",
    );
    expect(migrationSql).toContain(
      "target_snapshot_status_required text not null default 'active'",
    );
    expect(migrationSql).toContain(
      "reevaluate_on_visibility_change boolean not null default true",
    );
    expect(migrationSql).toContain(
      "viewer_result_deletion_disables_report boolean not null default true",
    );
  });

  it("enables RLS for viewer-owned reads without anonymous direct reads", () => {
    expect(migrationSql).toContain(
      "alter table comparison.public_comparison_report enable row level security",
    );
    expect(migrationSql).toContain(
      "viewer_account_id = identity.current_account_id()",
    );
    expect(migrationSql).not.toMatch(/to\s+anon/i);
  });

  it("disables stored reports as soon as target visibility or consent changes", () => {
    expect(revocationMigrationSql).toContain(
      "disable_public_comparison_on_snapshot_change",
    );
    expect(revocationMigrationSql).toContain(
      "disable_public_comparison_on_profile_change",
    );
    expect(revocationMigrationSql).toContain("access_status = 'disabled'");
    expect(revocationMigrationSql).toContain(
      "target_profile.comparison_enabled is not true",
    );
    expect(revocationMigrationSql).toContain(
      "target_profile.detail_visibility <> 'public'",
    );
  });

  it("creates the report and mandatory audit event in one database transaction", () => {
    expect(atomicCreationMigrationSql).toContain(
      "function comparison.create_public_comparison_report",
    );
    expect(atomicCreationMigrationSql).toContain(
      "insert into comparison.public_comparison_report",
    );
    expect(atomicCreationMigrationSql).toContain(
      "insert into audit.visibility_audit_event",
    );
    expect(atomicCreationMigrationSql).toContain(
      "target_profile.comparison_enabled is true",
    );
    expect(atomicCreationMigrationSql).toContain(
      "target_profile.detail_visibility = 'public'",
    );
    expect(serverSource).toContain('.rpc("create_public_comparison_report"');
    expect(serverSource).not.toContain('.from("visibility_audit_event")');
  });
});
