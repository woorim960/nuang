import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_INFERRED_AXIS_SCOPE_AUDIT_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map inferred-axis scope audit v2.1", () => {
  it("queues every axis added beyond directly controlled axes", () => {
    expect(report.summary.inferredAxisDecisions).toBe(133);
    expect(report.summary.affectedClaimSlots).toBe(133);
    expect(report.summary.countsByAxis).toEqual({
      SE: 21,
      OE: 23,
      RO: 66,
      SM: 13,
      ER: 10,
    });
  });

  it("flags general plan-change RO as a P0 scope risk", () => {
    const entry = report.entries.find(
      (item: { claimKey: string; axisRef: string }) =>
        item.claimKey ===
          ".scenario.general.plan_change.response" &&
        item.axisRef === "RO",
    );
    expect(entry).toBeTruthy();
    expect(entry.priority).toBe("P0");
    expect(entry.scopeFlags).toContain(
      "RO_GENERAL_CONTEXT_REQUIRES_EXPLICIT_RELATION_BOUNDARY",
    );
    expect(entry.scopeFlags).toContain(
      "RO_SCENARIO_NOT_CLEARLY_A_RELATIONSHIP_PROBLEM",
    );
  });

  it("stores both directions and keeps all decisions pending", () => {
    for (const entry of report.entries) {
      expect(
        entry.evidenceAudit.byDirection[
          entry.axisContract.symbols[0]
        ].canonicalCandidates,
      ).toBeGreaterThan(0);
      expect(
        entry.evidenceAudit.byDirection[
          entry.axisContract.symbols[1]
        ].canonicalCandidates,
      ).toBeGreaterThan(0);
      expect(entry.internalTriageState).toContain("pending");
      expect(entry.publicationState).toBe("research_only");
    }
    expect(report.summary.retainedAfterIndependentReview).toBe(0);
    expect(report.summary.removedAfterIndependentReview).toBe(0);
    expect(report.summary.customerApprovedEntries).toBe(0);
  });
});
