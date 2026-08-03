import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  normalizeAdminConsentFilters,
  readAdminConsentDashboard,
  sanitizeConsentChange,
} from "./server-admin-consents";

describe("admin consent dashboard contract", () => {
  it("normalizes filters to the small supported set", () => {
    expect(
      normalizeAdminConsentFilters({ status: "revoked", type: "analytics" }),
    ).toEqual({
      status: "revoked",
      type: "analytics",
    });
    expect(
      normalizeAdminConsentFilters({ status: "injected", type: "unknown" }),
    ).toEqual({
      status: "all",
      type: "all",
    });
  });

  it("returns only a short account reference and controlled ledger fields", () => {
    const fullAccountId = "4292e0e7-0353-43f0-9132-f90149badee5";
    const result = sanitizeConsentChange({
      account_id: fullAccountId,
      consent_type: "marketing",
      consent_version: "MARKETING-2026.08",
      contact_email_ciphertext: "must-never-leave-the-server",
      metadata: { email: "private@example.com", pathname: "/result/private" },
      recorded_at: "2026-08-03T01:00:00.000Z",
      source: "my_settings",
      status: "revoked",
    });

    expect(result).toEqual({
      accountRef: "4292E0E7",
      consentVersion: "MARKETING-2026.08",
      recordedAt: "2026-08-03T01:00:00.000Z",
      source: "my_settings",
      status: "revoked",
      type: "marketing",
    });
    expect(JSON.stringify(result)).not.toContain(fullAccountId);
    expect(JSON.stringify(result)).not.toContain("private@example.com");
    expect(JSON.stringify(result)).not.toContain("must-never-leave-the-server");
  });

  it("rejects unsupported records instead of passing through arbitrary values", () => {
    expect(
      sanitizeConsentChange({
        account_id: "not-an-account-id",
        consent_type: "required_privacy",
        consent_version: "<script>alert(1)</script>",
        recorded_at: "2026-08-03T01:00:00.000Z",
        source: "custom_free_text",
        status: "granted",
      }),
    ).toBeNull();
  });

  it("degrades only the optional analytics metric when its table is unavailable", async () => {
    const fullAccountId = "4292e0e7-0353-43f0-9132-f90149badee5";
    const client = createReadOnlyClient({
      recentRows: [
        {
          account_id: fullAccountId,
          consent_type: "analytics",
          consent_version: "ANALYTICS-2026.08",
          recorded_at: "2026-08-03T01:00:00.000Z",
          source: "account_gate",
          status: "granted",
        },
      ],
    });

    const dashboard = await readAdminConsentDashboard({
      client,
      now: new Date("2026-08-03T02:00:00.000Z"),
    });

    expect(dashboard.analyticsEventsAvailable).toBe(false);
    expect(dashboard.metrics.analyticsEvents24h.state).toBe("unavailable");
    expect(dashboard.metrics.currentAccounts).toMatchObject({
      state: "ready",
      value: 4,
    });
    expect(dashboard.metrics.analyticsOptIn).toMatchObject({
      denominator: 4,
      state: "ready",
      value: 50,
    });
    expect(dashboard.recentChanges.items[0]?.accountRef).toBe("4292E0E7");
    expect(JSON.stringify(dashboard)).not.toContain(fullAccountId);
  });

  it("degrades only the marketing readiness metric when the audience resolver fails", async () => {
    const dashboard = await readAdminConsentDashboard({
      client: createReadOnlyClient({
        analyticsEventsAvailable: true,
        marketingAudienceAvailable: false,
        recentRows: [],
      }),
      now: new Date("2026-08-03T02:00:00.000Z"),
    });

    expect(dashboard.metrics.marketingReady.state).toBe("unavailable");
    expect(dashboard.metrics.marketingOptIn.state).toBe("ready");
    expect(dashboard.metrics.analyticsEvents24h).toMatchObject({
      state: "ready",
      value: 12,
    });
    expect(dashboard.recentChanges.available).toBe(true);
  });
});

function createReadOnlyClient({
  analyticsEventsAvailable = false,
  marketingAudienceAvailable = true,
  recentRows,
}: {
  analyticsEventsAvailable?: boolean;
  marketingAudienceAvailable?: boolean;
  recentRows: Record<string, unknown>[];
}) {
  function createBuilder(table: string) {
    const filters = new Map<string, unknown>();
    let head = false;
    let selected = "";

    const builder = {
      eq(column: string, value: unknown) {
        filters.set(column, value);
        return builder;
      },
      gte() {
        return builder;
      },
      in() {
        return builder;
      },
      limit() {
        return builder;
      },
      order() {
        return builder;
      },
      range() {
        return Promise.resolve({ data: [], error: null });
      },
      select(columns: string, options?: { head?: boolean }) {
        selected = columns;
        head = Boolean(options?.head);
        return builder;
      },
      then<TResult1 = unknown, TResult2 = never>(
        onfulfilled?:
          ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?:
          ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ) {
        let response: unknown;
        if (table === "product_analytics_event") {
          response = analyticsEventsAvailable
            ? { count: 12, data: null, error: null }
            : { count: null, data: null, error: { code: "42P01" } };
        } else if (table === "resolve_marketing_audience") {
          response = marketingAudienceAvailable
            ? { count: 0, data: null, error: null }
            : { count: null, data: null, error: { code: "PGRST202" } };
        } else if (table === "age_and_consent_status" && head) {
          const count = filters.has("analytics_opt_in")
            ? 2
            : filters.has("marketing_opt_in")
              ? 0
              : 4;
          response = { count, data: null, error: null };
        } else if (table === "consent_record" && head) {
          response = { count: 3, data: null, error: null };
        } else if (
          table === "consent_record" &&
          selected.includes("consent_version")
        ) {
          response = { count: null, data: recentRows, error: null };
        } else {
          response = { count: 0, data: [], error: null };
        }
        return Promise.resolve(response).then(onfulfilled, onrejected);
      },
    };
    return builder;
  }

  return {
    from(table: string) {
      return createBuilder(table);
    },
    schema() {
      return {
        from(table: string) {
          return createBuilder(table);
        },
        rpc(
          functionName: string,
          _args: Record<string, unknown>,
          options?: { head?: boolean },
        ) {
          return createBuilder(functionName).select("", {
            head: options?.head,
          });
        },
      };
    },
  } as unknown as SupabaseClient;
}
