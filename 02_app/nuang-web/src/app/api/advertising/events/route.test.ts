import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => ({ rpc: mocks.rpc }),
}));

import { POST } from "@/app/api/advertising/events/route";

describe("advertising event API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("AD_EVENT_SESSION_PEPPER", "event-api-test-pepper");
    mocks.rpc.mockResolvedValue({ data: { ok: true }, error: null });
  });

  it("records an allowlisted event with a server-only session hash", async () => {
    const response = await POST(
      request({
        campaignId: null,
        creativeId: null,
        event: "ad_slot_viewable",
        placementKey: "HOME_INLINE_01",
        provider: "adsense",
        viewportBucket: "mobile",
      }),
    );
    expect(response.status).toBe(202);
    expect(response.headers.get("set-cookie")).toContain("nuang_ad_session=");
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_advertising_event_atomic",
      expect.objectContaining({
        target_ephemeral_session_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        target_page_context: "home_recommended",
      }),
    );
  });

  it("does not collect an AdSense click event", async () => {
    const response = await POST(
      request({
        event: "ad_click_out",
        placementKey: "HOME_INLINE_01",
        provider: "adsense",
        viewportBucket: "mobile",
      }),
    );
    expect(response.status).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed when the database RPC does not explicitly approve", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    const response = await POST(
      request({
        event: "ad_slot_viewable",
        placementKey: "HOME_INLINE_01",
        provider: "adsense",
        viewportBucket: "desktop",
      }),
    );
    expect(response.status).toBe(422);
  });
});

function request(body: unknown) {
  return new Request("http://localhost/api/advertising/events", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
    },
    method: "POST",
  });
}
