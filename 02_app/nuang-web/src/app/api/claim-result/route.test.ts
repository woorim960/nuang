import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimResultToAccount: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  readResultAccountStatus: vi.fn(),
  requireAuthenticatedUser: vi.fn(),
}));

vi.mock("@/features/auth/server-auth", () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/features/account/server-reads", () => ({
  readResultAccountStatus: mocks.readResultAccountStatus,
}));

vi.mock("@/features/account/server-writes", () => ({
  claimResultToAccount: mocks.claimResultToAccount,
}));

import { GET, POST } from "@/app/api/claim-result/route";

const authUser = { id: "auth-user-a" };
const serviceClient = { service: true };

describe("/api/claim-result auth scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      user: authUser,
    });
    mocks.createSupabaseServiceClient.mockReturnValue(serviceClient);
  });

  it("includes the canonical auth user in a successful status response", async () => {
    mocks.readResultAccountStatus.mockResolvedValue({ data: null, ok: true });

    const response = await GET(statusRequest("auth-user-a"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authUserId: "auth-user-a",
      ok: true,
      result: null,
    });
  });

  it.each([
    ["age_or_required_consent_missing", 400],
    ["result_deleted", 410],
  ] as const)(
    "binds the %s claim failure to the canonical auth user",
    async (code, expectedStatus) => {
      mocks.claimResultToAccount.mockResolvedValue({ code, ok: false });

      const response = await POST(claimRequest("auth-user-a"));
      const body = await response.json();

      expect(response.status).toBe(expectedStatus);
      expect(body).toMatchObject({
        authUserId: "auth-user-a",
        code,
        ok: false,
      });
    },
  );

  it("includes the canonical auth user in a successful claim response", async () => {
    mocks.claimResultToAccount.mockResolvedValue({
      data: {
        assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
        claimedAt: "2026-08-15T00:00:00.000Z",
        profileCode: "ENAKQ",
        profileName: "관계를 여는 선도자",
        resultReportId: "22222222-2222-4222-8222-222222222222",
      },
      ok: true,
    });

    const response = await POST(claimRequest("auth-user-a"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      authUserId: "auth-user-a",
      ok: true,
      result: {
        resultReportId: "22222222-2222-4222-8222-222222222222",
      },
    });
  });

  it("rejects a changed auth scope before creating a service client or writing", async () => {
    const response = await POST(claimRequest("auth-user-b"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      authUserId: "auth-user-a",
      error: "auth_scope_changed",
      ok: false,
    });
    expect(mocks.createSupabaseServiceClient).not.toHaveBeenCalled();
    expect(mocks.claimResultToAccount).not.toHaveBeenCalled();
  });
});

function statusRequest(authUserId: string) {
  return new Request(
    "http://localhost:3000/api/claim-result?localResultId=local_test_123",
    { headers: { "x-nuang-auth-user-id": authUserId } },
  );
}

function claimRequest(authUserId: string) {
  return new Request("http://localhost:3000/api/claim-result", {
    body: JSON.stringify({
      assessmentKind: "full",
      localResultId: "local_test_123",
      responses: [
        {
          answeredAt: "2026-08-15T00:00:00.000Z",
          itemId: "NU-C1-001",
          value: 5,
        },
      ],
      resultSummary: { completedAt: "2026-08-15T00:00:00.000Z" },
      versionBundle: {
        assessmentReleaseId: "NUANG-CORE-FULL-1.0",
        codeSchemeVersion: "NUANG-CODE-5AXIS-1.0",
        scoringModelVersion: "CORE-SCORING-1.0",
        scoringReleaseId: "NUANG-CORE-FULL-SCORING-1.0",
      },
    }),
    headers: {
      "content-type": "application/json",
      "x-nuang-auth-user-id": authUserId,
    },
    method: "POST",
  });
}
