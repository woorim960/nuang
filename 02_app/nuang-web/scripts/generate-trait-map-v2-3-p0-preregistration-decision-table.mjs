import crypto from "node:crypto";
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
  "TRAIT_MAP_P0_PREREGISTRATION_DECISION_TABLE_V2_3.json",
);
const reviewPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_PREREGISTRATION_LOCK_REGISTER_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "152_P0_PREREGISTRATION_DECISION_TABLE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const moduleSpec = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_MODULE_SPEC_V2_3.json",
);
const modelContract = readGenerated(
  "TRAIT_MAP_P0_MODEL_OUTPUT_CONTRACT_V2_3.json",
);

const responseLayerRoles = {
  attention: {
    role: "secondary",
    reason:
      "무엇을 먼저 살피는지는 사고·행동 결과와 구분해 보조 결과로 본다.",
  },
  first_thought: {
    role: "primary",
    reason:
      "처음 드는 생각의 방향과 뉴앙 축 점수의 관계를 직접 시험한다.",
  },
  actual_response: {
    role: "primary",
    reason:
      "실제로 나타나는 반응과 처음 드는 생각의 차이를 별도로 시험한다.",
  },
  communication: {
    role: "secondary",
    reason:
      "상대에게 표현하는 방식은 상황·관계 규범의 영향을 크게 받아 보조 결과로 본다.",
  },
};

const moduleLocks = moduleSpec.modules.map((module) => ({
  lockId: `PREREG-${module.moduleId}`,
  moduleId: module.moduleId,
  rank: module.rank,
  scenarioRef: module.scenarioRef,
  label: module.label,
  targetContext: module.targetContext,
  targetAxes: module.targetAxes,
  affectedDirectionalEntries: module.affectedDirectionalEntries,
  stimulusHash: sha256(module.neutralStimulus),
  responseSequenceHash: sha256(
    JSON.stringify(module.responseSequence),
  ),
  primaryEstimands: module.targetAxes.flatMap((targetAxis) =>
    ["first_thought", "actual_response"].map((responseLayer) => ({
      targetAxis,
      responseLayer,
      estimand:
        "축 점수 1 SD 증가에 따른 사전등록 방향 점수의 표준화 회귀계수",
      expectedDirection:
        "axis_score_sign_matches_blind_coded_direction",
    })),
  ),
  secondaryEstimands: module.targetAxes.flatMap((targetAxis) =>
    ["attention", "communication"].map((responseLayer) => ({
      targetAxis,
      responseLayer,
      estimand:
        "축 점수 1 SD 증가에 따른 사전등록 방향 점수의 표준화 회귀계수",
      expectedDirection:
        "axis_score_sign_matches_blind_coded_direction",
    })),
  ),
  discoveryConfirmation: {
    splitUnit: "participant",
    splitBeforeOutcomeCoding: true,
    discoveryAndConfirmationParticipantsMustNotOverlap: true,
    randomSeedPublication:
      "data lock 전에 seed hash를 등록하고 분석 공개 때 원 seed를 공개한다.",
  },
  multiplicityFamily:
    "module × targetAxis × responseLayer × analysisStage",
  sampleSizeState:
    "pending_blinded_feasibility_and_power_simulation",
  executionState: "not_started",
  publicationState: "research_only",
}));

const exclusionRules = [
  {
    ruleId: "EX-01",
    rule: "동의하지 않았거나 철회한 참여자",
    timing: "before_analysis_lock",
    outcomeBlind: true,
  },
  {
    ruleId: "EX-02",
    rule: "무작위 배정된 상황을 열지 않았거나 필수 응답 층을 하나도 완료하지 않은 세션",
    timing: "before_coding",
    outcomeBlind: true,
  },
  {
    ruleId: "EX-03",
    rule: "동일 참여자·동일 모듈 중복 제출은 최초 완료 세션만 유지",
    timing: "before_coding",
    outcomeBlind: true,
  },
  {
    ruleId: "EX-04",
    rule: "blind 코딩에서 off_scenario로 합의된 응답 단위",
    timing: "after_adjudication_before_analysis",
    outcomeBlind: false,
  },
  {
    ruleId: "EX-05",
    rule: "두 코더 불일치가 제3자 합의 없이 남은 응답 단위",
    timing: "after_coding_before_analysis",
    outcomeBlind: false,
  },
];

const decisionTable = {
  contractVersion:
    "nuang-trait-map-p0-preregistration-decision-table.v2.3",
  reportId:
    "TRAIT-MAP-P0-PREREGISTRATION-DECISION-TABLE.2.3",
  status:
    "DECISION_TABLE_LOCKED_SAMPLE_SIZE_AND_EXTERNAL_REGISTRATION_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceModuleSpecReportId: moduleSpec.reportId,
  sourceModelOutputContractId: modelContract.contractId,
  summary: {
    modulesLocked: moduleLocks.length,
    targetAxisModulePairs: moduleLocks.reduce(
      (sum, module) => sum + module.targetAxes.length,
      0,
    ),
    primaryEstimands: moduleLocks.reduce(
      (sum, module) => sum + module.primaryEstimands.length,
      0,
    ),
    secondaryEstimands: moduleLocks.reduce(
      (sum, module) => sum + module.secondaryEstimands.length,
      0,
    ),
    exclusionRules: exclusionRules.length,
    modulesWithFixedSampleSize: moduleLocks.filter(
      (module) =>
        module.sampleSizeState === "fixed_before_data_collection",
    ).length,
    externalPreregistrationsCompleted: 0,
    modulesExecuted: 0,
    realParticipants: 0,
    canonicalSupportDecisions: 0,
    publicationApprovalsGranted: 0,
  },
  globalLock: {
    protocolVersion: "P0-DIRECT-VALIDATION-PROTOCOL.2.3-DRAFT-LOCK-1",
    hypothesisBoundary:
      "뉴앙 축 점수와 동일 상황에서 blind 코딩한 반응 방향의 연속적 관계만 시험한다.",
    prohibitedClaims: [
      "뉴앙 코드가 개인의 행동을 확정적으로 예측한다.",
      "한 상황의 결과가 다른 관계·상황으로 자동 전이된다.",
      "통계 신호만으로 canonical 문장 전체가 직접 지지된다.",
      "합성 fixture 결과가 실제 타당도 근거다.",
    ],
    responseLayerRoles,
    analysisPopulation:
      "동의·품질·중복·철회 규칙을 통과하고 축 점수와 blind 코딩 결과가 있는 참여자",
    modelFamily:
      "방향 점수 척도에 맞춘 사전 지정 ordinal 또는 연속 회귀; 선택 기준은 실제 결과를 보기 전에 합성·feasibility 분포만으로 잠근다.",
    covariates:
      "주분석은 무공변량. 사전에 수집을 승인한 연령대·성별·교육 수준은 민감도·DIF 분석에만 사용한다.",
    missingData:
      "응답 층별 결측을 보고하고 주분석에서 해당 층만 제외한다. 참여자 전체를 임의 대치하지 않는다.",
    multiplicity:
      "discovery의 모든 module×axis×layer 가족에 Benjamini-Hochberg FDR 0.05를 적용하고 confirmation은 사전등록된 조합만 양측 alpha 0.05로 시험한다.",
    confirmation:
      "독립 참여자 표본, 동일 자극·코딩 계약, 동일 방향, |표준화 효과|≥0.20, 95% CI 0 배제",
    sensitivityAnalyses: [
      "adjudication 포함/제외",
      "open text만/행동 선택 포함",
      "극단 응답시간 제외 전후",
      "축 점수 측정오차 반영 전후",
    ],
    stoppingRules: [
      "안전 문제 또는 동의 계약 위반이 발견되면 신규 배정을 즉시 중단한다.",
      "중간 효과를 보고 표본을 조기 종료하거나 늘리지 않는다.",
      "feasibility 단계는 효과 방향을 공개하지 않고 분산·결측·코딩 가능성만 산출한다.",
    ],
  },
  exclusionRules,
  sampleSizeLockProcedure: {
    currentState:
      "not_locked_no_real_or_feasibility_data_available",
    order: [
      "실행 가능성 표본에서 효과 방향을 가린 채 결측·분산·코딩 가능성을 확인한다.",
      "사전 지정한 최소 중요 효과 |β|=0.20, power 0.90, 가족별 alpha/FDR 규칙으로 simulation을 실행한다.",
      "탈락·철회·코딩 불가율의 상한을 보수적으로 더한다.",
      "discovery와 confirmation의 모듈별 목표 N과 최대 N을 외부 registry에 타임스탬프와 함께 잠근다.",
      "그 뒤에만 본 수집을 시작한다.",
    ],
    effectDataMayNotBeInspectedBeforeLock: true,
  },
  moduleLocks,
  amendmentPolicy: {
    beforeCollection:
      "변경 사유·diff·새 hash를 남기고 새 버전으로 등록한다.",
    afterCollectionBeforeAnalysis:
      "결과를 보지 않은 변경만 허용하며 기존 계획 분석도 함께 보존한다.",
    afterOutcomeInspection:
      "탐색 분석으로 명시하고 confirmation 근거로 세지 않는다.",
  },
  nextGate: {
    name: "PARTICIPANT_RIGHTS_AND_DATA_LIFECYCLE_CONTRACT",
    action:
      "동의·중단·철회·보존·삭제 규칙을 10개 테이블과 분석 view에 연결한다.",
  },
};

const reviewRegister = {
  registerVersion:
    "nuang-trait-map-p0-preregistration-lock-register.v2.3",
  sourceReportId: decisionTable.reportId,
  state: "awaiting_external_registration_and_sample_size_lock",
  locks: moduleLocks.map((module) => ({
    lockId: module.lockId,
    moduleId: module.moduleId,
    stimulusHash: module.stimulusHash,
    responseSequenceHash: module.responseSequenceHash,
    sampleSizeState: module.sampleSizeState,
    externalRegistryUrl: null,
    registeredAt: null,
    executionAuthorized: false,
  })),
  approvals: [],
};

if (
  decisionTable.summary.modulesLocked !== 6 ||
  decisionTable.summary.targetAxisModulePairs !== 10 ||
  decisionTable.summary.primaryEstimands !== 20 ||
  decisionTable.summary.secondaryEstimands !== 20 ||
  decisionTable.summary.exclusionRules !== 5 ||
  decisionTable.summary.modulesWithFixedSampleSize !== 0 ||
  decisionTable.summary.externalPreregistrationsCompleted !== 0 ||
  decisionTable.summary.modulesExecuted !== 0 ||
  decisionTable.summary.realParticipants !== 0 ||
  decisionTable.summary.canonicalSupportDecisions !== 0 ||
  decisionTable.summary.publicationApprovalsGranted !== 0 ||
  reviewRegister.locks.some(
    (entry) =>
      entry.externalRegistryUrl !== null ||
      entry.registeredAt !== null ||
      entry.executionAuthorized,
  )
) {
  throw new Error("P0 preregistration decision-table invariants failed.");
}

const output = await prettier.format(JSON.stringify(decisionTable), {
  parser: "json",
});
const reviewOutput = await prettier.format(
  JSON.stringify(reviewRegister),
  { parser: "json" },
);
const markdown = await prettier.format(
  buildMarkdown(decisionTable),
  { parser: "markdown" },
);

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [reviewPath, reviewOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error(
      "v2.3 P0 preregistration decision table is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reviewPath, reviewOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 preregistration table v2.3: ${moduleLocks.length} modules, ${decisionTable.summary.primaryEstimands} primary and ${decisionTable.summary.secondaryEstimands} secondary estimands; fixed sample sizes 0, execution 0.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function buildMarkdown(report) {
  return `# 152. P0 사전등록 결정표 v2.3

- 상태: \`${report.status}\`
- 모듈: **${report.summary.modulesLocked}개**
- 축-모듈: **${report.summary.targetAxisModulePairs}개**
- 주 결과 / 보조 결과: **${report.summary.primaryEstimands} / ${report.summary.secondaryEstimands}**
- 표본 수 잠금 / 외부 사전등록 / 실행: **0 / 0 / 0**

## 무엇을 잠갔나

- first_thought와 actual_response를 주 결과로 구분한다.
- attention과 communication은 보조 결과로 구분한다.
- 참여자 단위 discovery-confirmation 분리, 무중복 표본, 동일 방향 confirmation을 요구한다.
- 결과를 보기 전에 제외·결측·다중비교·민감도·중단 규칙을 고정한다.
- 통계 신호는 canonical 문장 전체를 직접 지지하지 않는다.

## 아직 잠그지 못한 것

실제·feasibility 자료가 없으므로 모듈별 표본 수는 임의로 만들지 않았다. 효과 방향을 가린 실행 가능성 자료와 power simulation을 거쳐 외부 registry에 목표 N·최대 N을 타임스탬프로 잠근 뒤에만 본 수집을 시작한다.

## 실행 경계

현재 실제 참여자, 실행 모듈, canonical 지지, 고객 발행 승인은 모두 0이다. 이 문서는 실행 준비 결정표이며 사전등록 완료나 타당도 근거가 아니다.
`;
}
