import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccount: vi.fn(),
  readState: vi.fn(),
  requireAuth: vi.fn(),
  saveState: vi.fn(),
  serviceClient: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccount,
}));
vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuth,
}));
vi.mock("@/features/onboarding/server-onboarding", () => ({
  readAccountOnboardingState: mocks.readState,
  saveAccountOnboardingState: mocks.saveState,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.serviceClient,
}));

import { GET, PATCH } from "@/app/api/me/onboarding/route";

const state = {
  completedAt: null,
  firstSeenAt: "2026-08-03T00:00:00.000Z",
  guideVersion: 3,
  seen: true,
};

describe("/api/me/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ ok: true, user: { id: "auth-1" } });
    mocks.serviceClient.mockReturnValue({ marker: "service" });
    mocks.ensureAccount.mockResolvedValue({ accountId: "account-1", ok: true });
    mocks.readState.mockResolvedValue({ data: state, ok: true });
    mocks.saveState.mockResolvedValue({ data: state, ok: true });
  });

  it("returns account-level first exposure without caching", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      ok: true,
      state,
    });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("lets an anonymous first visitor continue without creating an account", async () => {
    mocks.requireAuth.mockResolvedValue({ ok: false });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.authenticated).toBe(false);
    expect(payload.state.seen).toBe(false);
    expect(mocks.ensureAccount).not.toHaveBeenCalled();
  });

  it("saves an explicit seen state for the canonical account", async () => {
    const response = await PATCH(request({ state: "seen" }));

    expect(response.status).toBe(200);
    expect(mocks.saveState).toHaveBeenCalledWith({
      accountId: "account-1",
      client: { marker: "service" },
      state: "seen",
    });
  });

  it("rejects cross-site and unsupported writes before mutation", async () => {
    const crossSite = await PATCH(
      request(
        { state: "completed" },
        { origin: "https://malicious.example", "sec-fetch-site": "cross-site" },
      ),
    );
    const unsupported = await PATCH(request({ state: "reopen" }));

    expect(crossSite.status).toBe(403);
    expect(unsupported.status).toBe(422);
    expect(mocks.saveState).not.toHaveBeenCalled();
  });
});

function request(body: unknown, extraHeaders: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/me/onboarding", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      ...extraHeaders,
    },
    method: "PATCH",
  });
}
