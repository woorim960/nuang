import { z } from "zod";

export const enakqGateBMeasurementModelVersion =
  "ENAKQ-GATE-B-MEASUREMENT-MODEL.v0.1";

const gateBFacetSchema = z.object({
  customerLabel: z.string().min(1),
  excludes: z.array(z.string().min(1)).min(1),
  facetId: z.string().regex(/^(SE|OE|RO|SM|ER)-[A-Z]{2}$/),
  highDirection: z.string().min(1),
  includes: z.array(z.string().min(1)).min(1),
  internalLabel: z.string().min(1),
  lowDirection: z.string().min(1),
  role: z.enum([
    "representative_core",
    "self_private_research",
    "legacy_excluded",
  ]),
  status: z.enum([
    "candidate_requires_content_and_quant_validation",
    "research_only_requires_independence_and_safety_validation",
    "retired_from_current_model",
  ]),
});

const gateBValidationStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "passed",
  "failed",
]);

const gateBDomainSchema = z
  .object({
    aggregationStatus: z.literal("not_validated_for_final_code_issuance"),
    bipolarityStatus: z.literal("candidate_not_empirically_confirmed"),
    codePosition: z.number().int().min(1).max(5),
    competingModels: z.array(z.string().min(1)).min(2),
    customerLabel: z.string().min(1),
    domainId: z.enum(["SE", "OE", "RO", "SM", "ER"]),
    excludes: z.array(z.string().min(1)).min(1),
    facets: z.array(gateBFacetSchema).min(1),
    highSymbol: z.enum(["E", "N", "A", "K", "Q"]),
    includes: z.array(z.string().min(1)).min(1),
    interpretationUnit: z.enum([
      "candidate_higher_order_domain",
      "single_representative_facet",
    ]),
    lowSymbol: z.enum(["I", "R", "G", "M", "C"]),
    oneSentenceDefinition: z.string().min(1),
    structuralQuestion: z.string().min(1),
  })
  .superRefine((domain, context) => {
    const coreFacets = domain.facets.filter(
      (facet) => facet.role === "representative_core",
    );
    if (coreFacets.length === 0) {
      context.addIssue({
        code: "custom",
        message: "대표 코드 후보에는 하나 이상의 core facet이 필요해요.",
        path: ["facets"],
      });
    }
    if (
      domain.interpretationUnit === "single_representative_facet" &&
      coreFacets.length !== 1
    ) {
      context.addIssue({
        code: "custom",
        message: "단일 대표 facet 축에는 core facet이 정확히 하나여야 해요.",
        path: ["facets"],
      });
    }
    domain.facets.forEach((facet, index) => {
      if (!facet.facetId.startsWith(`${domain.domainId}-`)) {
        context.addIssue({
          code: "custom",
          message: `${facet.facetId}은 ${domain.domainId} 영역에 속하지 않아요.`,
          path: ["facets", index, "facetId"],
        });
      }
    });
  });

export const gateBReleaseDecisionPolicySchema = z.object({
  adaptiveFollowUpPolicy: z.literal(
    "use_only_after_information_gain_and_misclassification_reduction_validation",
  ),
  boundaryThresholdSource: z.literal(
    "pre_registered_quantitative_pilot_not_fixed_in_advance",
  ),
  currentMidpointRuleStatus: z.literal(
    "development_only_not_a_validated_release_threshold",
  ),
  facetSplitPolicy: z.literal(
    "show_facets_separately_and_limit_representative_letter_claim",
  ),
  fullAssessmentPolicy: z.literal(
    "issue_only_when_domain_evidence_boundary_and_facet_rules_pass",
  ),
  quickAssessmentPolicy: z.literal(
    "provisional_direction_only_no_confirmed_facet_claims",
  ),
  unresolvedPolicy: z.literal("do_not_issue_a_final_five_letter_code"),
});

export const gateBMeasurementModelSchema = z
  .object({
    codeOrder: z.literal("E/I · R/N · G/A · K/M · C/Q"),
    domains: z.array(gateBDomainSchema).length(5),
    evidenceBoundary: z.object({
      directNuangValidation: gateBValidationStatusSchema,
      externalModelUse: z.literal(
        "indirect_structure_and_boundary_support_only",
      ),
      sources: z.array(z.string().url()).min(4),
    }),
    releaseDecisionPolicy: gateBReleaseDecisionPolicySchema,
    status: z.literal("research_candidate_not_for_validated_scoring"),
    validationGates: z.object({
      cognitiveContentValidity: gateBValidationStatusSchema,
      fairnessAndInvariance: gateBValidationStatusSchema,
      quantitativeStructure: gateBValidationStatusSchema,
      reliabilityAndTemporalStability: gateBValidationStatusSchema,
    }),
    version: z.literal(enakqGateBMeasurementModelVersion),
  })
  .superRefine((model, context) => {
    const orderedDomainIds = model.domains
      .slice()
      .sort((left, right) => left.codePosition - right.codePosition)
      .map((domain) => domain.domainId);
    if (orderedDomainIds.join(",") !== "SE,OE,RO,SM,ER") {
      context.addIssue({
        code: "custom",
        message: "고객 코드 자리는 SE → OE → RO → SM → ER 순서여야 해요.",
        path: ["domains"],
      });
    }

    const expectedSymbols = {
      ER: ["C", "Q"],
      OE: ["R", "N"],
      RO: ["G", "A"],
      SE: ["I", "E"],
      SM: ["M", "K"],
    } as const;
    model.domains.forEach((domain, index) => {
      const expected = expectedSymbols[domain.domainId];
      if (
        domain.lowSymbol !== expected[0] ||
        domain.highSymbol !== expected[1]
      ) {
        context.addIssue({
          code: "custom",
          message: `${domain.domainId}의 고객 글자 방향이 Gate B 계약과 달라요.`,
          path: ["domains", index],
        });
      }
    });

    const allFacetIds = model.domains.flatMap((domain) =>
      domain.facets.map((facet) => facet.facetId),
    );
    if (new Set(allFacetIds).size !== allFacetIds.length) {
      context.addIssue({
        code: "custom",
        message: "facet ID는 Gate B 모델 안에서 중복될 수 없어요.",
        path: ["domains"],
      });
    }
  });

export const enakqGateBMeasurementModel = gateBMeasurementModelSchema.parse({
  codeOrder: "E/I · R/N · G/A · K/M · C/Q",
  domains: [
    {
      aggregationStatus: "not_validated_for_final_code_issuance",
      bipolarityStatus: "candidate_not_empirically_confirmed",
      codePosition: 1,
      competingModels: [
        "SE-M1.correlated_RE_AI_with_higher_order_SE",
        "SE-M2.correlated_RE_AI_without_representative_domain",
      ],
      customerLabel: "사람 사이 에너지",
      domainId: "SE",
      excludes: [
        "사교 기술·친구 수·인기",
        "리더십·발표·설득 능력",
        "낯선 사람에 대한 불안과 문화적 발언 규범",
      ],
      facets: [
        {
          customerLabel: "함께할 때의 에너지",
          excludes: [
            "먼저 말하는 행동",
            "친구 수와 모임 취향",
            "전반적 행복감",
          ],
          facetId: "SE-RE",
          highDirection: "교류 중·후 활력과 관여가 비교적 쉽게 올라감",
          includes: ["교류 중·후 활력 변화", "부담이 크지 않은 교류 관여"],
          internalLabel: "교류 활력",
          lowDirection: "교류 뒤 혼자 정리하고 회복할 필요가 비교적 커짐",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
        {
          customerLabel: "먼저 표현하기",
          excludes: ["리더십 능력", "지배성과 공격성", "과업 실행력"],
          facetId: "SE-AI",
          highDirection: "필요한 의견·요청·선택지를 먼저 밖으로 꺼냄",
          includes: ["제안 시작", "의견·필요·진행 방법의 선행 표현"],
          internalLabel: "주도적 표현",
          lowDirection: "다른 제안을 먼저 살핀 뒤 자신의 생각을 더함",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
      ],
      highSymbol: "E",
      includes: ["대인 교류에서의 활력", "필요한 대인 표현을 시작하는 경향"],
      interpretationUnit: "candidate_higher_order_domain",
      lowSymbol: "I",
      oneSentenceDefinition:
        "일상적인 대인 교류에서 활력이 움직이고 필요한 표현을 시작하는 두 경향을 함께 검토하는 후보 영역이다.",
      structuralQuestion:
        "교류 활력과 먼저 표현하기가 구분되면서도 하나의 E/I 상위 점수를 만들 수 있는가?",
    },
    {
      aggregationStatus: "not_validated_for_final_code_issuance",
      bipolarityStatus: "candidate_not_empirically_confirmed",
      codePosition: 2,
      competingModels: [
        "OE-M1.correlated_AE_CI_IE_with_higher_order_OE",
        "OE-M2.correlated_AE_CI_IE_without_representative_domain",
        "OE-M3.openness_AE_CI_and_intellect_IE_two_aspect_model",
      ],
      customerLabel: "생각과 탐색",
      domainId: "OE",
      excludes: [
        "지능·이해 속도·문제 해결 능력",
        "창의적 성과·예술 재능",
        "현실 판단·실용 능력·특정 가치관",
      ],
      facets: [
        {
          customerLabel: "분위기와 아름다움 느끼기",
          excludes: ["감각 정확도", "예술 능력", "감정 동요"],
          facetId: "OE-AE",
          highDirection: "음악·장면·환경의 미적 인상에 관심이 오래 머묾",
          includes: ["미적 분위기 관심", "인상에 대한 재관여"],
          internalLabel: "미적 경험",
          lowDirection: "미적 인상에 머무는 시간이 비교적 짧음",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
        {
          customerLabel: "장면과 이야기 떠올리기",
          excludes: ["창의적 결과물", "현실 판단", "기억 정확도"],
          facetId: "OE-CI",
          highDirection: "현재 정보 너머의 장면·이야기·가능성을 펼쳐 봄",
          includes: ["자발적 장면 생성", "가정과 이야기의 확장"],
          internalLabel: "상상 확장",
          lowDirection: "제시된 내용과 현재 장면 범위에 관심이 머묾",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
        {
          customerLabel: "원리와 관점 알아보기",
          excludes: ["지능", "학업 성취", "전문지식과 독서량"],
          facetId: "OE-IE",
          highDirection: "필요한 답을 넘어 원리·배경·다른 설명을 더 탐색함",
          includes: ["개념과 원리 관심", "대안 설명과 정보 연결 탐색"],
          internalLabel: "지적 탐구",
          lowDirection: "현재 목적에 필요한 정보 범위에서 탐색을 마침",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
      ],
      highSymbol: "N",
      includes: ["미적 경험에 대한 관심", "상상 확장", "개념·원리·관점 탐색"],
      interpretationUnit: "candidate_higher_order_domain",
      lowSymbol: "R",
      oneSentenceDefinition:
        "미적 경험·상상·새로운 개념과 관점을 접할 때 관심을 두고 탐색하는 정도의 후보 영역이다.",
      structuralQuestion:
        "세 facet이 구분되면서 상위 OE를 이루는가, 아니면 두 aspect나 독립 facet 설명이 더 정확한가?",
    },
    {
      aggregationStatus: "not_validated_for_final_code_issuance",
      bipolarityStatus: "candidate_not_empirically_confirmed",
      codePosition: 3,
      competingModels: [
        "RO-M1.single_bipolar_attention_continuum_G_to_A",
        "RO-M2.partly_independent_solution_and_emotion_attention_propensities",
      ],
      customerLabel: "관계에서 관심이 가는 곳",
      domainId: "RO",
      excludes: [
        "공감 능력·착함·배려 수준",
        "문제 해결 능력·차가움",
        "실제 나타나는 반응과 선택·존엄 존중",
      ],
      facets: [
        {
          customerLabel: "원인·해결 / 상대 마음",
          excludes: ["공감 정확도", "해결 능력", "실제 행동과 사회적 바람직성"],
          facetId: "RO-EC",
          highDirection:
            "관계 장면에서 상대의 감정 상태와 필요가 먼저 주의를 끎",
          includes: [
            "처음 드는 생각의 주의 방향",
            "상대 마음과 원인·해결의 상대적 선행",
          ],
          internalLabel: "관계 주의 방향",
          lowDirection:
            "관계 장면에서 일의 원인·결과·해결할 부분이 먼저 주의를 끎",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
        {
          customerLabel: "선택과 경계 존중",
          excludes: ["대표 G/A", "상대 마음 추론", "호감과 관계 성공"],
          facetId: "RO-RN",
          highDirection: "상대의 선택·거절·경계를 반복 행동에서 존중함",
          includes: ["비강압 행동", "선택권과 존엄 존중"],
          internalLabel: "선택·존엄 존중",
          lowDirection:
            "설득·압박·사람 평가 행동이 나타날 수 있어 별도 안전 검토가 필요함",
          role: "self_private_research",
          status: "research_only_requires_independence_and_safety_validation",
        },
      ],
      highSymbol: "A",
      includes: [
        "관계 장면에서 상대 마음과 원인·해결 중 먼저 주의를 끄는 방향",
      ],
      interpretationUnit: "single_representative_facet",
      lowSymbol: "G",
      oneSentenceDefinition:
        "관계 장면에서 원인·해결과 상대 마음 중 어느 쪽이 자연스럽게 먼저 주의를 끄는지 보는 단일 후보 축이다.",
      structuralQuestion:
        "G와 A가 한 양극 연속선인지, 두 관심 경향이 부분적으로 독립적인지 확인할 수 있는가?",
    },
    {
      aggregationStatus: "not_validated_for_final_code_issuance",
      bipolarityStatus: "candidate_not_empirically_confirmed",
      codePosition: 4,
      competingModels: [
        "SM-M1.correlated_EP_OS_with_higher_order_SM",
        "SM-M2.correlated_EP_OS_without_representative_domain",
        "SM-M3.EP_OS_core_with_RL_external_research_signal",
        "SM-M4.higher_order_EP_OS_RL_three_facet_model",
      ],
      customerLabel: "일상을 꾸리는 방식",
      domainId: "SM",
      excludes: [
        "성실함·책임감·도덕성",
        "성과·완성 능력·집행 기능 진단",
        "낮은 방향의 유연성·적응력 자동 부여",
      ],
      facets: [
        {
          customerLabel: "실행과 지속",
          excludes: [
            "성과와 완성 능력",
            "동기와 의지 전체",
            "임상적 집행 기능",
          ],
          facetId: "SM-EP",
          highDirection:
            "필요한 일을 시작하고 중단 뒤 다시 돌아와 이어가는 흐름이 비교적 꾸준함",
          includes: ["착수", "복귀", "지속"],
          internalLabel: "실행·지속",
          lowDirection: "착수·복귀·지속이 상황과 자원에 따라 더 크게 달라짐",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
        {
          customerLabel: "정리와 계획",
          excludes: ["계획 능력", "완벽주의", "실제 과업 지속"],
          facetId: "SM-OS",
          highDirection:
            "물건·시간·절차의 자리를 정하고 계획된 구조를 유지하려 함",
          includes: ["정돈", "사전 구조화", "일정과 절차의 조직"],
          internalLabel: "질서·구조",
          lowDirection: "정해진 구조보다 현재 필요에 맞춰 배치와 순서를 바꿈",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
        {
          customerLabel: "맡은 일 챙기기",
          excludes: ["착함과 책임감", "관계 헌신", "대표 K/M 자동 합산"],
          facetId: "SM-RL",
          highDirection:
            "약속하거나 맡은 일을 기억하고 확인하는 반복 행동이 나타남",
          includes: ["맡은 일 확인", "약속 이행 행동"],
          internalLabel: "맡은 일 이행 후보",
          lowDirection: "맡은 일 관리가 외부 도움과 상황 조건에 더 의존함",
          role: "self_private_research",
          status: "research_only_requires_independence_and_safety_validation",
        },
      ],
      highSymbol: "K",
      includes: ["시작·복귀·지속", "질서·구조"],
      interpretationUnit: "candidate_higher_order_domain",
      lowSymbol: "M",
      oneSentenceDefinition:
        "일의 착수·지속과 일상 구조가 상황에 따라 달라지는 정도를 함께 검토하는 후보 영역이다.",
      structuralQuestion:
        "EP와 OS가 하나의 K/M 상위 점수를 만들 수 있는가, RL은 독립성과 비낙인성을 확보해도 대표 코드에 필요한가?",
    },
    {
      aggregationStatus: "not_validated_for_final_code_issuance",
      bipolarityStatus: "candidate_not_empirically_confirmed",
      codePosition: 5,
      competingModels: [
        "ER-M1.correlated_IR_WD_with_higher_order_ER",
        "ER-M2.correlated_IR_WD_without_representative_domain",
        "ER-M3.trait_IR_WD_with_separate_recent_state_covariate",
      ],
      customerLabel: "걱정과 감정 반응",
      domainId: "ER",
      excludes: [
        "정신건강 진단과 불안장애",
        "회복력·감정 표현·위험 탐지 능력",
        "최근 수면·갈등·건강·경제 상태",
      ],
      facets: [
        {
          customerLabel: "감정 동요",
          excludes: ["감정 표현", "회복 속도", "긍정 감정의 풍부함"],
          facetId: "ER-IR",
          highDirection:
            "일상적 불편·짜증·긴장 같은 감정 반응이 비교적 빠르고 크게 활성화됨",
          includes: ["일상적 정서 반응의 활성화 속도", "불편 정서의 크기"],
          internalLabel: "감정 동요",
          lowDirection:
            "같은 일상 자극에서 불편 정서 활성화가 비교적 천천히 작게 나타남",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
        {
          customerLabel: "걱정과 주저",
          excludes: ["임상 불안", "신중함과 위험 탐지 능력", "실제 회복"],
          facetId: "ER-WD",
          highDirection:
            "불확실한 결과의 부정적 가능성이 반복해서 떠오르고 선택 전에 주저함",
          includes: ["부정적 가능성 반복", "불확실성에서의 걱정과 주저"],
          internalLabel: "걱정·주저",
          lowDirection:
            "불확실한 상황에서도 부정적 가능성에 오래 머물지 않고 선택으로 이동함",
          role: "representative_core",
          status: "candidate_requires_content_and_quant_validation",
        },
      ],
      highSymbol: "Q",
      includes: ["일상적 감정 동요", "불확실성에서의 걱정·주저"],
      interpretationUnit: "candidate_higher_order_domain",
      lowSymbol: "C",
      oneSentenceDefinition:
        "평소 일상에서 불편 정서와 걱정·주저가 활성화되는 정도를 검토하는 후보 영역이다.",
      structuralQuestion:
        "감정 동요와 걱정·주저가 하나의 Q/C 상위 점수를 만들며 최근 상태와 임상 구성개념에서 구분되는가?",
    },
  ],
  evidenceBoundary: {
    directNuangValidation: "not_started",
    externalModelUse: "indirect_structure_and_boundary_support_only",
    sources: [
      "https://www.colby.edu/wp-content/uploads/2013/08/Soto_John_2017.pdf",
      "https://pubmed.ncbi.nlm.nih.gov/17983306/",
      "https://www.intestcom.org/files/guideline_test_adaptation_2ed.pdf",
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC5891557/",
    ],
  },
  releaseDecisionPolicy: {
    adaptiveFollowUpPolicy:
      "use_only_after_information_gain_and_misclassification_reduction_validation",
    boundaryThresholdSource:
      "pre_registered_quantitative_pilot_not_fixed_in_advance",
    currentMidpointRuleStatus:
      "development_only_not_a_validated_release_threshold",
    facetSplitPolicy:
      "show_facets_separately_and_limit_representative_letter_claim",
    fullAssessmentPolicy:
      "issue_only_when_domain_evidence_boundary_and_facet_rules_pass",
    quickAssessmentPolicy:
      "provisional_direction_only_no_confirmed_facet_claims",
    unresolvedPolicy: "do_not_issue_a_final_five_letter_code",
  },
  status: "research_candidate_not_for_validated_scoring",
  validationGates: {
    cognitiveContentValidity: "not_started",
    fairnessAndInvariance: "not_started",
    quantitativeStructure: "not_started",
    reliabilityAndTemporalStability: "not_started",
  },
  version: enakqGateBMeasurementModelVersion,
});

export function getGateBDomain(domainId: "SE" | "OE" | "RO" | "SM" | "ER") {
  return (
    enakqGateBMeasurementModel.domains.find(
      (domain) => domain.domainId === domainId,
    ) ?? null
  );
}

export type GateBMeasurementModel = z.infer<typeof gateBMeasurementModelSchema>;
