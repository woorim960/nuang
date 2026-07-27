import type { z } from "zod";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";

type EvidenceSource = z.infer<typeof traitMapEvidenceSourceSchema>;
type EvidenceFinding = z.infer<typeof traitMapEvidenceFindingSchema>;

export const traitMapFriendshipEvidenceSourcesV2 = [
  {
    sourceId: "SRC-FRIEND-SIMILARITY-2026",
    title:
      "Friends’ Personality Similarity and Its Association With Friendship Well-Being",
    authors: [
      "Hyewon Yang",
      "Atea Nelson",
      "Lisa Stuckman",
      "Grace Yancho",
      "Lindsay S. Ackerman",
      "M. Brent Donnellan",
      "William J. Chopik",
      "Richard E. Lucas",
    ],
    year: 2026,
    researchStream: "friendship",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1177/19485506261450240",
    url: "https://journals.sagepub.com/doi/10.1177/19485506261450240",
    languages: ["English"],
    countries: ["United States"],
    populationSummary: "친구 4인 집단 369개, 총 1,476명의 성격·우정 자료",
    sampleSize: 1476,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-FRIEND-DYAD-2023",
    title:
      "Personality Is Related to Satisfaction in Friendship Dyads, but Similarity Is Not: Understanding the Links Between the Big Five and Friendship Satisfaction Using Actor-Partner Interdependence Models",
    authors: ["Robert Körner", "Tobias Altmann"],
    year: 2023,
    researchStream: "friendship",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1016/j.jrp.2023.104436",
    url: "https://doi.org/10.1016/j.jrp.2023.104436",
    languages: ["German", "English_report"],
    countries: ["Germany"],
    populationSummary: "친구 190쌍의 Big Five와 우정 만족 자료",
    sampleSize: 380,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-FRIEND-DAILY-2015",
    title:
      "Personality and Friendship Satisfaction in Daily Life: Do Everyday Social Interactions Account for Individual Differences in Friendship Satisfaction?",
    authors: ["Robert E. Wilson", "Kelci Harris", "Simine Vazire"],
    year: 2015,
    researchStream: "friendship",
    sourceType: "experience_sampling_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1002/per.1996",
    url: "https://doi.org/10.1002/per.1996",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "학생 434명의 자기·친구 성격 보고와 일상 상호작용 경험표집 자료",
    sampleSize: 434,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
] as const satisfies readonly EvidenceSource[];

export const traitMapFriendshipEvidenceFindingsV2 = [
  {
    findingId: "FND-FRIEND-GROUP-SIMILARITY-NOT-SATISFACTION",
    sourceId: "SRC-FRIEND-SIMILARITY-2026",
    constructRefs: [
      "actual_personality_similarity",
      "perceived_personality_similarity",
      "friendship_satisfaction",
    ],
    contexts: ["friend"],
    direction: "null_finding",
    evidenceGrade: "C",
    populationSummary: "미국의 친구 4인 집단 369개, 총 1,476명",
    resultSummary:
      "대부분의 Big Five에서 실제 유사성은 나타났고 지각된 유사성은 더 컸지만, 모든 trait와 모형에서 성향 유사성이 우정 만족을 높인다는 효과는 확인되지 않았다.",
    limitations: [
      "2026년 단일 연구이며 후속 독립 재현이 필요하다.",
      "친구 4인 집단 자료를 모든 1:1 친구 관계에 적용하지 않는다.",
      "뉴앙 코드 유사성이나 한국 표본을 직접 검증하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_full_text_2026-07-23"],
  },
  {
    findingId: "FND-FRIEND-DYAD-SIMILARITY-NOT-SATISFACTION",
    sourceId: "SRC-FRIEND-DYAD-2023",
    constructRefs: [
      "actor_effect",
      "partner_effect",
      "partner_perception",
      "personality_similarity",
      "friendship_satisfaction",
    ],
    contexts: ["friend"],
    direction: "null_finding",
    evidenceGrade: "C",
    populationSummary: "독일의 친구 190쌍",
    resultSummary:
      "일부 actor·partner·상대 지각 효과는 나타났지만, trait별 유사성과 전체 성격 프로필 유사성은 우정 만족과 관련되지 않았다.",
    limitations: [
      "단일 국가·단일 연구의 Big Five 자료다.",
      "친구의 성향이 우정 만족을 직접 일으킨다는 인과 근거가 아니다.",
      "뉴앙 코드로 친구 만족도를 예측하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-FRIEND-DAILY-INTERACTION-QUALITY",
    sourceId: "SRC-FRIEND-DAILY-2015",
    constructRefs: [
      "friendship_satisfaction",
      "time_with_friends",
      "interaction_quality",
      "trait_personality",
    ],
    contexts: ["friend"],
    direction: "qualifies",
    evidenceGrade: "C",
    populationSummary: "미국 학생 434명의 친구 보고와 일상 경험표집",
    resultSummary:
      "친구와 보낸 시간과 대화 깊이·자기개방·감정 억제 감소 같은 상호작용의 질은 우정 만족과 관련됐지만, 성격과 만족의 관련을 설명하지는 못했다.",
    limitations: [
      "학생 표본의 관찰 자료로 인과 과정을 확정할 수 없다.",
      "연락·만남 횟수 하나를 관계의 깊이나 만족 점수로 바꿀 수 없다.",
      "ENAKQ의 친구 행동을 직접 검증하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_record_2026-07-23"],
  },
] as const satisfies readonly EvidenceFinding[];

export const traitMapFriendshipEvidenceV2 = {
  sources: traitMapFriendshipEvidenceSourcesV2,
  findings: traitMapFriendshipEvidenceFindingsV2,
} as const;
