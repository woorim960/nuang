import type { z } from "zod";
import { enakcFoundationClaimsV2 } from "@/features/nuang-code/enakc-foundation-candidates-v2";
import { enakqFoundationClaimsV2 } from "@/features/nuang-code/enakq-foundation-candidates-v2";
import { enamqFoundationClaimsV2 } from "@/features/nuang-code/enamq-foundation-candidates-v2";
import { engkqFoundationClaimsV2 } from "@/features/nuang-code/engkq-foundation-candidates-v2";
import { erakqFoundationClaimsV2 } from "@/features/nuang-code/erakq-foundation-candidates-v2";
import { inakqFoundationClaimsV2 } from "@/features/nuang-code/inakq-foundation-candidates-v2";
import type { traitMapClaimV2Schema } from "@/features/nuang-code/trait-map-data-center-v2";

type TraitMapClaimV2 = z.infer<typeof traitMapClaimV2Schema>;

const sourceClaims = [
  ...enakqFoundationClaimsV2,
  ...inakqFoundationClaimsV2,
  ...erakqFoundationClaimsV2,
  ...engkqFoundationClaimsV2,
  ...enamqFoundationClaimsV2,
  ...enakcFoundationClaimsV2,
] as readonly TraitMapClaimV2[];

export const irakqFoundationClaimsV2 = buildFoundation(
  "IRAKQ",
  "IRAKQ는 혼자 생각을 정리한 뒤 확인된 사실과 직접 경험에서 생각을 시작하고, 상대 마음과 관계에 미칠 영향을 살핀 다음, 함께 정한 계획을 이어가며, 불확실한 상황의 위험과 걱정을 빠르게 알아차리는 조합으로 연구한다.",
);

export const ergkqFoundationClaimsV2 = buildFoundation(
  "ERGKQ",
  "ERGKQ는 사람들과 말하고 움직이며 에너지와 생각이 살아나고, 확인된 사실에서 원인과 해결할 부분을 찾은 뒤, 정한 순서와 완료 기준으로 실행을 이어가며, 놓칠 수 있는 위험과 걱정을 빠르게 알아차리는 조합으로 연구한다.",
);

export const engmqFoundationClaimsV2 = buildFoundation(
  "ENGMQ",
  "ENGMQ는 사람들과 연결되며 보이는 장면 너머의 가능성을 넓히고, 관계 문제의 원인과 해결할 부분을 먼저 살핀 뒤, 그날의 조건에 맞춰 움직이며, 불확실한 결과와 놓친 위험을 빠르게 알아차리는 조합으로 연구한다.",
);

export const enamcFoundationClaimsV2 = buildFoundation(
  "ENAMC",
  "ENAMC는 사람들과 연결되며 가능성을 넓히고, 상대 마음과 관계에 미칠 영향을 살핀 뒤, 그날의 흥미·마감·에너지·지원에 맞춰 움직이며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.",
);

export const inakcFoundationClaimsV2 = buildFoundation(
  "INAKC",
  "INAKC는 혼자 생각을 정리한 뒤 새로운 가능성과 연결을 넓히고, 상대 마음과 관계에 미칠 영향을 살핀 다음, 정한 계획을 이어가며, 부담스러운 상황에서도 감정이 비교적 천천히 커지는 조합으로 연구한다.",
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
  const sourceProfileClaim = enakqFoundationClaimsV2.find(
    (claim) => claim.claimId === "ENAKQ.general.profile.hypothesis",
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
