import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_AUTHORING_WORKFLOW_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical authoring workflow v2", () => {
  it("keeps all four channels and every signature of a scenario together", () => {
    expect(workflow.batches).toHaveLength(12);
    expect(workflow.summary.scenarios).toBe(72);
    expect(workflow.summary.claimSlots).toBe(288);
    expect(workflow.summary.canonicalVariants).toBe(713);

    const scenarioRefs = new Set<string>();
    for (const batch of workflow.batches) {
      expect(batch.scenarioCount).toBe(6);
      for (const scenario of batch.scenarios) {
        expect(scenario.claims).toHaveLength(4);
        expect(
          scenario.claims.map(
            (claim: { claimKind: string }) => claim.claimKind,
          ),
        ).toEqual([
          "attention",
          "first_thought",
          "actual_response",
          "communication",
        ]);
        expect(scenarioRefs.has(scenario.scenarioRef)).toBe(false);
        scenarioRefs.add(scenario.scenarioRef);
      }
    }
    expect(scenarioRefs.size).toBe(72);
  });

  it("requires all seven expert review decisions for every draft", () => {
    expect(workflow.reviewerRoles).toHaveLength(7);
    const requiredRoles = workflow.reviewerRoles.map(
      (reviewer: { role: string }) => reviewer.role,
    );
    for (const batch of workflow.batches) {
      for (const scenario of batch.scenarios) {
        for (const claim of scenario.claims) {
          for (const variant of claim.variants) {
            expect(Object.keys(variant.reviewDecisions)).toEqual(requiredRoles);
            expect(
              Object.values(variant.reviewDecisions).every(
                (decision: unknown) =>
                  (decision as { decision: string }).decision === "pending",
              ),
            ).toBe(true);
          }
        }
      }
    }
  });

  it("preserves sources while preventing unreviewed publication", () => {
    let variants = 0;
    for (const batch of workflow.batches) {
      for (const scenario of batch.scenarios) {
        for (const claim of scenario.claims) {
          for (const variant of claim.variants) {
            variants += 1;
            expect(variant.sourceAssertions.length).toBeGreaterThan(0);
            expect(variant.canonicalDraft).toBeNull();
            expect(variant.draftState).toBe("pending_semantic_decomposition");
            expect(variant.publicationState).toBe("research_only");
          }
        }
      }
    }
    expect(variants).toBe(713);
    expect(workflow.summary.customerApprovedDrafts).toBe(0);
  });

  it("accounts for all merge and single-lineage variants", () => {
    expect(workflow.summary.mergeVariants).toBe(695);
    expect(workflow.summary.singleLineageVariants).toBe(18);
    expect(
      workflow.summary.mergeVariants + workflow.summary.singleLineageVariants,
    ).toBe(workflow.summary.canonicalVariants);
  });
});
