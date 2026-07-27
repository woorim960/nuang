import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const manifest = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_FINAL_AXIS_DECISIONS_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map final axis decisions v2", () => {
  it("resolves all 288 slots exactly once without structural issues", () => {
    expect(manifest.slots).toHaveLength(288);
    expect(
      new Set(manifest.slots.map((slot: { claimKey: string }) => slot.claimKey))
        .size,
    ).toBe(288);
    expect(manifest.summary.resolvedSlots).toBe(288);
    expect(manifest.structuralIssues).toEqual([]);
  });

  it("never exceeds the source-variant identifiability ceiling", () => {
    for (const slot of manifest.slots) {
      expect(slot.finalSemanticAxes.length).toBeLessThanOrEqual(
        slot.identifiableAxisCeiling,
      );
      expect(slot.expectedCanonicalVariantCount).toBe(
        Math.max(1, 2 ** slot.finalSemanticAxes.length),
      );
    }
  });

  it("keeps private process channels self-only", () => {
    for (const slot of manifest.slots) {
      if (
        slot.claimKind === "first_thought" ||
        slot.claimKind === "actual_response"
      ) {
        expect(slot.privacyScope).toBe("self_only");
      }
    }
  });

  it("approves research drafting but no customer-facing claim", () => {
    expect(manifest.status).toBe(
      "APPROVED_FOR_RESEARCH_ONLY_CANONICAL_DRAFTING_EXPERT_VALIDATION_PENDING",
    );
    expect(manifest.publicationState).toBe("research_only");
    expect(manifest.summary.customerApprovedSlots).toBe(0);
  });
});
