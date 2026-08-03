import { afterEach, describe, expect, it, vi } from "vitest";
import {
  marketingEmailReadiness,
  readMarketingEmailConfig,
} from "./server-marketing-email-config";

afterEach(() => vi.unstubAllEnvs());

describe("marketing email runtime readiness", () => {
  it("opens only when every delivery and recovery dependency is valid", () => {
    vi.stubEnv("MARKETING_EMAIL_SEND_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MARKETING_EMAIL_FROM", "뉴앙 <news@notice.nuang.app>");
    vi.stubEnv("MARKETING_EMAIL_REPLY_TO", "woorimprog@gmail.com");
    vi.stubEnv("MARKETING_CONTACT_EMAIL", "woorimprog@gmail.com");
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://nuang.app");
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv(
      "AD_RESEND_WEBHOOK_SECRET",
      "whsec_123456789012345678901234567890",
    );
    vi.stubEnv(
      "AD_OUTBOX_CRON_SECRET",
      "cron_12345678901234567890123456789012",
    );

    expect(readMarketingEmailConfig().ready).toBe(true);
    expect(marketingEmailReadiness().checks.every((check) => check.ok)).toBe(
      true,
    );
  });

  it("fails closed for a non-production origin or missing webhook secret", () => {
    vi.stubEnv("MARKETING_EMAIL_SEND_ENABLED", "true");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MARKETING_EMAIL_FROM", "뉴앙 <news@notice.nuang.app>");
    vi.stubEnv("MARKETING_EMAIL_REPLY_TO", "woorimprog@gmail.com");
    vi.stubEnv("MARKETING_CONTACT_EMAIL", "woorimprog@gmail.com");
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "http://localhost:3000");
    vi.stubEnv("FIELD_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv("AD_RESEND_WEBHOOK_SECRET", "");
    vi.stubEnv(
      "AD_OUTBOX_CRON_SECRET",
      "cron_12345678901234567890123456789012",
    );

    const readiness = marketingEmailReadiness();
    expect(readiness.ready).toBe(false);
    expect(readiness.checks.find((check) => check.key === "origin")?.ok).toBe(
      false,
    );
    expect(readiness.checks.find((check) => check.key === "webhook")?.ok).toBe(
      false,
    );
  });
});
