import type { z } from "zod";
import { ergmcFoundationClaimsV2 } from "@/features/nuang-code/ergmc-foundation-candidates-v2";
import { ingmcFoundationClaimsV2 } from "@/features/nuang-code/ingmc-foundation-candidates-v2";
import { iramcFoundationClaimsV2 } from "@/features/nuang-code/iramc-foundation-candidates-v2";
import { irgkcFoundationClaimsV2 } from "@/features/nuang-code/irgkc-foundation-candidates-v2";
import { irgmcFoundationClaimsV2 } from "@/features/nuang-code/irgmc-foundation-candidates-v2";
import { irgmqFoundationClaimsV2 } from "@/features/nuang-code/irgmq-foundation-candidates-v2";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const sourceClaims = [
  ...irgmcFoundationClaimsV2,
  ...ergmcFoundationClaimsV2,
  ...ingmcFoundationClaimsV2,
  ...iramcFoundationClaimsV2,
  ...irgkcFoundationClaimsV2,
  ...irgmqFoundationClaimsV2,
] as readonly TraitMapClaimV2[];

export const engmcFoundationClaimsV2 = buildFoundation(
  "ENGMC",
  "ENGMC는 사람들과 말하고 움직이며 새로운 가능성과 연결을 넓히고, 관계 문제에서는 원인과 해결할 부분을 먼저 살핀 뒤, 현재 조건에 맞춰 방법을 바꾸며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.",
);

export const inamcFoundationClaimsV2 = buildFoundation(
  "INAMC",
  "INAMC는 혼자 생각을 정리하며 새로운 가능성과 의미를 넓히고, 상대 마음과 관계에 남을 영향을 살핀 뒤, 현재의 흥미·마감·에너지·주변 도움에 맞춰 움직이며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.",
);

export const irakcFoundationClaimsV2 = buildFoundation(
  "IRAKC",
  "IRAKC는 혼자 생각을 정리하며 확인된 사실과 직접 경험에서 생각을 시작하고, 상대 마음과 관계에 남을 영향을 살핀 뒤, 정한 계획을 이어가며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.",
);

export const irgkqFoundationClaimsV2 = buildFoundation(
  "IRGKQ",
  "IRGKQ는 혼자 생각을 정리하며 확인된 사실과 직접 경험에서 원인과 해결할 부분을 찾고, 정한 계획을 이어가며, 불확실한 결과와 놓친 위험을 빠르게 알아차리는 조합으로 연구한다.",
);

export const ergmqFoundationClaimsV2 = buildFoundation(
  "ERGMQ",
  "ERGMQ는 사람들과 말하고 움직이며 확인된 사실과 직접 경험에서 원인과 해결할 부분을 찾고, 현재 조건에 맞춰 방법을 바꾸며, 불확실한 결과와 놓친 위험을 빠르게 알아차리는 조합으로 연구한다.",
);

function buildFoundation(code: string, profileAssertion: string) {
  const definitions = code.split("").map((symbol) => {
    const sourceClaim = sourceClaims.find((claim) =>
      claim.claimId.endsWith(`.definition.${symbol}`),
    );
    if (!sourceClaim) {
      throw new Error(`Missing foundation definition for ${code}/${symbol}`);
    }
    return {
      ...sourceClaim,
      claimId: `${code}.general.definition.${symbol}`,
      entity: { kind: "profile" as const, ref: code },
    } satisfies TraitMapClaimV2;
  });
  const sourceProfileClaim = irgmcFoundationClaimsV2.find(
    (claim) => claim.claimId === "IRGMC.general.profile.hypothesis",
  )!;
  return [
    ...definitions,
    {
      ...sourceProfileClaim,
      claimId: `${code}.general.profile.hypothesis`,
      entity: { kind: "profile" as const, ref: code },
      assertion: profileAssertion,
    },
  ] satisfies TraitMapClaimV2[];
}
