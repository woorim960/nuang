import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ensureAccountForUser: vi.fn(),
  getUser: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
  serviceClient: vi.fn(),
}));

vi.mock("@/features/account/server-writes", () => ({
  ensureAccountForUser: mocks.ensureAccountForUser,
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
  })),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.serviceClient,
  getSupabaseServiceEnv: () => ({
    shareTokenPepper: "test-feedback-pepper",
  }),
}));

import { POST } from "@/app/api/feedback/route";

describe("product feedback API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: { id: "auth-user" },
    });
    mocks.ensureAccountForUser.mockResolvedValue({
      accountId: "10000000-0000-4000-8000-000000000001",
      ok: true,
    });
  });

  it("rejects a cross-site mutation before reading the payload", async () => {
    mocks.serviceClient.mockReturnValue(createClient().client);

    const response = await POST(
      request(validPayload(), { "sec-fetch-site": "cross-site" }),
    );

    expect(response.status).toBe(403);
    expect(mocks.serviceClient).not.toHaveBeenCalled();
  });

  it("stores anonymous feedback without collecting contact information", async () => {
    const mock = createClient();
    mocks.serviceClient.mockReturnValue(mock.client);

    const response = await POST(request(validPayload()));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ feedbackId: "feedback-1", ok: true });
    expect(mock.inserted).toMatchObject({
      account_id: null,
      area: "community",
      body: "투표를 눌렀는데 선택 결과가 바로 바뀌지 않았어요.",
      kind: "bug",
    });
    expect(mock.inserted).not.toHaveProperty("email");
    expect(mock.inserted).not.toHaveProperty("user_agent");
  });

  it("links feedback to a server-resolved account when signed in", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "auth-user" } },
    });
    const mock = createClient();
    mocks.serviceClient.mockReturnValue(mock.client);

    const response = await POST(request(validPayload()));

    expect(response.status).toBe(201);
    expect(mock.inserted?.account_id).toBe(
      "10000000-0000-4000-8000-000000000001",
    );
  });

  it("rejects a duplicate without inserting it again", async () => {
    const mock = createClient({ duplicate: true });
    mocks.serviceClient.mockReturnValue(mock.client);

    const response = await POST(request(validPayload()));

    expect(response.status).toBe(409);
    expect(mock.inserted).toBeNull();
  });

  it("requires a useful amount of detail", async () => {
    mocks.serviceClient.mockReturnValue(createClient().client);

    const response = await POST(
      request({ ...validPayload(), body: "안돼요" }),
    );

    expect(response.status).toBe(422);
  });
});

function validPayload() {
  return {
    area: "community",
    body: "투표를 눌렀는데 선택 결과가 바로 바뀌지 않았어요.",
    clientSessionId: "10000000-0000-4000-8000-000000000001",
    kind: "bug",
    sourcePath: "/feed",
    technicalContext: {
      locale: "ko-KR",
      timeZone: "Asia/Seoul",
      viewportHeight: 844,
      viewportWidth: 390,
    },
  };
}
function request(
  body: unknown,
  headers: Record<string, string> = { "sec-fetch-site": "same-origin" },
) {
  return new Request("http://localhost/api/feedback", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", ...headers },
    method: "POST",
  });
}

function createClient({
  duplicate = false,
}: {
  duplicate?: boolean;
} = {}) {
  let inserted: Record<string, unknown> | null = null;
  let selectCall = 0;

  const client = {
    from(table: string) {
      expect(table).toBe("product_feedback");
      return {
        insert(row: Record<string, unknown>) {
          inserted = row;
          return {
            select: () => ({
              single: async () => ({
                data: {
                  created_at: "2026-07-28T00:00:00.000Z",
                  id: "feedback-1",
                  status: "received",
                },
                error: null,
              }),
            }),
          };
        },
        select(_columns: string, options?: { count?: string; head?: boolean }) {
          selectCall += 1;
          if (options?.head) {
            const countBuilder = {
              eq: () => countBuilder,
              gte: async () => ({ count: 0, error: null }),
            };
            return countBuilder;
          }
          const duplicateBuilder = {
            eq: () => duplicateBuilder,
            gte: () => duplicateBuilder,
            limit: () => duplicateBuilder,
            maybeSingle: async () => ({
              data: duplicate ? { id: "existing" } : null,
              error: null,
            }),
          };
          return duplicateBuilder;
        },
      };
    },
  };

  return {
    client,
    get inserted() {
      return inserted;
    },
    get selectCall() {
      return selectCall;
    },
  };
}
