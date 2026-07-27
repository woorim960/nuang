import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readiness = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CUSTOMER_PUBLICATION_READINESS_V2.json",
    ),
    "utf8",
  ),
);

describe("trait-map customer publication readiness v2", () => {
  it("blocks publication while no claim or profile is customer-approved", () => {
    expect(readiness.status).toBe("CUSTOMER_PUBLICATION_BLOCKED");
    expect(readiness.summary.customerApprovedClaims).toBe(0);
    expect(readiness.summary.profilesReadyForCustomerPublication).toBe(0);
    expect(readiness.summary.gatesBlocked).toBeGreaterThan(0);
  });

  it("defines a distinct data purpose for every customer surface", () => {
    expect(
      readiness.surfaces.map((item: { surface: string }) => item.surface),
    ).toEqual([
      "result_summary",
      "trait_map_detail",
      "comparison_report",
      "profile_preview",
      "share_card",
    ]);
    for (const surface of readiness.surfaces) {
      expect(surface.purpose).toBeTruthy();
      expect(surface.allowedContent).toBeTruthy();
      expect(surface.forbiddenContent).toBeTruthy();
      expect(surface.nextAction).toBeTruthy();
    }
  });

  it("keeps structural and recomposition success separate from content approval", () => {
    const canonicalStructure = readiness.blockingGates.find(
      (gate: { gate: string }) => gate.gate === "CANONICAL_STRUCTURE",
    );
    const recomposition = readiness.blockingGates.find(
      (gate: { gate: string }) => gate.gate === "PROFILE_RECOMPOSITION",
    );
    const sevenRoleReview = readiness.blockingGates.find(
      (gate: { gate: string }) => gate.gate === "SEVEN_ROLE_REVIEW",
    );
    expect(canonicalStructure.passed).toBe(true);
    expect(recomposition.passed).toBe(true);
    expect(sevenRoleReview.passed).toBe(false);
    expect(readiness.summary.gatesPassed).toBe(2);
    expect(readiness.summary.canonicalDraftsPending).toBe(0);
    expect(readiness.summary.sevenRoleReviewsPending).toBe(713);
  });

  it("requires rollback by contentKey instead of replacing whole profiles", () => {
    expect(readiness.rollbackContract.action).toContain("contentKey");
    expect(readiness.rollbackContract.triggers.length).toBeGreaterThanOrEqual(
      4,
    );
  });
});
