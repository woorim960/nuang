import { describe, expect, it } from "vitest";
import enakcPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAKC_SCENARIO_REVIEW_V2.json";
import enakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_REVIEW_V2.json";
import enamqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAMQ_SCENARIO_REVIEW_V2.json";
import engkqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENGKQ_SCENARIO_REVIEW_V2.json";
import erakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ERAKQ_SCENARIO_REVIEW_V2.json";
import inakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/INAKQ_SCENARIO_REVIEW_V2.json";
import engkcPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENGKC_SCENARIO_REVIEW_V2.json";
import erakcPacket from "../../../docs/research/trait-map-data-center-v2/generated/ERAKC_SCENARIO_REVIEW_V2.json";
import eramqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ERAMQ_SCENARIO_REVIEW_V2.json";
import inamqPacket from "../../../docs/research/trait-map-data-center-v2/generated/INAMQ_SCENARIO_REVIEW_V2.json";
import ingkqPacket from "../../../docs/research/trait-map-data-center-v2/generated/INGKQ_SCENARIO_REVIEW_V2.json";
import plan from "../../../docs/research/trait-map-data-center-v2/generated/REMAINING_PROFILE_PRODUCTION_PLAN_V2.json";

const parentPackets = new Map(
  [enakcPacket, enamqPacket, engkqPacket, erakqPacket, inakqPacket].map(
    (packet) => [packet.code, packet],
  ),
);
const cases = [
  { code: "INGKQ", packet: ingkqPacket },
  { code: "INAMQ", packet: inamqPacket },
  { code: "ERAMQ", packet: eramqPacket },
  { code: "ERAKC", packet: erakcPacket },
  { code: "ENGKC", packet: engkcPacket },
] as const;

describe("remaining profile batch 2 scenario packets v2", () => {
  it.each(cases)(
    "$code preserves the 72 × 4 research contract",
    ({ code, packet }) => {
      const profilePlan = plan.batches[1].profiles.find(
        (profile) => profile.code === code,
      )!;
      expect(packet.status).toBe("RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION");
      expect(packet.summary.scenarioCount).toBe(72);
      expect(packet.summary.claimCount).toBe(288);
      expect(packet.summary.customerVisibleClaims).toBe(0);
      expect(packet.claims).toHaveLength(288);
      expect(packet.lineage).toHaveLength(288);
      expect(
        packet.summary.anchor_inherited +
          packet.summary.first_axis_inherited +
          packet.summary.second_axis_inherited +
          packet.summary.interaction_override,
      ).toBe(288);
      expect(packet.summary.anchor_inherited).toBe(
        profilePlan.composition.untouchedAnchorClaims,
      );
      expect(
        packet.summary.first_axis_inherited +
          packet.summary.second_axis_inherited,
      ).toBe(profilePlan.composition.singleAxisClaims);
      expect(packet.summary.interaction_override).toBe(
        profilePlan.composition.interactionClaims,
      );
    },
  );

  it.each(cases)(
    "$code converges on the correct parent copy outside interactions",
    ({ code, packet }) => {
      const profilePlan = plan.batches[1].profiles.find(
        (profile) => profile.code === code,
      )!;
      const firstBySuffix = indexBySuffix(
        parentPackets.get(profilePlan.primaryPath.parent)!.claims,
      );
      const secondBySuffix = indexBySuffix(
        parentPackets.get(profilePlan.alternatePath.parent)!.claims,
      );
      const anchorBySuffix = indexBySuffix(enakqPacket.claims);
      for (const claim of packet.claims) {
        const lineage = packet.lineage.find(
          (item) => item.claimId === claim.claimId,
        )!;
        const suffix = getSuffix(claim.claimId);
        if (lineage.derivationMode === "anchor_inherited") {
          expect(claim.assertion).toBe(anchorBySuffix.get(suffix)!.assertion);
        }
        if (lineage.derivationMode === "first_axis_inherited") {
          expect(claim.assertion).toBe(firstBySuffix.get(suffix)!.assertion);
        }
        if (lineage.derivationMode === "second_axis_inherited") {
          expect(claim.assertion).toBe(secondBySuffix.get(suffix)!.assertion);
        }
        if (lineage.derivationMode === "interaction_override") {
          expect(claim.assertion).not.toBe(
            firstBySuffix.get(suffix)!.assertion,
          );
          expect(claim.assertion).not.toBe(
            secondBySuffix.get(suffix)!.assertion,
          );
          expect(lineage.sourceClaimIds).toHaveLength(2);
        }
      }
    },
  );

  it("limits hand-authored interaction copy to the three planned scenes", () => {
    const actual = cases.flatMap(({ code, packet }) => [
      ...new Set(
        packet.lineage
          .filter((item) => item.derivationMode === "interaction_override")
          .map(
            (item) =>
              `${code}:${packet.claims.find((claim) => claim.claimId === item.claimId)!.scenarioRefs[0]}`,
          ),
      ),
    ]);
    expect(actual).toEqual([
      "ERAMQ:SCN-GENERAL-1",
      "ERAKC:SCN-GENERAL-5",
      "ERAKC:SCN-PERSON-OF-INTEREST-5",
    ]);
  });
});

function indexBySuffix<T extends { claimId: string }>(claims: readonly T[]) {
  return new Map(claims.map((claim) => [getSuffix(claim.claimId), claim]));
}

function getSuffix(claimId: string) {
  return claimId.slice(claimId.indexOf("."));
}
