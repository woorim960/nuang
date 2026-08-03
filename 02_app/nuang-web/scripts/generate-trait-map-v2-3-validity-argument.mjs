import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const docsDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2",
);
const generatedDirectory = path.join(docsDirectory, "generated");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_VALIDITY_ARGUMENT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "123_VALIDITY_ARGUMENT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const publicationGate = readJson("TRAIT_MAP_PUBLICATION_GATE_V2_3.json");
const validityClaims = [
  {
    claimId: "VA-01-FIVE-AXIS-SCORE-CLASSIFICATION",
    productClaim:
      "검사 응답으로 E/I·R/N·G/A·K/M·C/Q 다섯 방향의 상대적 가까움을 산출할 수 있다.",
    claimClass: "measurement_score_interpretation",
    allowedCustomerWording:
      "최근 평소 모습의 응답에서 각 방향이 얼마나 가까웠는지 보여준다.",
    prohibitedWording: [
      "타고난 본질을 확정한다.",
      "평생 바뀌지 않는 유형이다.",
      "한 글자로 능력·도덕성·정신건강을 판단한다.",
    ],
    requiredEvidence: [
      "문항-구성개념 내용 타당도",
      "응답 과정 인지 면담",
      "5축 요인 구조와 대안 모형 비교",
      "내적 일관성과 문항 정보",
      "검사-재검사와 상태 변동 분리",
      "수렴·판별 타당도",
      "연령·성별·교육·언어 이해 집단별 기능",
      "경계값 주변 분류 불확실성",
    ],
    currentEvidence: [
      "공식 10기호 언어 계약",
      "문항·축 내부 설계",
      "Gate-C 연구 수집 경로",
    ],
    currentState: "blocked_empirical_measurement_evidence_incomplete",
  },
  {
    claimId: "VA-02-AXIS-DESCRIPTIVE-MEANING",
    productClaim:
      "각 글자는 외향/내향, 현실/가능성, 해결/마음, 꾸준/상황, 차분/빠른 정서 반응의 이해 가능한 차이를 설명한다.",
    claimClass: "construct_definition_and_public_language",
    allowedCustomerWording:
      "각 글자가 무엇을 먼저 보고 어떻게 반응하는 방향인지 쉬운 말로 설명한다.",
    prohibitedWording: [
      "반대 글자를 부족하거나 미성숙하다고 표현한다.",
      "축 정의에 없는 행동을 글자 뜻으로 넣는다.",
    ],
    requiredEvidence: [
      "구성개념 전문가 독립 검토",
      "양방향 대칭성과 우열 없음",
      "한국어 인지 면담",
      "반대 방향 구별 과제",
      "연령·읽기 배경별 이해도",
    ],
    currentEvidence: [
      "공식 10기호 언어 계약",
      "P0·P1·P2 내부 문장 판독",
      "인지 면담 프로토콜과 103개 회기 계획",
    ],
    currentState: "blocked_independent_and_user_review_not_started",
  },
  {
    claimId: "VA-03-SCENARIO-TENDENCY-CONTENT",
    productClaim:
      "특정 방향의 사람에게 일반·가족·친구·연인·관심 상대·업무 상황에서 나타날 수 있는 주의·처음 생각·실제 반응·말하기 경향을 설명한다.",
    claimClass: "evidence_bounded_content_generalization",
    allowedCustomerWording:
      "이 방향에서는 보통 무엇을 먼저 살피고 어떤 반응이 나타나는지 구체적으로 설명한다.",
    prohibitedWording: [
      "모든 사람이 같은 상황에서 같은 행동을 한다.",
      "코드만으로 실제 사건의 결과를 예측한다.",
      "상태·역할·문화 효과를 전부 성향으로 돌린다.",
    ],
    requiredEvidence: [
      "605개 문장의 source unit·finding 추적",
      "고위험 문장 복수 근거와 실질 독립성",
      "문장별 7역할 독립 검토",
      "인지 면담과 수정 후 재시험",
      "상황 대표성과 빠진 장면 검토",
      "필요 시 일상 경험 표집 또는 행동 자료",
    ],
    currentEvidence: [
      "605/605 구조 근거 추적",
      "고위험 460/460 등록 출처 2개 이상",
      "P0 11·P1 14·P2 층화 검토 패킷",
    ],
    currentState: "blocked_semantic_scope_and_user_review_incomplete",
  },
  {
    claimId: "VA-04-THIRTY-TWO-ROLE-NAME",
    productClaim:
      "뉴앙 코드 조합을 짧고 기억하기 쉬운 역할형 별칭으로 부를 수 있다.",
    claimClass: "mnemonic_naming_not_measurement",
    allowedCustomerWording:
      "코드를 기억하고 대화하기 쉽게 돕는 이름이다.",
    prohibitedWording: [
      "직업 적성이나 실제 역할을 보장한다.",
      "별칭이 점수 타당도의 증거다.",
      "별칭만 보고 상대의 모든 행동을 판단한다.",
    ],
    requiredEvidence: [
      "32개 이름 고유성·길이·우열 없음",
      "코드-별칭 뜻 연결 회상",
      "연령·성별에 따른 호감·낙인 오해",
      "발음·검색·공유 사용성",
    ],
    currentEvidence: [
      "32개 짧은·긴 별칭 전수 내부 감사",
      "원장·프로필 코드 일치 자동 검사",
    ],
    currentState: "blocked_name_comprehension_user_test_incomplete",
  },
  {
    claimId: "VA-05-SELF-OTHER-AXIS-COMPARISON",
    productClaim:
      "두 사람의 동의된 검사 결과를 축별로 나란히 보고 공통점과 차이를 이해할 수 있다.",
    claimClass: "descriptive_dyadic_comparison",
    allowedCustomerWording:
      "두 응답 결과에서 가까운 방향과 차이가 큰 상황을 함께 살펴본다.",
    prohibitedWording: [
      "차이가 크면 관계가 나쁘다.",
      "같은 코드면 잘 맞는다.",
      "상대 동의 없이 비공개 세부 점수를 추정한다.",
    ],
    requiredEvidence: [
      "각 개인 점수의 측정 타당도와 오차",
      "두 결과의 동일 버전·동일 해석 계약",
      "비교 문구의 양방향 대칭성",
      "관계 맥락별 사용자 이해도",
      "공개 범위·동의·철회·차단 정책",
    ],
    currentEvidence: [
      "80개 한 글자 이웃 구조 검사",
      "비교 화면 privacyScope 기초 계약",
    ],
    currentState: "blocked_score_validity_and_consent_evidence_incomplete",
  },
  {
    claimId: "VA-06-RELATIONSHIP-GUIDANCE",
    productClaim:
      "가족·친구·연인·업무 관계에서 서로의 차이를 다룰 대화 질문과 행동 선택지를 제안할 수 있다.",
    claimClass: "supportive_guidance_not_compatibility_prediction",
    allowedCustomerWording:
      "다름을 확인하고 대화를 시작할 수 있는 질문과 선택지를 제안한다.",
    prohibitedWording: [
      "코드 조합만으로 궁합 순위를 매긴다.",
      "특정 조합의 이별·갈등·성공을 예측한다.",
      "폭력·통제·위험 신호를 성향 차이로 정상화한다.",
    ],
    requiredEvidence: [
      "관계 맥락별 연구 근거",
      "두 사람 상호작용과 상황 자료",
      "조언의 해로움·오용 안전 검토",
      "실제 사용자 결과와 부작용 모니터링",
      "위기·폭력·강압 상황의 별도 안전 경로",
    ],
    currentEvidence: [
      "관계 상황 문장과 출처 계보",
      "관계 결과 문장의 2출처 구조 규칙",
    ],
    currentState: "blocked_dyadic_outcome_and_safety_evidence_incomplete",
  },
  {
    claimId: "VA-07-PUBLIC-PROFILE-AND-SHARE",
    productClaim:
      "사용자가 선택한 코드·별칭·설명만 프로필과 공유 카드에 공개할 수 있다.",
    claimClass: "privacy_bounded_social_expression",
    allowedCustomerWording:
      "내가 고른 공개 범위 안에서 성향을 소개한다.",
    prohibitedWording: [
      "비공개 점수·세부 반응·민감 추론을 자동 공개한다.",
      "친구·연인의 결과를 대신 공개한다.",
    ],
    requiredEvidence: [
      "세분화된 공개 동의",
      "공개 전 미리보기",
      "언제든 철회와 기존 링크 만료",
      "검색·피드·공유별 노출 범위 테스트",
      "신고·차단·오용 대응",
    ],
    currentEvidence: [
      "canonical surface 금지 목록",
      "COMMON 61개 전 개인화 화면 차단",
    ],
    currentState: "blocked_surface_specific_consent_not_validated",
  },
  {
    claimId: "VA-08-CLINICAL-OR-SENSITIVE-LABS",
    productClaim:
      "애착·임상적 특성·반사회성 같은 민감 주제는 뉴앙 코드와 분리된 별도 연구·안전 계약에서만 다룬다.",
    claimClass: "separate_sensitive_assessment_boundary",
    allowedCustomerWording:
      "가벼운 자기이해 콘텐츠인지 전문 평가가 필요한 영역인지 명확히 구분한다.",
    prohibitedWording: [
      "뉴앙 코드로 사이코패스·소시오패스·정신질환을 추정한다.",
      "오락형 결과를 진단처럼 표현한다.",
      "위험 행동 여부를 성향 코드 하나로 판단한다.",
    ],
    requiredEvidence: [
      "주제별 별도 구성개념과 도구",
      "임상·윤리·법률 안전 검토",
      "연령 제한과 위기 안내",
      "점수 해석·오탐·낙인 피해 검증",
    ],
    currentEvidence: [],
    currentState: "prohibited_from_nuang_code_inference",
  },
];
const blockedClaims = validityClaims.filter(
  (claim) => !claim.currentState.startsWith("approved"),
);
const report = {
  contractVersion: "nuang-trait-map-validity-argument.v2.3",
  reportId: "TRAIT-MAP-VALIDITY-ARGUMENT.2.3",
  status: "VALIDITY_ARGUMENT_DEFINED_ALL_CUSTOMER_CLAIMS_GATED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourcePublicationGateReportId: publicationGate.reportId,
  officialSymbolLanguage: {
    E: "외향형",
    I: "내향형",
    R: "현실형",
    N: "가능성형",
    G: "해결형",
    A: "마음형",
    K: "꾸준형",
    M: "상황형",
    C: "차분반응형",
    Q: "빠른반응형",
  },
  argumentPrinciples: [
    "타당도는 검사 자체의 단일 딱지가 아니라 특정 점수 해석과 사용에 대한 근거다.",
    "문장 이해도, 점수 측정, 관계 비교, 역할형 이름은 서로 다른 주장이며 근거를 공유한다고 가정하지 않는다.",
    "구조·출처 추적·내부 검토는 경험적 타당도와 고객 승인을 대신하지 않는다.",
    "모든 주장은 허용 문구·금지 문구·필수 근거·현재 상태를 함께 가진다.",
  ],
  summary: {
    productClaims: validityClaims.length,
    approvedClaims: validityClaims.length - blockedClaims.length,
    blockedClaims: blockedClaims.length,
    clinicalInferenceClaimsAllowedFromNuangCode: 0,
    productionPublicationAllowedEntries:
      publicationGate.summary.productionAllowedCanonicalEntries,
  },
  validityClaims,
  crossClaimDependencies: [
    {
      downstreamClaim: "VA-05-SELF-OTHER-AXIS-COMPARISON",
      requires: [
        "VA-01-FIVE-AXIS-SCORE-CLASSIFICATION",
        "VA-02-AXIS-DESCRIPTIVE-MEANING",
      ],
    },
    {
      downstreamClaim: "VA-06-RELATIONSHIP-GUIDANCE",
      requires: [
        "VA-03-SCENARIO-TENDENCY-CONTENT",
        "VA-05-SELF-OTHER-AXIS-COMPARISON",
        "별도 dyadic·안전 근거",
      ],
    },
    {
      downstreamClaim: "VA-07-PUBLIC-PROFILE-AND-SHARE",
      requires: [
        "발행할 각 콘텐츠 claim의 승인",
        "화면별 동의·철회·오용 방지",
      ],
    },
    {
      downstreamClaim: "VA-08-CLINICAL-OR-SENSITIVE-LABS",
      requires: [
        "뉴앙 코드와 분리된 새 검사 계약",
        "임상·윤리·법률 검토",
      ],
    },
  ],
  nextGate: {
    name: "QUANTITATIVE_VALIDATION_ANALYSIS_PLAN",
    actions: [
      "5축 점수의 표본·요인 구조·신뢰도·검사-재검사·수렴·판별 분석을 사전 명세한다.",
      "경계값 주변의 추가 질문과 불확실성 표시 규칙을 모의 데이터로 검증한다.",
      "관계 비교·지도 문구의 검증을 점수 검증과 별도 연구로 유지한다.",
    ],
  },
};
if (
  report.summary.productClaims !== 8 ||
  report.summary.approvedClaims !== 0 ||
  report.summary.clinicalInferenceClaimsAllowedFromNuangCode !== 0
) {
  throw new Error("Validity argument gate is unexpectedly open.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 validity argument is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Validity argument v2.3: ${report.summary.productClaims} product claims, approved ${report.summary.approvedClaims}, blocked ${report.summary.blockedClaims}, clinical inference allowed ${report.summary.clinicalInferenceClaimsAllowedFromNuangCode}.`,
);

function buildMarkdown(result) {
  return `# v2.3 뉴앙 타당도 논증

- 제품 주장: ${result.summary.productClaims}
- 승인된 주장: ${result.summary.approvedClaims}
- 근거 게이트 차단: ${result.summary.blockedClaims}
- 뉴앙 코드 임상 추론 허용: ${result.summary.clinicalInferenceClaimsAllowedFromNuangCode}

## 반드시 분리할 주장

1. 검사 응답으로 다섯 축 점수를 산출하는가
2. 열 글자의 뜻이 자연스럽고 구별되는가
3. 상황별 경향 문장이 근거 범위 안에서 이해되는가
4. 32개 별칭이 기억을 돕고 낙인을 만들지 않는가
5. 두 사람의 점수를 설명적으로 비교할 수 있는가
6. 관계 대화와 행동 선택지를 안전하게 제안할 수 있는가
7. 선택한 정보만 프로필·공유에 공개되는가
8. 임상·민감 주제가 뉴앙 코드와 완전히 분리되는가

문장 검토가 검사 점수의 타당도를 대신할 수 없고, 점수 검증이 관계 궁합
예측을 허용하지도 않는다. 애착·반사회성·정신건강은 뉴앙 코드로 추정하지
않으며 별도 구성개념·도구·안전 계약이 없으면 제공하지 않는다.

현재 8개 주장 모두 필요한 외부·사용자·경험적 근거가 끝나지 않아
research_only다. 다음 단계는 5축 점수 자체의 정량 검증 분석 계획이다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
