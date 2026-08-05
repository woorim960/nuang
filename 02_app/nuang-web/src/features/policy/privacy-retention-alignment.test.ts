import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202608050009_privacy_retention_alignment.sql",
  ),
  "utf8",
);

describe("privacy retention alignment migration", () => {
  it("physically deletes the records covered by published retention periods", () => {
    expect(migration).toContain("identity.identity_link_intent");
    expect(migration).toContain("identity.email_verification_challenge");
    expect(migration).toContain("identity.phone_verification_challenge");
    expect(migration).toContain("together_balance.room");
    expect(migration).toContain("public.advertising_event");
    expect(migration).toContain("public.advertising_feedback");
    expect(migration).toContain("public.advertising_metric_daily");
    expect(migration).toContain("public.advertising_inquiry");
    expect(migration).toContain("interval '30 days'");
    expect(migration).toContain("interval '13 months'");
    expect(migration).toContain("interval '90 days'");
    expect(migration).toContain("interval '1 year'");
  });

  it("does not purge contracted advertising inquiries", () => {
    expect(migration).toContain("status in ('closed', 'rejected')");
    expect(migration).not.toMatch(/status\s+in\s*\([^)]*'contracted'/);
  });

  it("runs through a server-only daily cron job", () => {
    expect(migration).toContain("nuang-privacy-retention-prune");
    expect(migration).toContain(
      "revoke all on function public.purge_expired_privacy_data(timestamptz)",
    );
    expect(migration).toContain("to service_role, postgres");
  });
});
