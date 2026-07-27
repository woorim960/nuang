import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type ReviewAssignment = {
  semanticAxes: string[];
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
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_AXIS_SEMANTIC_REVIEW_A_V2.json",
    ),
    "utf8",
  ),
);
const assignments = review.assignments as Record<string, ReviewAssignment>;
const validAxes = new Set(["SE", "OE", "RO", "SM", "ER"]);

describe("trait-map semantic review A v2", () => {
  it("covers exactly the 103 previously unresolved slots once", () => {
    const unresolvedKeys = candidates.slots
      .filter(
        (slot: {
          currentControlledAxes: string[];
          candidateSemanticAxes: string[];
        }) =>
          slot.currentControlledAxes.length === 0 &&
          slot.candidateSemanticAxes.length === 0,
      )
      .map((slot: { claimKey: string }) => slot.claimKey)
      .sort();
    const reviewedKeys = Object.keys(assignments).sort();

    expect(unresolvedKeys).toHaveLength(103);
    expect(reviewedKeys).toHaveLength(103);
    expect(reviewedKeys).toEqual(unresolvedKeys);
  });

  it("uses only the five current axes and respects source identifiability", () => {
    for (const assignment of Object.values(assignments)) {
      expect(new Set(assignment.semanticAxes).size).toBe(
        assignment.semanticAxes.length,
      );
      expect(assignment.semanticAxes.length).toBeLessThanOrEqual(1);
      expect(
        assignment.semanticAxes.every((axisRef) => validAxes.has(axisRef)),
      ).toBe(true);
    }
  });

  it("keeps wording-only differences axis-free", () => {
    for (const assignment of Object.values(assignments)) {
      if (assignment.rationale === "WORDING_ONLY_MERGE") {
        expect(assignment.semanticAxes).toHaveLength(0);
      } else {
        expect(assignment.semanticAxes.length).toBeGreaterThan(0);
      }
    }
  });

  it("links every decision to an explicit rationale and stays research-only", () => {
    expect(review.publicationState).toBe("research_only");
    expect(review.status).toBe("PROVISIONAL_INTERNAL_SEMANTIC_REVIEW_COMPLETE");
    for (const assignment of Object.values(assignments)) {
      expect(review.rationaleCatalog[assignment.rationale]).toBeTruthy();
    }
  });
});
