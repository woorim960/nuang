import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202608030002_onboarding_experience_state.sql",
  ),
  "utf8",
);

describe("onboarding experience migration", () => {
  it("separates permanent first exposure from guide version and completion", () => {
    expect(migration).toContain("onboarding_first_seen_at timestamptz");
    expect(migration).toContain("onboarding_completed_at timestamptz");
    expect(migration).toContain("onboarding_last_seen_guide_version integer");
    expect(migration).toContain(
      "onboarding_first_seen_at = case",
    );
    expect(migration).toContain(
      "onboarding_last_seen_guide_version = greatest",
    );
  });

  it("keeps browser roles out and grants only the service writer", () => {
    expect(migration).toContain(
      "revoke all on identity.account_experience_state from public, anon, authenticated",
    );
    expect(migration).toContain(
      "revoke all on function identity.record_onboarding_experience(uuid, text, integer)",
    );
    expect(migration).toContain("to service_role");
    expect(migration).toContain("security definer");
  });

  it("rejects unsupported states and inactive accounts", () => {
    expect(migration).toContain("p_state not in ('seen', 'completed')");
    expect(migration).toContain("account_not_active");
  });
});
