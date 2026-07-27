import { describe, expect, it } from "vitest";
import enakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_REVIEW_V2.json";
import erakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ERAKQ_SCENARIO_REVIEW_V2.json";
import ingmcPacket from "../../../docs/research/trait-map-data-center-v2/generated/INGMC_SCENARIO_REVIEW_V2.json";
import irgmcPacket from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_REVIEW_V2.json";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapDerivedProfilePacketV2Schema } from "@/features/nuang-code/trait-map-derived-profile-v2";
import { erakqNrScenarioOverridesV2 } from "@/features/nuang-code/erakq-nr-scenario-overrides-v2";
import { ingmcNrScenarioOverridesV2 } from "@/features/nuang-code/ingmc-nr-scenario-overrides-v2";

const cases = [
  {
    code: "ERAKQ",
    packet: erakqPacket,
    base: enakqPacket,
    overrides: erakqNrScenarioOverridesV2,
  },
  {
    code: "INGMC",
    packet: ingmcPacket,
    base: irgmcPacket,
    overrides: ingmcNrScenarioOverridesV2,
  },
] as const;

describe("N/R derived scenario packets v2", () => {
  it.each(cases)("$code is complete, valid, and unpublished", ({ packet }) => {
    expect(() =>
      traitMapDerivedProfilePacketV2Schema.parse(packet),
    ).not.toThrow();
    expect(packet.summary).toEqual({
      scenarioCount: 72,
      claimCount: 288,
      inheritedClaimCount: 248,
      axisOverrideClaimCount: 40,
      customerVisibleClaims: 0,
    });
    expect(
      packet.claims.every(
        (claim) =>
          claim.entity.kind === "profile" &&
          claim.entity.ref === packet.code &&
          claim.publicationState === "research_only",
      ),
    ).toBe(true);
  });

  it.each(cases)(
    "$code covers 72 canonical scenes and rewrites only ten N/R scenes",
    ({ packet, base, overrides }) => {
      const canonicalIds = new Set(
        traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
      );
      const overrideScenarioIds = new Set<string>(
        overrides.map((item) => item.scenarioId),
      );
      const sourceById = new Map(
        base.claims.map((claim) => [claim.claimId, claim]),
      );
      const grouped = new Map<string, typeof packet.claims>();

      for (const claim of packet.claims) {
        const scenarioId = claim.scenarioRefs[0];
        grouped.set(scenarioId, [
          ...(grouped.get(scenarioId) ?? []),
          claim,
        ]);
        const lineage = packet.lineage.find(
          (item) => item.claimId === claim.claimId,
        );
        const source = sourceById.get(lineage!.sourceClaimId);
        if (overrideScenarioIds.has(scenarioId)) {
          expect(lineage!.derivationMode).toBe("axis_override");
          expect(claim.assertion).not.toBe(source!.assertion);
          expect(claim.evidenceFindingRefs).toContain(
            "FND-OPENNESS-INTELLECT-DISTINCTION",
          );
        } else {
          expect(lineage!.derivationMode).toBe("inherited");
          expect(claim.assertion).toBe(source!.assertion);
        }
      }

      expect(grouped.size).toBe(72);
      for (const [scenarioId, claims] of grouped) {
        expect(canonicalIds.has(scenarioId)).toBe(true);
        expect(claims).toHaveLength(4);
      }
    },
  );
});
