import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  advertisingRpc: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  marketingRpc: vi.fn(),
  verifyResendWebhookSignature: vi.fn(),
}));

vi.mock("@/features/advertising/server-resend-webhook", () => ({
  verifyResendWebhookSignature: mocks.verifyResendWebhookSignature,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

import { POST } from "./route";

describe("Resend email webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyResendWebhookSignature.mockReturnValue(true);
    mocks.advertisingRpc.mockResolvedValue({ error: null });
    mocks.marketingRpc.mockResolvedValue({ error: null });
    mocks.createSupabaseServiceClient.mockReturnValue({
      rpc: mocks.advertisingRpc,
      schema: vi.fn(() => ({ rpc: mocks.marketingRpc })),
    });
  });

  it("acknowledges production monitor events without database access", async () => {
    const response = await POST(
      webhookRequest({ category: "production_monitor" }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ignored: true, ok: true });
    expect(mocks.createSupabaseServiceClient).not.toHaveBeenCalled();
    expect(mocks.advertisingRpc).not.toHaveBeenCalled();
    expect(mocks.marketingRpc).not.toHaveBeenCalled();
  });

  it("keeps existing advertising and marketing webhook projection", async () => {
    const response = await POST(webhookRequest({ category: "marketing" }));

    expect(response.status).toBe(200);
    expect(mocks.advertisingRpc).toHaveBeenCalledOnce();
    expect(mocks.marketingRpc).toHaveBeenCalledOnce();
  });
});

function webhookRequest(tags: Record<string, string>) {
  return new Request(
    "https://nuang.app/api/internal/advertising/email-webhook",
    {
      body: JSON.stringify({
        created_at: "2026-08-15T00:00:00.000Z",
        data: { email_id: "email-test-id", tags },
        type: "email.delivered",
      }),
      headers: {
        "content-type": "application/json",
        "svix-id": "webhook-test-id",
      },
      method: "POST",
    },
  );
}
