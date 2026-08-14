import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608140001_outbox_cron_empty_queue_guard.sql",
  ),
  "utf8",
);

describe("outbox cron empty-queue guards", () => {
  it("skips the advertising HTTP worker unless a retry is due", () => {
    const body = functionBody("invoke_advertising_mail_outbox_retry");

    expect(body).toContain("outbox.status in ('pending', 'retry')");
    expect(body).toContain("outbox.next_attempt_at <= now()");
    expect(body).toContain("outbox.claimed_at < now() - interval '15 minutes'");
    expect(body).toContain("return 0;");
    expect(body.indexOf("return 0;")).toBeLessThan(
      body.indexOf("net.http_post("),
    );
  });

  it("keeps campaign and biennial confirmation work eligible", () => {
    const body = functionBody("invoke_marketing_email_outbox_drain");

    expect(body).toContain("marketing_campaign_recipient");
    expect(body).toContain("marketing_consent_confirmation_outbox");
    expect(body).toContain("resolve_marketing_audience('email')");
    expect(body).toContain("interval '2 years'");
    expect(body).toContain("emergency_paused = true");
    expect(body.indexOf("return 0;")).toBeLessThan(
      body.indexOf("net.http_post("),
    );
  });
});

function functionBody(name: string) {
  const start = sql.indexOf(`create or replace function public.${name}()`);
  const end = sql.indexOf("revoke all on function", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return sql.slice(start, end);
}
