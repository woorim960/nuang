import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/REMAINING_BATCH1_CALIBRATION_AUDIT_V2.json";

describe("remaining profile batch 1 calibration audit v2", () => {
  it("closes the first five multi-axis profiles structurally", () => {
    expect(audit.status).toBe(
      "FIRST_REMAINING_BATCH_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED",
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
      "IRAKQ",
      "ERGKQ",
      "ENGMQ",
      "ENAMC",
      "INAKC",
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

  it("records only the four planned interaction scenes", () => {
    expect(audit.totals.interactionScenes).toBe(4);
    expect(audit.totals.interactionScenarioClaims).toBe(16);
    expect(
      audit.profiles.flatMap((profile) =>
        profile.interactionScenarioIds.map(
          (scenarioId) => `${profile.code}:${scenarioId}`,
        ),
      ),
    ).toEqual([
      "IRAKQ:SCN-FRIEND-2",
      "IRAKQ:SCN-GENERAL-2",
      "ENAMC:SCN-GENERAL-4",
      "INAKC:SCN-GENERAL-12",
    ]);
  });

  it("reports exact first-batch totals", () => {
    expect(audit.totals.profiles).toBe(5);
    expect(audit.totals.scenarios).toBe(360);
    expect(audit.totals.scenarioClaims).toBe(1_440);
    expect(audit.totals.inheritedScenarioClaims).toBe(1_424);
    expect(audit.totals.structuredClaims).toBe(1_570);
    expect(audit.totals.neighborClaims).toBe(100);
    expect(audit.totals.customerApprovedClaims).toBe(0);
  });
});
