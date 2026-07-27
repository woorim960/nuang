import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_MASTER_COMPLETENESS_REAUDIT_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map 32-profile master completeness reaudit v2", () => {
  it("audits every code exactly once against the current master gates", () => {
    expect(report.profiles).toHaveLength(32);
    expect(
      new Set(report.profiles.map((profile: { code: string }) => profile.code))
        .size,
    ).toBe(32);
    expect(report.summary.structurallyCompleteProfiles).toBe(32);
    expect(report.summary.manuscriptsAtLeastFiftyThousandCharacters).toBe(32);
  });

  it("does not confuse structural completeness with publication readiness", () => {
    expect(report.summary.profilesReadyForCustomerPublication).toBe(0);
    expect(report.summary.customerApprovedClaims).toBe(0);
    expect(report.publicationState).toBe("research_only");
    for (const profile of report.profiles) {
      expect(profile.gates.structuralContract).toBe(true);
      expect(profile.gates.canonicalScenarioRebase).toBe(true);
      expect(profile.gates.automatedContentQuality).toBe(true);
      expect(profile.gates.externalHumanValidation).toBe(false);
      expect(profile.gates.customerPublication).toBe(false);
    }
  });

  it("records exact repair targets instead of a generic incomplete label", () => {
    expect(report.summary.profilesPassingLegacyAutomatedContentGate).toBe(32);
    expect(report.summary.profilesPassingCurrentAutomatedContentGate).toBe(32);
    expect(report.summary.profilesRequiringContentRepair).toBe(0);
    expect(report.summary.issueCounts.profilesWithThinChapters).toBe(0);
    for (const profile of report.profiles) {
      expect(profile.deficits.thinChapters).toBeInstanceOf(Array);
      expect(
        profile.deficits.substantiveContentMissingCharacters,
      ).toBeGreaterThanOrEqual(0);
      expect(
        profile.deficits.editorialMissingCharacters,
      ).toBeGreaterThanOrEqual(0);
      expect(profile.canonicalDependency).toBeTruthy();
    }
  });

  it("uses the repaired canonical recomposition audit as the future baseline", () => {
    expect(report.summary.canonicalVariants).toBe(605);
    expect(report.summary.canonicalVariantsPendingExpertAuthoring).toBe(0);
    expect(report.summary.profileCanonicalReferences).toBe(9_216);
    expect(report.summary.profilesRebasedToCanonicalV23).toBe(32);
    expect(report.summary.recompositionNeighborEdgesPassing).toBe(80);
  });
});
