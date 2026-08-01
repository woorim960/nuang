import { describe, expect, it } from "vitest";
import {
  createAccountResultsPayload,
  deleteAccountResultRequestSchema,
  parseStoredAccountResultSummary,
} from "@/features/account/account-result-contract";
import { buildReportContentSnapshot } from "@/features/result/unified-core-report/report-content-snapshot";

describe("account result contract", () => {
  it("accepts the private account summary without direct responses", () => {
    const parsed = parseStoredAccountResultSummary({
      alternativeCodes: ["IRGKC"],
      completedAt: "2026-07-09T00:00:00.000Z",
      domains: [
        {
          domainId: "SE",
          isBoundary: true,
          label: "사람 사이 에너지",
          score: 72,
          status: "valid",
          symbol: "E",
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
      versionBundle: {
        assessmentReleaseId: "ASSESSMENT-1",
        codeSchemeVersion: "CODE-1",
        scoringModelVersion: "MODEL-1",
        scoringReleaseId: "SCORING-1",
      },
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.domains[0]).toMatchObject({
      isBoundary: true,
      status: "valid",
    });
    expect(parsed.data.facets[0]?.validResponses).toBe(4);
    expect(parsed.data.alternativeCodes).toEqual(["IRGKC"]);
    expect(parsed.data.resultEvidenceStatus).toBe("near_boundary");
    expect(parsed.data.versionBundle?.scoringModelVersion).toBe("MODEL-1");
  });

  it("does not invent fields that are missing from a legacy summary", () => {
    const parsed = parseStoredAccountResultSummary({
      completedAt: "2026-07-09T00:00:00.000Z",
      domains: [],
      facets: [],
      resultLabel: "현재 대표 성향",
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.alternativeCodes).toBeUndefined();
    expect(parsed.data.originResultId).toBeUndefined();
    expect(parsed.data.resultEvidenceStatus).toBeUndefined();
    expect(parsed.data.resultStatus).toBeUndefined();
    expect(parsed.data.versionBundle).toBeUndefined();
  });

  it("parses the v2 report content snapshot without losing string versions", () => {
    const reportContentSnapshot = buildReportContentSnapshot({
      code: "ENAKQ",
      kind: "full",
      measurementVersion: "core-result-copy.v0.1",
    });
    const parsed = parseStoredAccountResultSummary({
      domains: [],
      facets: [],
      reportContentSnapshot,
    });

    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.reportContentSnapshot?.schemaVersion).toBe(
      "nuang-core-result-content-snapshot.v2",
    );
    expect(
      parsed.data.reportContentSnapshot?.sections.every(
        (section) => section.contentVersion.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps account result responses free of raw assessment data", () => {
    const payload = createAccountResultsPayload(
      [
        {
          assessmentAttemptId: "11111111-1111-4111-8111-111111111111",
          completedAt: "2026-07-09T00:00:00.000Z",
          createdAt: "2026-07-09T00:00:00.000Z",
          domains: [],
          facets: [],
          kind: "full",
          localResultId: "local_test_123",
          profileCode: "TVOAE",
          profileName: "불꽃의 온기 탐험가",
          resultLabel: "현재 대표 성향",
          resultReportId: "22222222-2222-4222-8222-222222222222",
        },
      ],
      [
        {
          accessStatus: "active",
          comparisonReportId: "33333333-3333-4333-8333-333333333333",
          createdAt: "2026-07-09T00:00:00.000Z",
          headline: "뉴앙 코드 비교 리포트",
          targetCode: "SVODE",
          targetDisplayName: "상대",
          targetProfileName: "물결의 새길 개척가",
          viewerCode: "TVOAE",
          viewerProfileName: "불꽃의 온기 탐험가",
        },
      ],
    );
    const serialized = JSON.stringify(payload);

    expect(payload.comparisonReports).toHaveLength(1);
    expect(serialized).not.toContain("responses");
    expect(serialized).not.toContain("score_payload");
    expect(serialized).not.toContain("token");
    expect(serialized).not.toContain("email");
  });

  it("accepts either internal result identifier for one delete action", () => {
    expect(
      deleteAccountResultRequestSchema.safeParse({
        localResultId: "local_test_123",
      }).success,
    ).toBe(true);
    expect(
      deleteAccountResultRequestSchema.safeParse({
        resultReportId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(true);
    expect(deleteAccountResultRequestSchema.safeParse({}).success).toBe(false);
  });
});
