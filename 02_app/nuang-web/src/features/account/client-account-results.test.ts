import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readClientAccountResults } from "@/features/account/client-account-results";

const authScope = vi.hoisted(() => ({
  userId: "auth-user-a" as string | null,
}));

vi.mock("@/features/result-persistence/client-result-scope", () => ({
  readCurrentSupabaseUserId: vi.fn(async () => authScope.userId),
  verifyStableResultAuthScope: vi.fn(
    async ({
      requestUserId,
      responseUserId,
    }: {
      requestUserId: string | null;
      responseUserId?: string | null;
    }) =>
      requestUserId &&
      responseUserId === requestUserId &&
      authScope.userId === requestUserId
        ? requestUserId
        : null,
  ),
}));

describe("client account result auth scope", () => {
  beforeEach(() => {
    authScope.userId = "auth-user-a";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends the captured user id and adopts a matching stable response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          comparisonReports: [],
          currentTraitProfile: null,
          ok: true,
          results: [],
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const read = await readClientAccountResults();

    expect(read.state).toBe("ready");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account-results",
      expect.objectContaining({
        headers: { "x-nuang-auth-user-id": "auth-user-a" },
        method: "GET",
      }),
    );
  });

  it("discards account A data when the session changes to B in flight", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => {
      authScope.userId = "auth-user-b";
      return new Response(
        JSON.stringify({
          authUserId: "auth-user-a",
          ok: true,
          results: [{ resultReportId: "account-a-result" }],
        }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const read = await readClientAccountResults();

    expect(read).toMatchObject({ results: [], state: "error" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/account-results",
      expect.objectContaining({
        headers: { "x-nuang-auth-user-id": "auth-user-a" },
      }),
    );
  });

  it("does not issue an account read without a captured user", async () => {
    authScope.userId = null;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(readClientAccountResults()).resolves.toMatchObject({
      results: [],
      state: "not_requested",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
