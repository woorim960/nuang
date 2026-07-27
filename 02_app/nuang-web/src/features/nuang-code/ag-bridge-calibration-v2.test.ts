import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/AG_BRIDGE_CALIBRATION_AUDIT_V2.json";

describe("A/G bridge calibration audit v2", () => {
  it("passes structural cross-anchor calibration without publishing", () => {
    expect(audit.status).toBe(
      "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED",
    );
    expect(audit.axis).toBe("RO_relational_attention");
    expect(audit.pairs).toHaveLength(2);
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
      ["ENGKQ", 248, 40],
      ["IRAMC", 248, 40],
    ]);
  });

  it("keeps first thought and actual support response separated", () => {
    expect(audit.checks.directionalSceneChecks).toHaveLength(6);
    expect(
      audit.checks.directionalSceneChecks.every((item) => item.passed),
    ).toBe(true);
    expect(audit.checks.firstThoughtAndActualResponseSeparated).toBe(true);
    expect(audit.checks.fullProfileResearchStructure).toBe(true);
  });
});
