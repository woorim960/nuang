import type { z } from "zod";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";
import { irgmcFoundationClaimsV2 } from "@/features/nuang-code/irgmc-foundation-candidates-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const nAssertion =
  "N은 지금 보이는 사실에서 멈추지 않고 앞으로 펼쳐질 가능성, 숨어 있는 의미, 서로 다른 생각의 연결을 먼저 살피는 방향이다. 하나의 답보다 여러 관점을 탐색할 때 생각이 넓어지는 경향이 있다.";
const profileAssertion =
  "INGMC는 혼자 생각을 정리하며 아직 드러나지 않은 가능성과 연결을 넓히고, 원인과 해결할 부분을 찾아 그날의 조건에 맞춰 움직이며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.";

export const ingmcFoundationClaimsV2 = irgmcFoundationClaimsV2.map(
  (sourceClaim): TraitMapClaimV2 => ({
    ...sourceClaim,
    claimId: sourceClaim.claimId
      .replace(/^IRGMC\./, "INGMC.")
      .replace(".definition.R", ".definition.N"),
    entity: { kind: "profile", ref: "INGMC" },
    assertion:
      sourceClaim.claimId === "IRGMC.general.definition.R"
        ? nAssertion
        : sourceClaim.claimId === "IRGMC.general.profile.hypothesis"
          ? profileAssertion
          : sourceClaim.assertion,
  }),
);
