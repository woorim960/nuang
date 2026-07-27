import type { z } from "zod";
import {
  traitMapEvidenceFindingSchema,
  traitMapEvidenceSourceSchema,
} from "@/features/nuang-code/trait-map-data-center-v2";

type EvidenceSource = z.infer<typeof traitMapEvidenceSourceSchema>;
type EvidenceFinding = z.infer<typeof traitMapEvidenceFindingSchema>;

export const traitMapWorkEvidenceSourcesV2 = [
  {
    sourceId: "SRC-TRAIT-ACTIVATION-2003",
    title: "A Personality Trait-Based Interactionist Model of Job Performance",
    authors: ["Robert P. Tett", "Dawn D. Burnett"],
    year: 2003,
    researchStream: "work_and_study",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/0021-9010.88.3.500",
    url: "https://doi.org/10.1037/0021-9010.88.3.500",
    languages: ["English"],
    countries: ["international_theory"],
    populationSummary:
      "업무의 과업·사회·조직 수준에서 성향 단서와 직무 행동·성과를 구분한 상호작용 이론 모형",
    sampleSize: null,
    screeningStatus: "included",
    quality: {
      directness: "method_only",
      riskOfBias: "not_applicable",
      culturalFit: "method_only",
      replication: "not_applicable",
    },
  },
  {
    sourceId: "SRC-PERSON-SITUATION-WORK-2015",
    title:
      "The Person–Situation Debate Revisited: Effect of Situation Strength and Trait Activation on the Validity of the Big Five Personality Traits in Predicting Job Performance",
    authors: ["Timothy A. Judge", "Cindy P. Zapata"],
    year: 2015,
    researchStream: "work_and_study",
    sourceType: "meta_analysis",
    peerReviewStatus: "peer_reviewed",
    doi: "10.5465/amj.2010.0837",
    url: "https://doi.org/10.5465/amj.2010.0837",
    languages: ["English"],
    countries: ["international_literature"],
    populationSummary:
      "기존 Big Five–직무 성과 문헌을 상황 강도와 성향 활성화 단서로 코딩해 재검토한 메타분석",
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
    sourceId: "SRC-JOB-META-1991",
    title:
      "The Big Five Personality Dimensions and Job Performance: A Meta-Analysis",
    authors: ["Murray R. Barrick", "Michael K. Mount"],
    year: 1991,
    researchStream: "work_and_study",
    sourceType: "meta_analysis",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1111/j.1744-6570.1991.tb00688.x",
    url: "https://doi.org/10.1111/j.1744-6570.1991.tb00688.x",
    languages: ["English"],
    countries: ["international_literature"],
    populationSummary:
      "Big Five와 여러 직군·직무 성과 준거의 관련을 종합한 메타분석",
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
    sourceId: "SRC-CURVILINEAR-PERFORMANCE-2011",
    title:
      "Too Much of a Good Thing: Curvilinear Relationships Between Personality Traits and Job Performance",
    authors: [
      "Huy Le",
      "In-Sue Oh",
      "Steven B. Robbins",
      "Remus Ilies",
      "Erica Holland",
      "Paul Westrick",
    ],
    year: 2011,
    researchStream: "work_and_study",
    sourceType: "peer_reviewed_study",
    peerReviewStatus: "peer_reviewed",
    doi: "10.1037/a0021016",
    url: "https://pubmed.ncbi.nlm.nih.gov/20939656/",
    languages: ["English"],
    countries: ["United States"],
    populationSummary:
      "두 표본에서 성격 특성과 여러 직무 성과 준거의 비선형 관계를 검토한 연구",
    sampleSize: null,
    screeningStatus: "included",
    quality: {
      directness: "indirect",
      riskOfBias: "some_concerns",
      culturalFit: "non_korean",
      replication: "multiple_samples",
    },
  },
] as const satisfies readonly EvidenceSource[];

export const traitMapWorkEvidenceFindingsV2 = [
  {
    findingId: "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
    sourceId: "SRC-TRAIT-ACTIVATION-2003",
    constructRefs: [
      "trait_activation",
      "task_social_organizational_cues",
      "trait_expressive_behavior",
      "job_performance",
    ],
    contexts: ["work"],
    direction: "method_only",
    evidenceGrade: "C",
    populationSummary: "업무 성향 활성화에 관한 이론 모형",
    resultSummary:
      "업무에서는 역할의 요구·방해·제약·표출 계기·촉진 조건을 먼저 보고, 성향이 드러난 행동과 그 행동이 성과로 평가되는지를 분리해야 한다.",
    limitations: [
      "뉴앙 코드나 ENAKQ의 업무 행동을 직접 검증한 연구가 아니다.",
      "특정 코드의 직업 적합성·성과·채용 가능성을 추론하는 근거로 사용할 수 없다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
    sourceId: "SRC-PERSON-SITUATION-WORK-2015",
    constructRefs: [
      "situation_strength",
      "trait_activation",
      "big_five",
      "job_performance",
    ],
    contexts: ["work"],
    direction: "qualifies",
    evidenceGrade: "B",
    populationSummary:
      "기존 Big Five–직무 성과 문헌을 업무 맥락과 함께 재검토한 자료",
    resultSummary:
      "규칙과 통제가 강한지, 재량이 큰지, 특정 성향을 드러낼 단서가 있는지에 따라 성격 특성과 업무 행동·성과의 관련이 달라질 수 있었다.",
    limitations: [
      "Big Five 자료이며 뉴앙 5축의 업무 준거타당도를 보여주지 않는다.",
      "코드만으로 직업·역할 적합성을 추천하거나 배제하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-WORK-PERFORMANCE-CONSTRUCT-BOUNDARY",
    sourceId: "SRC-JOB-META-1991",
    constructRefs: [
      "big_five",
      "occupational_group",
      "performance_criterion",
      "criterion_validity",
    ],
    contexts: ["work"],
    direction: "qualifies",
    evidenceGrade: "B",
    populationSummary: "여러 직군과 성과 준거를 종합한 Big Five 메타분석",
    resultSummary:
      "성격 특성과 업무 성과의 관련은 어떤 성격 구성개념·직군·성과 준거를 보는지에 따라 달랐으므로, 인접 개념의 결과를 뉴앙 코드의 성과 예측으로 옮기면 안 된다.",
    limitations: [
      "1991년까지의 Big Five 자료로 현재 한국의 직무 환경을 직접 대표하지 않는다.",
      "뉴앙 K는 Big Five 성실성 전체와 같지 않으며 K의 성과 근거로 사용하지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["publisher_primary_record_2026-07-23"],
  },
  {
    findingId: "FND-WORK-PERFORMANCE-CURVILINEAR-BOUNDARY",
    sourceId: "SRC-CURVILINEAR-PERFORMANCE-2011",
    constructRefs: [
      "conscientiousness",
      "emotional_stability",
      "job_performance",
      "curvilinear_association",
      "job_complexity",
    ],
    contexts: ["work"],
    direction: "qualifies",
    evidenceGrade: "C",
    populationSummary: "두 표본의 Big Five와 직무 성과 자료",
    resultSummary:
      "일반적으로 긍정적으로 여겨지는 성격 특성도 일부 성과 준거와 항상 직선적으로 연결되지 않았으므로, 성향 점수가 높을수록 무조건 좋다고 설명하면 안 된다.",
    limitations: [
      "뉴앙 5축의 최적 수준이나 과잉 사용 지점을 검증하지 않았다.",
      "Big Five 결과를 ENAKQ 개인의 장점·약점·업무 성과로 바꾸지 않는다.",
    ],
    extractedBy: "nuang-research-v2",
    verifiedBy: ["pubmed_primary_record_2026-07-23"],
  },
] as const satisfies readonly EvidenceFinding[];

export const traitMapWorkEvidenceV2 = {
  sources: traitMapWorkEvidenceSourcesV2,
  findings: traitMapWorkEvidenceFindingsV2,
} as const;
