import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202608050004_admin_profile_public_surface_cleanup.sql",
  "utf8",
);

describe("admin profile public surface cleanup migration", () => {
  it("revokes active snapshots when a profile or account becomes inactive", () => {
    expect(migration).toContain(
      "create or replace function profile.disable_account_public_surfaces",
    );
    expect(migration).toContain("status = 'private'");
    expect(migration).toContain("revoked_at = coalesce(revoked_at, now())");
    expect(migration).toContain(
      "create trigger disable_public_surfaces_on_profile_inactive",
    );
    expect(migration).toContain(
      "create trigger disable_public_surfaces_on_account_inactive",
    );
    expect(migration).toContain("after update of status, deleted_at");
  });

  it("disables comparisons where the inactive account is viewer or target", () => {
    expect(migration).toContain("access_status = 'disabled'");
    expect(migration).toContain(
      "comparison_report.viewer_account_id = p_account_id",
    );
    expect(migration).toContain("target_snapshot.account_id = p_account_id");
  });

  it("backfills public surfaces for profiles and accounts already inactive", () => {
    expect(migration).toContain("from profile.community_profile");
    expect(migration).toContain("from identity.account");
    expect(migration).toContain("status <> 'active'");
    expect(migration).toContain(
      "perform profile.disable_account_public_surfaces(v_account_id)",
    );
  });
});
