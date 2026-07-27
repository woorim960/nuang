import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/REMAINING_BATCH2_CALIBRATION_AUDIT_V2.json";

describe("remaining profile batch 2 calibration audit v2", () => {
  it("closes the second five multi-axis profiles structurally", () => {
    expect(audit.status).toBe(
      "SECOND_REMAINING_BATCH_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED",
    );
    expect(audit.checks.exactProfileCoverage).toBe(true);
    expect(audit.checks.exactInteractionCoverage).toBe(true);
    expect(audit.checks.fullResearchStructure).toBe(true);
    expect(audit.checks.twoParentPathConvergence).toBe(true);
    expect(audit.checks.allContentResearchOnly).toBe(true);
    expect(
      audit.checks.directionalSceneChecks.every((check) => check.passed),
    ).toBe(true);
  });

  it("keeps every profile complete, convergent, and unpublished", () => {
    expect(audit.profiles.map((profile) => profile.code)).toEqual([
      "INGKQ",
      "INAMQ",
      "ERAMQ",
      "ERAKC",
      "ENGKC",
    ]);
    for (const profile of audit.profiles) {
      expect(profile.scenarioCount).toBe(72);
      expect(profile.scenarioClaimCount).toBe(288);
      expect(profile.copyAudit).toBe("288/288");
      expect(profile.chapterCount).toBe(16);
      expect(profile.longformCharacters).toBeGreaterThanOrEqual(50_000);
      expect(profile.structuredClaimCount).toBe(314);
      expect(profile.neighborCount).toBe(5);
      expect(profile.neighborClaimCount).toBe(20);
      expect(profile.manuscriptPresent).toBe(true);
      expect(profile.parentPathsMatchPlan).toBe(true);
      expect(profile.lineageCountsMatchPlan).toBe(true);
      expect(profile.parentCopyConvergencePassed).toBe(true);
      expect(profile.customerVisibleScenarioClaims).toBe(0);
      expect(profile.customerApprovedClaims).toBe(0);
    }
  });

  it("records only the three planned interaction scenes", () => {
    expect(audit.totals.interactionScenes).toBe(3);
    expect(audit.totals.interactionScenarioClaims).toBe(12);
    expect(
      audit.profiles.flatMap((profile) =>
        profile.interactionScenarioIds.map(
          (scenarioId) => `${profile.code}:${scenarioId}`,
        ),
      ),
    ).toEqual([
      "ERAMQ:SCN-GENERAL-1",
      "ERAKC:SCN-GENERAL-5",
      "ERAKC:SCN-PERSON-OF-INTEREST-5",
    ]);
  });

  it("reports exact second-batch totals", () => {
    expect(audit.totals.profiles).toBe(5);
    expect(audit.totals.scenarios).toBe(360);
    expect(audit.totals.scenarioClaims).toBe(1_440);
    expect(audit.totals.inheritedScenarioClaims).toBe(1_428);
    expect(audit.totals.structuredClaims).toBe(1_570);
    expect(audit.totals.neighborClaims).toBe(100);
    expect(audit.totals.customerApprovedClaims).toBe(0);
  });
});
