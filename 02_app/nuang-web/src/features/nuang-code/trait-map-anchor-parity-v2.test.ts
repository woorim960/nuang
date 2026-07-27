import { describe, expect, it } from "vitest";
import audit from "../../../docs/research/trait-map-data-center-v2/generated/ANCHOR_PROFILE_PARITY_AUDIT_V2.json";

describe("trait-map anchor parity v2", () => {
  it("locks both anchors to all 72 scenarios and 288 four-channel claims", () => {
    expect(audit.profiles.ENAKQ.structuredScenarioCount).toBe(72);
    expect(audit.profiles.IRGMC.structuredScenarioCount).toBe(72);
    expect(audit.profiles.ENAKQ.structuredScenarioClaims).toBe(288);
    expect(audit.profiles.IRGMC.structuredScenarioClaims).toBe(288);
  });

  it("keeps automatic language passes separate from customer approval", () => {
    expect(audit.profiles.ENAKQ.automaticCopyPasses).toBe(288);
    expect(audit.profiles.IRGMC.automaticCopyPasses).toBe(288);
    expect(audit.profiles.ENAKQ.customerApprovedClaims).toBe(0);
    expect(audit.profiles.IRGMC.customerApprovedClaims).toBe(0);
  });

  it("aligns both research anchors without claiming customer approval", () => {
    expect(audit.status).toBe(
      "ANCHORS_STRUCTURALLY_ALIGNED_REVIEW_REQUIRED",
    );
    expect(audit.blockedGates).toBe(0);
    expect(
      audit.gates.find(
        (gate) => gate.gateId === "normalized_16_chapter_manifest",
      )?.status,
    ).toBe("PASS");
    expect(
      audit.gates.find(
        (gate) => gate.gateId === "structured_neighbor_contrasts",
      )?.status,
    ).toBe("PASS");
  });
});
