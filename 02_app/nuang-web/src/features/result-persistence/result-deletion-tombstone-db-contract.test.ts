import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  resolve(
    root,
    "supabase/migrations/202608150001_result_deletion_tombstone.sql",
  ),
  "utf8",
);
const labRoute = readFileSync(
  resolve(root, "src/app/api/lab-results/route.ts"),
  "utf8",
);
const topicRoute = readFileSync(
  resolve(root, "src/app/api/free-topic-results/route.ts"),
  "utf8",
);

describe("persisted result deletion boundary", () => {
  it("creates one private account-scoped tombstone store atomically", () => {
    expect(migration.trimStart()).toMatch(/^begin;/i);
    expect(migration.trimEnd()).toMatch(/commit;$/i);
    expect(migration).toContain(
      "create table if not exists assessment.result_deletion_tombstone",
    );
    expect(migration).toContain(
      "primary key (account_id, result_kind, local_result_id)",
    );
    expect(migration).toContain(
      "check (result_kind in ('core', 'topic', 'lab'))",
    );
    expect(migration).toContain(
      "alter table assessment.result_deletion_tombstone enable row level security",
    );
    expect(migration).toContain("from public, anon, authenticated");
    expect(migration).toContain("to service_role");
  });

  it("fails closed on legacy ids and validates the exact shared id contract", () => {
    expect(migration).toContain(
      "raise exception 'result_local_result_id_preflight_failed'",
    );
    expect(migration).toContain(
      "raise exception 'result_deletion_tombstone_backfill_incomplete'",
    );

    for (const constraint of [
      "account_assessment_progress_client_attempt_id_exact_check",
      "assessment_attempt_local_result_id_exact_check",
      "free_topic_result_local_result_id_exact_check",
      "lab_result_local_result_id_exact_check",
    ]) {
      expect(migration).toMatch(
        new RegExp(
          `add constraint ${constraint}[\\s\\S]*?char_length\\([^)]*\\) between 6 and 128[\\s\\S]*?btrim\\([^)]*\\)[\\s\\S]*?not valid`,
          "i",
        ),
      );
      expect(migration).toContain(`validate constraint ${constraint}`);
    }
  });

  it("serializes every result writer and rejects a tombstoned id", () => {
    for (const table of [
      "assessment.account_assessment_progress",
      "assessment.free_topic_result",
      "assessment.lab_result",
    ]) {
      expect(migration).toContain(`on ${table};`);
    }
    expect(migration).toContain(
      "create or replace function assessment.persisted_result_lock_key",
    );
    expect(migration).toContain(
      "create or replace function assessment.lock_persisted_result_key",
    );
    expect(
      migration.match(/pg_catalog\.pg_advisory_xact_lock/g) ?? [],
    ).toHaveLength(1);
    expect(migration).toContain(
      "create or replace function assessment.save_account_assessment_progress",
    );
    expect(migration).toContain(
      "This must remain before SELECT ... FOR UPDATE and before INSERT/UPDATE",
    );
    expect(migration).toContain(
      "BEFORE INSERT runs before uniqueness/conflict row locking",
    );
    expect(migration).toContain(
      "raise exception 'persisted_result_key_immutable'",
    );
    expect(migration).toContain(
      "The authoritative report lookup is repeated after the lock",
    );
    expect(migration).toContain(
      "Re-read after acquiring the same logical-key lock",
    );
    expect(migration).toContain("raise exception 'persisted_result_deleted'");
    expect(migration).toContain(
      "create or replace function assessment.delete_persisted_result",
    );
    expect(migration).toContain(
      "create or replace function assessment.guard_core_result_claim_tombstone",
    );
    expect(migration).toContain(
      "create or replace function public.claim_assessment_result_atomic",
    );
    expect(migration).toContain("on assessment.assessment_attempt");
    expect(migration).toContain(
      "create or replace function report.delete_result_for_account",
    );
    expect(migration).toContain(
      "update assessment.account_assessment_progress",
    );
    expect(migration).toContain("where status = 'deleted'");
    expect(migration).toContain("notify pgrst, 'reload schema'");
  });

  it("keeps DB-first rolling deploy soft-deletes non-blocking", () => {
    expect(migration).toContain("pg_catalog.pg_try_advisory_xact_lock");
    expect(migration).toContain(
      "assessment.persisted_result_lock_key(\n          new.account_id,",
    );
    expect(migration).toContain(
      "raise exception 'persisted_result_delete_retry'",
    );
    expect(migration).toContain("it can never wait while holding a row lock");
  });

  it("acquires the core logical-key lock before any progress row lock or DML", () => {
    const saveFunction = migration.slice(
      migration.indexOf(
        "create or replace function assessment.save_account_assessment_progress",
      ),
      migration.indexOf(
        "revoke all on function assessment.save_account_assessment_progress",
      ),
    );
    const lockIndex = saveFunction.indexOf(
      "perform assessment.lock_persisted_result_key",
    );
    const rowLockIndex = saveFunction.indexOf("for update;");
    const insertIndex = saveFunction.indexOf(
      "insert into assessment.account_assessment_progress",
    );

    expect(lockIndex).toBeGreaterThan(-1);
    expect(rowLockIndex).toBeGreaterThan(lockIndex);
    expect(insertIndex).toBeGreaterThan(lockIndex);
    expect(saveFunction).not.toContain(
      "p_account_id::text || ':' || p_client_attempt_id",
    );
  });

  it("locks core claims before their first attempt read", () => {
    const claimFunction = migration.slice(
      migration.indexOf(
        "create or replace function public.claim_assessment_result_atomic",
      ),
      migration.indexOf(
        "revoke all on function public.claim_assessment_result_atomic",
      ),
    );
    const lockIndex = claimFunction.indexOf(
      "perform assessment.lock_persisted_result_key",
    );
    const firstAttemptReadIndex = claimFunction.indexOf(
      "from assessment.assessment_attempt attempt",
    );
    const firstAttemptWriteIndex = claimFunction.indexOf(
      "insert into assessment.assessment_attempt",
    );

    expect(lockIndex).toBeGreaterThan(-1);
    expect(firstAttemptReadIndex).toBeGreaterThan(lockIndex);
    expect(firstAttemptWriteIndex).toBeGreaterThan(lockIndex);
    expect(claimFunction).toContain(
      "raise exception 'persisted_result_deleted'",
    );
  });

  it("rejects mismatched core report and local identifiers", () => {
    const deleteFunction = migration.slice(
      migration.indexOf(
        "create or replace function report.delete_result_for_account",
      ),
      migration.indexOf(
        "revoke all on function report.delete_result_for_account",
      ),
    );

    expect(deleteFunction).toContain(
      "raise exception 'result_delete_identifier_mismatch'",
    );
    expect(deleteFunction).toContain(
      "A dual-identifier miss is idempotent only when this logical result was",
    );
    expect(deleteFunction).toContain(
      "and (p_result_report_id is null or rr.id = p_result_report_id)",
    );
    expect(deleteFunction).toContain(
      "and (p_local_result_id is null or aa.local_result_id = p_local_result_id)",
    );
    expect(deleteFunction).not.toContain(
      "(p_result_report_id is not null and rr.id = p_result_report_id)\n      or",
    );
  });

  it("keeps current topic/lab writers on trigger-safe insert paths", () => {
    expect(topicRoute).toContain('.from("free_topic_result")');
    expect(topicRoute).toContain(".insert({");
    expect(labRoute).toContain('.from("lab_result")');
    expect(labRoute).toContain(".upsert(");
    expect(migration).toContain(
      "before insert or update on assessment.free_topic_result",
    );
    expect(migration).toContain(
      "before insert or update on assessment.lab_result",
    );
  });

  it("routes topic and lab deletion through the transactional RPC and maps late writes to gone", () => {
    for (const route of [labRoute, topicRoute]) {
      expect(route).toContain('.rpc("delete_persisted_result"');
      expect(route).toContain('includes("persisted_result_deleted")');
      expect(route).toContain("status: 410");
    }
  });

  it("contains no destructive bulk operation", () => {
    expect(migration).not.toMatch(/\btruncate\b/i);
    expect(migration).not.toMatch(/\bdrop\s+table\b/i);
    expect(migration).not.toMatch(
      /\bdelete\s+from\s+assessment\.(?:account_assessment_progress|free_topic_result|lab_result|result_deletion_tombstone)\b/i,
    );
  });
});
