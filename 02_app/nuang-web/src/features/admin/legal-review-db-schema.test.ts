import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { legalReviewDefinitions } from "./legal-review-contract";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/202608050007_admin_legal_review_operations.sql",
  ),
  "utf8",
);

describe("legal review operations database contract", () => {
  it("seeds every guided review item", () => {
    for (const item of legalReviewDefinitions) {
      expect(migration).toContain(`('${item.itemKey}')`);
    }
  });

  it("keeps records service-role only and writes every mutation to the admin audit log", () => {
    expect(migration).toContain(
      "alter table public.admin_legal_release enable row level security",
    );
    expect(migration).toContain(
      "alter table public.admin_legal_review_item enable row level security",
    );
    expect(migration).toMatch(
      /revoke all on public\.admin_legal_release[\s\S]*authenticated/,
    );
    expect(migration).toMatch(
      /grant select, insert, update, delete[\s\S]*to service_role/,
    );
    expect(migration).toContain("insert into audit.admin_audit_log");
  });

  it("requires evidence and attestation without copying raw advice into the audit log", () => {
    expect(migration).toContain("approved_legal_item_evidence_required");
    expect(migration).toContain("legal_approval_attestation_required");
    expect(migration).toContain("legal_review_items_not_approved");
    expect(migration).toContain("'changedFields'");
    expect(migration).not.toContain("'payload', target_payload");
  });
});
