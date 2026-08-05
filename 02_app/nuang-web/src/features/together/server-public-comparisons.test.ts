import { describe, expect, it, vi } from "vitest";
import {
  createPublicComparisonForUser,
  readCommunityComparisonEnabled,
} from "@/features/together/server-public-comparisons";

const publicationMocks = vi.hoisted(() => ({
  readCoreResultPublicationDecision: vi.fn(),
  readPublicSnapshotPublicationDecision: vi.fn(),
}));

vi.mock("@/features/assessment/server-core-result-publication-policy", () => ({
  readCoreResultPublicationDecision:
    publicationMocks.readCoreResultPublicationDecision,
  readPublicSnapshotPublicationDecision:
    publicationMocks.readPublicSnapshotPublicationDecision,
}));

describe("public comparison release policy", () => {
  it("rejects comparison creation before any write when either core release is candidate", async () => {
    publicationMocks.readCoreResultPublicationDecision.mockResolvedValueOnce({
      eligible: true,
      resultReportId: "viewer-report",
    });
    publicationMocks.readPublicSnapshotPublicationDecision.mockResolvedValueOnce({
      eligible: false,
      reason: "release_not_publicable",
    });
    const rpc = vi.fn();
    const client = createComparisonClient(rpc);

    await expect(
      createPublicComparisonForUser({
        client: client as never,
        targetPublicSnapshotId: "target-snapshot",
        user: { id: "auth-user", user_metadata: {} } as never,
      }),
    ).resolves.toEqual({
      code: "measurement_release_not_publicable",
      ok: false,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("readCommunityComparisonEnabled", () => {
  it.each([
    [{ data: null, error: { message: "read failed" } }, false],
    [{ data: null, error: null }, false],
    [{ data: { comparison_enabled: false }, error: null }, false],
    [{ data: { comparison_enabled: true }, error: null }, true],
  ] as const)(
    "fails closed for comparison consent read %#",
    async (result, expected) => {
      const maybeSingle = vi.fn().mockResolvedValue(result);
      const chain = {
        eq: vi.fn(),
        is: vi.fn(),
        maybeSingle,
        select: vi.fn(),
      };
      chain.select.mockReturnValue(chain);
      chain.eq.mockReturnValue(chain);
      chain.is.mockReturnValue(chain);
      const client = {
        schema: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue(chain),
        }),
      };

      await expect(
        readCommunityComparisonEnabled({
          accountId: "target-account",
          client: client as never,
        }),
      ).resolves.toBe(expected);
    },
  );
});

function createComparisonClient(rpc: ReturnType<typeof vi.fn>) {
  return {
    schema(schemaName: string) {
      return {
        from(tableName: string) {
          const key = `${schemaName}.${tableName}`;
          const response =
            key === "identity.auth_identity"
              ? { data: { account_id: "viewer-account" }, error: null }
              : key === "report.result_report"
                ? {
                    data: {
                      account_id: "viewer-account",
                      created_at: "2026-08-05T00:00:00.000Z",
                      id: "viewer-report",
                      profile_code: "ENAKQ",
                      profile_name: "테스트 프로필",
                      report_kind: "full",
                      summary: { domains: [], facets: [] },
                    },
                    error: null,
                  }
                : key === "profile.profile_public_snapshot"
                  ? {
                      data: {
                        account_id: "target-account",
                        id: "target-snapshot",
                        result_report_id: "target-report",
                        snapshot_payload: {},
                        status: "active",
                        visibility_policy_version: "profile-visibility.v1",
                      },
                      error: null,
                    }
                  : { data: null, error: { message: `Unexpected ${key}` } };
          const chain = {
            eq: () => chain,
            is: () => chain,
            limit: () => chain,
            maybeSingle: async () => response,
            order: () => chain,
            select: () => chain,
          };
          return chain;
        },
        rpc,
      };
    },
  };
}
