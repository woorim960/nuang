import { describe, expect, it } from "vitest";
import enakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_REVIEW_V2.json";
import enamqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAMQ_SCENARIO_REVIEW_V2.json";
import irgkcPacket from "../../../docs/research/trait-map-data-center-v2/generated/IRGKC_SCENARIO_REVIEW_V2.json";
import irgmcPacket from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_REVIEW_V2.json";
import { enamqKmScenarioOverridesV2 } from "@/features/nuang-code/enamq-km-scenario-overrides-v2";
import { irgkcKmScenarioOverridesV2 } from "@/features/nuang-code/irgkc-km-scenario-overrides-v2";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapDerivedProfilePacketV2Schema } from "@/features/nuang-code/trait-map-derived-profile-v2";

const cases = [
  {
    code: "ENAMQ",
    packet: enamqPacket,
    base: enakqPacket,
    overrides: enamqKmScenarioOverridesV2,
  },
  {
    code: "IRGKC",
    packet: irgkcPacket,
    base: irgmcPacket,
    overrides: irgkcKmScenarioOverridesV2,
  },
] as const;

describe("K/M derived scenario packets v2", () => {
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
  });

  it.each(cases)(
    "$code covers canonical scenes and rewrites only ten K/M scenes",
    ({ packet, base, overrides }) => {
      const canonicalIds = new Set(
        traitMapScenarioCatalogV2.map((scenario) => scenario.scenarioId),
      );
      const overrideIds = new Set<string>(
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
        )!;
        const source = sourceById.get(lineage.sourceClaimId)!;
        if (overrideIds.has(scenarioId)) {
          expect(lineage.derivationMode).toBe("axis_override");
          expect(lineage.rationale).toContain(
            "실행을 시작하고 이어가는 조건",
          );
          expect(claim.assertion).not.toBe(source.assertion);
        } else {
          expect(lineage.derivationMode).toBe("inherited");
          expect(claim.assertion).toBe(source.assertion);
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
