import {
  getFreeTopicQuestions,
  openFreeTopicAssessments,
} from "@/features/assessment/free-topic-assessments";

export type AssessmentEvidenceId =
  | "E0_RESPONSE_QUALITY"
  | "E1_PRIMARY_SCALE"
  | "E2_SECONDARY_SCALE"
  | "E3_CONTEXT_CLUSTER"
  | "E4_APPROVED_COMBINATION"
  | "E5_REPEAT_CHANGE"
  | "E6_PRECISION_CODE"
  | "E7_PAIRED_SOCIAL_SCENE"
  | "E8_PLAY_CHOICE_DISTRIBUTION"
  | "E9_REVIEWED_KNOWLEDGE";

export type AssessmentQualityContract = {
  assessmentId: string;
  currentItemCount: number;
  intendedUse: "play" | "self_reflection" | "trait_estimation";
  longReport: {
    allowed: boolean;
    minimumCharacters: number;
    minimumItems: number;
    minimumItemsPerPersonalizedClaim: number;
    requiredEvidence: AssessmentEvidenceId[];
  };
  prohibitedClaims: string[];
  publicResultDepth: "none" | "short" | "long";
  releaseGate:
    | "play_ready"
    | "content_expansion_required"
    | "psychometric_validation_required";
};

const commonTraitProhibitions = [
  "정신건강 진단",
  "능력 또는 인격의 우열",
  "관계 성공 확률",
  "채용·금융·의료 판단",
] as const;

const topicQualityContracts = Object.fromEntries(
  openFreeTopicAssessments.map((assessment) => {
    const minimumItems = ["emotion", "relationship", "social_energy"].includes(
      assessment.categoryId,
    )
      ? 12
      : 9;
    const assessmentId = `topic:${assessment.slug}`;
    const currentItemCount = getFreeTopicQuestions(assessment.slug).length;
    const hasProfessionalContentDepth =
      currentItemCount >= minimumItems &&
      (assessment.reportScales?.length ?? 0) >= 3;

    return [
      assessmentId,
      {
        assessmentId,
        currentItemCount,
        intendedUse: "self_reflection",
        longReport: {
          allowed: hasProfessionalContentDepth,
          minimumCharacters: 2_000,
          minimumItems,
          minimumItemsPerPersonalizedClaim: 3,
          requiredEvidence: [
            "E0_RESPONSE_QUALITY",
            "E1_PRIMARY_SCALE",
            "E2_SECONDARY_SCALE",
            "E3_CONTEXT_CLUSTER",
          ],
        },
        prohibitedClaims: [
          ...commonTraitProhibitions,
          "대표 뉴앙 코드 변경",
          "한두 문항으로 관계 행동 단정",
        ],
        publicResultDepth: hasProfessionalContentDepth ? "long" : "short",
        releaseGate: hasProfessionalContentDepth
          ? "psychometric_validation_required"
          : "content_expansion_required",
      } satisfies AssessmentQualityContract,
    ];
  }),
) as Record<string, AssessmentQualityContract>;

export const assessmentQualityContracts: Readonly<
  Record<string, AssessmentQualityContract>
> = {
  "nu-core-quick": {
    assessmentId: "nu-core-quick",
    currentItemCount: 22,
    intendedUse: "self_reflection",
    longReport: {
      allowed: false,
      minimumCharacters: 2_000,
      minimumItems: 22,
      minimumItemsPerPersonalizedClaim: 3,
      requiredEvidence: ["E0_RESPONSE_QUALITY", "E1_PRIMARY_SCALE"],
    },
    prohibitedClaims: [
      ...commonTraitProhibitions,
      "가족·연인·업무에서의 구체 행동 단정",
      "정밀 코드로서 비교 기준에 사용",
    ],
    publicResultDepth: "short",
    releaseGate: "psychometric_validation_required",
  },
  "nu-core-full": {
    assessmentId: "nu-core-full",
    currentItemCount: 60,
    intendedUse: "trait_estimation",
    longReport: {
      allowed: true,
      minimumCharacters: 2_000,
      minimumItems: 60,
      minimumItemsPerPersonalizedClaim: 3,
      requiredEvidence: [
        "E0_RESPONSE_QUALITY",
        "E1_PRIMARY_SCALE",
        "E2_SECONDARY_SCALE",
        "E3_CONTEXT_CLUSTER",
        "E6_PRECISION_CODE",
        "E9_REVIEWED_KNOWLEDGE",
      ],
    },
    prohibitedClaims: [...commonTraitProhibitions],
    publicResultDepth: "long",
    releaseGate: "psychometric_validation_required",
  },
  "lab:conversation-temperature": makeLabContract(
    "lab:conversation-temperature",
    6,
    12,
  ),
  "lab:recharge-ritual": makeLabContract("lab:recharge-ritual", 6, 9),
  "lab:conflict-repair": makeLabContract("lab:conflict-repair", 6, 12),
  "together:friend-match": {
    assessmentId: "together:friend-match",
    currentItemCount: 1,
    intendedUse: "play",
    longReport: {
      allowed: false,
      minimumCharacters: 2_000,
      minimumItems: 6,
      minimumItemsPerPersonalizedClaim: 2,
      requiredEvidence: ["E7_PAIRED_SOCIAL_SCENE"],
    },
    prohibitedClaims: [
      "친구를 잘 안다는 능력 점수",
      "관계 친밀도 또는 궁합 점수",
      "상대의 뉴앙 코드 추정",
    ],
    publicResultDepth: "none",
    releaseGate: "play_ready",
  },
  "together:balance-game": {
    assessmentId: "together:balance-game",
    currentItemCount: 312,
    intendedUse: "play",
    longReport: {
      allowed: false,
      minimumCharacters: 2_000,
      minimumItems: 8,
      minimumItemsPerPersonalizedClaim: 2,
      requiredEvidence: ["E8_PLAY_CHOICE_DISTRIBUTION"],
    },
    prohibitedClaims: [
      "관계의 성공 가능성 또는 친밀도 판정",
      "이상형 취향 유사도를 연애 궁합으로 해석",
      "놀이 점수를 성격·능력·인격의 우열로 해석",
      "뉴앙 코드 또는 성향지도 변경",
    ],
    publicResultDepth: "short",
    releaseGate: "play_ready",
  },
  ...topicQualityContracts,
};

export function isLongReportStructurallyEligible(
  contract: AssessmentQualityContract,
) {
  return (
    contract.longReport.allowed &&
    contract.currentItemCount >= contract.longReport.minimumItems &&
    contract.longReport.requiredEvidence.length >= 3
  );
}

function makeLabContract(
  assessmentId: string,
  currentItemCount: number,
  minimumItems: number,
): AssessmentQualityContract {
  return {
    assessmentId,
    currentItemCount,
    intendedUse: "play",
    longReport: {
      allowed: false,
      minimumCharacters: 2_000,
      minimumItems,
      minimumItemsPerPersonalizedClaim: 3,
      requiredEvidence: ["E3_CONTEXT_CLUSTER", "E8_PLAY_CHOICE_DISTRIBUTION"],
    },
    prohibitedClaims: [
      ...commonTraitProhibitions,
      "뉴앙 코드 또는 성향지도 변경",
    ],
    publicResultDepth: "short",
    releaseGate: "play_ready",
  };
}
