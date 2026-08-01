import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202607280018_assessment_quality_observation.sql",
  ),
  "utf8",
);

describe("assessment quality observation database", () => {
  it("keeps raw observations service-only and exposes an aggregate review queue", () => {
    expect(sql).toContain(
      "alter table assessment.quality_observation enable row level security",
    );
    expect(sql).toContain(
      "revoke all on assessment.quality_observation from public, anon, authenticated",
    );
    expect(sql).toContain("quality_observation_review_summary");
    expect(sql).toContain("review_status in ('queued', 'reviewing')");
    expect(sql).toContain("unique (submission_id, observation_index)");
    expect(sql).toContain("request_fingerprint");
    expect(sql).toContain("totals.sample_count < 30");
    expect(sql).toContain("observation_rate");
    expect(sql).toContain("priority_rank");
    expect(sql).toContain("signals.observation_count >= 10");
    expect(sql).toContain("result:fit_low");
  });
});
