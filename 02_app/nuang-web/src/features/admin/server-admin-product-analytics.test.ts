import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  parseAdminProductAnalyticsSnapshot,
  parseAdminProductAnalyticsWindow,
  readAdminProductAnalytics,
} from "@/features/admin/server-admin-product-analytics";

describe("admin product analytics read", () => {
  it("accepts only supported operating windows", () => {
    expect(parseAdminProductAnalyticsWindow("7")).toBe(7);
    expect(parseAdminProductAnalyticsWindow("90")).toBe(90);
    expect(parseAdminProductAnalyticsWindow("365")).toBe(30);
    expect(parseAdminProductAnalyticsWindow(undefined)).toBe(30);
  });

  it("reads the operator-only aggregate RPC without fetching event rows", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: fixture(), error: null });
    const client = {
      schema: vi.fn(() => ({ rpc })),
    } as unknown as SupabaseClient;

    const result = await readAdminProductAnalytics({
      accountId: "admin-account",
      client,
      windowDays: 30,
    });

    expect(client.schema).toHaveBeenCalledWith("consent");
    expect(rpc).toHaveBeenCalledWith("admin_product_analytics_snapshot", {
      target_admin_account_id: "admin-account",
      target_days: 30,
    });
    expect(result).toMatchObject({
      available: true,
      snapshot: {
        summary: { activeAccounts: 4, totalScreenViews: 12 },
        windowDays: 30,
      },
    });
  });

  it("fails closed for unavailable or malformed aggregate payloads", async () => {
    const errorClient = {
      schema: () => ({
        rpc: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST" } }),
      }),
    } as unknown as SupabaseClient;
    const malformedClient = {
      schema: () => ({
        rpc: vi.fn().mockResolvedValue({
          data: { ...fixture(), areas: [{ area: "secret_path", views: 1 }] },
          error: null,
        }),
      }),
    } as unknown as SupabaseClient;

    await expect(
      readAdminProductAnalytics({
        accountId: "admin-account",
        client: errorClient,
        windowDays: 7,
      }),
    ).resolves.toEqual({ available: false, snapshot: null });
    await expect(
      readAdminProductAnalytics({
        accountId: "admin-account",
        client: malformedClient,
        windowDays: 30,
      }),
    ).resolves.toEqual({ available: false, snapshot: null });
  });

  it("rejects negative counts, duplicate aggregate rows and oversized daily payloads", () => {
    expect(
      parseAdminProductAnalyticsSnapshot({
        ...fixture(),
        summary: { ...fixture().summary, activeAccounts: -1 },
      }),
    ).toBeNull();
    expect(
      parseAdminProductAnalyticsSnapshot({
        ...fixture(),
        areas: [fixture().areas[0], fixture().areas[0]],
      }),
    ).toBeNull();
    expect(
      parseAdminProductAnalyticsSnapshot({
        ...fixture(),
        daily: [fixture().daily[0], fixture().daily[0]],
      }),
    ).toBeNull();
    expect(
      parseAdminProductAnalyticsSnapshot({
        ...fixture(),
        daily: Array.from({ length: 31 }, (_, index) => ({
          day: `2026-08-${String((index % 28) + 1).padStart(2, "0")}`,
          uniqueAccounts: 0,
          views: 0,
        })),
      }),
    ).toBeNull();
  });
});

function fixture() {
  return {
    areas: [{ area: "home", uniqueAccounts: 3, views: 7 }],
    daily: [{ day: "2026-08-05", uniqueAccounts: 3, views: 7 }],
    generatedAt: "2026-08-05T00:00:00.000Z",
    retentionDays: 90,
    schemaVersion: 1,
    summary: {
      activatedAccounts: 1,
      activeAccounts: 4,
      assessmentViewers: 3,
      bugFeedbackCount: 1,
      comparedAccounts: 1,
      completedAccounts: 2,
      completedAttempts: 3,
      eligibleAccounts: 8,
      ideaFeedbackCount: 2,
      lastEventAt: "2026-08-05T00:00:00.000Z",
      newEligibleAccounts: 2,
      repeatAccounts: 2,
      resultDependsCount: 1,
      resultFeedbackCount: 3,
      resultFitCount: 2,
      resultNotFitCount: 0,
      resultViewers: 2,
      sharedAccounts: 1,
      totalScreenViews: 12,
      usabilityFeedbackCount: 1,
    },
    windowDays: 30,
  };
}
