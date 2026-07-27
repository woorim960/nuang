import type { z } from "zod";
import { enakqFoundationClaimsV2 } from "@/features/nuang-code/enakq-foundation-candidates-v2";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const mAssertion =
  "M은 일을 시작하고 이어가는 흐름이 현재의 흥미, 마감, 에너지, 주변 도움 같은 상황 조건에 더 민감한 방향이다. 조건이 맞을 때 집중이 빠르게 올라가고, 조건이 달라지면 실행 방식도 함께 바뀌는 경향이 있다.";
const profileAssertion =
  "ENAMQ는 사람들과 연결되며 가능성을 넓히고, 상대 마음과 관계에 미칠 영향을 살핀 뒤 그날의 조건에 맞춰 움직이며, 놓칠 수 있는 위험과 걱정을 빠르게 알아차리는 조합으로 연구한다.";

export const enamqFoundationClaimsV2 = enakqFoundationClaimsV2.map(
  (sourceClaim): TraitMapClaimV2 => ({
    ...sourceClaim,
    claimId: sourceClaim.claimId
      .replace(/^ENAKQ\./, "ENAMQ.")
      .replace(".definition.K", ".definition.M"),
    entity: { kind: "profile", ref: "ENAMQ" },
    assertion:
      sourceClaim.claimId === "ENAKQ.general.definition.K"
        ? mAssertion
        : sourceClaim.claimId === "ENAKQ.general.profile.hypothesis"
          ? profileAssertion
          : sourceClaim.assertion,
  }),
);
