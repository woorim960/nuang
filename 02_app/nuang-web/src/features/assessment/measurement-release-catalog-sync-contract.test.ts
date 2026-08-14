import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const syncCatalogScript = readFileSync(
  "scripts/sync-measurement-release-catalog.mjs",
  "utf8",
);
const normalizedScript = syncCatalogScript.replace(/\s+/g, " ");

describe("measurement release catalog sync contract", () => {
  it("reads the current validation gates before preparing an upsert", () => {
    expect(normalizedScript).toContain(
      '.select("code_scheme_version,status,validation_gates")',
    );
    expect(normalizedScript).toContain(
      '.select("item_bank_release_id,status,validation_gates")',
    );
  });

  it("defaults every Gate B requirement without downgrading existing results", () => {
    for (const gateName of [
      "cognitive_review",
      "fairness_and_invariance",
      "quantitative_pilot",
      "reliability_and_structure",
    ]) {
      expect(syncCatalogScript).toContain(`${gateName}: "not_started"`);
    }

    expect(normalizedScript).toContain(
      "return { ...measurementValidationGateDefaults, ...preservedGates };",
    );
  });

  it("merges current gates for the scheme and both item-bank releases", () => {
    expect(normalizedScript).toContain(
      "mergeValidationGates( existingScheme.data?.validation_gates, )",
    );
    expect(normalizedScript).toContain(
      "existingReleaseById.get(candidateReleaseId)?.validation_gates",
    );
    expect(normalizedScript).toContain(
      "existingReleaseById.get(betaReleaseId)?.validation_gates",
    );
    expect(syncCatalogScript.match(/mergeValidationGates\(/g)).toHaveLength(4);
  });
});
