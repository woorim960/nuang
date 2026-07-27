import { describe, expect, it } from "vitest";
import enakcPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAKC_SCENARIO_REVIEW_V2.json";
import enakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_REVIEW_V2.json";
import irgmcPacket from "../../../docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_REVIEW_V2.json";
import irgmqPacket from "../../../docs/research/trait-map-data-center-v2/generated/IRGMQ_SCENARIO_REVIEW_V2.json";
import { enakcQcScenarioOverridesV2 } from "@/features/nuang-code/enakc-qc-scenario-overrides-v2";
import { irgmqQcScenarioOverridesV2 } from "@/features/nuang-code/irgmq-qc-scenario-overrides-v2";
import { traitMapScenarioCatalogV2 } from "@/features/nuang-code/trait-map-data-center-v2";
import { traitMapDerivedProfilePacketV2Schema } from "@/features/nuang-code/trait-map-derived-profile-v2";

const cases = [
  {
    code: "ENAKC",
    packet: enakcPacket,
    base: enakqPacket,
    overrides: enakcQcScenarioOverridesV2,
  },
  {
    code: "IRGMQ",
    packet: irgmqPacket,
    base: irgmcPacket,
    overrides: irgmqQcScenarioOverridesV2,
  },
] as const;

describe("Q/C derived scenario packets v2", () => {
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
    "$code covers canonical scenes and rewrites only ten Q/C scenes",
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
        grouped.set(scenarioId, [...(grouped.get(scenarioId) ?? []), claim]);
        const lineage = packet.lineage.find(
          (item) => item.claimId === claim.claimId,
        )!;
        const source = sourceById.get(lineage.sourceClaimId)!;
        if (overrideIds.has(scenarioId)) {
          expect(lineage.derivationMode).toBe("axis_override");
          expect(lineage.rationale).toContain("불편함을 알아차리는 시점");
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
