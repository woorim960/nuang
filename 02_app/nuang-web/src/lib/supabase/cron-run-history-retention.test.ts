import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608140002_cron_run_history_retention.sql",
  ),
  "utf8",
);

describe("cron run-history retention", () => {
  it("keeps 14 days of history and prunes it once per day", () => {
    expect(sql).toContain("'nuang-cron-run-history-prune'");
    expect(sql).toContain("'7 19 * * *'");
    expect(sql).toContain("delete from cron.job_run_details");
    expect(sql).toContain("end_time < now() - interval '14 days'");
  });

  it("does not truncate current or running cron history", () => {
    expect(sql.toLowerCase()).not.toContain("truncate");
    expect(sql).not.toContain("start_time <");
  });
});
