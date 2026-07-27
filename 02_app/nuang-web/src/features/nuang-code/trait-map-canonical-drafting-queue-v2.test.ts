import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const queue = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_V2.json",
    ),
    "utf8",
  ),
);
const audit = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_RECOMPOSITION_DRY_RUN_AUDIT_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical drafting queue v2", () => {
  it("creates exactly 713 canonical groups across 288 slots", () => {
    expect(queue.slots).toHaveLength(288);
    expect(
      queue.slots.reduce(
        (total: number, slot: { canonicalCandidates: unknown[] }) =>
          total + slot.canonicalCandidates.length,
        0,
      ),
    ).toBe(713);
    expect(queue.summary.canonicalVariantCount).toBe(713);
  });

  it("maps all 32 profiles to 288 path-independent canonical references", () => {
    expect(audit.profileClaimIndexes).toHaveLength(32);
    for (const profile of audit.profileClaimIndexes) {
      expect(profile.claims).toHaveLength(288);
      expect(
        new Set(
          profile.claims.map((claim: { claimKey: string }) => claim.claimKey),
        ).size,
      ).toBe(288);
    }
    expect(audit.summary.profileClaimReferences).toBe(9_216);
    expect(audit.summary.pathIndependentReferences).toBe(true);
  });

  it("audits all 80 undirected one-letter neighbor edges", () => {
    expect(audit.neighborEdges).toHaveLength(80);
    for (const edge of audit.neighborEdges) {
      expect(edge.unexpectedChangedClaimKeys).toEqual([]);
      expect(edge.collisionClaimKeys).toEqual([]);
      expect(edge.passesSelectedDraftCheck).toBe(true);
    }
    expect(audit.summary.neighborEdgesPassingSelectedDraftCheck).toBe(80);
  });

  it("resolves all initially detected axis collisions with traceable source variants", () => {
    expect(
      audit.summary.preResolutionAxisDifferentiationCollisions,
    ).toBeGreaterThan(0);
    expect(audit.summary.automaticallyResolvedAxisCollisions).toBe(
      audit.summary.preResolutionAxisDifferentiationCollisions,
    );
    expect(audit.summary.axisDifferentiationCollisions).toBe(0);
    expect(audit.axisDifferentiationCollisions).toEqual([]);
    expect(audit.collisionResolutions).toHaveLength(
      audit.summary.automaticallyResolvedAxisCollisions,
    );
    for (const resolution of audit.collisionResolutions) {
      expect(resolution.before.leftAssertion).toBe(
        resolution.before.rightAssertion,
      );
      expect(resolution.after.leftAssertion).not.toBe(
        resolution.after.rightAssertion,
      );
      expect(resolution.publicationState).toBe("research_only");
    }
  });

  it("keeps every selected candidate research-only and traceable", () => {
    expect(queue.publicationState).toBe("research_only");
    for (const slot of queue.slots) {
      for (const candidate of slot.canonicalCandidates) {
        expect(candidate.sourceCandidates.length).toBeGreaterThan(0);
        expect(candidate.selectedVariantId).toBeTruthy();
        expect(candidate.selectedAssertion).toBeTruthy();
        expect(candidate.publicationState).toBe("research_only");
      }
    }
  });
});
