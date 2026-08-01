import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "supabase/migrations/202607280016_lab_result_attempt_history.sql",
  "utf8",
);

describe("lab result attempt history migration", () => {
  it("replaces the per-slug unique key with a per-completion idempotency key", () => {
    expect(migrationSql).toContain(
      "add column if not exists local_result_id text",
    );
    expect(migrationSql).toContain(
      "drop constraint if exists lab_result_account_id_lab_slug_key",
    );
    expect(migrationSql).toContain(
      "unique (account_id, local_result_id)",
    );
    expect(migrationSql).not.toContain("unique (account_id, lab_slug)");
  });

  it("backfills old rows without deleting or merging their result payloads", () => {
    expect(migrationSql).toContain(
      "set local_result_id = 'legacy_lab_' || id::text",
    );
    expect(migrationSql).toContain(
      "alter column local_result_id set not null",
    );
    expect(migrationSql).not.toMatch(/\bdelete\s+from\s+assessment\.lab_result/i);
  });

  it("keeps a latest-first account and lab history index", () => {
    expect(migrationSql).toContain(
      "on assessment.lab_result(account_id, lab_slug, completed_at desc)",
    );
    expect(migrationSql).toContain("where deleted_at is null");
  });
});
