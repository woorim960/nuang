import { describe, expect, it } from "vitest";
import enakcPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAKC_SCENARIO_REVIEW_V2.json";
import enakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_REVIEW_V2.json";
import enamqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAMQ_SCENARIO_REVIEW_V2.json";
import engkqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENGKQ_SCENARIO_REVIEW_V2.json";
import erakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ERAKQ_SCENARIO_REVIEW_V2.json";
import inakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/INAKQ_SCENARIO_REVIEW_V2.json";
import enakcMultiPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENAMC_SCENARIO_REVIEW_V2.json";
import engmqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ENGMQ_SCENARIO_REVIEW_V2.json";
import ergkqPacket from "../../../docs/research/trait-map-data-center-v2/generated/ERGKQ_SCENARIO_REVIEW_V2.json";
import inakcPacket from "../../../docs/research/trait-map-data-center-v2/generated/INAKC_SCENARIO_REVIEW_V2.json";
import irakqPacket from "../../../docs/research/trait-map-data-center-v2/generated/IRAKQ_SCENARIO_REVIEW_V2.json";
import plan from "../../../docs/research/trait-map-data-center-v2/generated/REMAINING_PROFILE_PRODUCTION_PLAN_V2.json";

const parentPackets = new Map(
  [enakcPacket, enamqPacket, engkqPacket, erakqPacket, inakqPacket].map(
    (packet) => [packet.code, packet],
  ),
);
const cases = [
  { code: "IRAKQ", packet: irakqPacket },
  { code: "ERGKQ", packet: ergkqPacket },
  { code: "ENGMQ", packet: engmqPacket },
  { code: "ENAMC", packet: enakcMultiPacket },
  { code: "INAKC", packet: inakcPacket },
] as const;

describe("remaining profile batch 1 scenario packets v2", () => {
  it.each(cases)(
    "$code preserves the 72 × 4 research contract",
    ({ code, packet }) => {
      const profilePlan = plan.batches[0].profiles.find(
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
    "$code keeps non-overlap copy equal to the correct parent path",
    ({ code, packet }) => {
      const profilePlan = plan.batches[0].profiles.find(
        (profile) => profile.code === code,
      )!;
      const firstParent = parentPackets.get(profilePlan.primaryPath.parent)!;
      const secondParent = parentPackets.get(profilePlan.alternatePath.parent)!;
      const firstBySuffix = indexBySuffix(firstParent.claims);
      const secondBySuffix = indexBySuffix(secondParent.claims);
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

  it("limits hand-authored interaction copy to the four planned scenes", () => {
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
    expect(new Set(actual)).toEqual(
      new Set([
        "IRAKQ:SCN-FRIEND-2",
        "IRAKQ:SCN-GENERAL-2",
        "ENAMC:SCN-GENERAL-4",
        "INAKC:SCN-GENERAL-12",
      ]),
    );
  });
});

function indexBySuffix<T extends { claimId: string }>(claims: readonly T[]) {
  return new Map(claims.map((claim) => [getSuffix(claim.claimId), claim]));
}

function getSuffix(claimId: string) {
  return claimId.slice(claimId.indexOf("."));
}
