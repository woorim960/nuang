import { describe, expect, it } from "vitest";
import basePacket from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_REVIEW_V2.json";
import derivedPacket from "../../../docs/research/trait-map-data-center-v2/generated/ERGMC_SCENARIO_REVIEW_V2.json";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapDerivedProfilePacketV2Schema } from "@/features/nuang-code/trait-map-derived-profile-v2";
import { ergmcEiScenarioOverridesV2 } from "@/features/nuang-code/ergmc-ei-scenario-overrides-v2";

describe("ERGMC derived scenario packet v2", () => {
  it("is valid, complete, and remains unpublished", () => {
    expect(() =>
      traitMapDerivedProfilePacketV2Schema.parse(derivedPacket),
    ).not.toThrow();
    expect(derivedPacket.summary).toEqual({
      scenarioCount: 72,
      claimCount: 288,
      inheritedClaimCount: 248,
      axisOverrideClaimCount: 40,
      customerVisibleClaims: 0,
    });
    expect(
      derivedPacket.claims.every(
        (claim) =>
          claim.entity.kind === "profile" &&
          claim.entity.ref === "ERGMC" &&
          claim.publicationState === "research_only",
      ),
    ).toBe(true);
  });

  it("covers the canonical 72 scenes with four distinct channels each", () => {
    const canonicalIds = new Set(
      traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
    );
    const grouped = new Map<string, typeof derivedPacket.claims>();
    for (const claim of derivedPacket.claims) {
      const scenarioId = claim.scenarioRefs[0];
      grouped.set(scenarioId, [...(grouped.get(scenarioId) ?? []), claim]);
    }

    expect(grouped.size).toBe(72);
    for (const [scenarioId, claims] of grouped) {
      expect(canonicalIds.has(scenarioId)).toBe(true);
      expect(claims).toHaveLength(4);
      expect(new Set(claims.map((claim) => claim.claimKind))).toEqual(
        new Set([
          "attention",
          "first_thought",
          "actual_response",
          "communication",
        ]),
      );
    }
  });

  it("inherits unchanged claims exactly and rewrites every E/I scene channel", () => {
    const sourceById = new Map(
      basePacket.claims.map((claim) => [claim.claimId, claim]),
    );
    const lineById = new Map(
      derivedPacket.lineage.map((item) => [item.claimId, item]),
    );
    const overrideScenarioIds = new Set<string>(
      ergmcEiScenarioOverridesV2.map((item) => item.scenarioId),
    );

    for (const claim of derivedPacket.claims) {
      const lineage = lineById.get(claim.claimId);
      expect(lineage).toBeDefined();
      const source = sourceById.get(lineage!.sourceClaimId);
      expect(source).toBeDefined();
      if (overrideScenarioIds.has(claim.scenarioRefs[0])) {
        expect(lineage!.derivationMode).toBe("axis_override");
        expect(claim.assertion).not.toBe(source!.assertion);
        expect(claim.evidenceFindingRefs).toContain(
          "FND-BFI2-HIERARCHICAL-FACETS",
        );
      } else {
        expect(lineage!.derivationMode).toBe("inherited");
        expect(claim.assertion).toBe(source!.assertion);
        expect(claim.evidenceFindingRefs).toEqual(
          source!.evidenceFindingRefs,
        );
      }
    }
  });
});
