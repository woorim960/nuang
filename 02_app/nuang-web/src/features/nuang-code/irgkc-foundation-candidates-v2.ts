import type { z } from "zod";
import { irgmcFoundationClaimsV2 } from "@/features/nuang-code/irgmc-foundation-candidates-v2";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const kAssertion =
  "K는 목표와 다음 순서가 정해지면 시작한 흐름을 이어가고, 약속한 일을 다시 확인해 마무리하려는 방향이다. 미리 정한 계획과 완료 기준으로 행동을 안정시키는 경향이 있다.";
const profileAssertion =
  "IRGKC는 혼자 생각을 정리한 뒤 확인된 사실에서 원인과 해결할 부분을 찾고, 미리 정한 순서와 완료 기준으로 실행을 이어가며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.";

export const irgkcFoundationClaimsV2 = irgmcFoundationClaimsV2.map(
  (sourceClaim): TraitMapClaimV2 => ({
    ...sourceClaim,
    claimId: sourceClaim.claimId
      .replace(/^IRGMC\./, "IRGKC.")
      .replace(".definition.M", ".definition.K"),
    entity: { kind: "profile", ref: "IRGKC" },
    assertion:
      sourceClaim.claimId === "IRGMC.general.definition.M"
        ? kAssertion
        : sourceClaim.claimId === "IRGMC.general.profile.hypothesis"
          ? profileAssertion
          : sourceClaim.assertion,
  }),
);
