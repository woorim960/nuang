import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type ReviewDecision = {
  proposedAdditionalAxes: string[];
  acceptedSuggestedAxes: string[];
  rejectedSuggestedAxes: string[];
  replacementAxes: string[];
  rationale: string;
};

const candidates = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_AXIS_CONTRIBUTION_CANDIDATES_V2.json",
    ),
    "utf8",
  ),
);
const review = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_AXIS_SEMANTIC_REVIEW_B_V2.json",
    ),
    "utf8",
  ),
);
const decisions = review.decisions as Record<string, ReviewDecision>;
const validAxes = new Set(["SE", "OE", "RO", "SM", "ER"]);

describe("trait-map semantic review B v2", () => {
  it("covers exactly all 63 slots with newly suggested axes", () => {
    const expectedKeys = candidates.slots
      .filter(
        (slot: {
          currentControlledAxes: string[];
          candidateSemanticAxes: { axisRef: string }[];
        }) =>
          slot.candidateSemanticAxes.some(
            (candidate) =>
              !slot.currentControlledAxes.includes(candidate.axisRef),
          ),
      )
      .map((slot: { claimKey: string }) => slot.claimKey)
      .sort();

    expect(expectedKeys).toHaveLength(63);
    expect(Object.keys(decisions).sort()).toEqual(expectedKeys);
  });

  it("records every proposed axis as accepted or rejected exactly once", () => {
    for (const slot of candidates.slots) {
      const decision = decisions[slot.claimKey];
      if (!decision) continue;
      const proposed = slot.candidateSemanticAxes
        .filter(
          (candidate: { axisRef: string }) =>
            !slot.currentControlledAxes.includes(candidate.axisRef),
        )
        .map((candidate: { axisRef: string }) => candidate.axisRef)
        .sort();
      const resolved = [
        ...decision.acceptedSuggestedAxes,
        ...decision.rejectedSuggestedAxes,
      ].sort();

      expect(decision.proposedAdditionalAxes.sort()).toEqual(proposed);
      expect(resolved).toEqual(proposed);
      expect(new Set(resolved).size).toBe(resolved.length);
    }
  });

  it("does not exceed the number of axes identifiable from source variants", () => {
    for (const slot of candidates.slots) {
      const decision = decisions[slot.claimKey];
      if (!decision) continue;
      const finalAxes = new Set([
        ...slot.currentControlledAxes,
        ...decision.acceptedSuggestedAxes,
        ...decision.replacementAxes,
      ]);
      const identifiableAxisCeiling = Math.log2(slot.anchorVariants.length);

      expect(finalAxes.size).toBeLessThanOrEqual(identifiableAxisCeiling);
    }
  });

  it("uses only current axes, explicit rationales, and research-only state", () => {
    expect(review.publicationState).toBe("research_only");
    for (const decision of Object.values(decisions)) {
      expect(
        [
          ...decision.proposedAdditionalAxes,
          ...decision.acceptedSuggestedAxes,
          ...decision.rejectedSuggestedAxes,
          ...decision.replacementAxes,
        ].every((axisRef) => validAxes.has(axisRef)),
      ).toBe(true);
      expect(review.rationaleCatalog[decision.rationale]).toBeTruthy();
    }
  });
});
