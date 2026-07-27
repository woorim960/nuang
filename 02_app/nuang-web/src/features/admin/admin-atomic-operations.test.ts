import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607280004_atomic_admin_operations.sql",
  "utf8",
);
const communityRoute = readFileSync(
  "src/app/api/admin/community/route.ts",
  "utf8",
);
const linkRoute = readFileSync(
  "src/app/api/admin/community/links/route.ts",
  "utf8",
);
const memberRoute = readFileSync(
  "src/app/api/admin/members/[accountId]/route.ts",
  "utf8",
);
const communityContentRoute = readFileSync(
  "src/app/api/admin/community/content/route.ts",
  "utf8",
);
const traitContentRoute = readFileSync(
  "src/app/api/admin/content/route.ts",
  "utf8",
);

describe("atomic admin operations", () => {
  it("keeps each state mutation and its audit row in one database call", () => {
    expect(migration).toContain(
      "create or replace function public.admin_apply_community_moderation",
    );
    expect(migration).toContain(
      "create or replace function public.admin_review_external_link",
    );
    expect(migration).toContain(
      "create or replace function public.admin_apply_member_action",
    );
    expect(migration).toContain(
      "create or replace function public.admin_manage_community_content_atomic",
    );
    expect(migration).toContain(
      "create or replace function public.admin_manage_trait_map_content_atomic",
    );
    expect(migration).toContain(
      "create or replace function public.admin_mark_reward_contacted",
    );
    expect(migration.match(/insert into audit\.admin_audit_log/g)?.length).toBe(
      6,
    );
  });

  it("routes administrator mutations through the atomic functions", () => {
    expect(communityRoute).toContain("admin_apply_community_moderation");
    expect(linkRoute).toContain("admin_review_external_link");
    expect(memberRoute).toContain("admin_apply_member_action");
    expect(communityContentRoute).toContain(
      "admin_manage_community_content_atomic",
    );
    expect(traitContentRoute).toContain(
      "admin_manage_trait_map_content_atomic",
    );

    for (const route of [
      communityRoute,
      linkRoute,
      memberRoute,
      communityContentRoute,
      traitContentRoute,
    ]) {
      expect(route).not.toContain('.from("admin_audit_log")');
    }
  });
});
