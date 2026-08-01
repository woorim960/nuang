import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ rpc: mocks.rpc }),
}));

import { POST } from "@/app/api/advertising/feedback/route";

describe("advertising feedback API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("AD_EVENT_SESSION_PEPPER", "feedback-api-test-pepper");
    mocks.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it("stores a fixed-choice reason without an account or free text", async () => {
    const response = await POST(
      request({
        campaignId: null,
        creativeId: null,
        placementKey: "HOME_INLINE_01",
        provider: "adsense",
        reason: "not_interested",
        viewportBucket: "tablet",
      }),
    );
    expect(response.status).toBe(201);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "submit_advertising_feedback_atomic",
      expect.objectContaining({
        target_ephemeral_session_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        target_reason: "not_interested",
        target_viewport_bucket: "tablet",
      }),
    );
    const rpcInput = mocks.rpc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(rpcInput).not.toHaveProperty("accountId");
    expect(rpcInput).not.toHaveProperty("message");
  });

  it("rejects a provider and slot mismatch", async () => {
    const response = await POST(
      request({
        placementKey: "FEED_COMMERCE_01",
        provider: "adsense",
        reason: "seems_wrong",
      }),
    );
    expect(response.status).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("maps the atomic rate limit to 429", async () => {
    mocks.rpc.mockResolvedValue({
      data: { code: "rate_limited", ok: false },
      error: null,
    });
    const response = await POST(
      request({
        placementKey: "HOME_INLINE_01",
        provider: "adsense",
        reason: "too_repetitive",
      }),
    );
    expect(response.status).toBe(429);
  });
});

function request(body: unknown) {
  return new Request("http://localhost/api/advertising/feedback", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
    },
    method: "POST",
  });
}
