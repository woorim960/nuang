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
            scoring_version: "MODEL-1",
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
            code_scheme_version: "CODE-1",
            created_at: "2026-07-09T00:00:00.000Z",
            id: "22222222-2222-4222-8222-222222222222",
            measurement_release_id: "ASSESSMENT-1",
            profile_code: "TVOAE",
            profile_name: "불꽃의 온기 탐험가",
            report_kind: "full",
            scoring_release_id: "SCORING-1",
            summary: {
              alternativeCodes: ["SVOAE"],
              completedAt: "2026-07-08T00:00:00.000Z",
              domains: [
                {
                  domainId: "SE",
                  isBoundary: true,
                  label: "사람 사이 에너지",
                  score: 52,
                  status: "valid",
                  symbol: "T",
                },
              ],
              facets: [
                {
                  facetId: "SE_SOC",
                  label: "외향 리듬",
                  score: 72,
                  status: "valid",
                  validResponses: 4,
                },
              ],
              originResultId: "local_test_123",
              reportContentSnapshot: null,
              responseSnapshotHash: "fnv1a32x2:abcdef12",
              resultCopyVersion: "core-result-copy.v0.1",
              resultEvidenceStatus: "near_boundary",
              resultLabel: "현재 대표 성향",
              resultStatus: "ready",
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
          alternativeCodes: ["SVOAE"],
          assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
          completedAt: "2026-07-08T00:00:00.000Z",
          createdAt: "2026-07-09T00:00:00.000Z",
          domains: [
            {
              domainId: "SE",
              isBoundary: true,
              label: "사람 사이 에너지",
              score: 52,
              status: "valid",
              symbol: "T",
            },
          ],
          facets: [
            {
              facetId: "SE_SOC",
              label: "외향 리듬",
              score: 72,
              status: "valid",
              validResponses: 4,
            },
          ],
          kind: "full",
          localResultId: "local_test_123",
          originResultId: "local_test_123",
          profileCode: "TVOAE",
          profileName: "불꽃의 온기 탐험가",
          reportContentSnapshot: null,
          responseSnapshotHash: "fnv1a32x2:abcdef12",
          resultCopyVersion: "core-result-copy.v0.1",
          resultEvidenceStatus: "near_boundary",
          resultLabel: "현재 대표 성향",
          resultReportId: "22222222-2222-4222-8222-222222222222",
          resultStatus: "ready",
          versionBundle: {
            assessmentReleaseId: "ASSESSMENT-1",
            codeSchemeVersion: "CODE-1",
            scoringModelVersion: "MODEL-1",
            scoringReleaseId: "SCORING-1",
          },
        },
      ],
      ok: true,
    });
  });

  it("fails the collection instead of dropping a damaged completion row", async () => {
    const client = createClient({
      "assessment.assessment_attempt": {
        data: [
          {
            claimed_at: "2026-07-31T00:00:00.000Z",
            completed_at: "2026-07-31T00:00:00.000Z",
            id: "11111111-1111-4111-8111-111111111111",
            local_result_id: "local_damaged_latest",
            scoring_version: "MODEL-1",
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
            code_scheme_version: "CODE-1",
            created_at: "2026-07-31T00:00:00.000Z",
            id: "22222222-2222-4222-8222-222222222222",
            measurement_release_id: "ASSESSMENT-1",
            profile_code: "ENAKQ",
            profile_name: "관계를 여는 선도자",
            report_kind: "full",
            scoring_release_id: "SCORING-1",
            summary: { domains: "broken" },
          },
        ],
        error: null,
      },
    });

    await expect(
      readAccountResults({
        client,
        user: { id: "user-1" } as User,
      }),
    ).resolves.toEqual({ code: "account_results_read_failed", ok: false });
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
              key === "sharing.share_link"
                ? Promise.resolve(response)
                : builder,
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
