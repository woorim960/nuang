import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/202608050008_product_analytics_operations_center.sql",
  ),
  "utf8",
);

describe("product analytics operations migration", () => {
  it("requires the current explicit analytics consent version for collection", () => {
    expect(migration).toContain(
      "status.analytics_consent_version =\n        'NUANG-ANALYTICS-PREFERENCE-2026-08-03'",
    );
    expect(migration).toContain("status.analytics_opt_in = true");
    expect(migration).toContain("account.deleted_at is null");
    expect(migration).toContain(
      "create or replace function consent.enforce_quality_observation_analytics_consent()",
    );
  });

  it("exposes only an operator-checked aggregate RPC to the service role", () => {
    expect(migration).toContain(
      "create or replace function consent.admin_product_analytics_snapshot(",
    );
    expect(migration).toContain("join identity.operator_account operator");
    expect(migration).toContain(
      "raise exception 'active_product_analytics_operator_required'",
    );
    expect(migration).toContain(
      "revoke all on function consent.admin_product_analytics_snapshot(uuid, integer)\n  from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function consent.admin_product_analytics_snapshot(uuid, integer)\n  to service_role;",
    );
  });

  it("bounds windows and returns daily and area aggregates without raw identifiers", () => {
    expect(migration).toContain("target_days not in (7, 30, 90)");
    expect(migration).toContain("'areas', coalesce((");
    expect(migration).toContain("'daily', coalesce((");
    expect(migration).toContain("'retentionDays', 90");

    const returnedSnapshot = migration.slice(
      migration.indexOf("select jsonb_build_object(\n      'schemaVersion'"),
      migration.indexOf("revoke all on function"),
    );
    expect(returnedSnapshot).not.toContain("'accountId'");
    expect(returnedSnapshot).not.toContain("'pathname'");
    expect(returnedSnapshot).not.toContain("'answer'");
    expect(returnedSnapshot).not.toContain("'body'");
  });
});
