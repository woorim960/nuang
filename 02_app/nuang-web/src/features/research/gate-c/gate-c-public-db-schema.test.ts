import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607200003_gate_c_public_research.sql",
  ),
  "utf8",
);
const retentionMigration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607200004_gate_c_research_retention.sql",
  ),
  "utf8",
);

describe("Gate C public research storage", () => {
  it("stores only pseudonymous minimal participant categories", () => {
    expect(migration).toContain("public.research_gate_c_session");
    expect(migration).toContain("public_receipt_id uuid");
    expect(migration).toContain("age_band text");
    expect(migration).toContain("life_context text");
    expect(migration).toContain("assessment_experience text");
    expect(migration).not.toMatch(
      /^\s*(name|email|phone|birth_date|ip_address|precise_location)\s+/m,
    );
  });

  it("blocks browser roles and limits all research writes to the service role", () => {
    for (const table of [
      "research_gate_c_session",
      "research_gate_c_item_response",
      "research_gate_c_item_review_queue",
      "research_gate_c_analysis_snapshot",
    ]) {
      expect(migration).toContain(
        `alter table public.${table} enable row level security`,
      );
      expect(migration).toContain(
        `revoke all on public.${table} from public, anon, authenticated`,
      );
    }
    expect(migration).not.toMatch(/grant .* to anon/i);
    expect(migration).not.toMatch(/grant .* to authenticated/i);
  });

  it("keeps automatic output in a review-only queue", () => {
    expect(migration).toContain("research_gate_c_item_review_queue");
    expect(migration).toContain("awaiting_human_review");
    expect(migration).toContain("publication_state = 'review_only'");
    expect(migration).not.toMatch(/activate_item_bank_release/);
  });

  it("supports atomic completion and anonymous withdrawal", () => {
    expect(migration).toContain("complete_gate_c_public_session");
    expect(migration).toContain("Exactly 12 Gate C responses are required");
    expect(migration).toContain("withdraw_gate_c_public_session");
    expect(migration).toContain("on delete cascade");
  });

  it("automatically purges records after the promised retention window", () => {
    expect(retentionMigration).toContain("purge_expired_gate_c_research");
    expect(retentionMigration).toContain("where retention_until <= now()");
    expect(retentionMigration).toContain("nuang-gate-c-retention");
    expect(retentionMigration).toContain("17 3 * * *");
  });
});
