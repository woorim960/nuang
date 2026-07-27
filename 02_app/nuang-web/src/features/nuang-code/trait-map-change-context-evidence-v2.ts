import type { z } from "zod";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";

type EvidenceSource = z.infer<typeof traitMapEvidenceSourceSchema>;
type EvidenceFinding = z.infer<typeof traitMapEvidenceFindingSchema>;

export const traitMapChangeContextEvidenceSourcesV2 = [
  {
    sourceId: "SRC-CREATIVITY-DISTINCTION-2014",
    title:
      "The Road to Creative Achievement: A Latent Variable Model of Ability and Personality Predictors",
    authors: ["Emanuel Jauk", "Mathias Benedek", "Aljoscha C. Neubauer"],
    year: 2014,
    researchStream: "work_and_study",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1002/per.1941",
    url: "https://onlinelibrary.wiley.com/doi/10.1002/per.1941",
    languages: ["German", "English_report"],
    countries: ["Austria"],
    populationSummary:
      "성인 297명의 개방성·지능·아이디어 유창성·독창성·일상 창의 활동·창의 성취를 구분해 측정한 자료",
    sampleSize: 297,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-DAILY-STRESS-STATES-2024",
    title:
      "Characterizing Stress Processes by Linking Big Five Personality States, Traits, and Day-to-Day Stressors",
    authors: [
      "Whitney R. Ringwald",
      "Sienna R. Nielsen",
      "Janan Mostajabi",
      "Colin E. Vize",
      "Tessa van den Berg",
      "Stephen B. Manuck",
      "Anna L. Marsland",
      "Aidan G. C. Wright",
    ],
    year: 2024,
    researchStream: "emotion_stress_recovery",
    sourceType: "experience_sampling_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1016/j.jrp.2024.104487",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC11067701/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "1,090명이 8–10일 동안 남긴 스트레스 사건·평가·Big Five 상태 8,870건",
    sampleSize: 1090,
    screeningStatus: "included",
    quality: {
      directness: "partial",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
  {
    sourceId: "SRC-STRESS-STATE-2026",
    title: "The Impact of Stress on Personality State Expressions",
    authors: ["Samantha J. Grayson", "Gabriella M. Harari", "Sandra C. Matz"],
    year: 2026,
    researchStream: "emotion_stress_recovery",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1038/s44271-026-00438-3",
    url: "https://www.nature.com/articles/s44271-026-00438-3",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "온라인 스트레스 실험 792명과 학생 713명의 경험표집 관찰 17,853건",
    sampleSize: 1505,
    screeningStatus: "included",
    quality: {
      directness: "partial",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "multiple_samples",
    },
  },
  {
    sourceId: "SRC-INTERVENTION-META-2017",
    title: "A Systematic Review of Personality Trait Change Through Intervention",
    authors: [
      "Brent W. Roberts",
      "Jing Luo",
      "Daniel A. Briley",
      "Philip I. Chow",
      "Rong Su",
      "Patrick L. Hill",
    ],
    year: 2017,
    researchStream: "person_situation_process",
    sourceType: "meta_analysis",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/bul0000088",
    url: "https://pubmed.ncbi.nlm.nih.gov/28054797/",
    languages: ["English"],
    countries: ["international_literature"],
    populationSummary:
      "성격 측정치 변화를 추적한 개입 연구 207편을 종합한 메타분석",
    sampleSize: null,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "cross_cultural",
      replication: "multiple_samples",
    },
  },
  {
    sourceId: "SRC-DIGITAL-CHANGE-2021",
    title:
      "Changing Personality Traits With the Help of a Digital Personality Change Intervention",
    authors: [
      "Mirjam Stieger",
      "Sarah Wepfer",
      "Dominik Rüegger",
      "Tobias Kowatsch",
      "Brent W. Roberts",
      "Mathias Allemand",
    ],
    year: 2021,
    researchStream: "person_situation_process",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1073/pnas.2017548118",
    url: "https://www.pnas.org/doi/10.1073/pnas.2017548118",
    languages: ["German", "English_report"],
    countries: ["Switzerland", "Germany"],
    populationSummary:
      "성격 변화를 원한 비임상 성인 1,523명의 3개월 디지털 개입 무작위 대기군 연구",
    sampleSize: 1523,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "single_sample",
    },
  },
] as const satisfies readonly EvidenceSource[];

export const traitMapChangeContextEvidenceFindingsV2 = [
  {
    findingId: "FND-CREATIVITY-CONSTRUCTS-ARE-DISTINCT",
    sourceId: "SRC-CREATIVITY-DISTINCTION-2014",
    constructRefs: [
      "openness",
      "intelligence",
      "ideational_fluency",
      "ideational_originality",
      "creative_activity",
      "creative_achievement",
    ],
    contexts: ["general", "work"],
    direction: "qualifies",
    evidenceGrade: "C",
    populationSummary: "오스트리아 성인 297명",
    resultSummary:
      "개방성, 지능, 아이디어 유창성·독창성, 일상 창의 활동, 실제 창의 성취는 서로 관련될 수 있지만 같은 능력이나 결과가 아니었다.",
    limitations: [
      "뉴앙 N을 측정하거나 ENAKQ의 창의성을 검증한 연구가 아니다.",
      "N의 관점 탐색을 창의 능력·아이디어 품질·지능·성취로 확대하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-DAILY-STRESS-SHIFTS-TRAIT-STATES",
    sourceId: "SRC-DAILY-STRESS-STATES-2024",
    constructRefs: [
      "daily_stressor",
      "stress_appraisal",
      "personality_state",
      "personality_trait",
      "within_person_variability",
    ],
    contexts: ["general", "work"],
    direction: "supports",
    evidenceGrade: "B",
    populationSummary: "미국 성인 1,090명의 8,870개 일일 관찰",
    resultSummary:
      "스트레스를 보고한 날에는 Big Five 상태 표현이 달라졌고, 사람의 평균적 특성과 지각된 상황 특성이 일상 스트레스 과정을 함께 설명했다.",
    limitations: [
      "자기보고 일일 관찰 자료이므로 모든 방향의 인과를 확정하지 않는다.",
      "Big Five 상태를 뉴앙 Q나 다른 자리의 변화 규칙으로 바꾸지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["pmc_primary_full_text_2026-07-23"],
  },
  {
    findingId: "FND-STRESS-CHANGES-MOMENTARY-PERSONALITY",
    sourceId: "SRC-STRESS-STATE-2026",
    constructRefs: [
      "experimental_stress",
      "daily_stress",
      "momentary_personality_expression",
      "affect",
    ],
    contexts: ["general", "work"],
    direction: "supports",
    evidenceGrade: "B",
    populationSummary:
      "미국 온라인 성인 792명과 학생 713명의 두 연구 자료",
    resultSummary:
      "실험으로 유발한 스트레스와 일상의 순간 스트레스 모두 성격 상태 표현 변화와 관련됐고, 일부 세부 방향은 두 맥락에서 달랐다.",
    limitations: [
      "2026년 한 연구 묶음으로 다른 문화·연령·스트레스 상황의 반복 검증이 필요하다.",
      "부담이 큰 순간의 행동만으로 대표 뉴앙 코드를 다시 판정하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_full_text_2026-07-23"],
  },
  {
    findingId: "FND-PERSONALITY-CHANGE-INTERVENTION-BOUNDARY",
    sourceId: "SRC-INTERVENTION-META-2017",
    constructRefs: [
      "personality_trait_change",
      "intervention",
      "clinical_context",
      "longitudinal_follow_up",
    ],
    contexts: ["general"],
    direction: "qualifies",
    evidenceGrade: "A",
    populationSummary: "성격 변화를 추적한 개입 연구 207편",
    resultSummary:
      "평균 약 24주의 개입 뒤 성격 측정치 변화가 종합적으로 나타나, 성향이 평생 전혀 변하지 않는 고정값은 아니라는 근거를 제공했다.",
    limitations: [
      "임상 개입이 중심이고 개입 종류와 표본이 다양하다.",
      "뉴앙의 짧은 안내·알림·행동 제안이 성격을 바꾼다고 약속하는 근거가 아니다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["pubmed_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-DIGITAL-CHANGE-REQUIRES-INTENTIONAL-INTERVENTION",
    sourceId: "SRC-DIGITAL-CHANGE-2021",
    constructRefs: [
      "desired_personality_change",
      "digital_intervention",
      "self_report",
      "observer_report",
      "follow_up",
    ],
    contexts: ["general"],
    direction: "qualifies",
    evidenceGrade: "B",
    populationSummary:
      "성격 변화를 원한 독일어권 비임상 성인 1,523명의 3개월 개입",
    resultSummary:
      "목표를 직접 선택하고 3개월간 여러 개입 요소를 사용한 집단에서 목표 방향의 자기보고 변화가 나타났고, 일부 타인 보고와 추적에서도 변화가 관찰됐다.",
    limitations: [
      "자발적으로 변화를 원한 표본과 다요소·고강도 프로그램의 결과다.",
      "감소 목표의 타인 보고는 유의하지 않았으며 참여자 선택·이탈·자기보고 영향을 고려해야 한다.",
      "뉴앙의 단일 팁이나 짧은 실험이 같은 효과를 낸다고 말하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_full_text_2026-07-23"],
  },
] as const satisfies readonly EvidenceFinding[];

export const traitMapChangeContextEvidenceV2 = {
  sources: traitMapChangeContextEvidenceSourcesV2,
  findings: traitMapChangeContextEvidenceFindingsV2,
} as const;
