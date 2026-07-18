import { describe, expect, it } from "vitest";
import {
  buildFreeTopicResultReport,
  buildFreeTopicEvidenceObservations,
  buildTargetKey,
  featuredFreeTopicAssessments,
  forbiddenFreeTopicKeywords,
  freeTopicAssessments,
  freeTopicSourceWeight,
  getFreeTopicAssessment,
} from "@/features/assessment/free-topic-assessments";
import {
  coreDomainDefinitions,
  coreFacetDefinitions,
} from "@/features/assessment/quick-core-seed";
import { dynamicTraitSourceWeights } from "@/lib/scoring/dynamic-trait-evidence";

describe("freeTopicAssessments", () => {
  it("keeps the approved v0.1 catalog compactly featureable", () => {
    expect(freeTopicAssessments).toHaveLength(19);
    expect(featuredFreeTopicAssessments).toHaveLength(3);
    expect(featuredFreeTopicAssessments.map((assessment) => assessment.slug)).toEqual([
      "conversation-temperature",
      "apology-style",
      "distance-rhythm",
    ]);
  });

  it("uses the free topic evidence weight and never opens comparison use by default", () => {
    expect(freeTopicSourceWeight).toBe(dynamicTraitSourceWeights.free_topic);

    freeTopicAssessments.forEach((assessment) => {
      expect(assessment.sourceWeight).toBe(0.35);
      expect(assessment.comparisonUse).toBe(false);
    });
  });

  it("maps every target to an approved core domain or facet", () => {
    const domainIds = new Set(
      coreDomainDefinitions.map((domain) => domain.domainId),
    );
    const facetIds = new Set(coreFacetDefinitions.map((facet) => facet.facetId));

    freeTopicAssessments.forEach((assessment) => {
      expect(assessment.mappings.length).toBeGreaterThan(0);
      expect(
        assessment.mappings.some((mapping) => mapping.role === "primary"),
      ).toBe(true);

      assessment.mappings.forEach((mapping) => {
        expect(mapping.constructDirectness).toBeGreaterThan(0);
        expect(mapping.constructDirectness).toBeLessThanOrEqual(1);
        expect(mapping.measurementAmount).toBeGreaterThan(0);
        expect(mapping.measurementAmount).toBeLessThanOrEqual(1);

        if (mapping.target.kind === "domain") {
          expect(domainIds.has(mapping.target.id)).toBe(true);
        } else {
          expect(facetIds.has(mapping.target.id)).toBe(true);
        }
      });
    });
  });

  it("keeps high-risk or clinical topics out of the free topic catalog", () => {
    const searchableText = freeTopicAssessments
      .flatMap((assessment) => [
        assessment.title,
        assessment.caption,
        assessment.categoryLabel,
      ])
      .join(" ");

    forbiddenFreeTopicKeywords.forEach((keyword) => {
      expect(searchableText).not.toContain(keyword);
    });
  });

  it("builds approved dynamic evidence for A-grade free topic results", () => {
    const assessment = getFreeTopicAssessment("conversation-temperature");
    expect(assessment).not.toBeNull();

    const observations = buildFreeTopicEvidenceObservations({
      assessment: assessment!,
      observedAt: "2026-07-10T00:00:00.000Z",
      scoresByTargetId: {
        "facet:RO-EC": 72,
        "facet:RO-RN": 64,
        "facet:SE-AI": 80,
      },
    });

    expect(observations).toHaveLength(3);
    expect(observations[0]).toMatchObject({
      approvalStatus: "approved",
      id: "conversation-temperature:facet:RO-EC",
      score: 72,
      sourceKind: "free_topic",
      target: { kind: "facet", id: "RO-EC" },
    });
  });

  it("builds user-facing report signals without exposing internal target codes", () => {
    const assessment = getFreeTopicAssessment("conversation-temperature");
    expect(assessment).not.toBeNull();

    const report = buildFreeTopicResultReport({
      assessment: assessment!,
      result: {
        observations: buildFreeTopicEvidenceObservations({
          assessment: assessment!,
          observedAt: "2026-07-10T00:00:00.000Z",
          scoresByTargetId: {
            "facet:RO-EC": 72,
            "facet:RO-RN": 50,
            "facet:SE-AI": 100,
          },
        }),
        scoresByTargetId: {
          "facet:RO-EC": 72,
          "facet:RO-RN": 50,
          "facet:SE-AI": 100,
        },
      },
    });
    const serialized = JSON.stringify(report);

    expect(report.signals.map((signal) => signal.label)).toEqual([
      "상대 마음 살피기",
      "기준과 선택 존중",
      "먼저 말 꺼내기",
    ]);
    expect(report.headline).toContain("상대 마음 살피기");
    expect(serialized).not.toContain("RO-EC");
    expect(serialized).not.toContain("RO-RN");
    expect(serialized).not.toContain("SE-AI");
    expect(serialized).not.toContain("facet:");
  });

  it("does not emit representative-code evidence for B-grade preference topics", () => {
    const assessment = getFreeTopicAssessment("cafe-seat-style");
    expect(assessment?.impactGrade).toBe("B");
    expect(assessment?.evidenceUse).toBe("interpretation_and_recommendation_only");

    const observations = buildFreeTopicEvidenceObservations({
      assessment: assessment!,
      observedAt: "2026-07-10T00:00:00.000Z",
      scoresByTargetId: Object.fromEntries(
        assessment!.mappings.map((mapping) => [buildTargetKey(mapping.target), 70]),
      ),
    });

    expect(observations).toEqual([]);
  });
});
