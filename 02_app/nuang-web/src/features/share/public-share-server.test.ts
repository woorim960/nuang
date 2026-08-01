import { beforeEach, describe, expect, it, vi } from "vitest";
import { readPublicShareToken } from "@/features/share/public-share-server";

const browserAuthMocks = vi.hoisted(() => ({
  userId: null as string | null,
}));

const serviceMocks = vi.hoisted(() => ({
  client: null as null | ReturnType<typeof createMockShareClient>,
  env: {
    appOrigin: "http://localhost:3000",
    serviceRoleKey: "service-role",
    shareTokenPepper: "pepper",
    url: "https://example.supabase.co",
  },
}));

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: vi.fn(() => serviceMocks.client),
  getSupabaseServiceEnv: vi.fn(() => serviceMocks.env),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () =>
    browserAuthMocks.userId
      ? {
          auth: {
            getUser: async () => ({
              data: { user: { id: browserAuthMocks.userId } },
            }),
          },
        }
      : null,
  ),
}));

describe("public share server read", () => {
  beforeEach(() => {
    browserAuthMocks.userId = null;
    serviceMocks.client = null;
  });

  it("resolves an active token without requiring a public profile", async () => {
    serviceMocks.client = createMockShareClient({
      attempt: { completed_at: "2026-07-04T00:00:00.000Z" },
      report: {
        attempt_id: "11111111-1111-4111-8111-111111111111",
        created_at: "2026-07-04T00:00:00.000Z",
        id: "22222222-2222-4222-8222-222222222222",
        profile_code: "ENAKQ",
        profile_name: "예전 저장 이름",
        report_kind: "full",
      },
      share: {
        account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        expires_at: "2099-08-01T00:00:00.000Z",
        result_report_id: "22222222-2222-4222-8222-222222222222",
        status: "active",
      },
    });

    const result = await readPublicShareToken("public-token");

    expect(result.status).toBe("active");
    if (result.status !== "active") return;
    expect(result.model.result.code).toBe("ENAKQ");
    expect(result.model.result.domains).toEqual([]);
    expect(result.model.identity.originResultId).toBeNull();
  });

  it.each([
    ["revoked", { expires_at: "2099-08-01T00:00:00.000Z", status: "revoked" }],
    ["expired", { expires_at: "2020-08-01T00:00:00.000Z", status: "active" }],
  ] as const)("returns %s for a closed token", async (expected, tokenState) => {
    serviceMocks.client = createMockShareClient({
      attempt: null,
      report: null,
      share: createShare(tokenState),
    });

    await expect(readPublicShareToken("public-token")).resolves.toEqual({
      status: expected,
    });
  });

  it("returns not_found when the linked result was deleted", async () => {
    serviceMocks.client = createMockShareClient({
      attempt: null,
      report: null,
      share: createShare(),
    });

    await expect(readPublicShareToken("public-token")).resolves.toEqual({
      status: "not_found",
    });
  });

  it("denies a signed-in viewer when either account blocked the other", async () => {
    browserAuthMocks.userId = "viewer-user";
    serviceMocks.client = createMockShareClient({
      attempt: null,
      block: { id: "block-id" },
      identity: { account_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      report: null,
      share: createShare(),
    });

    await expect(readPublicShareToken("public-token")).resolves.toEqual({
      status: "blocked",
    });
  });

  it("fails closed when a signed-in viewer's block relation cannot be read", async () => {
    browserAuthMocks.userId = "viewer-user";
    serviceMocks.client = createMockShareClient({
      attempt: null,
      blockError: { message: "block relation unavailable" },
      identity: { account_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
      report: null,
      share: createShare(),
    });

    await expect(readPublicShareToken("public-token")).resolves.toEqual({
      status: "closed",
    });
  });
});

function createMockShareClient({
  attempt,
  block = null,
  blockError = null,
  identity = null,
  report,
  share,
}: {
  attempt: unknown;
  block?: unknown;
  blockError?: unknown;
  identity?: unknown;
  report: unknown;
  share: unknown;
}) {
  return {
    schema(schemaName: string) {
      return {
        from(tableName: string) {
          const key = `${schemaName}.${tableName}`;
          const response =
            key === "sharing.share_link"
              ? { data: share, error: null }
              : key === "report.result_report"
                ? { data: report, error: null }
                : key === "assessment.assessment_attempt"
                  ? { data: attempt, error: null }
                  : key === "identity.auth_identity"
                    ? { data: identity, error: null }
                    : key === "feed.profile_block"
                      ? { data: block, error: blockError }
                      : {
                          data: null,
                          error: { message: `Unexpected table ${key}` },
                        };
          const builder = {
            eq: () => builder,
            is: () => builder,
            limit: () => builder,
            maybeSingle: async () => response,
            order: () => builder,
            select: () => builder,
          };

          return builder;
        },
      };
    },
  };
}

function createShare(
  override: Partial<{ expires_at: string; status: string }> = {},
) {
  return {
    account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    expires_at: "2099-08-01T00:00:00.000Z",
    result_report_id: "22222222-2222-4222-8222-222222222222",
    status: "active",
    ...override,
  };
}
