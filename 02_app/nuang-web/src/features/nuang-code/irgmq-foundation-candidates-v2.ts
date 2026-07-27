import type { z } from "zod";
import { irgmcFoundationClaimsV2 } from "@/features/nuang-code/irgmc-foundation-candidates-v2";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const qAssertion =
  "Q는 결과가 불확실하거나 관계에 이상 신호가 보일 때 걱정과 불편한 감정이 비교적 빠르게 올라오는 방향이다. 놓치면 안 될 위험과 사람에게 미칠 영향을 일찍 알아차려 대비하려는 경향이 있다.";
const profileAssertion =
  "IRGMQ는 혼자 생각을 정리한 뒤 확인된 사실에서 원인과 해결할 부분을 찾고, 그날의 조건에 맞춰 움직이며, 불확실한 결과와 놓칠 수 있는 위험을 빠르게 알아차리는 조합으로 연구한다.";

export const irgmqFoundationClaimsV2 = irgmcFoundationClaimsV2.map(
  (sourceClaim): TraitMapClaimV2 => ({
    ...sourceClaim,
    claimId: sourceClaim.claimId
      .replace(/^IRGMC\./, "IRGMQ.")
      .replace(".definition.C", ".definition.Q"),
    entity: { kind: "profile", ref: "IRGMQ" },
    assertion:
      sourceClaim.claimId === "IRGMC.general.definition.C"
        ? qAssertion
        : sourceClaim.claimId === "IRGMC.general.profile.hypothesis"
          ? profileAssertion
          : sourceClaim.assertion,
  }),
);
