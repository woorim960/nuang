import type { z } from "zod";
import { irgmcFoundationClaimsV2 } from "@/features/nuang-code/irgmc-foundation-candidates-v2";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const aAssertion =
  "A는 관계에서 일이 생기면 상대가 어떤 마음일지, 그 경험이 관계에 어떤 흔적을 남길지에 주의가 먼저 가는 방향이다. 사람의 경험을 알아준 뒤 함께할 방법을 찾으려는 경향이 있다.";
const profileAssertion =
  "IRAMC는 혼자 생각을 정리한 뒤 확인된 사실을 바탕으로 상대 마음과 관계에 남을 영향을 살피고, 그날의 조건에 맞춰 움직이며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.";

export const iramcFoundationClaimsV2 = irgmcFoundationClaimsV2.map(
  (sourceClaim): TraitMapClaimV2 => ({
    ...sourceClaim,
    claimId: sourceClaim.claimId
      .replace(/^IRGMC\./, "IRAMC.")
      .replace(".definition.G", ".definition.A"),
    entity: { kind: "profile", ref: "IRAMC" },
    assertion:
      sourceClaim.claimId === "IRGMC.general.definition.G"
        ? aAssertion
        : sourceClaim.claimId === "IRGMC.general.profile.hypothesis"
          ? profileAssertion
          : sourceClaim.assertion,
  }),
);
