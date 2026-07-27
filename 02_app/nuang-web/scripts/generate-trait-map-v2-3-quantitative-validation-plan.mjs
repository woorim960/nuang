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
  "TRAIT_MAP_QUANTITATIVE_VALIDATION_PLAN_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "124_QUANTITATIVE_VALIDATION_PLAN_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const seedPath = path.join(
  projectRoot,
  "supabase/migrations/202607180002_core_candidate_bank_seed.sql",
);
const seedSource = fs.readFileSync(seedPath, "utf8");
const itemRevisions = new Map(
  [
    ...seedSource.matchAll(
      /\('(NX-\d+)', '[^']+', '([A-Z]+)', '([^']+)', '(HIGH|LOW)', '([^']*)', '([^']*)', '([^']+)', '([^']+)', '([^']+)', '([^']+)'/g,
    ),
  ].map((match) => [
    match[1],
    {
      itemRevisionId: match[1],
      domainId: match[2],
      facetId: match[3],
      keyedDirection: match[4],
      contextLabel: match[5],
      promptText: match[6],
      evidenceRole: match[7],
      responseLayer: match[8],
      scoreRole: match[9],
      candidateStatus: match[10],
    },
  ]),
);
const betaItems = [
  ...seedSource.matchAll(
    /\('NUANG-CORE-BETA-1\.0', '(NX-\d+)', (\d+), '([^']+)', '(direct|reverse)'\)/g,
  ),
]
  .map((match) => ({
    ...itemRevisions.get(match[1]),
    orderIndex: Number(match[2]),
    itemId: match[3],
    scoringKey: match[4],
  }))
  .sort((left, right) => left.orderIndex - right.orderIndex);
const countsBy = (selector) =>
  Object.fromEntries(
    [...Map.groupBy(betaItems, selector).entries()]
      .map(([key, values]) => [key, values.length])
      .sort(([left], [right]) => left.localeCompare(right, "en")),
  );
const currentManifest = {
  itemBankReleaseId: "NUANG-CORE-BETA-1.0",
  codeSchemeVersion: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
  itemCount: betaItems.length,
  domainCounts: countsBy((item) => item.domainId),
  facetCounts: countsBy((item) => item.facetId),
  keyedDirectionCounts: countsBy((item) => item.keyedDirection),
  scoringKeyCounts: countsBy((item) => item.scoringKey),
  responseLayerCounts: countsBy((item) => item.responseLayer),
  candidateStatusCounts: countsBy((item) => item.candidateStatus),
  items: betaItems,
};
const plan = {
  contractVersion:
    "nuang-trait-map-quantitative-validation-plan.v2.3",
  reportId: "TRAIT-MAP-QUANTITATIVE-VALIDATION-PLAN.2.3",
  status: "ANALYSIS_PLAN_READY_DATA_COLLECTION_NOT_STARTED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceAssets: [
    "docs/NUANG_CORE_MEASUREMENT_VALIDATION_PLAN.md",
    "docs/NUANG_MVP_BETA_MEASUREMENT_GATE.md",
    "supabase/migrations/202607180001_measurement_release_catalog.sql",
    "supabase/migrations/202607180002_core_candidate_bank_seed.sql",
    "supabase/migrations/202607200001_gate_b_measurement_validation_gate.sql",
  ],
  currentManifest,
  constructModel: {
    publicAxes: [
      {
        domainId: "SE",
        symbols: ["E", "I"],
        facets: ["SE-RE", "SE-AI"],
      },
      {
        domainId: "OE",
        symbols: ["R", "N"],
        facets: ["OE-AE", "OE-CI", "OE-IE"],
      },
      {
        domainId: "RO",
        symbols: ["G", "A"],
        facets: ["RO-EC"],
        asymmetryNote:
          "대표 G/A는 RO-EC만 사용한다. RO-RN은 비공개 별도 연구 신호이며 대표 점수에 합산하지 않는다.",
      },
      {
        domainId: "SM",
        symbols: ["K", "M"],
        facets: ["SM-EP", "SM-OS"],
        candidateFacetExcludedFromCurrentRelease: "SM-RL",
      },
      {
        domainId: "ER",
        symbols: ["C", "Q"],
        facets: ["ER-IR", "ER-WD"],
      },
    ],
    interpretation:
      "60문항은 10개 세부 성향을 각 6문항으로 측정하는 연구 후보이며, 다섯 축·열 세부 성향 구조는 아직 검증할 가설이다.",
  },
  preregistration: {
    requiredBeforeOutcomeInspection: [
      "주 분석 모형과 대안 모형",
      "개발·확인 표본 분리 규칙",
      "문항 제외·수정·유지 기준",
      "불성실·속도·결측·판단 어려움 처리",
      "검사-재검사 간격",
      "외부 척도와 사용 권리",
      "집단별 문항 기능 분석 범위",
      "다중 비교와 탐색 분석 표시 규칙",
    ],
    noHARKingRule:
      "데이터를 본 뒤 바꾼 가설과 기준은 탐색 분석으로 명확히 분리한다.",
  },
  sampleSizePlan: {
    fixedArbitraryN: "prohibited",
    method:
      "5범주 순서형 응답, 60문항, 10세부 성향, 대안 요인모형, 예상 결측·탈락·재검사·집단별 분석을 반영한 Monte Carlo simulation으로 정한다.",
    scenarios: [
      "낮음·중간·높음 요인부하량",
      "세부 성향 간 낮음·중간·높음 상관",
      "범주 쏠림과 판단 어려움",
      "문항 교차적재와 국소 의존",
      "개발·확인·재검사·집단별 분석 표본 손실",
    ],
    target:
      "주요 모수의 편향·표준오차·수렴률·모형 구별력과 DIF 탐지력을 만족하는 가장 작은 표본 범위를 사전에 확정한다.",
  },
  dataQualityPlan: {
    requiredRecords: [
      "releaseId·itemRevisionId·scoringReleaseId",
      "문항별 응답·판단 어려움 이유·응답 시간",
      "세션 시작·중단·재개·완료",
      "기기·접근성·언어 이해 범주",
      "동의·철회·삭제 상태",
    ],
    flagsNotAutomaticDeletion: [
      "지나치게 짧은 전체·문항 응답 시간",
      "오랜 동일 번호 반복",
      "상반 문항의 비정상적 동일 패턴",
      "판단 어려움 과다",
      "중복 세션 또는 자동화 의심",
    ],
    exclusionRule:
      "품질 플래그 하나만으로 삭제하지 않고 사전 조합 규칙과 민감도 분석을 함께 보고한다.",
  },
  analysisStages: [
    {
      stage: "Q1-DESCRIPTIVE-ITEM",
      analyses: [
        "범주 분포·결측·판단 어려움·응답 시간",
        "문항별 천장·바닥·극단 쏠림",
        "정·역채점 문항의 방법 효과",
        "상황 라벨·반응 층위별 분포",
      ],
      outputState: "not_started",
    },
    {
      stage: "Q2-DEVELOPMENT-STRUCTURE",
      estimator:
        "5범주 순서형 응답에 적합한 polychoric correlation과 WLSMV 또는 동등한 강건 추정",
      candidateModels: [
        "M1: 10개 상관 세부 성향",
        "M2: 문항 수준 5개 상관 축",
        "M3: SE·OE·SM·ER은 부분 위계, RO-EC는 직접 축으로 둔 비대칭 모형",
        "M4: 목표 적재와 작은 교차적재를 허용한 ESEM",
        "M5: 정·역채점 또는 문장 형식 방법 요인을 둔 모형",
      ],
      decisionRule:
        "단일 fit 지수 기준으로 선택하지 않고 적재·교차적재·잔차·국소 의존·해석 가능성·확인 표본 재현을 함께 본다.",
      outputState: "not_started",
    },
    {
      stage: "Q3-CONFIRMATION",
      analyses: [
        "개발 표본에서 선택한 모형을 독립 확인 표본에 고정 적용",
        "CFI·TLI·RMSEA·SRMR과 잔차·수렴·Heywood case 보고",
        "사전 명세되지 않은 수정지수 사용은 탐색 분석으로 분리",
      ],
      outputState: "not_started",
    },
    {
      stage: "Q4-RELIABILITY-PRECISION",
      analyses: [
        "세부 성향·축별 omega와 조건부 측정 정밀도",
        "문항 제거가 내용 포괄성을 해치지 않는지 확인",
        "검사-재검사 안정성과 평균 변화",
        "개인 점수 구간별 표준오차 또는 posterior uncertainty",
      ],
      outputState: "not_started",
    },
    {
      stage: "Q5-CONVERGENT-DISCRIMINANT",
      analyses: [
        "사용 권리가 확인된 외부 척도와 사전 가설 방향 비교",
        "같은 축 안 세부 성향의 수렴과 인접 축 판별",
        "사회적 바람직성·현재 기분·관계 상태와의 오염 점검",
        "MBTI 글자와의 동일성 주장이 아니라 예상되는 제한적 연관만 검토",
      ],
      outputState: "not_started",
    },
    {
      stage: "Q6-FAIRNESS-INVARIANCE-DIF",
      analyses: [
        "연령·성별·교육·한국어 편안함별 순서형 측정동일성",
        "문항 수준 DIF 크기와 방향",
        "스마트폰·접근성·완료 맥락별 기능 차이",
        "표본이 부족한 집단은 동등성으로 승인하지 않고 보류",
      ],
      outputState: "not_started",
    },
    {
      stage: "Q7-SCORING-CLASSIFICATION",
      analyses: [
        "단순 합산·요인점수·IRT 계열 점수의 안정성과 설명 가능성 비교",
        "50점 단순 분할과 경험적 경계·불확실성 표시 비교",
        "quick·full 결과 일치와 quick의 제한된 해석 범위",
        "결측·판단 어려움·역채점 처리의 민감도",
      ],
      outputState: "not_started",
    },
  ],
  diagnosticThresholdPolicy: {
    purpose:
      "수치 기준은 자동 승인 버튼이 아니라 수동 검토를 여는 신호다.",
    reviewSignals: [
      "목표 적재가 약하거나 인접 축 교차적재가 실질적으로 크다.",
      "국소 의존·방법 효과가 세부 성향보다 응답을 더 잘 설명한다.",
      "신뢰도·재검사·정밀도가 개인 피드백에 부족하다.",
      "집단별 모수 차이가 점수 해석을 바꾼다.",
      "모형 fit이 좋아도 내용 포괄성이 줄거나 해석이 축 정의와 어긋난다.",
    ],
    noSingleCutoffApproval: true,
  },
  boundaryAndFollowUpPlan: {
    currentProblem:
      "50점 이상/미만으로 글자를 즉시 확정하면 정확히 50점과 측정오차 범위의 사람을 임의로 한쪽에 배정한다.",
    researchAlgorithm: [
      "각 축의 연속 점수와 불확실성 구간을 계산한다.",
      "정확히 동률이거나 불확실성 구간이 중간점을 가로지르면 해당 축만 추가 문항 대상으로 둔다.",
      "추가 문항은 같은 문장 반복이 아니라 해당 축에서 정보량이 높고 아직 보지 않은 HIGH·LOW 균형 문항으로 고른다.",
      "3개 단위로 추가하고 최대 6개까지 갱신한다.",
      "최대 문항 뒤에도 불확실하면 가까운 글자와 양방향 비율을 보여주되 확정적 표현을 쓰지 않는다.",
    ],
    activationRequirements: [
      "문항 모수와 정보량의 독립 확인 표본 재현",
      "추가 문항 선택 편향·피로·응답 변경 효과 검증",
      "고정 60문항 대비 분류 안정성과 사용자 부담 비교",
    ],
    currentState: "simulation_and_empirical_validation_required",
  },
  releaseDecision: {
    activationGates: [
      "cognitive_review",
      "fairness_and_invariance",
      "quantitative_pilot",
      "reliability_and_structure",
    ],
    currentState: "all_not_started",
    activeReleaseAllowed: false,
    customerScoringAuthority: "provisional_only",
  },
  nextGate: {
    name: "ANALYSIS_INPUT_CONTRACT_AND_SIMULATION_HARNESS",
    actions: [
      "60문항 응답 export의 열·결측·판단 어려움·시간·release 무결성 계약을 만든다.",
      "실제 데이터를 보지 않고 Monte Carlo 표본 수·모형 회수·경계 알고리즘 모의시험 코드를 준비한다.",
      "실제 수집 전 분석 계획과 simulation seed를 잠근다.",
    ],
  },
};
if (
  currentManifest.itemCount !== 60 ||
  Object.keys(currentManifest.facetCounts).length !== 10 ||
  currentManifest.keyedDirectionCounts.HIGH !== 30 ||
  currentManifest.keyedDirectionCounts.LOW !== 30 ||
  currentManifest.scoringKeyCounts.direct !== 30 ||
  currentManifest.scoringKeyCounts.reverse !== 30
) {
  throw new Error("Current 60-item beta manifest is not balanced.");
}

const output = await prettier.format(JSON.stringify(plan), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(plan), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 quantitative validation plan is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Quantitative validation plan v2.3: ${currentManifest.itemCount} beta items, ${Object.keys(currentManifest.facetCounts).length} facets, HIGH/LOW ${currentManifest.keyedDirectionCounts.HIGH}/${currentManifest.keyedDirectionCounts.LOW}, direct/reverse ${currentManifest.scoringKeyCounts.direct}/${currentManifest.scoringKeyCounts.reverse}, analyses not started.`,
);

function buildMarkdown(result) {
  return `# v2.3 5축 점수 정량 검증 계획

## 현재 60문항 구조

- release: \`${result.currentManifest.itemBankReleaseId}\`
- 문항: ${result.currentManifest.itemCount}
- 공개 세부 성향: ${Object.keys(result.currentManifest.facetCounts).length}
- HIGH / LOW: ${result.currentManifest.keyedDirectionCounts.HIGH} / ${result.currentManifest.keyedDirectionCounts.LOW}
- 정 / 역채점: ${result.currentManifest.scoringKeyCounts.direct} / ${result.currentManifest.scoringKeyCounts.reverse}

OE는 3개 세부 성향, SE·SM·ER은 2개, 대표 G/A는 RO-EC 1개만
포함한다. 따라서 모든 축에 같은 위계 구조를 강요하지 않고 10상관
세부 성향, 5상관 축, 부분 위계, ESEM, 방법 요인을 독립 확인 표본에서
비교한다.

## 분석 순서

1. 응답 분포·판단 어려움·시간·정역채점 방법 효과
2. 개발 표본의 대안 구조 비교
3. 독립 확인 표본 재현
4. omega·검사-재검사·점수 구간별 정밀도
5. 수렴·판별·사회적 바람직성·현재 상태 오염
6. 연령·성별·교육·한국어·기기별 동일성·DIF
7. 합산·요인·IRT 점수와 경계 분류 비교

표본 수는 임의 숫자로 고정하지 않고 5범주 순서형 응답, 60문항,
10세부 성향, 결측·탈락·재검사·집단별 분석을 반영한 Monte Carlo
simulation으로 정한다.

정확히 동률이거나 불확실성 구간이 중간점을 가로지르면 해당 축에서만
새 HIGH·LOW 균형 문항을 3개씩 최대 6개까지 제시하는 안을 모의시험한다.
문항 모수와 분류 안정성이 확인되기 전에는 활성화하지 않는다.

현재 정량 분석과 데이터 수집은 시작하지 않았고 release는
\`provisional_only\`다.
`;
}
