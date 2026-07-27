import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const report = JSON.parse(
  fs.readFileSync(
    path.join(
      process.cwd(),
      "docs/research/trait-map-data-center-v2/generated/TRAIT_MAP_CANONICAL_PREFLIGHT_CAB_01_V2_1.json",
    ),
    "utf8",
  ),
);

describe("trait-map canonical preflight CAB-01 v2.1", () => {
  it("audits all 93 variants without integrity or unsafe-language failure", () => {
    expect(report.reportId).toBe(
      "TRAIT-MAP-CANONICAL-PREFLIGHT-CAB-01.0.2",
    );
    expect(report.summary.canonicalVariants).toBe(93);
    expect(report.summary.automatedPreflightPassed).toBe(true);
    expect(report.summary.automatedHardFailures).toBe(0);
    expect(report.summary.sourceTraceabilityFailures).toBe(0);
    expect(report.summary.sourceAccountingFailures).toBe(0);
    expect(report.summary.selectedPrimaryFailures).toBe(0);
    expect(report.summary.privacyScopeFailures).toBe(0);
    expect(report.summary.overclaimFlags).toBe(0);
    expect(report.summary.diagnosticOrStigmaFlags).toBe(0);
  });

  it("does not recreate removed RO or ER branches", () => {
    const ordinaryChoice = report.variantAudits.filter(
      (audit: { claimKey: string }) =>
        audit.claimKey ===
        ".scenario.general.ordinary_choice.attention",
    );
    const newEncounter = report.variantAudits.filter(
      (audit: { claimKey: string }) =>
        audit.claimKey ===
        ".scenario.general.new_encounter.response",
    );
    expect(ordinaryChoice).toHaveLength(4);
    expect(newEncounter).toHaveLength(4);
    expect(
      ordinaryChoice.every(
        (audit: { axisSignature: string }) =>
          !audit.axisSignature.includes("RO="),
      ),
    ).toBe(true);
    expect(
      newEncounter.every(
        (audit: { axisSignature: string }) =>
          !audit.axisSignature.includes("ER="),
      ),
    ).toBe(true);
  });

  it("keeps every variant pending independent review", () => {
    expect(report.summary.pendingSevenRoleReviews).toBe(93);
    expect(report.summary.customerApprovedVariants).toBe(0);
    for (const audit of report.variantAudits) {
      expect(audit.expertApprovalState).toBe("pending");
      expect(audit.publicationState).toBe("research_only");
    }
  });
});
