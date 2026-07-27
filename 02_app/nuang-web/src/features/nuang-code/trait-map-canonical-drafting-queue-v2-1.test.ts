import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const queue = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_V2_1.json",
    ),
    "utf8",
  ),
);
const audit = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_RECOMPOSITION_DRY_RUN_AUDIT_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical drafting queue v2.1", () => {
  it("builds the 705-variant queue across all 288 claim slots", () => {
    expect(queue.sourceDecisionManifestId).toBe(
      "TRAIT-MAP-FINAL-AXIS-DECISIONS.0.2",
    );
    expect(queue.summary.claimSlots).toBe(288);
    expect(queue.summary.canonicalVariantCount).toBe(705);
    expect(queue.summary.missingSourceCandidateGroups).toBe(0);
  });

  it("reduces only the two amended CAB-01 claims to four variants", () => {
    const ordinaryChoice = queue.slots.find(
      (slot: { claimKey: string }) =>
        slot.claimKey ===
        ".scenario.general.ordinary_choice.attention",
    );
    const newEncounter = queue.slots.find(
      (slot: { claimKey: string }) =>
        slot.claimKey ===
        ".scenario.general.new_encounter.response",
    );
    expect(ordinaryChoice.semanticAxes).toEqual(["OE", "SM"]);
    expect(ordinaryChoice.canonicalCandidates).toHaveLength(4);
    expect(newEncounter.semanticAxes).toEqual(["SE", "OE"]);
    expect(newEncounter.canonicalCandidates).toHaveLength(4);
  });

  it("preserves all 9,216 profile refs and all 80 neighbor audits", () => {
    expect(audit.summary.profiles).toBe(32);
    expect(audit.summary.claimsPerProfile).toBe(288);
    expect(audit.summary.profileClaimReferences).toBe(32 * 288);
    expect(audit.summary.pathIndependentReferences).toBe(true);
    expect(audit.summary.neighborEdges).toBe(80);
    expect(audit.summary.neighborEdgesPassingSelectedDraftCheck).toBe(80);
    expect(audit.summary.axisDifferentiationCollisions).toBe(0);
  });

  it("keeps every candidate research-only", () => {
    expect(queue.publicationState).toBe("research_only");
    expect(queue.summary.customerApprovedVariants).toBe(0);
    for (const slot of queue.slots) {
      for (const candidate of slot.canonicalCandidates) {
        expect(candidate.publicationState).toBe("research_only");
      }
    }
  });
});
