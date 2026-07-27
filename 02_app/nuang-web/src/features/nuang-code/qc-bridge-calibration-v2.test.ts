import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/QC_BRIDGE_CALIBRATION_AUDIT_V2.json";

describe("Q/C bridge calibration audit v2", () => {
  it("passes structural calibration without publishing", () => {
    expect(audit.status).toBe(
      "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED",
    );
    expect(audit.axis).toBe("ER_emotional_activation_and_worry");
    expect(audit.customerApprovedProfiles).toBe(0);
  });

  it("uses the same ten scenes and balanced derivation", () => {
    expect(audit.checks.sameTenDiscriminatingScenes).toBe(true);
    expect(audit.checks.balancedInheritanceAndOverrides).toBe(true);
    expect(
      audit.pairs.map((pair) => [
        pair.derivedCode,
        pair.inheritedClaimCount,
        pair.axisOverrideClaimCount,
      ]),
    ).toEqual([
      ["ENAKC", 248, 40],
      ["IRGMQ", 248, 40],
    ]);
  });

  it("checks concrete Q/C activation and recovery language", () => {
    expect(
      audit.checks.directionalSceneChecks.every((item) => item.passed),
    ).toBe(true);
    expect(audit.checks.fullProfileResearchStructure).toBe(true);
  });
});
