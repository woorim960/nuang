import type { z } from "zod";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";
import { irgmcNeighborContrastClaimsV2 } from "@/features/nuang-code/irgmc-neighbor-contrast-candidates-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const sourceNeighborMap = {
  INGMC: "ENGMC",
  IRAMC: "ERAMC",
  IRGKC: "ERGKC",
  IRGMQ: "ERGMQ",
} as const;

const eiAssertions = {
  definition:
    "ERGMC와 IRGMC의 차이는 사람을 좋아하는 정도가 아니라 에너지가 돌아오고 생각이 정리되는 기본 방향이다. ERGMC는 사람들과 말하고 움직이는 과정에서 생각이 살아나고, IRGMC는 혼자 정리한 뒤 대화로 들어가는 쪽에 가깝다.",
  attention:
    "낯선 모임에서 ERGMC는 말을 걸고 반응을 주고받으면서 자신의 역할과 다음 행동을 찾는 편이고, IRGMC는 먼저 흐름과 역할을 살핀 뒤 필요한 순간에 말하는 편이다.",
  response:
    "중요한 대화가 끝난 뒤 ERGMC는 상대와 이야기를 이어가며 의미와 다음 행동을 바로 맞추는 편이고, IRGMC는 혼자 되짚고 정리한 다음 필요한 후속 연락을 하는 편이다.",
  guide:
    "E와 I를 구분할 때는 말이 많았는지만 보지 않고, 사람들과 함께한 뒤와 혼자 있은 뒤 어디에서 에너지가 돌아왔는지, 생각이 대화 중과 대화 전후 어느 때 선명해졌는지를 함께 묻는다.",
} as const;

const eiClaims = irgmcNeighborContrastClaimsV2
  .filter((claim) => claim.entity.ref === "IRGMC<>ERGMC")
  .map((claim) => {
    const suffix = claim.claimId.split(".").at(-1);
    return {
      ...claim,
      claimId: `ERGMC.neighbor.IRGMC.${suffix}`,
      entity: { kind: "interaction" as const, ref: "ERGMC<>IRGMC" },
      assertion: eiAssertions[suffix as keyof typeof eiAssertions],
    };
  });

const sharedAxisClaims = Object.entries(sourceNeighborMap).flatMap(
  ([sourceNeighbor, targetNeighbor]) =>
    irgmcNeighborContrastClaimsV2
      .filter(
        (claim) => claim.entity.ref === `IRGMC<>${sourceNeighbor}`,
      )
      .map((claim) => ({
        ...claim,
        claimId: claim.claimId
          .replace("IRGMC.neighbor.", "ERGMC.neighbor.")
          .replace(sourceNeighbor, targetNeighbor),
        entity: {
          kind: "interaction" as const,
          ref: `ERGMC<>${targetNeighbor}`,
        },
        assertion: claim.assertion
          .replaceAll("IRGMC", "ERGMC")
          .replaceAll(sourceNeighbor, targetNeighbor),
      })),
);

export const ergmcNeighborContrastClaimsV2 = [
  ...eiClaims,
  ...sharedAxisClaims,
] satisfies TraitMapClaimV2[];

export const ergmcNeighborReviewQueueV2 = [
  {
    code: "IRGMC",
    changedAxis: "SE_energy_and_expression",
    changedLetters: "E↔I",
  },
  {
    code: "ENGMC",
    changedAxis: "OE_exploration_and_interest",
    changedLetters: "R↔N",
  },
  {
    code: "ERAMC",
    changedAxis: "RO_relational_attention",
    changedLetters: "G↔A",
  },
  {
    code: "ERGKC",
    changedAxis: "SM_execution_and_structure",
    changedLetters: "M↔K",
  },
  {
    code: "ERGMQ",
    changedAxis: "ER_emotional_activation_and_worry",
    changedLetters: "C↔Q",
  },
] as const;
