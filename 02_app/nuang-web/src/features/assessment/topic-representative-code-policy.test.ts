import { describe, expect, it } from "vitest";
import { topicAssessmentCatalog } from "@/features/assessment/assessment-catalog";
import {
  canTopicEvidenceUpdateRepresentativeCode,
  topicRepresentativeCodeEvidencePolicy,
} from "@/features/assessment/topic-representative-code-policy";

describe("topic representative-code evidence policy", () => {
  it("fails closed for every current public topic release", () => {
    const publicTopicSlugs = topicAssessmentCatalog
      .filter((assessment) => assessment.publicationStatus === "published")
      .map((assessment) => assessment.id.replace(/^topic:/, ""));

    expect(publicTopicSlugs.length).toBeGreaterThan(0);
    publicTopicSlugs.forEach((slug) => {
      expect(
        canTopicEvidenceUpdateRepresentativeCode({
          releaseKey: "current-runtime-release",
          slug,
        }),
      ).toBe(false);
    });
  });

  it("also fails closed for future slugs and missing release identity", () => {
    expect(topicRepresentativeCodeEvidencePolicy.defaultDecision).toBe(
      "exclude",
    );
    expect(topicRepresentativeCodeEvidencePolicy.approvedReleaseKeys).toEqual(
      [],
    );
    expect(
      canTopicEvidenceUpdateRepresentativeCode({
        releaseKey: "future-v1",
        slug: "future-topic",
      }),
    ).toBe(false);
    expect(
      canTopicEvidenceUpdateRepresentativeCode({ slug: "future-topic" }),
    ).toBe(false);
  });
});
