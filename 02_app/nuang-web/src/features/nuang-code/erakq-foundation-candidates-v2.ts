import type { z } from "zod";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";
import { enakqFoundationClaimsV2 } from "@/features/nuang-code/enakq-foundation-candidates-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const rAssertion =
  "R은 이미 확인된 사실, 직접 겪은 경험, 지금 바로 적용할 수 있는 구체적인 정보에서 생각을 시작하는 방향이다. 가능성을 넓히기 전 현재 무엇을 알고 있는지와 실제로 쓸 수 있는지를 먼저 확인하는 경향이 있다.";
const profileAssertion =
  "ERAKQ는 사람들과 연결되며 확인된 사실과 직접 경험을 살피고, 상대와 관계에 미칠 영향을 확인한 뒤 함께 정한 목표를 계획으로 이어가며, 놓칠 수 있는 위험과 걱정을 빠르게 알아차리는 조합으로 연구한다.";

export const erakqFoundationClaimsV2 = enakqFoundationClaimsV2.map(
  (sourceClaim): TraitMapClaimV2 => ({
    ...sourceClaim,
    claimId: sourceClaim.claimId
      .replace(/^ENAKQ\./, "ERAKQ.")
      .replace(".definition.N", ".definition.R"),
    entity: { kind: "profile", ref: "ERAKQ" },
    assertion:
      sourceClaim.claimId === "ENAKQ.general.definition.N"
        ? rAssertion
        : sourceClaim.claimId === "ENAKQ.general.profile.hypothesis"
          ? profileAssertion
          : sourceClaim.assertion,
  }),
);
