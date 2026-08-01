import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAdvertisingServerSession } from "@/features/advertising/server-advertising-event-security";

describe("advertising event session protection", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("AD_EVENT_SESSION_PEPPER", "event-only-pepper");
    vi.stubEnv("AD_CONTACT_HASH_PEPPER", "contact-only-pepper");
  });

  it("creates a stable keyed hash from the HttpOnly session cookie", () => {
    const cookie = "10000000-0000-4000-8000-000000000001";
    const first = resolveAdvertisingServerSession(
      new Request("https://nuang.example/api/advertising/events", {
        headers: { cookie: `nuang_ad_session=${cookie}` },
      }),
    );
    const second = resolveAdvertisingServerSession(
      new Request("https://nuang.example/api/advertising/feedback", {
        headers: { cookie: `other=x; nuang_ad_session=${cookie}` },
      }),
    );
    expect(first).toEqual(second);
    expect(first.sessionId).toBe(cookie);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.hash).not.toContain(cookie);
  });

  it("does not fall back to the contact blind-index pepper", () => {
    vi.stubEnv("AD_EVENT_SESSION_PEPPER", "");
    expect(() =>
      resolveAdvertisingServerSession(
        new Request("https://nuang.example/api/advertising/events"),
      ),
    ).toThrow("AD_EVENT_SESSION_PEPPER is required");
  });
});
