import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET } from "@/app/api/account-results/route";
import { readAccountResults } from "@/features/account/server-reads";
import { rebuildAccountTraitProfile } from "@/features/assessment/server-account-trait-profile";
import { listPublicComparisonsForUser } from "@/features/together/server-public-comparisons";

const routeMocks = vi.hoisted(() => ({
  expectedAuthUserId: null as string | null,
  deleteCalls: 0,
  serviceClientCalls: 0,
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: vi.fn(
    async (
      _request?: Request,
      options?: { expectedSupabaseUserId?: string | null },
    ) => {
      routeMocks.expectedAuthUserId = options?.expectedSupabaseUserId ?? null;
      if (routeMocks.expectedAuthUserId !== "supabase-user-1") {
        return {
          ok: false,
          response: new Response(
            JSON.stringify({
              authUserId: "supabase-user-1",
              error: "auth_scope_changed",
              ok: false,
            }),
            { status: 409 },
          ),
        };
      }

      return {
        ok: true,
        user: { id: "supabase-user-1" },
      };
    },
  ),
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => {
    routeMocks.serviceClientCalls += 1;
    const query = {
      eq: vi.fn(),
      is: vi.fn(),
      limit: vi.fn(),
      maybeSingle: vi.fn(async () => ({
        data: { account_id: "account-1" },
        error: null,
      })),
      order: vi.fn(),
      select: vi.fn(),
    };
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.select.mockReturnValue(query);
    return {
      schema: vi.fn(() => ({ from: vi.fn(() => query) })),
    };
  }),
}));

vi.mock("@/features/account/server-writes", () => ({
  deleteResultForAccount: vi.fn(async () => {
    routeMocks.deleteCalls += 1;
    return {
      data: {
        deleted: true,
        localResultId: "local_test_123",
        resultReportId: null,
      },
      ok: true,
    };
  }),
}));

vi.mock("@/features/account/server-reads", () => ({
  readAccountResults: vi.fn(),
}));

vi.mock("@/features/assessment/server-account-trait-profile", () => ({
  rebuildAccountTraitProfile: vi.fn(),
}));

vi.mock("@/features/together/server-public-comparisons", () => ({
  listPublicComparisonsForUser: vi.fn(),
}));

describe("account result auth scope", () => {
  afterEach(() => {
    routeMocks.expectedAuthUserId = null;
    routeMocks.deleteCalls = 0;
    routeMocks.serviceClientCalls = 0;
    vi.clearAllMocks();
  });

  it("rejects a mismatched read before service access", async () => {
    const response = await GET(
      new Request("http://localhost:3000/api/account-results", {
        headers: { "x-nuang-auth-user-id": "supabase-user-2" },
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      authUserId: "supabase-user-1",
      error: "auth_scope_changed",
      ok: false,
    });
    expect(routeMocks.expectedAuthUserId).toBe("supabase-user-2");
    expect(routeMocks.serviceClientCalls).toBe(0);
    expect(readAccountResults).not.toHaveBeenCalled();
    expect(listPublicComparisonsForUser).not.toHaveBeenCalled();
  });

  it("returns the canonical user id with a successful read", async () => {
    vi.mocked(readAccountResults).mockResolvedValueOnce({
      data: [],
      ok: true,
    });
    vi.mocked(listPublicComparisonsForUser).mockResolvedValueOnce({
      data: [],
      ok: true,
    });
    vi.mocked(rebuildAccountTraitProfile).mockResolvedValueOnce(null);

    const response = await GET(
      new Request("http://localhost:3000/api/account-results", {
        headers: { "x-nuang-auth-user-id": "supabase-user-1" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({
      authUserId: "supabase-user-1",
      ok: true,
      results: [],
    });
    expect(routeMocks.serviceClientCalls).toBe(1);
  });

  it("rejects a mismatched request before service access", async () => {
    const response = await DELETE(deleteRequest("supabase-user-2"));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      authUserId: "supabase-user-1",
      error: "auth_scope_changed",
      ok: false,
    });
    expect(routeMocks.serviceClientCalls).toBe(0);
    expect(routeMocks.deleteCalls).toBe(0);
  });

  it("returns the canonical user id with a successful deletion", async () => {
    const response = await DELETE(deleteRequest("supabase-user-1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({
      authUserId: "supabase-user-1",
      ok: true,
      result: { deleted: true, localResultId: "local_test_123" },
    });
    expect(routeMocks.serviceClientCalls).toBe(1);
    expect(routeMocks.deleteCalls).toBe(1);
  });
});

function deleteRequest(authUserId: string) {
  return new Request("http://localhost:3000/api/account-results", {
    body: JSON.stringify({ localResultId: "local_test_123" }),
    headers: {
      "content-type": "application/json",
      "x-nuang-auth-user-id": authUserId,
    },
    method: "DELETE",
  });
}
