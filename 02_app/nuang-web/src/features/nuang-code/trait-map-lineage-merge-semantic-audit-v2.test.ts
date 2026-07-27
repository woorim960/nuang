import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const audit = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_LINEAGE_MERGE_SEMANTIC_AUDIT_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map lineage merge semantic audit v2", () => {
  it("classifies every one of the 695 two-lineage groups", () => {
    expect(audit.groups).toHaveLength(695);
    expect(audit.summary.mergeGroups).toBe(695);
    expect(audit.summary.sourceAssertionsCompared).toBe(1_390);
    expect(
      Object.values(audit.summary.classifications).reduce(
        (total: number, count) => total + Number(count),
        0,
      ),
    ).toBe(695);
    for (const group of audit.groups) {
      expect(group.sourceCandidates).toHaveLength(2);
      expect(group.classification).toBeTruthy();
      expect(["P0", "P1", "P2"]).toContain(group.priority);
    }
  });

  it("keeps both source assertions and their evidence lineage", () => {
    for (const group of audit.groups) {
      for (const source of group.sourceCandidates) {
        expect(source.variantId).toBeTruthy();
        expect(source.assertion).toBeTruthy();
        expect(source.matchingCodes.length).toBeGreaterThan(0);
        expect(source.evidenceFindingRefs).toBeInstanceOf(Array);
        expect(source.independentSourceRefs).toBeInstanceOf(Array);
      }
      expect(group.textSignals.leftOnlyTokens).toBeInstanceOf(Array);
      expect(group.textSignals.rightOnlyTokens).toBeInstanceOf(Array);
    }
  });

  it("does not mistake lexical similarity for customer approval", () => {
    expect(audit.summary.automaticallyCustomerApproved).toBe(0);
    expect(audit.summary.expertReviewRequired).toBe(695);
    expect(audit.publicationState).toBe("research_only");
    for (const group of audit.groups) {
      expect(group.reviewState).toBe("expert_semantic_review_required");
      expect(group.publicationState).toBe("research_only");
      expect(group.requiredReview.canonicalDraft).toBeNull();
    }
  });

  it("makes reused source sets explicit for directional review", () => {
    const reused = audit.groups.filter(
      (group: { siblingSignaturesUsingSameSourceSet: string[] }) =>
        group.siblingSignaturesUsingSameSourceSet.length > 0,
    );
    expect(reused).toHaveLength(audit.summary.reusedSourceSetGroups);
    expect(reused.length).toBeGreaterThan(0);
    for (const group of reused) {
      expect(group.classification).toBe("DIRECTIONAL_MEANING_REWRITE_REQUIRED");
    }
  });
});
