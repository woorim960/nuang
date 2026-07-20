import { describe, expect, it } from "vitest";
import {
  enakqClaimRegistry,
  getClaimById,
  selectTraitClaims,
} from "@/features/nuang-code/enakq-claim-registry";
import {
  enakqBoundaryFixture,
  enakqClearFixture,
  enakqFacetSplitFixture,
  enakqTraitProfileFixtures,
} from "@/features/nuang-code/fixtures/enakq-trait-profile-fixtures";
import {
  traitClaimRegistryEntrySchema,
  traitClaimRegistrySchema,
  traitProfileFixtureSchema,
} from "@/features/nuang-code/trait-map-knowledge-contract";

describe("ENAKQ canonical claim registry", () => {
  it("loads all 158 audited claims with unique stable keys", () => {
    expect(enakqClaimRegistry.entries).toHaveLength(158);
    expect(
      new Set(enakqClaimRegistry.entries.map((claim) => claim.claimId)).size,
    ).toBe(158);
    expect(
      new Set(enakqClaimRegistry.entries.map((claim) => claim.contentKey)).size,
    ).toBe(158);
    expect(
      enakqClaimRegistry.entries.every(
        (claim) => claim.sourceBlockRefs.length > 0,
      ),
    ).toBe(true);
  });

  it("keeps every current research claim out of production selection", () => {
    expect(
      enakqClaimRegistry.entries.some(
        (claim) => claim.publicationState === "approved",
      ),
    ).toBe(false);

    expect(
      selectTraitClaims({
        fixture: enakqClearFixture,
        mode: "production",
        surface: "trait_map",
      }),
    ).toEqual([]);
  });

  it("classifies safety boundaries and ambiguous claims by meaning", () => {
    expect(getClaimById("ENAKQ.comparison.nonjudgment")?.claimKind).toBe(
      "boundary",
    );
    expect(getClaimById("ENAKQ.work.performance_boundary")?.claimKind).toBe(
      "boundary",
    );
    expect(getClaimById("ENAKQ.strength.Q_nonvirtue")?.claimKind).toBe(
      "boundary",
    );
    expect(getClaimById("ENAKQ.general.role.conductor")?.claimKind).toBe(
      "strength",
    );
    expect(getClaimById("ENAKQ.friend.support")?.claimKind).toBe(
      "conversation_prompt",
    );
  });

  it("rejects an approval label that outruns evidence review", () => {
    const source = getClaimById("ENAKQ.general.definition.E");
    expect(source).not.toBeNull();

    const result = traitClaimRegistryEntrySchema.safeParse({
      ...source,
      publicationState: "approved",
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate content keys at registry level", () => {
    const duplicate = {
      ...enakqClaimRegistry.entries[0],
      claimId: "ENAKQ.synthetic.duplicate",
    };
    const result = traitClaimRegistrySchema.safeParse({
      ...enakqClaimRegistry,
      entries: [...enakqClaimRegistry.entries, duplicate],
    });

    expect(result.success).toBe(false);
  });

  it("never exposes self-only process claims to comparison", () => {
    const fixtureWithProcessSignals = traitProfileFixtureSchema.parse({
      ...enakqClearFixture,
      availableSignals: [
        ...enakqClearFixture.availableSignals,
        "private_process_signals",
      ],
    });
    const claims = selectTraitClaims({
      context: "partner",
      fixture: fixtureWithProcessSignals,
      mode: "research_audit",
      surface: "comparison_report",
    });

    expect(claims.some((claim) => claim.privacyScope === "self_only")).toBe(
      false,
    );
    expect(claims.map((claim) => claim.claimId)).not.toContain(
      "ENAKQ.general.inner.A",
    );
  });

  it("suppresses claims whose required signals are absent", () => {
    const selectedClaimIds = new Set(
      selectTraitClaims({
        fixture: enakqClearFixture,
        mode: "research_audit",
        surface: "personal_report",
      }).map((claim) => claim.claimId),
    );

    for (const claimId of enakqClearFixture.expectedSuppressedClaimIds) {
      expect(selectedClaimIds.has(claimId), claimId).toBe(false);
    }
  });
});

describe("ENAKQ profile fixtures", () => {
  it("provides clear, boundary, and facet-split review cases", () => {
    expect(enakqTraitProfileFixtures.map((fixture) => fixture.kind)).toEqual([
      "clear",
      "boundary",
      "facet_split",
    ]);
    expect(
      enakqClearFixture.domainScores.every((score) => !score.isBoundary),
    ).toBe(true);
    expect(
      enakqBoundaryFixture.domainScores.every((score) => score.isBoundary),
    ).toBe(true);
    expect(
      enakqFacetSplitFixture.facetScores.some(
        (score) => score.direction === "low",
      ),
    ).toBe(true);
  });

  it("rejects a fixture whose displayed code disagrees with its scores", () => {
    const result = traitProfileFixtureSchema.safeParse({
      ...enakqClearFixture,
      code: "INAKQ",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a fixture that labels a clear score as boundary", () => {
    const result = traitProfileFixtureSchema.safeParse({
      ...enakqClearFixture,
      domainScores: enakqClearFixture.domainScores.map((score, index) =>
        index === 0 ? { ...score, isBoundary: true } : score,
      ),
    });

    expect(result.success).toBe(false);
  });
});
