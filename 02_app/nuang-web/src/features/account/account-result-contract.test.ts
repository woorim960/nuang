import { describe, expect, it } from "vitest";
import {
  createAccountResultsPayload,
  deleteAccountResultRequestSchema,
  parseStoredAccountResultSummary,
} from "@/features/account/account-result-contract";

describe("account result contract", () => {
  it("accepts the private account summary without direct responses", () => {
    const parsed = parseStoredAccountResultSummary({
      completedAt: "2026-07-09T00:00:00.000Z",
      domains: [
        {
          domainId: "SE",
          label: "사람 사이 에너지",
          score: 72,
          symbol: "T",
        },
      ],
      facets: [
        {
          facetId: "SE_SOC",
          label: "외향 리듬",
          score: 72,
          status: "valid",
        },
      ],
      resultLabel: "현재 대표 성향",
    });

    expect(parsed.success).toBe(true);
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
