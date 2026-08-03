import { beforeEach, describe, expect, it, vi } from "vitest";
import { optionalConsentVersions } from "@/features/consent/optional-consent-contract";

const mocks = vi.hoisted(() => ({
  ensureAccount: vi.fn(),
  readPreferences: vi.fn(),
  requireAuth: vi.fn(),
  savePreference: vi.fn(),
  serviceClient: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccount,
}));
vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuth,
}));
vi.mock("@/features/consent/server-optional-consent", () => ({
  readOptionalConsentPreferences: mocks.readPreferences,
  saveOptionalConsentPreference: mocks.savePreference,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.serviceClient,
}));

import { GET, PATCH } from "@/app/api/me/consents/route";

const preferences = {
  analytics: {
    enabled: true,
    updatedAt: "2026-08-03T00:00:00.000Z",
    version: optionalConsentVersions.analytics,
  },
  marketing: {
    enabled: false,
    updatedAt: "2026-08-03T00:00:00.000Z",
    version: optionalConsentVersions.marketing,
  },
};

describe("/api/me/consents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { id: "auth-1" } });
    mocks.serviceClient.mockReturnValue({ marker: "service" });
    mocks.ensureAccount.mockResolvedValue({ accountId: "account-1", ok: true });
    mocks.readPreferences.mockResolvedValue({ data: preferences, ok: true });
    mocks.savePreference.mockResolvedValue({ data: preferences, ok: true });
  });

  it("returns both canonical preferences without caching", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, preferences });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("writes one explicit preference with the matching version", async () => {
    const response = await PATCH(
      request({
        consentVersion: optionalConsentVersions.analytics,
        enabled: false,
        preference: "analytics",
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.savePreference).toHaveBeenCalledWith({
      accountId: "account-1",
      client: { marker: "service" },
      enabled: false,
      preference: "analytics",
      source: "my_settings",
    });
  });

  it("rejects a mismatched version and cross-origin request before mutation", async () => {
    const stale = await PATCH(
      request({
        consentVersion: optionalConsentVersions.marketing,
        enabled: true,
        preference: "analytics",
      }),
    );
    const crossSite = await PATCH(
      request(
        {
          consentVersion: optionalConsentVersions.marketing,
          enabled: true,
          preference: "marketing",
        },
        { origin: "https://malicious.example", "sec-fetch-site": "cross-site" },
      ),
    );

    expect(stale.status).toBe(422);
    expect(crossSite.status).toBe(403);
    expect(mocks.savePreference).not.toHaveBeenCalled();
  });
});

function request(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/me/consents", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      ...extraHeaders,
    },
    method: "PATCH",
  });
}
