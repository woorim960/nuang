import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_INFERRED_AXIS_SCOPE_INTERNAL_SCREEN_P0_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map inferred-axis P0 internal screen v2.1", () => {
  it("classifies every P0 entry exactly once", () => {
    expect(report.summary.entries).toBe(48);
    expect(report.summary.retainCandidates).toBe(19);
    expect(report.summary.removeProposals).toBe(25);
    expect(report.summary.constructHolds).toBe(4);
    expect(
      report.summary.retainCandidates +
        report.summary.removeProposals +
        report.summary.constructHolds,
    ).toBe(48);
  });

  it("removes known plan-change RO and all false SM/ER P0 contrasts", () => {
    const planChange = report.entries.find(
      (entry: { claimKey: string }) =>
        entry.claimKey ===
        ".scenario.general.plan_change.response",
    );
    expect(planChange.internalScreening.decision).toBe(
      "remove_scope_mismatch",
    );
    expect(report.summary.byAxis.SM.remove).toBe(3);
    expect(report.summary.byAxis.ER.remove).toBe(1);
  });

  it("keeps uncertain general relationship contexts out of the next baseline", () => {
    const holds = report.entries.filter(
      (entry: {
        internalScreening: { decision: string };
      }) =>
        entry.internalScreening.decision ===
        "hold_for_construct_evidence",
    );
    expect(holds).toHaveLength(4);
    for (const entry of holds) {
      expect(entry.nextBaselineAction).toContain("exclude");
    }
  });

  it("does not represent internal screening as expert approval", () => {
    expect(report.summary.expertReviewed).toBe(0);
    expect(report.summary.customerApproved).toBe(0);
    expect(report.publicationState).toBe("research_only");
    for (const entry of report.entries) {
      expect(entry.independentRoleReviewState).toBe("pending");
      expect(entry.expertReviewed).toBe(false);
    }
  });
});
