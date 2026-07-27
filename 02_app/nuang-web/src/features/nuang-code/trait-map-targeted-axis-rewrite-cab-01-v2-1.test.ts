import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/review/TRAIT_MAP_TARGETED_AXIS_REWRITE_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map targeted axis rewrite CAB-01 v2.1", () => {
  it("contains only the eight remaining neighbor pairs", () => {
    expect(report.reportId).toBe(
      "TRAIT-MAP-TARGETED-AXIS-REWRITE-CAB-01.0.2",
    );
    expect(report.summary.neighborPairs).toBe(8);
    expect(report.summary.affectedVariants).toBe(16);
    expect(report.pairs).toHaveLength(8);
  });

  it("does not recreate the removed RO ordinary-choice or ER new-encounter pairs", () => {
    expect(
      report.pairs.some(
        (pair: { claimKey: string; changedAxis: string }) =>
          pair.claimKey ===
            ".scenario.general.ordinary_choice.attention" &&
          pair.changedAxis === "RO",
      ),
    ).toBe(false);
    expect(
      report.pairs.some(
        (pair: { claimKey: string; changedAxis: string }) =>
          pair.claimKey ===
            ".scenario.general.new_encounter.response" &&
          pair.changedAxis === "ER",
      ),
    ).toBe(false);
  });

  it("uses the official C/Q construct instead of outward response speed", () => {
    expect(report.axisLenses.ER.distinction).toContain(
      "걱정과 감정",
    );
    expect(report.axisLenses.ER.distinction).toContain(
      "말하기·행동 시작 속도로 대신 설명하지 않는다",
    );
  });

  it("keeps every rewrite pending and research-only", () => {
    expect(report.summary.completedRewrites).toBe(0);
    expect(report.summary.customerApprovedPairs).toBe(0);
    for (const pair of report.pairs) {
      expect(pair.proposedRewrite.state).toBe(
        "pending_evidence_bounded_authoring",
      );
      expect(pair.publicationState).toBe("research_only");
    }
  });
});
