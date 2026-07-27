import { describe, expect, it } from "vitest";
import plan from "../../../docs/research/trait-map-data-center-v2/generated/REMAINING_PROFILE_PRODUCTION_PLAN_V2.json";

describe("remaining profile production plan v2", () => {
  it("locks all twenty remaining profiles into four balanced batches", () => {
    expect(plan.status).toBe("FOUR_BATCHES_LOCKED_FIRST_BATCH_AUTHORING_READY");
    expect(plan.batches).toHaveLength(4);
    expect(plan.batches.map((batch) => batch.profileCount)).toEqual([
      5, 5, 5, 5,
    ]);
    const codes = plan.batches.flatMap((batch) =>
      batch.profiles.map((profile) => profile.code),
    );
    expect(codes).toHaveLength(20);
    expect(new Set(codes).size).toBe(20);
  });

  it("starts with a five-axis cycle around ENAKQ", () => {
    expect(plan.batches[0].profiles.map((profile) => profile.code)).toEqual([
      "IRAKQ",
      "ERGKQ",
      "ENGMQ",
      "ENAMC",
      "INAKC",
    ]);
    expect(plan.batches[0].interactionScenarioCount).toBe(4);
    expect(plan.batches[0].interactionClaimCount).toBe(16);
  });

  it("gives every profile two complete parent paths and exact claim composition", () => {
    const completed = new Set([
      ...plan.completedFoundation.anchorProfiles,
      ...plan.completedFoundation.directDerivedProfiles,
    ]);
    for (const batch of plan.batches) {
      for (const profile of batch.profiles) {
        expect(completed.has(profile.primaryPath.parent)).toBe(true);
        expect(completed.has(profile.alternatePath.parent)).toBe(true);
        expect(profile.primaryPath.parent).not.toBe(
          profile.alternatePath.parent,
        );
        expect(profile.changedAxes).toHaveLength(2);
        expect(
          profile.composition.untouchedAnchorClaims +
            profile.composition.singleAxisClaims +
            profile.composition.interactionClaims,
        ).toBe(288);
        expect(profile.status).toBe("authoring_ready_research_only");
      }
    }
  });

  it("keeps production unpublished and human validation explicit", () => {
    expect(plan.productionRules.join(" ")).toContain("research_only");
    expect(plan.productionRules.join(" ")).toContain(
      "사람 검증 전 고객 화면에 발행하지 않는다",
    );
    expect(plan.firstBatchGate).toHaveLength(5);
  });
});
