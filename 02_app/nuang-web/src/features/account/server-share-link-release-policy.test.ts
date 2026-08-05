import type { User } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createShareLinkForResult } from "@/features/account/server-writes";

const publicationMocks = vi.hoisted(() => ({
  readCoreResultPublicationDecision: vi.fn(),
}));

vi.mock("@/features/assessment/server-core-result-publication-policy", () => ({
  readCoreResultPublicationDecision:
    publicationMocks.readCoreResultPublicationDecision,
}));

vi.mock("@/lib/supabase/env", () => ({
  getAppOrigin: () => "https://nuang.example",
}));

vi.mock("@/lib/supabase/service", () => ({
  getSupabaseServiceEnv: () => ({ shareTokenPepper: "test-pepper" }),
}));

const resultReportId = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const user = {
  app_metadata: { provider: "kakao" },
  id: "auth-user",
  identities: [
    {
      id: "provider-user",
      identity_id: "supabase-identity",
      provider: "kakao",
    },
  ],
  user_metadata: {},
} as unknown as User;

describe("core result share link release policy", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a candidate result before reading or inserting a share link", async () => {
    publicationMocks.readCoreResultPublicationDecision.mockResolvedValue({
      eligible: false,
      reason: "release_not_publicable",
    });
    const mock = createShareClient();

    await expect(
      createShareLinkForResult({
        client: mock.client as never,
        payload: {
          consentDraft: {
            analytics: false,
            is14OrOlder: true,
            marketing: false,
            privacy: true,
            terms: true,
          },
          resultReportId,
          ttlDays: 30,
          visibility: "summary",
        },
        user,
      }),
    ).resolves.toEqual({ code: "result_release_not_publicable", ok: false });
    expect(mock.tables).not.toContain("report.result_report");
    expect(mock.tables).not.toContain("sharing.share_link");
  });

  it("creates the share link after both releases are validated or active", async () => {
    publicationMocks.readCoreResultPublicationDecision.mockResolvedValue({
      eligible: true,
      resultReportId,
    });
    const mock = createShareClient();

    const result = await createShareLinkForResult({
      client: mock.client as never,
      payload: {
        consentDraft: {
          analytics: false,
          is14OrOlder: true,
          marketing: false,
          privacy: true,
          terms: true,
        },
        resultReportId,
        ttlDays: 30,
        visibility: "summary",
      },
      user,
    });

    expect(result.ok).toBe(true);
    expect(mock.tables).toContain("sharing.share_link");
  });
});

function createShareClient() {
  const tables: string[] = [];
  const client = {
    schema(schemaName: string) {
      return {
        from(tableName: string) {
          const key = `${schemaName}.${tableName}`;
          tables.push(key);
          const response =
            key === "report.result_report"
              ? { data: { id: resultReportId, share_summary: {} }, error: null }
              : key === "sharing.share_link"
                ? {
                    data: { id: "33333333-3333-4333-8333-333333333333" },
                    error: null,
                  }
                : { data: null, error: { message: `Unexpected ${key}` } };
          const builder = {
            eq: () => builder,
            insert: () => builder,
            is: () => builder,
            maybeSingle: async () => response,
            select: () => builder,
            single: async () => response,
          };
          return builder;
        },
        rpc: async (name: string) =>
          name === "resolve_account_for_auth_user"
            ? {
                data: [
                  {
                    account_id: accountId,
                    identities_synced: 0,
                    resolution: "existing",
                  },
                ],
                error: null,
              }
            : { data: null, error: { message: `Unexpected RPC ${name}` } },
      };
    },
  };
  return { client, tables };
}
