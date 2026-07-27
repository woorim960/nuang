import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflow = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_AUTHORING_WORKFLOW_V2_1.json",
    ),
    "utf8",
  ),
) as {
  batches: Array<{
    batchId: string;
    canonicalVariantCount: number;
    claimSlotCount: number;
    scenarioCount: number;
    scenarios: Array<{
      claims: Array<{
        claimKey: string;
        variants: Array<{ canonicalVariantId: string }>;
      }>;
    }>;
  }>;
  completionGates: unknown[];
  publicationState: string;
  reviewerRoles: Array<{ role: string }>;
  sourceQueueId: string;
  summary: {
    batches: number;
    canonicalVariants: number;
    claimSlots: number;
    contexts: number;
    customerApprovedDrafts: number;
    pendingDrafts: number;
    scenarios: number;
  };
};

describe("trait-map canonical authoring workflow v2.1", () => {
  it("rebuilds all 12 batches around the 705-variant baseline", () => {
    expect(workflow.sourceQueueId).toBe(
      "TRAIT-MAP-CANONICAL-DRAFTING-QUEUE.0.2",
    );
    expect(workflow.summary.batches).toBe(12);
    expect(workflow.summary.contexts).toBe(6);
    expect(workflow.summary.scenarios).toBe(72);
    expect(workflow.summary.claimSlots).toBe(288);
    expect(workflow.summary.canonicalVariants).toBe(705);
    expect(workflow.summary.pendingDrafts).toBe(705);
    expect(workflow.summary.customerApprovedDrafts).toBe(0);
  });

  it("reduces CAB-01 to 93 variants without changing scenarios or slots", () => {
    const cab01 = workflow.batches.find(
      (batch) => batch.batchId === "CAB-01",
    );
    expect(cab01).toBeDefined();
    if (!cab01) return;
    expect(cab01.scenarioCount).toBe(6);
    expect(cab01.claimSlotCount).toBe(24);
    expect(cab01.canonicalVariantCount).toBe(93);
  });

  it("preserves seven independent reviewer roles and customer blocking", () => {
    expect(workflow.reviewerRoles).toHaveLength(7);
    expect(
      new Set(
        workflow.reviewerRoles.map((role) => role.role),
      ).size,
    ).toBe(7);
    expect(workflow.publicationState).toBe("research_only");
    expect(workflow.completionGates).toHaveLength(7);
  });

  it("contains every claim and canonical ID exactly once", () => {
    const claims = workflow.batches.flatMap((batch) =>
      batch.scenarios.flatMap((scenario) => scenario.claims),
    );
    const variants = claims.flatMap((claim) => claim.variants);
    expect(claims).toHaveLength(288);
    expect(variants).toHaveLength(705);
    expect(
      new Set(
        claims.map((claim) => claim.claimKey),
      ).size,
    ).toBe(288);
    expect(
      new Set(
        variants.map((variant) => variant.canonicalVariantId),
      ).size,
    ).toBe(705);
  });
});
