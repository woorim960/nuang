import { describe, expect, it } from "vitest";
import { legacyCoreContainmentPolicy } from "./legacy-core-containment-policy";
import {
  readCoreResultPublicationDecision,
  readPublicSnapshotPublicationDecision,
} from "./server-core-result-publication-policy";

describe("core result publication policy", () => {
  it.each(["validated", "active"] as const)(
    "rejects catalog-%s releases when the exact public allowlist is empty",
    async (status) => {
      const client = createPolicyClient({
        codeStatus: status,
        itemStatus: status,
      });

      await expect(
        readCoreResultPublicationDecision({
          client: client as never,
          ownerAccountId: "account-1",
          resultReportId: "report-1",
        }),
      ).resolves.toEqual({
        eligible: false,
        reason: legacyCoreContainmentPolicy.publicDenyReason,
      });
      expect(client.catalogReads).toBe(0);
      expect(client.mutations).toBe(0);
    },
  );

  it.each([
    {
      codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
      measurementReleaseId: "ITEM-1",
      scoringReleaseId: "SCORING-1",
    },
    {
      codeSchemeVersion: "CODE-1",
      measurementReleaseId: "NUANG-CORE-QUICK-CANDIDATE-1.0",
      scoringReleaseId: "SCORING-1",
    },
    {
      codeSchemeVersion: "CODE-1",
      measurementReleaseId: "NUANG-CORE-CANDIDATE-BANK-M03-150",
      scoringReleaseId: "SCORING-1",
    },
    {
      codeSchemeVersion: "CODE-1",
      measurementReleaseId: "ITEM-1",
      scoringReleaseId: "NUANG-CORE-FULL-CANDIDATE-SCORING-1.0",
    },
  ])(
    "explicitly contains a legacy release trace before catalog publication lookup",
    async ({ codeSchemeVersion, measurementReleaseId, scoringReleaseId }) => {
      const client = createPolicyClient({
        codeStatus: "active",
        itemStatus: "active",
        report: {
          account_id: "account-1",
          code_scheme_version: codeSchemeVersion,
          id: "report-1",
          measurement_release_id: measurementReleaseId,
          report_kind: "full",
          scoring_release_id: scoringReleaseId,
        },
      });

      await expect(
        readCoreResultPublicationDecision({
          client: client as never,
          resultReportId: "report-1",
        }),
      ).resolves.toEqual({
        eligible: false,
        reason: legacyCoreContainmentPolicy.publicDenyReason,
      });
      expect(client.catalogReads).toBe(0);
      expect(client.mutations).toBe(0);
    },
  );

  it.each(["candidate", "beta", "retired"])(
    "does not consult a %s catalog release without an exact allowlist trace",
    async (status) => {
      const client = createPolicyClient({
        codeStatus: "candidate",
        itemStatus: status,
      });

      await expect(
        readCoreResultPublicationDecision({
          client: client as never,
          resultReportId: "report-1",
        }),
      ).resolves.toEqual({
        eligible: false,
        reason: legacyCoreContainmentPolicy.publicDenyReason,
      });
      expect(client.catalogReads).toBe(0);
      expect(client.mutations).toBe(0);
    },
  );

  it("fails closed when the private result lookup or release trace is missing", async () => {
    const missing = createPolicyClient({ report: null });
    const lookupFailure = createPolicyClient({
      reportError: { message: "down" },
    });
    const missingTrace = createPolicyClient({
      report: {
        account_id: "account-1",
        code_scheme_version: "CODE-1",
        id: "report-1",
        measurement_release_id: "ITEM-1",
        report_kind: "full",
      },
    });

    await expect(
      readCoreResultPublicationDecision({
        client: missing as never,
        resultReportId: "missing",
      }),
    ).resolves.toMatchObject({ eligible: false, reason: "result_not_found" });
    await expect(
      readCoreResultPublicationDecision({
        client: lookupFailure as never,
        resultReportId: "report-1",
      }),
    ).resolves.toMatchObject({
      eligible: false,
      reason: "policy_lookup_failed",
    });
    await expect(
      readCoreResultPublicationDecision({
        client: missingTrace as never,
        resultReportId: "report-1",
      }),
    ).resolves.toMatchObject({
      eligible: false,
      reason: "release_trace_missing",
    });
  });

  it("contains an existing public snapshot through the same empty allowlist", async () => {
    const client = createPolicyClient({
      codeStatus: "active",
      itemStatus: "active",
    });

    await expect(
      readPublicSnapshotPublicationDecision({
        client: client as never,
        publicSnapshotId: "snapshot-1",
      }),
    ).resolves.toEqual({
      eligible: false,
      reason: legacyCoreContainmentPolicy.publicDenyReason,
    });
  });
});

function createPolicyClient({
  codeStatus = "candidate",
  itemError = null,
  itemStatus = "candidate",
  report = {
    account_id: "account-1",
    code_scheme_version: "CODE-1",
    id: "report-1",
    measurement_release_id: "ITEM-1",
    report_kind: "full",
    scoring_release_id: "SCORING-1",
  },
  reportError = null,
}: {
  codeStatus?: string;
  itemError?: unknown;
  itemStatus?: string;
  report?: unknown;
  reportError?: unknown;
} = {}) {
  const client = {
    catalogReads: 0,
    mutations: 0,
    schema(schemaName: string) {
      return {
        from(tableName: string) {
          const key = `${schemaName}.${tableName}`;
          if (
            key === "assessment.item_bank_release" ||
            key === "scoring.code_scheme_release"
          ) {
            client.catalogReads += 1;
          }
          const response =
            key === "report.result_report"
              ? { data: report, error: reportError }
              : key === "assessment.item_bank_release"
                ? {
                    data: {
                      code_scheme_version: "CODE-1",
                      item_bank_release_id: "ITEM-1",
                      status: itemStatus,
                    },
                    error: itemError,
                  }
                : key === "scoring.code_scheme_release"
                  ? {
                      data: {
                        code_scheme_version: "CODE-1",
                        status: codeStatus,
                      },
                      error: null,
                    }
                  : key === "profile.profile_public_snapshot"
                    ? {
                        data: {
                          account_id: "account-1",
                          result_report_id: "report-1",
                          status: "active",
                        },
                        error: null,
                      }
                    : { data: null, error: { message: `Unexpected ${key}` } };
          const builder = {
            eq: () => builder,
            is: () => builder,
            maybeSingle: async () => response,
            select: () => builder,
          };
          return builder;
        },
      };
    },
  };
  return client;
}
