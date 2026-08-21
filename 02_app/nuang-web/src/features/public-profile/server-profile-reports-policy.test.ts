import { describe, expect, it } from "vitest";
import {
  getDefaultOriginalProfileReportVisibility,
  mapTopicRow,
  resolveOriginalProfileReportVisibility,
} from "@/features/public-profile/server-profile-reports";

describe("original profile report default visibility", () => {
  it("publishes every regular report summary when no explicit visibility row exists", () => {
    expect(getDefaultOriginalProfileReportVisibility("core", "full")).toBe(
      "profile_public",
    );
    expect(getDefaultOriginalProfileReportVisibility("core", "quick")).toBe(
      "profile_public",
    );
    expect(getDefaultOriginalProfileReportVisibility("topic")).toBe(
      "profile_public",
    );
    expect(getDefaultOriginalProfileReportVisibility("lab")).toBe(
      "profile_public",
    );
  });

  it("keeps explicit privacy and fails closed when visibility cannot be read", () => {
    expect(resolveOriginalProfileReportVisibility("private", "topic")).toBe(
      "private",
    );
    expect(resolveOriginalProfileReportVisibility("missing", "topic")).toBe(
      "profile_public",
    );
    expect(resolveOriginalProfileReportVisibility("unavailable", "topic")).toBe(
      "private",
    );
  });
});

describe("topic public projection containment", () => {
  it("preserves the topic result while redacting archived core-code context", () => {
    const result = mapTopicRow({
      completed_at: "2026-08-21T00:00:00.000Z",
      evidence_payload: {
        reportSnapshot: {
          averageScore: 70,
          confidenceCopy: "충분한 응답",
          confidenceLabel: "참고 가능",
          headline: "대화에서 천천히 마음을 여는 편이에요.",
          longReportSections: [],
          nuangCodeSection: {
            body: "legacy core context",
            claimIds: ["legacy-code"],
            title: "검사 당시 뉴앙 코드 ENAKQ",
          },
          signals: [],
        },
        scoresByTargetId: { "facet:SE-AI": 70 },
        traitImpactSnapshot: {
          after: { code: "ENAKQ" },
          before: { code: "INGMC" },
          state: "changed",
          version: "topic-trait-impact.v1",
        },
      },
      id: "topic-result-1",
      local_result_id: "topic_local_1",
      profile_code_at_completion: "ENAKQ",
      topic_slug: "conversation-temperature",
    });

    expect(result).not.toBeNull();
    expect(result?.reportSnapshot.headline).toContain("대화");
    expect(result?.reportSnapshot).not.toHaveProperty("nuangCodeSection");
    expect(result).not.toHaveProperty("nuangCodeContext");
    expect(result).not.toHaveProperty("traitImpactSnapshot");
  });
});
