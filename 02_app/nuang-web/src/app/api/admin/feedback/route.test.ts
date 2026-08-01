import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: null as unknown,
  rpc: vi.fn(),
}));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: vi.fn(async () => mocks.context),
}));

import { POST } from "@/app/api/admin/feedback/route";

const feedbackId = "11111111-1111-4111-8111-111111111111";
const adminAccountId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("admin product feedback API", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    mocks.context = {
      accountId: adminAccountId,
      client: { rpc: mocks.rpc },
      email: "admin@example.com",
      ok: true,
    };
  });

  it("rejects a cross-origin mutation before touching the database", async () => {
    const response = await POST(
      request({ feedbackId, status: "reviewing" }, "https://example.com"),
    );

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires an administrator", async () => {
    mocks.context = { ok: false, reason: "forbidden" };

    const response = await POST(request({ feedbackId, status: "reviewing" }));

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("validates the feedback state change", async () => {
    const response = await POST(request({ feedbackId, status: "unknown" }));

    expect(response.status).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("changes state through the audited atomic RPC", async () => {
    const response = await POST(request({ feedbackId, status: "planned" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_manage_product_feedback",
      {
        target_admin_account_id: adminAccountId,
        target_feedback_id: feedbackId,
        target_status: "planned",
      },
    );
  });
});

function request(
  body: Record<string, unknown>,
  origin = "http://localhost",
) {
  return new Request("http://localhost/api/admin/feedback", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin,
    },
    method: "POST",
  });
}
