import { createHmac } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPublicShareToken } from "@/features/share/public-share-server";
import {
  buildCoreReportShareContent,
  type ReportShareContent,
} from "@/features/share/report-share-contract";

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
    vi.stubEnv("SHARE_TOKEN_PEPPER", "public-share-guest-test-pepper");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("closes an already-issued g1 core token instead of rendering it", async () => {
    const issuedAt = new Date();
    const coreContent = buildCoreReportShareContent({
      code: "ENAKQ",
      highlights: ["혼자 정리한 뒤 대화를 시작해요"],
      profileName: "차분한 탐색가",
      resultLabel: "나의 뉴앙 코드 결과",
      summary: "생각을 충분히 정리한 뒤 움직이는 편이에요.",
    });
    const token = createPreviouslyIssuedGuestToken(coreContent, issuedAt);

    await expect(readPublicShareToken(token)).resolves.toEqual({
      status: "closed",
    });
  });

  it("hides a catalog-active account core token while the exact allowlist is empty", async () => {
    serviceMocks.client = createMockShareClient({
      attempt: { completed_at: "2026-07-04T00:00:00.000Z" },
      report: {
        attempt_id: "11111111-1111-4111-8111-111111111111",
        created_at: "2026-07-04T00:00:00.000Z",
        id: "22222222-2222-4222-8222-222222222222",
        profile_code: "ENAKQ",
        profile_name: "예전 저장 이름",
        report_kind: "full",
        measurement_release_id: "ITEM-1",
        code_scheme_version: "CODE-1",
      },
      share: {
        account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        expires_at: "2099-08-01T00:00:00.000Z",
        result_report_id: "22222222-2222-4222-8222-222222222222",
        status: "active",
      },
    });

    await expect(readPublicShareToken("public-token")).resolves.toEqual({
      status: "not_found",
    });
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

  it("hides an existing share token when its result release is still candidate", async () => {
    serviceMocks.client = createMockShareClient({
      attempt: null,
      itemStatus: "candidate",
      report: {
        account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        code_scheme_version: "CODE-1",
        id: "22222222-2222-4222-8222-222222222222",
        measurement_release_id: "ITEM-1",
        report_kind: "full",
      },
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
  itemStatus = "active",
  codeStatus = "active",
  report,
  share,
}: {
  attempt: unknown;
  block?: unknown;
  blockError?: unknown;
  identity?: unknown;
  itemStatus?: string;
  codeStatus?: string;
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
                : key === "assessment.item_bank_release"
                  ? {
                      data: {
                        code_scheme_version: "CODE-1",
                        item_bank_release_id: "ITEM-1",
                        status: itemStatus,
                      },
                      error: null,
                    }
                  : key === "scoring.code_scheme_release"
                    ? {
                        data: {
                          code_scheme_version: "CODE-1",
                          status: codeStatus,
                        },
                        error: null,
                      }
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

function createPreviouslyIssuedGuestToken(
  content: ReportShareContent,
  issuedAt: Date,
) {
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1_000);
  const payload = deflateRawSync(
    Buffer.from(
      JSON.stringify({
        content,
        expiresAt: issuedAtSeconds + 180 * 24 * 60 * 60,
        issuedAt: issuedAtSeconds,
        version: 1,
      }),
      "utf8",
    ),
  ).toString("base64url");
  const signature = createHmac("sha256", "public-share-guest-test-pepper")
    .update(`nuang:guest-report-share:v1:${payload}`)
    .digest("base64url");
  return `g1.${payload}.${signature}`;
}
