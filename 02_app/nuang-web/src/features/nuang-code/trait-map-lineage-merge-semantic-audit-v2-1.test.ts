import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const audit = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_LINEAGE_MERGE_SEMANTIC_AUDIT_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map lineage merge semantic audit v2.1", () => {
  it("classifies every v2.1 multi-lineage group", () => {
    expect(audit.sourceQueueId).toBe(
      "TRAIT-MAP-CANONICAL-DRAFTING-QUEUE.0.2",
    );
    expect(audit.summary.mergeGroups).toBe(691);
    expect(audit.groups).toHaveLength(691);
    expect(audit.summary.expertReviewRequired).toBe(691);
    expect(audit.summary.automaticallyCustomerApproved).toBe(0);
  });

  it("contains no removed RO or ER signature in the amended claims", () => {
    const ordinaryChoiceGroups = audit.groups.filter(
      (group: { claimKey: string }) =>
        group.claimKey ===
        ".scenario.general.ordinary_choice.attention",
    );
    const newEncounterGroups = audit.groups.filter(
      (group: { claimKey: string }) =>
        group.claimKey ===
        ".scenario.general.new_encounter.response",
    );
    expect(ordinaryChoiceGroups).toHaveLength(4);
    expect(newEncounterGroups).toHaveLength(4);
    expect(
      ordinaryChoiceGroups.every(
        (group: { axisSignature: string }) =>
          !group.axisSignature.includes("RO="),
      ),
    ).toBe(true);
    expect(
      newEncounterGroups.every(
        (group: { axisSignature: string }) =>
          !group.axisSignature.includes("ER="),
      ),
    ).toBe(true);
  });

  it("preserves source and evidence traceability for every merge", () => {
    for (const group of audit.groups) {
      expect(group.sourceCandidates.length).toBeGreaterThanOrEqual(2);
      for (const source of group.sourceCandidates) {
        expect(source.variantId).toBeTruthy();
        expect(source.assertion).toBeTruthy();
        expect(source.evidenceFindingRefs.length).toBeGreaterThan(0);
        expect(source.independentSourceRefs.length).toBeGreaterThan(0);
      }
      expect(group.publicationState).toBe("research_only");
    }
  });
});
