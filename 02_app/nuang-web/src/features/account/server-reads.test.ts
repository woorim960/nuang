import type { SupabaseClient, User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  readAccountResults,
  readResultAccountStatus,
} from "@/features/account/server-reads";

describe("result account status server read", () => {
  it("restores the owned result and active share-link summary", async () => {
    const client = createClient({
      "assessment.assessment_attempt": {
        data: {
          claimed_at: "2026-07-09T00:00:00.000Z",
          id: "11111111-1111-4111-8111-111111111111",
        },
        error: null,
      },
      "identity.auth_identity": {
        data: { account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        error: null,
      },
      "report.result_report": {
        data: {
          id: "22222222-2222-4222-8222-222222222222",
          profile_code: "TVOAE",
          profile_name: "불꽃의 온기 탐험가",
        },
        error: null,
      },
      "sharing.share_link": {
        data: [
          {
            expires_at: "2026-08-08T00:00:00.000Z",
            id: "33333333-3333-4333-8333-333333333333",
          },
          {
            expires_at: "2026-08-01T00:00:00.000Z",
            id: "44444444-4444-4444-8444-444444444444",
          },
        ],
        error: null,
      },
    });

    const result = await readResultAccountStatus({
      client,
      localResultId: "local_test_123",
      user: { id: "user-1" } as User,
    });

    expect(result).toEqual({
      data: {
        activeShareLinkCount: 2,
        activeShareLinks: [
          {
            expiresAt: "2026-08-08T00:00:00.000Z",
            id: "33333333-3333-4333-8333-333333333333",
          },
          {
            expiresAt: "2026-08-01T00:00:00.000Z",
            id: "44444444-4444-4444-8444-444444444444",
          },
        ],
        assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
        claimedAt: "2026-07-09T00:00:00.000Z",
        latestShareExpiresAt: "2026-08-08T00:00:00.000Z",
        profileCode: "TVOAE",
        profileName: "불꽃의 온기 탐험가",
        resultReportId: "22222222-2222-4222-8222-222222222222",
      },
      ok: true,
    });
  });

  it("returns a local-only state when the user has no NUANG account", async () => {
    const client = createClient({
      "identity.auth_identity": {
        data: null,
        error: null,
      },
    });

    const result = await readResultAccountStatus({
      client,
      localResultId: "local_test_123",
      user: { id: "user-1" } as User,
    });

    expect(result).toEqual({ data: null, ok: true });
  });

  it("projects account reports with their local result identifiers", async () => {
    const client = createClient({
      "assessment.assessment_attempt": {
        data: [
          {
            claimed_at: "2026-07-09T00:00:00.000Z",
            completed_at: "2026-07-08T00:00:00.000Z",
            id: "11111111-1111-4111-8111-111111111111",
            local_result_id: "local_test_123",
          },
        ],
        error: null,
      },
      "identity.auth_identity": {
        data: { account_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
        error: null,
      },
      "report.result_report": {
        data: [
          {
            attempt_id: "11111111-1111-4111-8111-111111111111",
            created_at: "2026-07-09T00:00:00.000Z",
            id: "22222222-2222-4222-8222-222222222222",
            profile_code: "TVOAE",
            profile_name: "불꽃의 온기 탐험가",
            report_kind: "full",
            summary: {
              completedAt: "2026-07-08T00:00:00.000Z",
              domains: [],
              facets: [
                {
                  facetId: "SE_SOC",
                  label: "외향 리듬",
                  score: 72,
                  status: "valid",
                },
              ],
              resultLabel: "현재 대표 성향",
            },
          },
        ],
        error: null,
      },
    });

    const result = await readAccountResults({
      client,
      user: { id: "user-1" } as User,
    });

    expect(result).toEqual({
      data: [
        {
          assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
          completedAt: "2026-07-08T00:00:00.000Z",
          createdAt: "2026-07-09T00:00:00.000Z",
          domains: [],
          facets: [
            {
              facetId: "SE_SOC",
              label: "외향 리듬",
              score: 72,
              status: "valid",
            },
          ],
          kind: "full",
          localResultId: "local_test_123",
          profileCode: "TVOAE",
          profileName: "불꽃의 온기 탐험가",
          resultLabel: "현재 대표 성향",
          resultReportId: "22222222-2222-4222-8222-222222222222",
        },
      ],
      ok: true,
    });
  });
});

type QueryResponse = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

function createClient(responses: Record<string, QueryResponse>) {
  let schemaName = "";

  return {
    schema(nextSchema: string) {
      schemaName = nextSchema;

      return {
        from(tableName: string) {
          const key = `${schemaName}.${tableName}`;
          const response = responses[key] ?? {
            data: null,
            error: { message: `Missing mock response for ${key}` },
          };
          const builder = {
            eq: () => builder,
            gt: () => builder,
            in: () => builder,
            is: () => builder,
            limit: () => builder,
            maybeSingle: async () => response,
            order: () =>
              key === "sharing.share_link" ? Promise.resolve(response) : builder,
            select: () => builder,
            then: (
              resolve: (value: QueryResponse) => unknown,
              reject: (reason: unknown) => unknown,
            ) => Promise.resolve(response).then(resolve, reject),
          };

          return builder;
        },
      };
    },
  } as unknown as SupabaseClient;
}
