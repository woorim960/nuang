import type { z } from "zod";
import { enakqFoundationClaimsV2 } from "@/features/nuang-code/enakq-foundation-candidates-v2";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const cAssertion =
  "C는 불편한 일이 생겨도 걱정과 감정이 비교적 천천히 커지는 방향이다. 감정이 크게 올라오기 전 사실과 대응 방법을 살필 여유가 생기고, 겉으로도 차분한 반응이 이어지는 경향이 있다.";
const profileAssertion =
  "ENAKC는 사람들과 연결되며 가능성을 넓히고, 상대 마음과 관계에 미칠 영향을 살핀 뒤 함께 정한 목표를 계획으로 이어가며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.";

export const enakcFoundationClaimsV2 = enakqFoundationClaimsV2.map(
  (sourceClaim): TraitMapClaimV2 => ({
    ...sourceClaim,
    claimId: sourceClaim.claimId
      .replace(/^ENAKQ\./, "ENAKC.")
      .replace(".definition.Q", ".definition.C"),
    entity: { kind: "profile", ref: "ENAKC" },
    assertion:
      sourceClaim.claimId === "ENAKQ.general.definition.Q"
        ? cAssertion
        : sourceClaim.claimId === "ENAKQ.general.profile.hypothesis"
          ? profileAssertion
          : sourceClaim.assertion,
  }),
);
