import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readAdminAdvertising,
  readAdvertisingEnvironmentReadiness,
} from "./server-admin-advertising";

describe("readAdminAdvertising", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps inquiry operations available while later advertising tables are missing", async () => {
    const responses: Record<string, { data: unknown[]; error: unknown }> = {
      advertising_inquiry: {
        data: [
          {
            assigned_admin_account_id: null,
            budget_band: "3m_10m",
            campaign_objective: "awareness",
            company_name: "뉴앙 파트너",
            contact_email_ciphertext: "must-never-reach-admin-client",
            contact_email_masked: "he***@example.com",
            created_at: "2026-08-01T01:00:00.000Z",
            creative_readiness: "ready",
            desired_end_date: "2026-09-30",
            desired_start_date: "2026-09-01",
            first_response_due_at: "2026-08-02T01:00:00.000Z",
            id: "22222222-2222-4222-8222-222222222222",
            inquiry_type: "banner",
            next_action_at: null,
            preferred_placement: "home",
            priority: "urgent",
            privacy_consented_at: "2026-08-01T01:00:00.000Z",
            public_reference: "AD-20260801-AAAAAA",
            risk_flags: [],
            schedule_mode: "fixed",
            status: "received",
            target_audience: "뉴앙의 일반 성인 사용자",
            website_url: "https://example.com/campaign",
          },
        ],
        error: null,
      },
      advertising_mail_outbox: {
        data: [
          {
            inquiry_id: "22222222-2222-4222-8222-222222222222",
            status: "sent",
          },
        ],
        error: null,
      },
    };
    const client = {
      async rpc() {
        return { data: null, error: { code: "42883" } };
      },
      from(table: string) {
        return {
          select() {
            return {
              order() {
                return {
                  async limit() {
                    const response = responses[table] ?? {
                      data: [],
                      error: { code: "42P01" },
                    };
                    return {
                      ...response,
                      count: response.data.length,
                    };
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as SupabaseClient;

    const result = await readAdminAdvertising({
      adminAccountId: "33333333-3333-4333-8333-333333333333",
      client,
    });

    expect(result.inquiries.available).toBe(true);
    expect(result.inquiries.items[0]).toMatchObject({
      companyName: "뉴앙 파트너",
      mailRetryableCount: 0,
      mailStatus: "sent",
      priority: "urgent",
      websiteHost: "example.com",
    });
    expect(JSON.stringify(result)).not.toContain(
      "must-never-reach-admin-client",
    );
    expect(result.campaigns).toMatchObject({ available: false, items: [] });
  });

  it("returns environment readiness booleans without exposing secret values", () => {
    vi.stubEnv("ADVERTISING_ENABLED", "true");
    vi.stubEnv("ADSENSE_PUBLISHER_ID", "ca-pub-sensitive-value");
    vi.stubEnv("AD_OUTBOX_CRON_SECRET", "outbox-sensitive-value");
    vi.stubEnv("ADSENSE_ENABLED", "false");

    const readiness = readAdvertisingEnvironmentReadiness();
    const items = readiness.flatMap((group) => group.items);

    expect(
      items.find((item) => item.key === "ADVERTISING_ENABLED")?.configured,
    ).toBe(true);
    expect(
      items.find((item) => item.key === "ADSENSE_ENABLED")?.configured,
    ).toBe(false);
    expect(
      items.find((item) => item.key === "ADSENSE_PUBLISHER_ID")?.configured,
    ).toBe(true);
    expect(JSON.stringify(readiness)).not.toContain("sensitive-value");
  });
});
