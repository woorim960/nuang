import { describe, expect, it } from "vitest";
import {
  readCoreResultPublicationDecision,
  readPublicSnapshotPublicationDecision,
} from "./server-core-result-publication-policy";

describe("core result publication policy", () => {
  it.each(["validated", "active"] as const)(
    "allows a %s item and code release",
    async (status) => {
      const client = createPolicyClient({ codeStatus: status, itemStatus: status });

      await expect(
        readCoreResultPublicationDecision({
          client: client as never,
          ownerAccountId: "account-1",
          resultReportId: "report-1",
        }),
      ).resolves.toEqual({ eligible: true, resultReportId: "report-1" });
    },
  );

  it.each(["candidate", "beta", "retired"])(
    "rejects a %s release without mutating the private result",
    async (status) => {
      const client = createPolicyClient({ codeStatus: "candidate", itemStatus: status });

      await expect(
        readCoreResultPublicationDecision({
          client: client as never,
          resultReportId: "report-1",
        }),
      ).resolves.toEqual({
        eligible: false,
        reason: "release_not_publicable",
      });
      expect(client.mutations).toBe(0);
    },
  );

  it("fails closed when release traceability or lookup is missing", async () => {
    const missing = createPolicyClient({ report: null });
    const lookupFailure = createPolicyClient({ itemError: { message: "down" } });

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
  });

  it("resolves a public snapshot through the same result release policy", async () => {
    const client = createPolicyClient({ codeStatus: "active", itemStatus: "active" });

    await expect(
      readPublicSnapshotPublicationDecision({
        client: client as never,
        publicSnapshotId: "snapshot-1",
      }),
    ).resolves.toEqual({ eligible: true, resultReportId: "report-1" });
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
  },
}: {
  codeStatus?: string;
  itemError?: unknown;
  itemStatus?: string;
  report?: unknown;
} = {}) {
  const client = {
    mutations: 0,
    schema(schemaName: string) {
      return {
        from(tableName: string) {
          const key = `${schemaName}.${tableName}`;
          const response =
            key === "report.result_report"
              ? { data: report, error: null }
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
