import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { legalReviewDefinitions } from "./legal-review-contract";
import { readAdminLegalDashboard } from "./server-admin-legal";

function clientWith({
  items = [],
  itemError = null,
  release,
  releaseError = null,
}: {
  items?: unknown[];
  itemError?: null | { code?: string };
  release?: Record<string, unknown>;
  releaseError?: null | { code?: string };
}) {
  const from = vi.fn((table: string) => {
    const query = {
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => ({
        data: release ?? null,
        error: releaseError,
      })),
      order: vi.fn(async () => ({ data: items, error: itemError })),
      select: vi.fn(() => query),
    };
    if (table === "admin_legal_review_item") {
      query.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    }
    return query;
  });
  return { client: { from } as unknown as SupabaseClient, from };
}

describe("readAdminLegalDashboard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails safely with all guided items when the operations migration is missing", async () => {
    const { client } = clientWith({ releaseError: { code: "PGRST205" } });

    const dashboard = await readAdminLegalDashboard(client);

    expect(dashboard.available).toBe(false);
    expect(dashboard.items).toHaveLength(legalReviewDefinitions.length);
    expect(dashboard.unavailableReason).toContain("최신 DB 마이그레이션");
    expect(dashboard.items.every((item) => item.status === "pending")).toBe(
      true,
    );
  });

  it("merges stored decisions while exposing only readiness for environment facts", async () => {
    vi.stubEnv("LEGAL_OPERATOR_NAME", "secret-operator-name");
    vi.stubEnv("LEGAL_BUSINESS_NAME", "secret-business-name");
    vi.stubEnv("LEGAL_REPRESENTATIVE_NAME", "secret-representative-name");
    vi.stubEnv("LEGAL_BUSINESS_REGISTRATION_NUMBER", "secret-registration");
    vi.stubEnv("LEGAL_SUPPORT_RESPONSE_WINDOW", "secret-response-window");
    vi.stubEnv("LEGAL_SERVICE_ORIGIN", "https://secret.example");
    const { client } = clientWith({
      items: [
        {
          evidence_ref: "secure-docs/operator",
          item_key: "operator_identity",
          note: "기능과 문구 일치",
          owner_label: "owner-01",
          reviewed_at: "2026-08-05T01:00:00.000Z",
          status: "approved",
        },
      ],
      release: {
        id: "00000000-0000-4000-8000-000000000001",
        policy_version: "policy.v1.0",
        privacy_version: "policy.v1.0",
        release_key: "NUANG-MVP-LEGAL-2026-08",
        status: "draft",
        terms_version: "policy.v1.0",
      },
    });

    const dashboard = await readAdminLegalDashboard(client);
    const operatorItem = dashboard.items.find(
      (item) => item.itemKey === "operator_identity",
    );

    expect(dashboard.available).toBe(true);
    expect(operatorItem).toMatchObject({
      evidenceRef: "secure-docs/operator",
      ownerLabel: "owner-01",
      status: "approved",
    });
    expect(
      dashboard.environment.find((item) => item.key === "operator")?.ready,
    ).toBe(true);
    expect(
      [
        "business-name",
        "representative-name",
        "business-registration-number",
        "support-response-window",
        "policy-origin",
      ].every(
        (key) => dashboard.environment.find((item) => item.key === key)?.ready,
      ),
    ).toBe(true);
    expect(JSON.stringify(dashboard.environment)).not.toContain(
      "secret-operator-name",
    );
    expect(JSON.stringify(dashboard.environment)).not.toContain("secret-");
  });
});
