import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_32_PROFILE_COMPLETENESS_AUDIT_V2.json";

describe("trait map 32-profile completeness audit v2", () => {
  it("covers every code combination exactly once", () => {
    expect(audit.status).toBe(
      "ALL_32_PROFILE_RESEARCH_PACKAGES_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED",
    );
    expect(audit.checks).toEqual({
      exactCodeCoverage: true,
      allProfileStructuresComplete: true,
      reciprocalNeighborNetwork: true,
      allContentResearchOnly: true,
      allStageAuditsPassed: true,
      namingSystemComplete: true,
      exactTotals: true,
    });
    expect(audit.profiles).toHaveLength(32);
    expect(new Set(audit.profiles.map((profile) => profile.code)).size).toBe(
      32,
    );
  });

  it("keeps every profile structurally complete and unpublished", () => {
    for (const profile of audit.profiles) {
      expect(profile.scenarioCount).toBe(72);
      expect(profile.scenarioClaimCount).toBe(288);
      expect(profile.uniqueScenarioClaimIds).toBe(288);
      expect(profile.copyAudit).toBe("288/288");
      expect(profile.chapterCount).toBe(16);
      expect(profile.longformCharacters).toBeGreaterThanOrEqual(50_000);
      expect(profile.evidenceSourceCount).toBeGreaterThanOrEqual(30);
      expect(profile.neighborCount).toBe(5);
      expect(profile.neighborClaimCount).toBe(20);
      expect(profile.exactNeighborSet).toBe(true);
      expect(profile.customerVisibleScenarioClaims).toBe(0);
      expect(profile.customerApprovedClaims).toBe(0);
      expect(profile.manuscriptPresent).toBe(true);
    }
  });

  it("reports exact network and content totals", () => {
    expect(audit.totals).toMatchObject({
      profiles: 32,
      scenarios: 2_304,
      scenarioClaims: 9_216,
      structuredClaims: 10_048,
      neighborClaims: 640,
      directedNeighborLinks: 160,
      undirectedNeighborPairs: 80,
      customerApprovedClaims: 0,
    });
    expect(audit.totals.longformCharacters).toBe(2_352_502);
  });
});
