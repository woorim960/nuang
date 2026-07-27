import type { z } from "zod";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";

type EvidenceSource = z.infer<typeof traitMapEvidenceSourceSchema>;
type EvidenceFinding = z.infer<typeof traitMapEvidenceFindingSchema>;

export const traitMapRelationshipEvidenceSourcesV2 = [
  {
    sourceId: "SRC-ROMANTIC-SIMILARITY-2023",
    title:
      "Trait and Facet Personality Similarity and Relationship and Life Satisfaction in Romantic Couples",
    authors: [
      "Rebekka Weidmann",
      "Mariah F. Purol",
      "Alisar Alabdullah",
      "Sophia M. Ryan",
      "Ethan G. Wright",
      "Jeewon Oh",
      "William J. Chopik",
    ],
    year: 2023,
    researchStream: "romantic_relationships",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1016/j.jrp.2023.104378",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10312100/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "여성-남성 연인 1,294쌍의 Big Five trait·facet과 관계·삶 만족 자료",
    sampleSize: 2588,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-INITIAL-ATTRACTION-2023",
    title:
      "Is (Actual or Perceptual) Personality Similarity Associated With Attraction in Initial Romantic Encounters? A Dyadic Response Surface Analysis",
    authors: [
      "Sarah Humberg",
      "Tanja M. Gerlach",
      "Theresa Franke-Prasse",
      "Katharina Geukes",
      "Mitja D. Back",
    ],
    year: 2023,
    researchStream: "romantic_relationships",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.5964/ps.7551",
    url: "https://doi.org/10.5964/ps.7551",
    languages: ["German", "English_report"],
    countries: ["Germany"],
    populationSummary:
      "18~28세 이성애 독신자 397명이 참여한 실제 3분 스피드데이트 940건",
    sampleSize: 397,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-RELATIONAL-UNCERTAINTY-2011",
    title:
      "Relational Uncertainty and Relationship Talk within Courtship: A Longitudinal Actor–Partner Interdependence Model",
    authors: ["Leanne K. Knobloch", "Jennifer A. Theiss"],
    year: 2011,
    researchStream: "romantic_relationships",
    sourceType: "longitudinal_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1080/03637751.2010.542471",
    url: "https://www.tandfonline.com/doi/abs/10.1080/03637751.2010.542471",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "연인 135쌍이 6주 동안 매주 응답한 관계 불확실성과 관계 대화 자료",
    sampleSize: 270,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-SUPPORT-MATCHING-2007",
    title: "Optimally Matching Support and Perceived Spousal Sensitivity",
    authors: [
      "Carolyn E. Cutrona",
      "Philip A. Shaffer",
      "Kristin A. Wesner",
      "Kelli A. Gardner",
    ],
    year: 2007,
    researchStream: "romantic_relationships",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/0893-3200.21.4.754",
    url: "https://pubmed.ncbi.nlm.nih.gov/18179347/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "부부 59쌍이 영상 자기공개 과제에 참여한 지원 일치와 상대 민감성 자료",
    sampleSize: 118,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    // 기존 원장의 sourceId는 추적 호환을 위해 유지하되, 실제 발행 연도와 DOI를 저장한다.
    sourceId: "SRC-RESPONSIVENESS-2017",
    title:
      "Does Partner Responsiveness Predict Hedonic and Eudaimonic Well-Being? A 10-Year Longitudinal Study",
    authors: [
      "Emre Selcuk",
      "Gul Gunaydin",
      "Anthony D. Ong",
      "David M. Almeida",
    ],
    year: 2016,
    researchStream: "romantic_relationships",
    sourceType: "longitudinal_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1111/jomf.12272",
    url: "https://pubmed.ncbi.nlm.nih.gov/28592909/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "미국의 혼인 성인 2,000명 이상을 약 10년 동안 추적한 상대 반응성과 웰빙 자료",
    sampleSize: null,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-REACTIVITY-RECOVERY-2023",
    title:
      "Is Daily-Life Stress Reactivity a Measure of Stress Recovery? An Investigation of Laboratory and Daily-Life Stress",
    authors: [
      "Joana De Calheiros Velozo",
      "Thomas Vaessen",
      "Ginette Lafit",
      "Stephan Claes",
      "Inez Myin-Germeys",
    ],
    year: 2023,
    researchStream: "emotion_stress_recovery",
    sourceType: "experience_sampling_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1002/smi.3213",
    url: "https://pubmed.ncbi.nlm.nih.gov/36521434/",
    languages: ["Dutch", "English_report"],
    countries: ["Belgium"],
    populationSummary:
      "19~35세 건강한 성인 53명의 실험실 스트레스 과제와 8일 경험표집 자료",
    sampleSize: 53,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-RESPONSIVENESS-STRESS-2021",
    title:
      "Perceptions of Partner Responsiveness Across the Transition to Parenthood",
    authors: [
      "Dave Smallen",
      "Jami Eller",
      "W. Steven Rholes",
      "Jeffry A. Simpson",
    ],
    year: 2021,
    researchStream: "romantic_relationships",
    sourceType: "longitudinal_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/fam0000907",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC8825924/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "첫 자녀를 기다리던 부부·동거 커플 192쌍을 출산 전부터 2년간 추적한 자료",
    sampleSize: 384,
    screeningStatus: "excluded",
    exclusionReason:
      "2025년 철회된 논문이므로 모든 claim과 고객 문구의 근거에서 제외한다.",
    quality: {
      directness: "indirect",
      riskOfBias: "high",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
] as const satisfies readonly EvidenceSource[];

export const traitMapRelationshipEvidenceFindingsV2 = [
  {
    findingId: "FND-ROMANTIC-SIMILARITY-NOT-ROBUST",
    sourceId: "SRC-ROMANTIC-SIMILARITY-2023",
    constructRefs: [
      "personality_similarity",
      "relationship_satisfaction",
      "life_satisfaction",
    ],
    contexts: ["partner"],
    direction: "null_finding",
    evidenceGrade: "B",
    populationSummary: "미국의 여성-남성 연인 1,294쌍",
    resultSummary:
      "Big Five trait와 facet의 유사성은 두 파트너의 관계 만족이나 삶 만족과 강건하게 관련되지 않았다.",
    limitations: [
      "뉴앙 5축이나 32개 코드의 직접 비교 연구가 아니다.",
      "유사성 외의 actor·partner 효과나 구체적 상호작용을 부정하지 않는다.",
      "미국 여성-남성 커플 표본 결과를 모든 관계와 문화에 일반화하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["primary_full_text_and_pubmed_2026-07-23"],
  },
  {
    findingId: "FND-INITIAL-ATTRACTION-SIMILARITY-NULL",
    sourceId: "SRC-INITIAL-ATTRACTION-2023",
    constructRefs: [
      "actual_personality_similarity",
      "perceived_personality_similarity",
      "initial_romantic_attraction",
    ],
    contexts: ["person_of_interest"],
    direction: "null_finding",
    evidenceGrade: "C",
    populationSummary:
      "독일의 18~28세 이성애 독신자 397명, 실제 3분 스피드데이트 940건",
    resultSummary:
      "이 첫 만남 표본에서는 Big Five의 실제 유사성과 지각된 유사성 모두 초기 호감과 관련되지 않았다.",
    limitations: [
      "짧은 스피드데이트와 젊은 이성애 표본에 한정된다.",
      "장기 관계, 다양한 성별·성적 지향, 한국 문화에 같은 결과를 가정하지 않는다.",
      "성향 전체가 호감과 무관하다는 뜻이 아니다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["primary_full_text_2026-07-23"],
  },
  {
    findingId: "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
    sourceId: "SRC-RELATIONAL-UNCERTAINTY-2011",
    constructRefs: [
      "relational_uncertainty",
      "relationship_talk",
      "threat_appraisal",
      "avoidance",
    ],
    contexts: ["partner"],
    direction: "supports",
    evidenceGrade: "C",
    populationSummary: "미국 연인 135쌍의 6주 주간 반복 측정",
    resultSummary:
      "관계 불확실성이 높을 때 관계 대화를 더 위협적으로 보고 회피하거나 덜 나누는 경향이 있었고, 대화를 피한 다음 주에는 불확실성이 더 높게 보고되는 연결도 나타났다.",
    limitations: [
      "이미 교제 중인 커플 자료로 첫 호감 단계에 직접 적용할 수 없다.",
      "대화를 하면 관계가 좋아진다는 처방이나 인과 확정이 아니다.",
      "한 사람의 대표 코드만으로 두 사람 사이의 불확실성을 설명할 수 없다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["primary_article_abstract_and_pdf_2026-07-23"],
  },
  {
    findingId: "FND-SUPPORT-MATCHING-CONTEXT",
    sourceId: "SRC-SUPPORT-MATCHING-2007",
    constructRefs: [
      "support_goal",
      "support_type",
      "perceived_partner_sensitivity",
    ],
    contexts: ["partner"],
    direction: "qualifies",
    evidenceGrade: "C",
    populationSummary: "미국 부부 59쌍의 영상 자기공개 과제",
    resultSummary:
      "감정을 털어놓은 뒤 정서적 지원이 이어진 경우 상대 민감성 지각을 예측했지만, 정보 요청 뒤 정보 지원에서는 같은 결과가 나타나지 않아 지원 일치는 부분적으로만 지지됐다.",
    limitations: [
      "작은 부부 표본과 특정 자기공개 과제에 한정된다.",
      "어떤 사람에게나 특정 지원 방식이 최선이라는 근거가 아니다.",
      "뉴앙 A/G 방향이나 개인의 지원 능력을 직접 검증하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["pubmed_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
    sourceId: "SRC-RESPONSIVENESS-2017",
    constructRefs: [
      "perceived_partner_responsiveness",
      "eudaimonic_wellbeing",
      "hedonic_wellbeing",
    ],
    contexts: ["partner"],
    direction: "supports",
    evidenceGrade: "B",
    populationSummary: "미국의 혼인 성인 2,000명 이상을 약 10년 추적",
    resultSummary:
      "초기 웰빙과 여러 공변량을 통제한 뒤 지각된 상대 반응성은 10년 뒤 의미·성장 중심 웰빙의 증가를 예측했지만, 즐거움 중심 웰빙의 변화는 예측하지 않았다.",
    limitations: [
      "관찰 종단 자료이므로 인과를 확정할 수 없다.",
      "상대 반응성을 뉴앙 A나 특정 코드와 동일시할 수 없다.",
      "미국의 혼인 성인 결과를 모든 관계 형태에 일반화하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["pubmed_and_primary_full_text_2026-07-23"],
  },
  {
    findingId: "FND-STRESS-REACTIVITY-RECOVERY-DISTINCTION",
    sourceId: "SRC-REACTIVITY-RECOVERY-2023",
    constructRefs: [
      "stress_reactivity",
      "stress_recovery",
      "laboratory_daily_life_correspondence",
    ],
    contexts: ["general"],
    direction: "qualifies",
    evidenceGrade: "C",
    populationSummary:
      "벨기에의 건강한 19~35세 성인 53명, 실험실 과제와 8일 경험표집",
    resultSummary:
      "실험실의 스트레스 반응·회복 지표와 일상 반응 지표 사이에는 대체로 강한 관련이 확인되지 않아 반응성과 회복을 구분해 측정할 필요가 있다.",
    limitations: [
      "작은 비임상 표본의 단일 연구다.",
      "정서·생리 지표를 뉴앙 Q/C 점수로 바꿀 수 없다.",
      "스트레스 반응과 회복이 언제나 무관하다는 결론이 아니다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["pubmed_primary_record_2026-07-23"],
  },
] as const satisfies readonly EvidenceFinding[];

export const traitMapRelationshipEvidenceV2 = {
  sources: traitMapRelationshipEvidenceSourcesV2,
  findings: traitMapRelationshipEvidenceFindingsV2,
} as const;
