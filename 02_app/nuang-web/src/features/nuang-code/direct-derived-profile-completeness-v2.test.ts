import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/DIRECT_DERIVED_PROFILE_COMPLETENESS_AUDIT_V2.json";

describe("direct-derived profile completeness audit v2", () => {
  it("completes all ten direct-derived research profiles", () => {
    expect(audit.status).toBe(
      "TEN_DIRECT_DERIVED_PROFILES_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED",
    );
    expect(audit.checks).toEqual({
      exactProfileCoverage: true,
      allProfilesComplete: true,
      allAxesStructurallyCalibrated: true,
      allContentResearchOnly: true,
    });
  });

  it("keeps every profile symmetric and unpublished", () => {
    expect(audit.profiles).toHaveLength(10);
    for (const profile of audit.profiles) {
      expect(profile.baseAnchor).toBe(profile.expectedBaseAnchor);
      expect(profile.changedAxis).toBe(profile.expectedAxis);
      expect(profile.lineageMatchesPlan).toBe(true);
      expect(profile.scenarioCount).toBe(72);
      expect(profile.scenarioClaimCount).toBe(288);
      expect(profile.inheritedClaimCount).toBe(248);
      expect(profile.axisOverrideClaimCount).toBe(40);
      expect(profile.copyAudit).toBe("288/288");
      expect(profile.chapterCount).toBe(16);
      expect(profile.longformCharacters).toBeGreaterThanOrEqual(50_000);
      expect(profile.structuredClaimCount).toBe(314);
      expect(profile.neighborClaimCount).toBe(20);
      expect(profile.customerVisibleScenarioClaims).toBe(0);
      expect(profile.customerApprovedClaims).toBe(0);
      expect(profile.manuscriptPresent).toBe(true);
    }
  });

  it("closes all five structural calibration audits", () => {
    expect(audit.calibrations).toHaveLength(5);
    expect(new Set(audit.calibrations.map((item) => item.axis)).size).toBe(5);
    expect(
      audit.calibrations.every(
        (item) =>
          item.status ===
          "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED",
      ),
    ).toBe(true);
  });

  it("reports the exact direct-derived totals", () => {
    expect(audit.totals.scenarios).toBe(720);
    expect(audit.totals.scenarioClaims).toBe(2_880);
    expect(audit.totals.structuredClaims).toBe(3_140);
    expect(audit.totals.neighborClaims).toBe(200);
    expect(audit.totals.customerApprovedClaims).toBe(0);
  });
});
