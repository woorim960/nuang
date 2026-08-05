import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/202608050011_report_summaries_public_default.sql",
  "utf8",
);

describe("profile report public-default migration", () => {
  it("makes missing and future regular result visibility public", () => {
    expect(migrationSql).toContain(
      "alter column visibility set default 'profile_public'",
    );
    expect(migrationSql).toContain("Missing rows mean profile_public");
  });

  it("publishes regular summaries while retaining protected private fields", () => {
    expect(migrationSql).toContain("('quick_core_result', 'public', 'hidden')");
    expect(migrationSql).toContain("('lab_results', 'public', 'hidden')");
    for (const field of [
      "direct_responses",
      "raw_scores",
      "sensitive_assessments",
      "crisis_help_interactions",
      "account_identity",
    ]) {
      expect(migrationSql).toContain(`('${field}', 'private', 'blocked')`);
    }
  });

  it("does not overwrite explicit per-report privacy choices", () => {
    expect(migrationSql).not.toMatch(
      /update\s+profile\.profile_report_visibility[\s\S]*visibility\s*=\s*'profile_public'/i,
    );
  });
});
