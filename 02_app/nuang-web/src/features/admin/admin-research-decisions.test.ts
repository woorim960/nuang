import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/202607280005_admin_research_decisions.sql",
  "utf8",
);
const route = readFileSync(
  "src/app/api/admin/research/decisions/route.ts",
  "utf8",
);
const dashboard = readFileSync(
  "src/features/admin/AdminResearchDashboard.tsx",
  "utf8",
);

describe("admin research decisions", () => {
  it("stores human decisions separately from automatic research signals", () => {
    expect(migration).toContain(
      "create table if not exists public.research_gate_c_item_decision",
    );
    expect(migration).toContain(
      "create table if not exists public.research_trait_map_section_decision",
    );
    expect(migration).toContain(
      "create or replace function public.admin_manage_research_decision",
    );
    expect(migration).toContain("insert into audit.admin_audit_log");
  });

  it("accepts only valid decisions through the administrator API", () => {
    expect(route).toContain('z.discriminatedUnion("scope"');
    expect(route).toContain("admin_manage_research_decision");
    expect(route).toContain("isAllowedGateCRequest");
  });

  it("connects both question and trait-map queues to the decision controls", () => {
    expect(dashboard.match(/<AdminResearchDecisionActions/g)?.length).toBe(2);
    expect(dashboard).toContain('scope="gate_c_item"');
    expect(dashboard).toContain('scope="trait_map_section"');
  });
});
