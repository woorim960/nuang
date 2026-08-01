import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607280013_product_feedback_mvp.sql",
  "utf8",
);
const adminRoute = readFileSync(
  "src/app/api/admin/feedback/route.ts",
  "utf8",
);

describe("product feedback database contract", () => {
  it("stores private feedback with bounded kinds, content and technical context", () => {
    expect(migration).toContain(
      "create table if not exists public.product_feedback",
    );
    expect(migration).toContain(
      "check (kind in ('bug', 'usability', 'idea'))",
    );
    expect(migration).toContain(
      "check (char_length(trim(body)) between 10 and 2000)",
    );
    expect(migration).toContain(
      "octet_length(technical_context::text) <= 2048",
    );
  });

  it("keeps customer feedback service-only and deletes member-linked data with the account", () => {
    expect(migration).toContain(
      "account_id uuid references identity.account(id) on delete cascade",
    );
    expect(migration).toContain(
      "alter table public.product_feedback enable row level security",
    );
    expect(migration).toContain(
      "revoke all on public.product_feedback from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant select, insert, update, delete on public.product_feedback to service_role",
    );
  });

  it("changes operator status and writes its audit row atomically", () => {
    expect(migration).toContain(
      "create or replace function public.admin_manage_product_feedback",
    );
    expect(migration).toContain("insert into audit.admin_audit_log");
    expect(adminRoute).toContain("admin_manage_product_feedback");
    expect(adminRoute).not.toContain('.from("admin_audit_log")');
  });
});
