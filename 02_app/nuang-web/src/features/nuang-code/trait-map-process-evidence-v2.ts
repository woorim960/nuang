import type { z } from "zod";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";

type EvidenceSource = z.infer<typeof traitMapEvidenceSourceSchema>;
type EvidenceFinding = z.infer<typeof traitMapEvidenceFindingSchema>;

export const traitMapProcessEvidenceSourcesV2 = [
  {
    sourceId: "SRC-SITUATION-CONTINGENCY-2007",
    title:
      "Situation-Based Contingencies Underlying Trait-Content Manifestation in Behavior",
    authors: ["William Fleeson"],
    year: 2007,
    researchStream: "person_situation_process",
    sourceType: "experience_sampling_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1111/j.1467-6494.2007.00458.x",
    url: "https://doi.org/10.1111/j.1467-6494.2007.00458.x",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "두 연구에서 2주 또는 5주 동안 하루 여러 차례 성향 상태와 동시 상황 특성을 보고한 표본",
    sampleSize: null,
    screeningStatus: "included",
    quality: {
      directness: "partial",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "multiple_samples",
    },
  },
  {
    sourceId: "SRC-REALTIME-PERSON-SITUATION-2015",
    title:
      "The Independent Effects of Personality and Situations on Real-Time Expressions of Behavior and Emotion",
    authors: [
      "Ryne A. Sherman",
      "John F. Rauthmann",
      "Nicolas A. Brown",
      "David G. Serfass",
      "Ashley Bell Jones",
    ],
    year: 2015,
    researchStream: "person_situation_process",
    sourceType: "experience_sampling_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/pspp0000036",
    url: "https://pubmed.ncbi.nlm.nih.gov/25915131/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "성격·상황 특성과 실시간 행동·정서 표현을 함께 반복 측정한 참여자 210명",
    sampleSize: 210,
    screeningStatus: "included",
    quality: {
      directness: "partial",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-TRAIT-ENACTMENT-2015",
    title:
      "Trait Enactments as Density Distributions: The Role of Actors, Situations, and Observers in Explaining Stability and Variability",
    authors: ["William Fleeson", "Mary Kate Law"],
    year: 2015,
    researchStream: "person_situation_process",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/a0039517",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4673017/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "통제된 반복 상호작용에 참여한 대상자 97명과 관찰자 183명의 성향 행동 자료",
    sampleSize: 280,
    screeningStatus: "included",
    quality: {
      directness: "partial",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "multiple_samples",
    },
  },
  {
    sourceId: "SRC-INTENTION-BEHAVIOR-2016",
    title: "The Intention–Behavior Gap",
    authors: ["Paschal Sheeran", "Thomas L. Webb"],
    year: 2016,
    researchStream: "person_situation_process",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1111/spc3.12265",
    url: "https://eprints.whiterose.ac.uk/id/eprint/107519/",
    languages: ["English"],
    countries: ["international_review"],
    populationSummary:
      "의도와 행동의 관계, 방해 조건, 행동으로 옮기는 전략을 종합한 동료평가 검토 논문",
    sampleSize: null,
    screeningStatus: "included",
    quality: {
      directness: "method_only",
      riskOfBias: "some_concerns",
      culturalFit: "method_only",
      replication: "not_applicable",
    },
  },
  {
    sourceId: "SRC-SOKA-2010",
    title:
      "Who Knows What About a Person? The Self–Other Knowledge Asymmetry Model",
    authors: ["Simine Vazire"],
    year: 2010,
    researchStream: "measurement_and_validity",
    sourceType: "measurement_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/a0017908",
    url: "https://pubmed.ncbi.nlm.nih.gov/20085401/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "본인 평가와 친구 4명·낯선 사람 최대 4명의 평가, 행동 준거를 비교한 참여자 165명",
    sampleSize: 165,
    screeningStatus: "included",
    quality: {
      directness: "partial",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-SELF-KNOWLEDGE-2010",
    title: "Self-Knowledge of Personality: Do People Know Themselves?",
    authors: ["Simine Vazire", "Erika N. Carlson"],
    year: 2010,
    researchStream: "measurement_and_validity",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1111/j.1751-9004.2010.00280.x",
    url: "https://doi.org/10.1111/j.1751-9004.2010.00280.x",
    languages: ["English"],
    countries: ["international_review"],
    populationSummary:
      "자기 성격 지각의 정확성을 객관 준거·타인 지각·메타지각의 세 흐름으로 검토한 논문",
    sampleSize: null,
    screeningStatus: "included",
    quality: {
      directness: "method_only",
      riskOfBias: "some_concerns",
      culturalFit: "method_only",
      replication: "not_applicable",
    },
  },
  {
    sourceId: "SRC-PERSONAL-VALIDATION-1949",
    title:
      "The Fallacy of Personal Validation: A Classroom Demonstration of Gullibility",
    authors: ["Bertram R. Forer"],
    year: 1949,
    researchStream: "measurement_and_validity",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/h0059240",
    url: "https://pubmed.ncbi.nlm.nih.gov/18110193/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "모든 참여자에게 같은 일반적 성격 설명을 제시한 고전적 교실 시연",
    sampleSize: null,
    screeningStatus: "included",
    quality: {
      directness: "method_only",
      riskOfBias: "high",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
] as const satisfies readonly EvidenceSource[];

export const traitMapProcessEvidenceFindingsV2 = [
  {
    findingId: "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    sourceId: "SRC-SITUATION-CONTINGENCY-2007",
    constructRefs: [
      "situation_characteristics",
      "trait_state_contingency",
      "within_person_variability",
    ],
    contexts: ["general", "family", "friend", "partner", "work"],
    direction: "supports",
    evidenceGrade: "B",
    populationSummary: "두 경험표집 연구의 반복 일상 보고 표본",
    resultSummary:
      "성향 관련 행동은 심리적으로 의미 있는 상황 특성과 함께 달라졌고, 같은 상황 특성에 반응하는 방식에서도 개인차가 나타났다.",
    limitations: [
      "뉴앙 72개 상황이나 ENAKQ의 상황별 행동을 직접 검증하지 않는다.",
      "상황이 행동의 유일한 원인이라는 뜻이 아니다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-PERSON-SITUATION-INDEPENDENT-REALTIME",
    sourceId: "SRC-REALTIME-PERSON-SITUATION-2015",
    constructRefs: [
      "personality_traits",
      "situation_characteristics",
      "real_time_behavior",
      "real_time_emotion",
    ],
    contexts: ["general"],
    direction: "supports",
    evidenceGrade: "B",
    populationSummary: "실시간 행동·정서와 상황을 반복 보고한 참여자 210명",
    resultSummary:
      "성격 특성과 상황 특성은 실시간 행동과 정서 표현을 각각 독립적으로 예측하는 가법 모형을 지지했다.",
    limitations: [
      "상관 설계 결과를 특정 사용자의 원인 과정으로 바꿀 수 없다.",
      "뉴앙 조합이나 한국어 문항을 직접 검증하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["pubmed_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-TRAIT-ENACTMENT-STABILITY-AND-VARIABILITY",
    sourceId: "SRC-TRAIT-ENACTMENT-2015",
    constructRefs: [
      "trait_enactment",
      "observer_report",
      "within_person_variability",
      "between_person_stability",
    ],
    contexts: ["general"],
    direction: "supports",
    evidenceGrade: "B",
    populationSummary:
      "20회 안팎의 통제된 상호작용에 참여한 대상자 97명과 관찰자 183명",
    resultSummary:
      "관찰된 성향 행동은 한 사람 안에서 크게 달라졌지만, 반복 장면을 합친 평균에서는 사람 사이의 안정적인 차이도 나타났다.",
    limitations: [
      "통제된 상호작용의 Big Five 행동 자료이며 뉴앙 5축의 직접 검증이 아니다.",
      "한 번의 행동만으로 대표 성향을 판정할 수 있다는 뜻이 아니다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["primary_full_text_2026-07-23"],
  },
  {
    findingId: "FND-INTENTION-BEHAVIOR-SEPARATION",
    sourceId: "SRC-INTENTION-BEHAVIOR-2016",
    constructRefs: ["behavioral_intention", "actual_behavior", "action_barriers"],
    contexts: ["general"],
    direction: "qualifies",
    evidenceGrade: "B",
    populationSummary: "의도-행동 관계 연구를 종합한 검토 논문",
    resultSummary:
      "사람이 하려는 마음을 가졌다고 해서 언제나 실제 행동으로 이어지는 것은 아니며, 행동으로 옮기는 과정에는 여러 조건이 관여한다.",
    limitations: [
      "뉴앙의 '처음 드는 생각'은 행동 의도와 같은 구성개념이 아니다.",
      "G/A나 다른 뉴앙 방향의 직접 근거로 사용하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["repository_and_publisher_record_2026-07-23"],
  },
  {
    findingId: "FND-SELF-OTHER-KNOWLEDGE-ASYMMETRY",
    sourceId: "SRC-SOKA-2010",
    constructRefs: [
      "self_report",
      "informant_report",
      "observability",
      "evaluativeness",
    ],
    contexts: ["general", "friend"],
    direction: "supports",
    evidenceGrade: "C",
    populationSummary:
      "본인·친구·낯선 사람 평가와 행동 준거를 비교한 참여자 165명",
    resultSummary:
      "성향의 관찰 가능성과 평가 민감도에 따라 본인과 타인이 상대적으로 더 정확하게 알 수 있는 정보가 달랐다.",
    limitations: [
      "타인이 언제나 본인보다 정확하거나 그 반대라는 결론이 아니다.",
      "뉴앙의 공개 프로필이나 비교 기능에 타인 평가를 의무화하는 근거가 아니다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["primary_article_abstract_and_pdf_2026-07-23"],
  },
  {
    findingId: "FND-SELF-KNOWLEDGE-PARTIAL",
    sourceId: "SRC-SELF-KNOWLEDGE-2010",
    constructRefs: [
      "self_perception_accuracy",
      "informant_agreement",
      "metaperception",
    ],
    contexts: ["general"],
    direction: "qualifies",
    evidenceGrade: "B",
    populationSummary: "자기 성격 지각 정확성에 관한 세 연구 흐름의 검토",
    resultSummary:
      "자기 성격 지각은 실제 행동과 타인 지각에 어느 정도 연결되지만 완전하지 않고, 타인이 자신을 어떻게 보는지에 대한 이해에도 빈틈이 있었다.",
    limitations: [
      "특정 개인의 자기통찰 수준을 판정하는 근거가 아니다.",
      "자기보고를 무가치하게 만들거나 타인 평가를 절대화하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_record_and_full_text_2026-07-23"],
  },
  {
    findingId: "FND-PERSONAL-VALIDATION-COPY-RISK",
    sourceId: "SRC-PERSONAL-VALIDATION-1949",
    constructRefs: [
      "personal_validation",
      "generic_personality_feedback",
      "subjective_accuracy",
    ],
    contexts: ["general"],
    direction: "qualifies",
    evidenceGrade: "C",
    populationSummary: "같은 일반적 성격 설명을 받은 고전적 교실 시연",
    resultSummary:
      "여러 사람에게 똑같이 적용할 수 있는 일반적인 성격 설명도 개인에게 정확한 설명처럼 받아들여질 수 있음을 보여줬다.",
    limitations: [
      "1949년의 작은 교실 시연으로 현대 성향 서비스 전체를 평가하지 않는다.",
      "사용자의 자기일치감이 모두 착각이라는 뜻이 아니다.",
      "현대 표본·한국어 문구에서 재검증이 필요하다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["pubmed_primary_record_and_legacy_paper_2026-07-23"],
  },
] as const satisfies readonly EvidenceFinding[];

export const traitMapProcessEvidenceV2 = {
  sources: traitMapProcessEvidenceSourcesV2,
  findings: traitMapProcessEvidenceFindingsV2,
} as const;
