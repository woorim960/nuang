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
  "TRAIT_MAP_P0_MODEL_OUTPUT_CONTRACT_V2_3.json",
);
const fixturePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_NULL_SYNTHETIC_MODEL_FIXTURE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "150_P0_MODEL_OUTPUT_CONTRACT_AND_NULL_FIXTURE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const readyPath = readGenerated(
  "TRAIT_MAP_P0_DIRECT_VALIDATION_READY_PATH_RUN_V2_3.json",
);
const modules = uniqueBy(
  readyPath.analysisRows.map((entry) => ({
    moduleId: entry.moduleId,
    scenarioRef: entry.scenarioRef,
    targetAxes: entry.targetAxes,
  })),
  "moduleId",
);
const responseLayers = [
  ...new Set(readyPath.analysisRows.map((entry) => entry.responseLayer)),
].sort((left, right) => left.localeCompare(right, "en"));

const decisionRules = {
  estimand:
    "축 점수 1 SD 증가에 따른 방향 점수의 사전등록 표준화 계수",
  discoveryThresholds: {
    minimumAbsoluteEffect: 0.2,
    maximumFalseDiscoveryRate: 0.05,
    confidenceIntervalMustExcludeZero: true,
  },
  confirmationThresholds: {
    minimumAbsoluteEffect: 0.2,
    maximumTwoSidedPValue: 0.05,
    confidenceIntervalMustExcludeZero: true,
    directionMustMatchDiscovery: true,
  },
  releaseRules: [
    "discovery와 독립 confirmation을 모두 통과해야 한다.",
    "축·상황·응답 층·방향이 사전등록 내용과 일치해야 한다.",
    "품질, 결측, 측정 불변성, 민감도 분석 gate를 모두 통과해야 한다.",
    "실제 표본이어야 하며 synthetic·demo·fixture는 공개 근거가 될 수 없다.",
    "통계 신호는 canonical 문장 직접 지지가 아니라 독립 문장 검토의 입력일 뿐이다.",
    "독립 문장 검토와 고객 이해도 검토를 통과하기 전에는 공개할 수 없다.",
  ],
};

const modelOutputSchema = {
  requiredFields: [
    "outputRef",
    "moduleId",
    "scenarioRef",
    "targetAxis",
    "responseLayer",
    "analysisStage",
    "estimate",
    "standardError",
    "confidenceInterval95",
    "pValue",
    "falseDiscoveryRate",
    "sampleSize",
    "qualityGate",
    "synthetic",
    "decision",
    "decisionReasons",
  ],
  enumerations: {
    analysisStage: ["discovery", "confirmation"],
    qualityGate: ["pass", "fail", "not_run"],
    decision: [
      "no_signal",
      "technical_positive_synthetic_only",
      "eligible_for_independent_copy_review",
      "blocked_quality",
      "blocked_incomplete_confirmation",
    ],
  },
  nullHandling:
    "estimate가 기준 미만이거나 신뢰구간이 0을 포함하면 no_signal로 판정한다.",
  syntheticHandling:
    "모든 기술 기준을 통과해도 synthetic=true이면 technical_positive_synthetic_only에서 멈춘다.",
};

const nullModelOutputs = [];
for (const module of modules) {
  for (const targetAxis of module.targetAxes) {
    for (const responseLayer of responseLayers) {
      for (const analysisStage of ["discovery", "confirmation"]) {
        nullModelOutputs.push({
          outputRef: [
            "NULL",
            module.moduleId,
            targetAxis,
            responseLayer,
            analysisStage,
          ].join(":"),
          moduleId: module.moduleId,
          scenarioRef: module.scenarioRef,
          targetAxis,
          responseLayer,
          analysisStage,
          estimate: 0,
          standardError: 0.1,
          confidenceInterval95: [-0.196, 0.196],
          pValue: 1,
          falseDiscoveryRate: 1,
          sampleSize: 0,
          qualityGate: "not_run",
          synthetic: true,
          decision: "no_signal",
          decisionReasons: [
            "absolute_effect_below_preregistered_minimum",
            "confidence_interval_includes_zero",
            "synthetic_fixture_never_releases",
          ],
        });
      }
    }
  }
}

const nullFixture = {
  contractVersion: "nuang-trait-map-p0-null-synthetic-model-fixture.v2.3",
  fixtureId: "TRAIT-MAP-P0-NULL-SYNTHETIC-MODEL-FIXTURE.2.3",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReadyPathReportId: readyPath.reportId,
  synthetic: true,
  purpose:
    "효과가 없는 입력이 canonical 지지나 공개 승인으로 잘못 승격되지 않는지 확인한다.",
  modelOutputs: nullModelOutputs,
};

const contract = {
  contractVersion: "nuang-trait-map-p0-model-output-contract.v2.3",
  contractId: "TRAIT-MAP-P0-MODEL-OUTPUT-CONTRACT.2.3",
  status: "NULL_SYNTHETIC_GATE_PASSED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReadyPathReportId: readyPath.reportId,
  summary: {
    modules: modules.length,
    targetAxisModulePairs: modules.reduce(
      (sum, module) => sum + module.targetAxes.length,
      0,
    ),
    responseLayers: responseLayers.length,
    analysisStages: 2,
    nullModelOutputs: nullModelOutputs.length,
    noSignalDecisions: nullModelOutputs.filter(
      (entry) => entry.decision === "no_signal",
    ).length,
    outputsEligibleForIndependentCopyReview: 0,
    canonicalSupportDecisions: 0,
    canonicalRevisions: 0,
    publicationApprovalsGranted: 0,
    realParticipants: 0,
    inferentialModelsRun: 0,
  },
  decisionRules,
  modelOutputSchema,
  failClosedAssertions: [
    {
      assertion: "모든 null 출력은 no_signal이다.",
      passed: nullModelOutputs.every(
        (entry) => entry.decision === "no_signal",
      ),
    },
    {
      assertion: "어떤 신뢰구간도 0을 배제하지 않는다.",
      passed: nullModelOutputs.every(
        (entry) =>
          entry.confidenceInterval95[0] <= 0 &&
          entry.confidenceInterval95[1] >= 0,
      ),
    },
    {
      assertion: "synthetic 출력은 공개·문장 지지로 승격되지 않는다.",
      passed:
        nullModelOutputs.every((entry) => entry.synthetic) &&
        nullModelOutputs.every(
          (entry) =>
            entry.decision !==
            "eligible_for_independent_copy_review",
        ),
    },
  ],
  nextGate: {
    name: "POSITIVE_SYNTHETIC_BOUNDARY_FIXTURE",
    action:
      "모든 기술 기준을 통과하는 합성 양성 신호도 synthetic 경계에서 공개되지 않는지 검증한다.",
  },
};

if (
  contract.summary.modules !== 6 ||
  contract.summary.targetAxisModulePairs !== 10 ||
  contract.summary.responseLayers !== 4 ||
  contract.summary.nullModelOutputs !== 80 ||
  contract.summary.noSignalDecisions !== 80 ||
  !contract.failClosedAssertions.every((entry) => entry.passed) ||
  contract.summary.outputsEligibleForIndependentCopyReview !== 0 ||
  contract.summary.canonicalSupportDecisions !== 0 ||
  contract.summary.canonicalRevisions !== 0 ||
  contract.summary.publicationApprovalsGranted !== 0 ||
  contract.summary.realParticipants !== 0 ||
  contract.summary.inferentialModelsRun !== 0
) {
  throw new Error("P0 null model-output contract invariants failed.");
}

const output = await prettier.format(JSON.stringify(contract), {
  parser: "json",
});
const fixtureOutput = await prettier.format(
  JSON.stringify(nullFixture),
  { parser: "json" },
);
const markdown = await prettier.format(buildMarkdown(contract), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [fixturePath, fixtureOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 P0 null model-output contract is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(fixturePath, fixtureOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 model-output contract v2.3: ${nullModelOutputs.length} null outputs, ${contract.summary.noSignalDecisions} no-signal decisions, releases 0.`,
);

function uniqueBy(entries, key) {
  return [
    ...new Map(entries.map((entry) => [entry[key], entry])).values(),
  ].sort((left, right) =>
    left[key].localeCompare(right[key], "en"),
  );
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(report) {
  return `# 150. P0 모형 출력 계약과 null 합성 fixture v2.3

- 상태: \`${report.status}\`
- 공개 상태: \`${report.publicationState}\`
- 모듈: **${report.summary.modules}개**
- 축-모듈 조합: **${report.summary.targetAxisModulePairs}개**
- null 모형 출력: **${report.summary.nullModelOutputs}개**
- \`no_signal\`: **${report.summary.noSignalDecisions}개**
- canonical 지지/수정/공개 승인: **0 / 0 / 0**

## 목적

효과가 없는 합성 입력이 통계 신호, canonical 문장 지지 또는 공개 승인으로 잘못 승격되지 않는지 재현 가능하게 확인한다. 이 fixture는 통계 추론 결과가 아니라 판정 엔진의 안전 경로 시험이다.

## 판정 기준

- discovery 최소 절대 효과: **${report.decisionRules.discoveryThresholds.minimumAbsoluteEffect}**
- discovery 최대 FDR: **${report.decisionRules.discoveryThresholds.maximumFalseDiscoveryRate}**
- confirmation 최대 양측 p: **${report.decisionRules.confirmationThresholds.maximumTwoSidedPValue}**
- discovery와 독립 confirmation의 방향이 같아야 한다.
- 신뢰구간은 0을 배제해야 한다.
- synthetic 자료는 모든 기술 기준을 통과해도 공개 근거가 될 수 없다.

## 확인 결과

${report.failClosedAssertions
  .map(
    (entry) =>
      `- ${entry.passed ? "통과" : "실패"} — ${entry.assertion}`,
  )
  .join("\n")}

## 해석 제한

표본 수는 0명이고 추론 모형은 실행하지 않았다. 따라서 이 결과는 뉴앙 축이나 문장의 타당성을 보여주지 않는다. null fixture는 오직 효과 없음 경로가 안전하게 닫히는지를 확인한다.

## 다음 gate

${report.nextGate.action}
`;
}
