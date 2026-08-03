import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608030003_marketing_email_release1.sql",
  ),
  "utf8",
);

describe("marketing email Release 1 database contract", () => {
  it("locks the audience to the current explicit email consent", () => {
    expect(sql).toContain("where p_channel = 'email'");
    expect(sql).toContain(
      "status.marketing_consent_version = 'NUANG-MARKETING-EMAIL-KO-2026-08-03'",
    );
    expect(sql).not.toContain("p_channel in ('email', 'mobile_phone')");
  });

  it("includes bounded retry, claim locking, unsubscribe and suppression", () => {
    expect(sql).toContain("for update of recipient skip locked");
    expect(sql).toContain("recipient.attempt_count < 5");
    expect(sql).toContain("unsubscribe_marketing_email");
    expect(sql).toContain("provider_spam_complaint");
    expect(sql).toContain("provider_hard_bounce");
  });

  it("schedules drain and two-year confirmation preparation", () => {
    expect(sql).toContain("nuang-marketing-email-outbox-drain");
    expect(sql).toContain("interval '2 years'");
    expect(sql).toContain("nuang-marketing-consent-confirmation-prepare");
  });
});
