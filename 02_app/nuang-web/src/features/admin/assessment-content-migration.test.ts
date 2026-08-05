import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("assessment content operations migration", () => {
  const sql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/202608030005_assessment_content_operations.sql",
    ),
    "utf8",
  );
  const reorderAuditSql = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/202608030006_assessment_content_reorder_audit.sql",
    ),
    "utf8",
  );

  it("creates immutable releases, optimistic writes, rollback, and audit actions", () => {
    expect(sql).toContain("assessment_content_entry");
    expect(sql).toContain("assessment_content_release");
    expect(sql).toContain("assessment_content_revision_conflict");
    expect(sql).toContain("assessment_content_release_is_immutable");
    expect(sql).toContain("admin_rollback_assessment_content");
    expect(sql).toContain("audit.admin_audit_log");
    expect(sql).toContain("assessment_content_entry_slug_uidx");
    expect(sql).toContain("paused_at = case when published_release_id is null");
  });

  it("pins results, progress, quality observations, and balance rooms to releases", () => {
    expect(sql).toContain("assessment.free_topic_result");
    expect(sql).toContain("assessment.lab_result");
    expect(sql).toContain("assessment.account_assessment_progress");
    expect(sql).toContain("assessment.quality_observation");
    expect(sql).toContain("together_balance.template_version");
    expect(sql).toContain("relationship_audience");
    expect(sql).toContain("phase text not null");
    expect(sql).toContain("together_balance_session_recipe_immutable_trigger");
    expect(sql).toContain("assessment_content_release_id");
  });

  it("records every reordered entry in the audit trail", () => {
    for (const source of [sql, reorderAuditSql]) {
      expect(source).toContain("target_ordered_entry_ids[1]");
      expect(source).toContain("'entryIds', to_jsonb(target_ordered_entry_ids)");
      expect(source).toContain("target_id, metadata");
    }
  });
});
