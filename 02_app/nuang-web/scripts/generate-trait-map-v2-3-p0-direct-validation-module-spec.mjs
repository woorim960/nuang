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
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_P0_DIRECT_VALIDATION_MODULE_SPEC_V2_3.json",
);
const executionPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_DIRECT_VALIDATION_EXECUTION_REGISTER_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "145_P0_DIRECT_VALIDATION_MODULE_SPEC_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const priorityMatrix = readGenerated(
  "TRAIT_MAP_SCENARIO_GAP_PRIORITY_MATRIX_V2_3.json",
);
const cognitiveProtocol = readReview(
  "TRAIT_MAP_COGNITIVE_INTERVIEW_PROTOCOL_V2_3.json",
);
const quantitativePlan = readGenerated(
  "TRAIT_MAP_QUANTITATIVE_VALIDATION_PLAN_V2_3.json",
);
const p0ScenarioRefs = priorityMatrix.nextGate.scenarioRefs;

const scenarioStimuli = {
  "SCN-PERSON-OF-INTEREST-5": {
    stimulus:
      "마음에 드는 사람과 연락을 주고받고 있습니다. 최근 답장 간격과 말투가 전과 조금 달라졌지만, 그 이유는 아직 확인하지 못했습니다.",
    targetAxes: ["OE", "ER"],
    axisOutcomeBoundaries: {
      OE: {
        R: "직접 확인된 말·행동·조건을 구분해 기록하는 경향",
        N: "가능한 의미·앞뒤 맥락·이어질 방향을 생성하는 경향",
      },
      ER: {
        C: "반응 전에 속도와 표현 강도를 조절하는 경향",
        Q: "떠오른 반응을 비교적 빠르게 밖으로 표현하는 경향",
      },
    },
  },
  "SCN-PERSON-OF-INTEREST-11": {
    stimulus:
      "마음에 드는 사람과 이야기하던 중 내가 한 말에 상대가 예상과 다른 표정을 보였습니다. 정확히 어떤 뜻이었는지는 아직 듣지 못했습니다.",
    targetAxes: ["OE", "ER"],
    axisOutcomeBoundaries: {
      OE: {
        R: "실제로 한 말과 관찰한 반응을 따로 확인하는 경향",
        N: "상대 반응의 가능한 이유와 다음 흐름을 떠올리는 경향",
      },
      ER: {
        C: "즉시 반응하기 전에 정리하고 표현을 조절하는 경향",
        Q: "놀람·걱정·궁금함을 비교적 빠르게 표현하는 경향",
      },
    },
  },
  "SCN-PERSON-OF-INTEREST-8": {
    stimulus:
      "마음에 드는 사람을 다음 주에도 만나고 싶습니다. 상대도 같은 마음인지는 아직 모르며, 지금 말해도 되는 상황입니다.",
    targetAxes: ["SE", "OE"],
    axisOutcomeBoundaries: {
      SE: {
        E: "대화를 열고 상대 반응을 들으며 생각을 정리하는 경향",
        I: "먼저 혼자 생각을 정리한 뒤 표현하는 경향",
      },
      OE: {
        R: "원하는 일정·연락·답변 같은 구체 조건을 확인하는 경향",
        N: "관계가 이어질 여러 가능성과 표현의 의미를 연결하는 경향",
      },
    },
  },
  "SCN-PERSON-OF-INTEREST-7": {
    stimulus:
      "마음에 드는 사람이 오늘 힘든 일이 있었다며 잠깐 이야기할 수 있는지 물었습니다. 어떤 도움을 원하는지는 아직 말하지 않았습니다.",
    targetAxes: ["RO"],
    axisOutcomeBoundaries: {
      RO: {
        G: "무슨 일이 있었는지와 해결 가능한 부분을 확인하는 경향",
        A: "어떤 마음인지와 어떤 지원이 편한지를 확인하는 경향",
      },
    },
  },
  "SCN-PERSON-OF-INTEREST-6": {
    stimulus:
      "마음에 드는 사람과 함께 갈 장소를 정하고 있습니다. 서로 원하는 장소가 다르다는 것을 알게 됐습니다.",
    targetAxes: ["OE", "RO"],
    axisOutcomeBoundaries: {
      OE: {
        R: "거리·시간·비용처럼 확인 가능한 조건을 비교하는 경향",
        N: "각 선택이 만들 경험과 다른 대안을 떠올리는 경향",
      },
      RO: {
        G: "차이의 원인과 실행 가능한 해결 기준을 찾는 경향",
        A: "서로 중요하게 여기는 마음과 관계의 수용 가능성을 살피는 경향",
      },
    },
  },
  "SCN-FAMILY-7": {
    stimulus:
      "가족이 최근 힘든 일이 있어 도움을 받고 싶다고 말했습니다. 어떤 도움을 원하는지는 아직 구체적으로 말하지 않았습니다.",
    targetAxes: ["RO"],
    axisOutcomeBoundaries: {
      RO: {
        G: "문제와 필요한 실질 지원, 맡을 수 있는 범위를 확인하는 경향",
        A: "힘든 마음과 가족에게 편안한 지원 방식을 확인하는 경향",
      },
    },
  },
};

const modules = p0ScenarioRefs.map((scenarioRef, rankIndex) => {
  const priorityRow = priorityMatrix.rows.find(
    (row) => row.scenarioRef === scenarioRef,
  );
  const stimulus = scenarioStimuli[scenarioRef];
  if (!priorityRow || !stimulus) {
    throw new Error(`P0 module input missing: ${scenarioRef}`);
  }
  return {
    moduleId: `DVM-P0-${String(rankIndex + 1).padStart(2, "0")}`,
    rank: rankIndex + 1,
    scenarioRef,
    label: priorityRow.label,
    targetContext: priorityRow.targetContext,
    targetAxes: stimulus.targetAxes,
    affectedDirectionalEntries: priorityRow.directionalEntryCount,
    neutralStimulus: stimulus.stimulus,
    stimulusReviewState:
      "internal_draft_pending_cognitive_and_independent_review",
    responseSequence: [
      {
        order: 1,
        responseLayer: "attention",
        prompt:
          "이 상황에서 가장 먼저 눈에 들어오거나 확인하고 싶은 것은 무엇인가요?",
        format: "open_text",
      },
      {
        order: 2,
        responseLayer: "first_thought",
        prompt:
          "이 상황에서 처음 드는 생각을 떠오른 그대로 적어 주세요.",
        format: "open_text",
      },
      {
        order: 3,
        responseLayer: "actual_response",
        prompt:
          "실제로는 어떻게 행동할 가능성이 가장 큰가요? 구체적으로 적어 주세요.",
        format: "open_text_then_randomized_behavior_choice",
      },
      {
        order: 4,
        responseLayer: "communication",
        prompt:
          "상대에게 직접 말하거나 메시지를 보낸다면 어떻게 표현할까요?",
        format: "open_text",
      },
    ],
    axisOutcomeBoundaries: stimulus.axisOutcomeBoundaries,
    codingContract: {
      coders: 2,
      blindness:
        "첫 판정에서 참여자의 뉴앙 점수·코드·다른 코더 판정을 보지 않는다.",
      unit:
        "attention·first_thought·actual_response·communication을 별도 단위로 코딩한다.",
      allowedLabels: [
        "direction_a",
        "direction_b",
        "mixed",
        "not_observable",
        "off_scenario",
      ],
      interraterMetrics: [
        "weighted_kappa_for_ordered_or_directional_codes",
        "icc_for_continuous_ratings",
        "raw_agreement_with_confidence_interval",
      ],
      adjudication:
        "불일치는 근거 구절을 남긴 뒤 제3 검토자가 합의하며 최초 판정은 덮어쓰지 않는다.",
    },
    directValidationState: "not_started",
    independentReviewState: "not_started",
    cognitiveInterviewState: "not_started",
    publicationState: "research_only",
  };
});

const report = {
  contractVersion:
    "nuang-trait-map-p0-direct-validation-module-spec.v2.3",
  reportId: "TRAIT-MAP-P0-DIRECT-VALIDATION-MODULE-SPEC.2.3",
  status: "SIX_P0_MODULES_SPECIFIED_EXECUTION_NOT_STARTED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourcePriorityMatrixReportId: priorityMatrix.reportId,
  sourceCognitiveProtocolReportId: cognitiveProtocol.reportId,
  sourceQuantitativePlanReportId: quantitativePlan.reportId,
  reviewerIdentity: {
    type: "internal_validation_design",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  summary: {
    p0Modules: modules.length,
    neutralStimuliDrafted: modules.length,
    responseLayersPerModule: 4,
    totalCoreResponseUnits: modules.reduce(
      (sum, module) => sum + module.responseSequence.length,
      0,
    ),
    affectedDirectionalCanonicalEntries: modules.reduce(
      (sum, module) => sum + module.affectedDirectionalEntries,
      0,
    ),
    modulesExecuted: 0,
    participantsCollected: 0,
    directValidationCompletedModules: 0,
    releasedCanonicalEntries: 0,
    publicationApprovalsGranted: 0,
  },
  sharedExecutionContract: {
    identityAndConsent: {
      name: "do_not_collect",
      email: "do_not_collect",
      phone: "do_not_collect",
      accountLink: "prohibited_by_default",
      participantRef: "server_generated_random_identifier",
      informedConsent: "required",
      withdrawal: "allowed_until_analysis_lock",
    },
    sessionBurden: {
      maximumModulesPerParticipant: 2,
      coreResponseUnitsPerParticipant: 8,
      moduleOrder: "counterbalanced",
      axisDirectionOptions:
        "open response always precedes any directional option",
    },
    predictorContract: {
      scoring:
        "5개 알파벳 범주 대신 잠긴 검사 버전의 연속 축 점수와 측정오차를 사용한다.",
      prohibited:
        "이 장면 응답을 다시 축 점수에 넣어 predictor와 outcome을 순환 정의하지 않는다.",
      assessmentTiming:
        "핵심 검사와 장면 응답의 순서를 무작위화하거나 충분한 간격을 두고 순서 효과를 기록한다.",
    },
    stagedSampling: [
      {
        stage: "FEASIBILITY_PILOT",
        purpose:
          "자극문 이해, 응답 누락, 코딩 가능성, 분산과 피로를 확인한다.",
        inferentialUse: false,
        fixedSampleClaim: false,
      },
      {
        stage: "POWER_SIMULATION_AND_PREREGISTRATION",
        purpose:
          "파일럿 분산·클러스터·결측 정보를 사용해 최소 검출 효과와 표본 수를 시뮬레이션하고 분석을 잠근다.",
        inferentialUse: false,
        fixedSampleClaim: false,
      },
      {
        stage: "DISCOVERY_SAMPLE",
        purpose:
          "축 점수–코딩 결과의 관련과 비선형성·상황 상호작용을 추정한다.",
        inferentialUse: true,
        sampleIndependence: "must_not_overlap_confirmation",
      },
      {
        stage: "CONFIRMATION_SAMPLE",
        purpose:
          "잠긴 계수·방향·임계값을 새 표본에서 확인한다.",
        inferentialUse: true,
        sampleIndependence: "required",
      },
    ],
    analysisModel: {
      unit: "response layer nested in scenario nested in participant",
      predictor:
        "continuous latent or reliability-adjusted Nuang axis score",
      outcomes: [
        "blind-coded directional tendency",
        "mixed response probability",
        "response latency",
        "open-text semantic code",
      ],
      requiredTerms: [
        "axis main effect",
        "scenario main effect",
        "axis by scenario interaction",
        "order and familiarity covariates",
        "nonlinear axis term when preregistered",
      ],
      reporting:
        "effect estimate, uncertainty interval, absolute outcome distribution, missingness, coder agreement를 함께 보고한다.",
    },
    decisionRules: [
      "방향 효과가 없거나 확인 표본에서 재현되지 않으면 해당 구절은 직접 근거 미충족으로 유지한다.",
      "효과가 있어도 모든 사람에게 나타나는 행동으로 쓰지 않고 관찰된 경향 범위만 표현한다.",
      "관계 성공·호감·능력·도덕성 결과는 이 모듈의 검증 대상이 아니며 추론하지 않는다.",
      "인지 면담에서 축 혼동이나 번역투가 반복되면 문구를 수정하고 새 참여자에게 다시 시험한다.",
      "독립 검토와 고객 발행 승인을 모두 통과하기 전 운영 allowlist에 추가하지 않는다.",
    ],
  },
  modules,
  nextGate: {
    name: "P0_DIRECT_VALIDATION_DATA_CONTRACT_AND_FIXTURE",
    action:
      "자극 버전, 무작위 배정, 원 응답, blind 코딩, 합의, 축 점수 snapshot을 불변 저장하는 DB 계약과 합성 fixture를 만든다.",
  },
};

const executionRegister = {
  contractVersion:
    "nuang-trait-map-p0-direct-validation-execution-register.v2.3",
  registerId:
    "TRAIT-MAP-P0-DIRECT-VALIDATION-EXECUTION-REGISTER.2.3",
  status: "NOT_STARTED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReportId: report.reportId,
  modules: modules.map((module) => ({
    moduleId: module.moduleId,
    scenarioRef: module.scenarioRef,
    stimulusVersion: 1,
    stimulusHash: null,
    independentStimulusReview: "not_started",
    cognitivePilot: "not_started",
    feasibilityPilot: "not_started",
    powerSimulation: "not_started",
    preregistration: "not_started",
    discoveryCollection: "not_started",
    confirmationCollection: "not_started",
    finalDecision: null,
    releasedCanonicalVariantIds: [],
  })),
};

if (
  report.summary.p0Modules !== 6 ||
  report.summary.neutralStimuliDrafted !== 6 ||
  report.summary.responseLayersPerModule !== 4 ||
  report.summary.totalCoreResponseUnits !== 24 ||
  report.summary.affectedDirectionalCanonicalEntries !== 60 ||
  report.summary.modulesExecuted !== 0 ||
  report.summary.participantsCollected !== 0 ||
  report.summary.directValidationCompletedModules !== 0 ||
  report.summary.releasedCanonicalEntries !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error("P0 direct validation module invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const executionOutput = await prettier.format(
  JSON.stringify(executionRegister),
  { parser: "json" },
);
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [executionPath, executionOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 P0 direct validation module spec is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(executionPath, executionOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 direct validation spec v2.3: ${modules.length} modules, ${report.summary.totalCoreResponseUnits} core response units, ${report.summary.affectedDirectionalCanonicalEntries} affected directional entries, execution 0.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function readReview(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 P0 직접 검증 모듈

## 결과

- P0 장면 모듈: **${result.summary.p0Modules}개**
- 중립 자극문 초안: **${result.summary.neutralStimuliDrafted}개**
- 모듈별 응답 층: **${result.summary.responseLayersPerModule}개**
- 핵심 응답 단위: **${result.summary.totalCoreResponseUnits}개**
- 영향받는 방향 문장: **${result.summary.affectedDirectionalCanonicalEntries}개**
- 실행·참여자·직접 검증 완료: **0**

각 모듈은 무엇을 먼저 보는지, 처음 무슨 생각이 드는지, 실제로 어떻게 반응할지, 어떤 말로 표현할지를 분리한다. 열린 응답을 먼저 받고 코더는 참여자의 뉴앙 점수를 보지 않는다. 알파벳 범주가 아니라 연속 축 점수와 측정오차를 사용한다.

파일럿은 실행성과 분산을 확인할 뿐 효과를 확정하지 않는다. 본 표본은 검정력 시뮬레이션과 사전 등록 뒤 탐색·확인 표본을 분리한다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
