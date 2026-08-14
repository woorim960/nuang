import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "supabase/migrations/202608150002_result_deletion_trigger_table_shape_fix.sql",
  "utf8",
).toLowerCase();

describe("result deletion trigger table-shape repair", () => {
  it("branches by table before reading table-specific record fields", () => {
    expect(source).toContain(
      "if tg_table_name = 'account_assessment_progress' then",
    );
    expect(source).toContain("v_local_result_id := new.client_attempt_id");
    expect(source).toContain(
      "elsif tg_table_name = 'free_topic_result' then",
    );
    expect(source).toContain("elsif tg_table_name = 'lab_result' then");
    expect(source).toContain("v_local_result_id := new.local_result_id");
    expect(source).not.toMatch(
      /v_local_result_id\s*:=\s*case[\s\S]*new\.client_attempt_id[\s\S]*new\.local_result_id/,
    );
  });

  it("preserves locking, legacy delete compatibility, and tombstone rejection", () => {
    expect(source).toContain("assessment.lock_persisted_result_key");
    expect(source).toContain("pg_catalog.pg_try_advisory_xact_lock");
    expect(source).toContain("raise exception 'persisted_result_delete_retry'");
    expect(source).toContain("raise exception 'persisted_result_deleted'");
    expect(source).toContain("notify pgrst, 'reload schema'");
  });
});
