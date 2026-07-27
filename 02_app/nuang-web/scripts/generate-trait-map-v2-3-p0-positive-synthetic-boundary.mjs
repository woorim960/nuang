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
  "TRAIT_MAP_P0_POSITIVE_SYNTHETIC_BOUNDARY_RUN_V2_3.json",
);
const fixturePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_POSITIVE_SYNTHETIC_MODEL_FIXTURE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "151_P0_POSITIVE_SYNTHETIC_BOUNDARY_RUN_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const contract = readGenerated(
  "TRAIT_MAP_P0_MODEL_OUTPUT_CONTRACT_V2_3.json",
);
const nullFixture = readReview(
  "TRAIT_MAP_P0_NULL_SYNTHETIC_MODEL_FIXTURE_V2_3.json",
);
const positiveOutputs = nullFixture.modelOutputs.map(
  (entry, index) => ({
    ...entry,
    outputRef: entry.outputRef.replace(/^NULL:/, "POSITIVE:"),
    estimate: index % 4 < 2 ? 0.35 : -0.35,
    standardError: 0.0765,
    confidenceInterval95:
      index % 4 < 2 ? [0.2, 0.5] : [-0.5, -0.2],
    pValue: 0.001,
    falseDiscoveryRate: 0.01,
    sampleSize: 0,
    qualityGate: "pass",
    synthetic: true,
    decision: "technical_positive_synthetic_only",
    decisionReasons: [
      "technical_effect_thresholds_passed",
      "discovery_confirmation_direction_matched",
      "synthetic_fixture_never_releases",
      "real_independent_samples_absent",
    ],
  }),
);

const fixture = {
  contractVersion:
    "nuang-trait-map-p0-positive-synthetic-model-fixture.v2.3",
  fixtureId:
    "TRAIT-MAP-P0-POSITIVE-SYNTHETIC-MODEL-FIXTURE.2.3",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceContractId: contract.contractId,
  synthetic: true,
  purpose:
    "모든 기술 임계값을 통과하는 합성 출력도 실제 표본 경계에서 멈추는지 확인한다.",
  modelOutputs: positiveOutputs,
};

const discoveryByKey = new Map(
  positiveOutputs
    .filter((entry) => entry.analysisStage === "discovery")
    .map((entry) => [pairKey(entry), entry]),
);
const confirmationPairs = positiveOutputs
  .filter((entry) => entry.analysisStage === "confirmation")
  .map((confirmation) => ({
    discovery: discoveryByKey.get(pairKey(confirmation)),
    confirmation,
  }));
const technicalPairsPassing = confirmationPairs.filter(
  ({ discovery, confirmation }) =>
    discovery &&
    Math.abs(discovery.estimate) >=
      contract.decisionRules.discoveryThresholds
        .minimumAbsoluteEffect &&
    discovery.falseDiscoveryRate <=
      contract.decisionRules.discoveryThresholds
        .maximumFalseDiscoveryRate &&
    excludesZero(discovery.confidenceInterval95) &&
    Math.abs(confirmation.estimate) >=
      contract.decisionRules.confirmationThresholds
        .minimumAbsoluteEffect &&
    confirmation.pValue <=
      contract.decisionRules.confirmationThresholds
        .maximumTwoSidedPValue &&
    excludesZero(confirmation.confidenceInterval95) &&
    Math.sign(discovery.estimate) ===
      Math.sign(confirmation.estimate),
);

const report = {
  contractVersion:
    "nuang-trait-map-p0-positive-synthetic-boundary-run.v2.3",
  reportId:
    "TRAIT-MAP-P0-POSITIVE-SYNTHETIC-BOUNDARY-RUN.2.3",
  status: "TECHNICAL_POSITIVE_STOPPED_AT_SYNTHETIC_BOUNDARY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceContractId: contract.contractId,
  fixtureId: fixture.fixtureId,
  summary: {
    modelOutputs: positiveOutputs.length,
    discoveryConfirmationPairs: confirmationPairs.length,
    technicalPairsPassing: technicalPairsPassing.length,
    technicalPositiveSyntheticOnlyDecisions:
      positiveOutputs.filter(
        (entry) =>
          entry.decision ===
          "technical_positive_synthetic_only",
      ).length,
    outputsEligibleForIndependentCopyReview: 0,
    canonicalSupportDecisions: 0,
    canonicalRevisions: 0,
    publicationApprovalsGranted: 0,
    realParticipants: 0,
    inferentialModelsRun: 0,
  },
  boundaryAssertions: [
    {
      assertion:
        "40개 discovery-confirmation 조합이 기술 임계값을 통과한다.",
      passed: technicalPairsPassing.length === 40,
    },
    {
      assertion:
        "80개 출력 모두 synthetic 전용 정지 상태에 머문다.",
      passed: positiveOutputs.every(
        (entry) =>
          entry.decision ===
          "technical_positive_synthetic_only",
      ),
    },
    {
      assertion:
        "문장 검토 자격, canonical 지지, 수정, 공개 승인은 모두 0이다.",
      passed:
        positiveOutputs.every((entry) => entry.synthetic) &&
        positiveOutputs.every(
          (entry) =>
            entry.decision !==
            "eligible_for_independent_copy_review",
        ),
    },
  ],
  releaseBoundary: {
    stoppedAt: "real_independent_sample_required",
    unavailableRequirements: [
      "실제 참여자 표본",
      "독립 discovery 표본",
      "독립 confirmation 표본",
      "사전등록 실행 기록",
      "실제 품질·결측·불변성·민감도 분석",
      "독립 문장 검토",
      "고객 이해도 검토",
    ],
  },
  nextGate: {
    name: "PUBLICATION_GATE_AND_MANIFEST_INTEGRATION",
    action:
      "134~151 산출물을 공개 gate와 현재 manifest에 연결하고 전체 재현성 검사를 수행한다.",
  },
};

if (
  report.summary.modelOutputs !== 80 ||
  report.summary.discoveryConfirmationPairs !== 40 ||
  report.summary.technicalPairsPassing !== 40 ||
  report.summary.technicalPositiveSyntheticOnlyDecisions !== 80 ||
  !report.boundaryAssertions.every((entry) => entry.passed) ||
  report.summary.outputsEligibleForIndependentCopyReview !== 0 ||
  report.summary.canonicalSupportDecisions !== 0 ||
  report.summary.canonicalRevisions !== 0 ||
  report.summary.publicationApprovalsGranted !== 0 ||
  report.summary.realParticipants !== 0 ||
  report.summary.inferentialModelsRun !== 0
) {
  throw new Error(
    "P0 positive synthetic boundary invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const fixtureOutput = await prettier.format(JSON.stringify(fixture), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
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
    console.error(
      "v2.3 P0 positive synthetic boundary run is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(fixturePath, fixtureOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 positive synthetic boundary v2.3: ${technicalPairsPassing.length}/40 technical pairs pass, copy-review eligibility 0, releases 0.`,
);

function pairKey(entry) {
  return [
    entry.moduleId,
    entry.targetAxis,
    entry.responseLayer,
  ].join("|");
}

function excludesZero(interval) {
  return interval[0] > 0 || interval[1] < 0;
}

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

function buildMarkdown(report) {
  return `# 151. P0 양성 합성 경계 시험 v2.3

- 상태: \`${report.status}\`
- 공개 상태: \`${report.publicationState}\`
- 모형 출력: **${report.summary.modelOutputs}개**
- discovery-confirmation 조합: **${report.summary.discoveryConfirmationPairs}개**
- 기술 임계값 통과: **${report.summary.technicalPairsPassing}개**
- 문장 검토 자격/canonical 지지/수정/공개 승인: **0 / 0 / 0 / 0**

## 목적

강한 효과처럼 보이는 합성 값이 들어와도 실제 독립 표본과 검토 절차가 없으면 고객 문구나 공개 승인으로 넘어가지 않는지 확인한다. 이 시험은 실제 효과를 추정하지 않는다.

## 결과

${report.boundaryAssertions
  .map(
    (entry) =>
      `- ${entry.passed ? "통과" : "실패"} — ${entry.assertion}`,
  )
  .join("\n")}

## 멈춘 경계

\`${report.releaseBoundary.stoppedAt}\`

${report.releaseBoundary.unavailableRequirements
  .map((entry) => `- ${entry}`)
  .join("\n")}

## 해석 제한

표본 수는 0명이고 추론 모형은 실행하지 않았다. 양성 수치는 판정 경계를 시험하려고 넣은 fixture 값일 뿐 뉴앙 축, 상황 또는 canonical 문장을 지지하지 않는다.

## 다음 gate

${report.nextGate.action}
`;
}
