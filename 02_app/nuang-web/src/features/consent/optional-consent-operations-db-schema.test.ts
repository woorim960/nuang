import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/202608030001_optional_consent_operations.sql",
  ),
  "utf8",
).toLowerCase();

describe("optional consent operations database", () => {
  it("atomically owns current state and immutable preference transitions", () => {
    expect(migration).toContain(
      "create or replace function consent.set_optional_preference",
    );
    expect(migration).toContain(
      "create or replace function consent.persist_account_consent",
    );
    expect(migration).toContain("if p_analytics_requested then");
    expect(migration).toContain("if p_marketing_requested then");
    expect(migration).toContain("'legacy_backfill'");
    expect(migration).toContain("recorded_at desc, record.id desc");
    expect(migration).toContain("consent_integrity_migration_audit");
  });

  it("limits analytics to normalized screen views and schedules 90-day deletion", () => {
    expect(migration).toContain(
      "create table if not exists consent.product_analytics_event",
    );
    expect(migration).toContain("check (event_name = 'screen_view')");
    expect(migration).toContain("and status.analytics_opt_in = true");
    expect(migration).toContain("v_now - interval '5 minutes'");
    expect(migration).toContain("p_now - interval '90 days'");
    expect(migration).toContain("nuang-product-analytics-retention");
    expect(migration).toContain("quality_observation_analytics_consent_guard");
    expect(migration).toContain("add column if not exists account_id uuid");
  });

  it("keeps marketing audience service-only and excludes unsafe accounts", () => {
    expect(migration).toContain(
      "create or replace function consent.resolve_marketing_audience",
    );
    expect(migration).toContain("contact.email_status = 'verified'");
    expect(migration).toContain("contact.mobile_phone_status = 'verified'");
    expect(migration).toContain("consent.marketing_suppression");
    expect(migration).toContain("identity.account_merge_case");
    expect(migration).toContain("identity.identity_resolution_conflict");
    expect(migration).toContain(
      "revoke all on all tables in schema consent from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function consent.resolve_marketing_audience(text)",
    );
  });
});
