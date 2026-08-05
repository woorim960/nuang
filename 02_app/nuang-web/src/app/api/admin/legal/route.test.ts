import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  originAllowed: vi.fn(() => true),
  resolveAdminContext: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: mocks.resolveAdminContext,
}));

vi.mock("@/features/research/gate-c/gate-c-server-security", () => ({
  isAllowedGateCRequest: mocks.originAllowed,
}));

import { POST } from "@/app/api/admin/legal/route";

const releaseId = "00000000-0000-4000-8000-000000000001";

function request(body: unknown) {
  return new Request("https://nuang.app/api/admin/legal", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

describe("POST /api/admin/legal", () => {
  beforeEach(() => {
    mocks.originAllowed.mockReturnValue(true);
    mocks.rpc.mockReset();
    mocks.resolveAdminContext.mockResolvedValue({
      accountId: "00000000-0000-4000-8000-000000000002",
      client: { rpc: mocks.rpc },
      ok: true,
    });
  });

  it("rejects a cross-origin mutation before checking admin state", async () => {
    mocks.originAllowed.mockReturnValue(false);

    const response = await POST(request({}));

    expect(response.status).toBe(403);
    expect(mocks.resolveAdminContext).not.toHaveBeenCalled();
  });

  it("validates item state before calling the database function", async () => {
    const response = await POST(
      request({
        action: "update_item",
        itemKey: "operator_identity",
        payload: {},
        releaseId,
      }),
    );

    expect(response.status).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("records a typed item update through the audited database function", async () => {
    mocks.rpc.mockResolvedValue({ data: { ok: true }, error: null });

    const response = await POST(
      request({
        action: "update_item",
        itemKey: "operator_identity",
        payload: {
          evidenceRef: "secure-docs/legal/operator-review",
          note: "운영 정보와 일치함",
          ownerLabel: "privacy-owner",
          status: "approved",
        },
        releaseId,
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith("admin_manage_legal_review", {
      target_action: "update_item",
      target_admin_account_id: "00000000-0000-4000-8000-000000000002",
      target_item_key: "operator_identity",
      target_payload: {
        evidenceRef: "secure-docs/legal/operator-review",
        note: "운영 정보와 일치함",
        ownerLabel: "privacy-owner",
        status: "approved",
      },
      target_release_id: releaseId,
    });
  });

  it("turns a missing database function into an actionable setup message", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "function missing" },
    });

    const response = await POST(
      request({ action: "start_review", payload: {}, releaseId }),
    );
    const body = (await response.json()) as { message: string };

    expect(response.status).toBe(503);
    expect(body.message).toContain("최신 DB 마이그레이션");
  });
});
