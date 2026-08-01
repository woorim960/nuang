import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("core result feedback migration", () => {
  const migration = readFileSync(
    resolve(
      process.cwd(),
      "supabase/migrations/202608010001_core_result_report_feedback.sql",
    ),
    "utf8",
  );

  it("stores exact version feedback behind service-only access", () => {
    expect(migration).toContain(
      "create table if not exists report.core_result_feedback",
    );
    expect(migration).toContain("content_version text not null");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain(
      "revoke all on report.core_result_feedback from public, anon, authenticated",
    );
    expect(migration).toContain(
      "unique (account_id, result_report_id, section_id)",
    );
  });

  it("provides aggregated review signals without automatic publication", () => {
    expect(migration).toContain(
      "create or replace view report.core_result_feedback_review_summary",
    );
    expect(migration).toContain("not_fit_rate");
    expect(migration).not.toContain("publication_state = 'published'");
  });

  it("records every operator state change atomically", () => {
    expect(migration).toContain(
      "create or replace function public.admin_manage_core_result_feedback",
    );
    expect(migration).toContain("insert into audit.admin_audit_log");
  });
});
