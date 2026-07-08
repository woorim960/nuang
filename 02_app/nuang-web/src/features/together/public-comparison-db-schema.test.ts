import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/202607040095_public_comparison_report.sql",
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
    expect(migrationSql).toContain("target_public_code_id uuid");
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
    expect(migrationSql).toContain("viewer_account_id = identity.current_account_id()");
    expect(migrationSql).not.toMatch(/to\s+anon/i);
  });
});
