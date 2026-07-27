import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  allowed: true,
  context: null as unknown,
  rpc: vi.fn(),
  schema: vi.fn(),
}));

vi.mock("@/features/admin/server-admin-access", () => ({
  resolveAdminContext: vi.fn(async () => mocks.context),
}));

vi.mock("@/features/research/gate-c/gate-c-server-security", () => ({
  isAllowedGateCRequest: vi.fn(() => mocks.allowed),
}));

import { POST } from "@/app/api/admin/community/content/route";

describe("admin community content API", () => {
  beforeEach(() => {
    mocks.allowed = true;
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({
      data: { contentId: "11111111-1111-4111-8111-111111111111", ok: true },
      error: null,
    });
    mocks.schema.mockReset();
    mocks.schema.mockReturnValue({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      })),
    });
    mocks.context = {
      accountId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      client: { rpc: mocks.rpc, schema: mocks.schema },
      email: "admin@example.com",
      ok: true,
    };
  });

  it("rejects an untrusted request before any database write", async () => {
    mocks.allowed = false;

    const response = await POST(request({ action: "publish" }));

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("requires a verified administrator", async () => {
    mocks.context = { ok: false, reason: "forbidden" };

    const response = await POST(request({ action: "publish" }));

    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("validates a balance game before calling the service-role RPC", async () => {
    const response = await POST(
      request({
        action: "create",
        body: "",
        contentType: "balance_game",
        options: [{ key: "only", label: "한 개뿐인 선택지" }],
        prompt: "어느 쪽에 더 가까운가요?",
        title: "잘못된 콘텐츠",
      }),
    );

    expect(response.status).toBe(422);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("passes a valid draft to the atomic admin RPC with the admin account", async () => {
    const payload = {
      action: "create",
      body: "",
      contentType: "daily_question",
      options: [],
      prompt: "오늘 가장 고마웠던 순간은 언제였나요?",
      title: "오늘의 감사",
    };

    const response = await POST(request(payload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      contentId: "11111111-1111-4111-8111-111111111111",
      ok: true,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "admin_manage_community_content_atomic",
      {
        target_admin_account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        target_payload: payload,
      },
    );
  });
});

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/admin/community/content", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    method: "POST",
  });
}
