import type { z } from "zod";
import { enakqFoundationClaimsV2 } from "@/features/nuang-code/enakq-foundation-candidates-v2";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const gAssertion =
  "G는 관계에서 문제가 생기면 어떤 일이 있었고 왜 생겼는지, 무엇을 바꾸면 풀리는지에 주의가 먼저 가는 방향이다. 상대 마음도 살피지만 생각의 출발점은 원인과 해결할 부분에 더 가깝다.";
const profileAssertion =
  "ENGKQ는 사람들과 연결되며 가능성을 넓히고, 관계 문제의 원인과 해결할 부분을 찾은 뒤 함께 정한 목표를 계획으로 이어가며, 놓칠 수 있는 위험과 걱정을 빠르게 알아차리는 조합으로 연구한다.";

export const engkqFoundationClaimsV2 = enakqFoundationClaimsV2.map(
  (sourceClaim): TraitMapClaimV2 => ({
    ...sourceClaim,
    claimId: sourceClaim.claimId
      .replace(/^ENAKQ\./, "ENGKQ.")
      .replace(".definition.A", ".definition.G"),
    entity: { kind: "profile", ref: "ENGKQ" },
    assertion:
      sourceClaim.claimId === "ENAKQ.general.definition.A"
        ? gAssertion
        : sourceClaim.claimId === "ENAKQ.general.profile.hypothesis"
          ? profileAssertion
          : sourceClaim.assertion,
  }),
);
