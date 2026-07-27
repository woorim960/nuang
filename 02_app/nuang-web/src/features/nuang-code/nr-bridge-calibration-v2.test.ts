import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/NR_BRIDGE_CALIBRATION_AUDIT_V2.json";

describe("R/N bridge calibration audit v2", () => {
  it("passes the structural cross-anchor calibration without publishing", () => {
    expect(audit.status).toBe(
      "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED",
    );
    expect(audit.axis).toBe("OE_exploration_and_interest");
    expect(audit.pairs).toHaveLength(2);
    expect(audit.customerApprovedProfiles).toBe(0);
  });

  it("uses the same ten discriminating scenes and balanced derivation", () => {
    expect(audit.checks.sameTenDiscriminatingScenes).toBe(true);
    expect(audit.checks.balancedInheritanceAndOverrides).toBe(true);
    expect(
      audit.pairs.map((pair) => [
        pair.derivedCode,
        pair.inheritedClaimCount,
        pair.axisOverrideClaimCount,
      ]),
    ).toEqual([
      ["ERAKQ", 248, 40],
      ["INGMC", 248, 40],
    ]);
  });

  it("checks concrete R/N language in matched scenes", () => {
    expect(audit.checks.directionalSceneChecks).toHaveLength(4);
    expect(
      audit.checks.directionalSceneChecks.every((item) => item.passed),
    ).toBe(true);
    expect(audit.checks.fullProfileResearchStructure).toBe(true);
  });
});
