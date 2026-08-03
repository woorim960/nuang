import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccount: vi.fn(),
  recordScreenView: vi.fn(),
  requireAuth: vi.fn(),
  serviceClient: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccount,
}));
vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuth,
}));
vi.mock("@/features/consent/server-optional-consent", () => ({
  recordProductScreenView: mocks.recordScreenView,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.serviceClient,
}));

import { POST } from "@/app/api/analytics/events/route";

describe("POST /api/analytics/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { id: "auth-1" } });
    mocks.serviceClient.mockReturnValue({ marker: "service" });
    mocks.ensureAccount.mockResolvedValue({ accountId: "account-1", ok: true });
    mocks.recordScreenView.mockResolvedValue({ ok: true, status: "recorded" });
  });

  it("accepts only a normalized screen view and returns 201 when recorded", async () => {
    const response = await POST(
      request({ area: "home", eventName: "screen_view" }),
    );

    expect(response.status).toBe(201);
    expect(mocks.recordScreenView).toHaveBeenCalledWith({
      accountId: "account-1",
      area: "home",
      client: { marker: "service" },
    });
  });

  it("rejects raw paths and unsupported event names before authentication", async () => {
    const response = await POST(
      request({
        area: "home",
        eventName: "button_click",
        pathname: "/results/account/secret-id",
      }),
    );

    expect(response.status).toBe(422);
    expect(mocks.requireAuth).not.toHaveBeenCalled();
  });

  it("quietly drops signed-out, revoked, duplicate and unavailable writes", async () => {
    mocks.requireAuth.mockResolvedValueOnce({ ok: false });
    const signedOut = await POST(
      request({ area: "my", eventName: "screen_view" }),
    );

    mocks.recordScreenView.mockResolvedValueOnce({
      ok: true,
      status: "not_allowed",
    });
    const revoked = await POST(
      request({ area: "my", eventName: "screen_view" }),
    );

    mocks.recordScreenView.mockResolvedValueOnce({
      ok: true,
      status: "duplicate",
    });
    const duplicate = await POST(
      request({ area: "my", eventName: "screen_view" }),
    );

    mocks.recordScreenView.mockResolvedValueOnce({
      code: "analytics_write_failed",
      ok: false,
    });
    const unavailable = await POST(
      request({ area: "my", eventName: "screen_view" }),
    );

    expect([
      signedOut.status,
      revoked.status,
      duplicate.status,
      unavailable.status,
    ]).toEqual([204, 204, 204, 204]);
  });

  it("blocks cross-origin requests before reading a session", async () => {
    const response = await POST(
      request(
        { area: "home", eventName: "screen_view" },
        { origin: "https://malicious.example", "sec-fetch-site": "cross-site" },
      ),
    );

    expect(response.status).toBe(403);
    expect(mocks.requireAuth).not.toHaveBeenCalled();
  });
});

function request(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/analytics/events", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      ...extraHeaders,
    },
    method: "POST",
  });
}
