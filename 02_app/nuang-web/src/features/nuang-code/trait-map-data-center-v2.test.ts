import { describe, expect, it } from "vitest";
import {
  getCandidateProfileInventoryV2,
  getOneLetterNeighborCodes,
  traitMapClaimV2Schema,
  traitMapDataCenterManifestV2Schema,
  traitMapDataCenterV2Scaffold,
  traitMapProfilePackageV2Schema,
  traitMapScenarioCatalogV2,
  traitMapScenarioSchema,
  traitMapV2ChapterIds,
  traitMapV2RelationshipContexts,
} from "@/features/nuang-code/trait-map-data-center-v2";

const passedClaimReviews = {
  personality_psychology: "passed",
  psychometrics: "passed",
  relationship_psychology: "passed",
  clinical_safety: "passed",
  plain_korean: "passed",
  product: "passed",
  design: "passed",
} as const;

const passedPackageReviews = {
  contradictionAudit: "passed",
  deduplication: "passed",
  evidenceAudit: "passed",
  measurement: "passed",
  plainLanguage: "passed",
  productSafety: "passed",
  psychology: "passed",
  scenarioCoverage: "passed",
} as const;

describe("trait map data center v2", () => {
  it("locks 72 canonical 5W1H scenarios across the six core contexts", () => {
    expect(traitMapScenarioCatalogV2).toHaveLength(72);
    expect(
      new Set(traitMapScenarioCatalogV2.map((item) => item.scenarioId)).size,
    ).toBe(72);

    for (const scenario of traitMapScenarioCatalogV2) {
      expect(() => traitMapScenarioSchema.parse(scenario)).not.toThrow();
    }

    for (const relationshipContext of traitMapV2RelationshipContexts) {
      expect(
        traitMapScenarioCatalogV2.filter(
          (item) => item.relationshipContext === relationshipContext,
        ),
      ).toHaveLength(12);
    }
  });

  it("locks all 32 profiles and five one-letter neighbors per profile", () => {
    const profiles = getCandidateProfileInventoryV2();

    expect(profiles).toHaveLength(32);
    expect(profiles.find((item) => item.code === "ENAKQ")).toMatchObject({
      profileName: "관계를 여는 선도자",
      neighborCodes: ["INAKQ", "ERAKQ", "ENGKQ", "ENAMQ", "ENAKC"],
    });

    for (const profile of profiles) {
      expect(profile.neighborCodes).toHaveLength(5);
      expect(new Set(profile.neighborCodes).size).toBe(5);
      for (const neighbor of profile.neighborCodes) {
        const distance = profile.code
          .split("")
          .filter((symbol, index) => symbol !== neighbor[index]).length;
        expect(distance).toBe(1);
      }
    }
  });

  it("validates the foundation scaffold", () => {
    expect(() =>
      traitMapDataCenterManifestV2Schema.parse(traitMapDataCenterV2Scaffold),
    ).not.toThrow();
  });

  it("blocks a high-risk customer claim without two independent sources", () => {
    const result = traitMapClaimV2Schema.safeParse({
      claimId: "ENAKQ.partner.relationship-outcome",
      entity: { kind: "profile", ref: "ENAKQ" },
      scope: "scenario",
      claimKind: "communication",
      assertion: "연인 관계에서 대화를 먼저 여는 경향을 설명한다.",
      contexts: ["partner"],
      scenarioRefs: ["SCN-PARTNER-6"],
      requiredSignals: [
        "representative_code",
        "scenario_context",
        "relationship_context",
      ],
      evidenceFindingRefs: ["FND-RELATIONSHIP-01"],
      independentSourceRefs: ["SRC-RELATIONSHIP-01"],
      evidenceStatus: "supported",
      evidenceGrade: "B",
      privacyScope: "comparison_safe",
      riskDomains: ["relationship_outcome"],
      publicationState: "approved",
      customerCopy: {
        short: "대화를 먼저 여는 편이에요.",
        standard: "갈등이 생기면 대화를 먼저 열어 풀어가려는 편이에요.",
        long: "갈등이 생겼을 때 대화를 먼저 열어 상황을 풀어가려는 경향을 보여요.",
      },
      reviews: passedClaimReviews,
    });

    expect(result.success).toBe(false);
  });

  it("blocks relationship claims without relationship context signals", () => {
    const result = traitMapClaimV2Schema.safeParse({
      claimId: "ENAKQ.friend.support",
      entity: { kind: "profile", ref: "ENAKQ" },
      scope: "scenario",
      claimKind: "actual_response",
      assertion: "친구가 힘들다고 말할 때 나타나는 반응을 설명한다.",
      contexts: ["friend"],
      scenarioRefs: ["SCN-FRIEND-7"],
      requiredSignals: ["scenario_context", "private_process_signals"],
      evidenceFindingRefs: [],
      independentSourceRefs: [],
      evidenceStatus: "nuang_validation_required",
      evidenceGrade: "D",
      privacyScope: "self_only",
      riskDomains: ["none"],
      publicationState: "research_only",
      reviews: {
        ...passedClaimReviews,
        psychometrics: "in_review",
      },
    });

    expect(result.success).toBe(false);
  });

  it("enforces the full release gate for completed profile packages", () => {
    const chapters = traitMapV2ChapterIds.map((chapterId, index) => ({
      chapterId,
      title: chapterId,
      nonWhitespaceCharacters: index === 0 ? 5_000 : 3_000,
      sourceFiles: [`${chapterId}.md`],
      claimRefs: [`ENAKQ.chapter-${index + 1}`],
    }));
    const totalNonWhitespaceCharacters = chapters.reduce(
      (total, chapter) => total + chapter.nonWhitespaceCharacters,
      0,
    );

    const result = traitMapProfilePackageV2Schema.safeParse({
      packageId: "ENAKQ.map.v2",
      code: "ENAKQ",
      profileName: "관계를 여는 지휘자",
      releaseVersion: "2.0.0",
      status: "approved",
      chapters,
      totalNonWhitespaceCharacters,
      claimRefs: Array.from(
        { length: 100 },
        (_, index) => `ENAKQ.claim-${index + 1}`,
      ),
      evidenceSourceRefs: Array.from(
        { length: 30 },
        (_, index) => `SRC-ENAKQ-${index + 1}`,
      ),
      scenarioRefs: traitMapScenarioCatalogV2.map((item) => item.scenarioId),
      neighborContrastCodes: getOneLetterNeighborCodes("ENAKQ"),
      reviews: passedPackageReviews,
    });

    expect(result.success).toBe(true);
  });

  it("does not allow a short draft to be marked approved", () => {
    const result = traitMapProfilePackageV2Schema.safeParse({
      packageId: "ENAKQ.map.v2",
      code: "ENAKQ",
      profileName: "관계를 여는 지휘자",
      releaseVersion: "2.0.0",
      status: "approved",
      chapters: [
        {
          chapterId: "overview",
          title: "핵심 모습",
          nonWhitespaceCharacters: 100,
          sourceFiles: ["overview.md"],
          claimRefs: ["ENAKQ.general-overview"],
        },
      ],
      totalNonWhitespaceCharacters: 100,
      claimRefs: ["ENAKQ.general-overview"],
      evidenceSourceRefs: ["SRC-ENAKQ-1"],
      scenarioRefs: ["SCN-GENERAL-1"],
      neighborContrastCodes: [],
      reviews: passedPackageReviews,
    });

    expect(result.success).toBe(false);
  });
});
