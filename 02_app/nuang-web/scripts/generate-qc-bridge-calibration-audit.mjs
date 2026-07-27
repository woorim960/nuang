import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const generatedDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated",
);
const outputPath = path.join(
  generatedDirectory,
  "QC_BRIDGE_CALIBRATION_AUDIT_V2.json",
);
const checkOnly = process.argv.includes("--check");
const bridgePlan = read("BRIDGE_PROFILE_PRODUCTION_PLAN_V2.json");
const qcPlan = bridgePlan.pairs.find(
  (pair) => pair.axis === "ER_emotional_activation_and_worry",
);
const pairs = [buildPair("ENAKQ", "ENAKC"), buildPair("IRGMC", "IRGMQ")];
const expectedScenarioIds = [...qcPlan.discriminatingScenarioIds].sort();
const sameOverrideScenes = pairs.every(
  (pair) =>
    JSON.stringify([...pair.overrideScenarioIds].sort()) ===
    JSON.stringify(expectedScenarioIds),
);
const balancedDerivation =
  new Set(pairs.map((pair) => pair.inheritedClaimCount)).size === 1 &&
  new Set(pairs.map((pair) => pair.axisOverrideClaimCount)).size === 1;
const fullStructure = pairs.every(
  (pair) =>
    pair.scenarioCount === 72 &&
    pair.claimCount === 288 &&
    pair.copyAudit === "288/288" &&
    pair.longformCharacters >= 50_000 &&
    pair.chapterCount === 16 &&
    pair.neighborClaimCount === 20 &&
    pair.customerVisibleClaims === 0,
);
const directionalSceneChecks = [
  checkClaimContains(
    "ENAKC_SCENARIO_REVIEW_V2.json",
    "ENAKC.scenario.general.uncertainty.attention",
    ["걱정이 크게 올라오기 전", "대응 선택지"],
  ),
  checkClaimContains(
    "IRGMQ_SCENARIO_REVIEW_V2.json",
    "IRGMQ.scenario.general.uncertainty.attention",
    ["좋지 않은 결과", "놓친 단서"],
  ),
  checkClaimContains(
    "ENAKC_SCENARIO_REVIEW_V2.json",
    "ENAKC.scenario.general.aftermath.response",
    ["후속 행동", "늦게 확인"],
  ),
  checkClaimContains(
    "IRGMQ_SCENARIO_REVIEW_V2.json",
    "IRGMQ.scenario.general.aftermath.response",
    ["반복되는 걱정", "시간이 필요한"],
  ),
];
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "QC-BRIDGE-CALIBRATION-AUDIT.0.1",
  status:
    sameOverrideScenes &&
    balancedDerivation &&
    fullStructure &&
    directionalSceneChecks.every((item) => item.passed)
      ? "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED"
      : "STRUCTURAL_CALIBRATION_FAILED",
  axis: "ER_emotional_activation_and_worry",
  pairs,
  checks: {
    sameTenDiscriminatingScenes: sameOverrideScenes,
    balancedInheritanceAndOverrides: balancedDerivation,
    fullProfileResearchStructure: fullStructure,
    directionalSceneChecks,
  },
  customerApprovedProfiles: 0,
  nextGate: [
    "코드 이름을 가린 Q/C 양방향 인지 인터뷰",
    "불편함의 초기 활성화·처음 드는 생각·실제 행동·회복 시간을 각각 평정",
    "사건 직후와 시간이 지난 뒤의 감정·몸의 긴장·반복 생각을 분리해 확인",
    "Q/C 차이를 예민함·강한 멘탈·정신건강·회복력의 우열로 오해하지 않는지 확인",
  ],
};
const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "Q/C bridge calibration audit is stale. Run npm run research:trait-map:v2:qc-calibration.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `Q/C bridge calibration audit: ${report.status}, ${pairs.length} derived profiles checked.`,
);

function buildPair(baseAnchor, derivedCode) {
  const scenario = read(`${derivedCode}_SCENARIO_REVIEW_V2.json`);
  const copyAudit = read(`${derivedCode}_SCENARIO_COPY_AUDIT_V2.json`);
  const neighbor = read(`${derivedCode}_NEIGHBOR_REVIEW_V2.json`);
  const longform = read(`${derivedCode}_LONGFORM_RESEARCH_MANIFEST_V2.json`);
  return {
    baseAnchor,
    derivedCode,
    changedLetters: scenario.changedLetters,
    scenarioCount: scenario.summary.scenarioCount,
    claimCount: scenario.summary.claimCount,
    inheritedClaimCount: scenario.summary.inheritedClaimCount,
    axisOverrideClaimCount: scenario.summary.axisOverrideClaimCount,
    overrideScenarioIds: [
      ...new Set(
        scenario.lineage
          .filter((item) => item.derivationMode === "axis_override")
          .map(
            (item) =>
              scenario.claims.find((claim) => claim.claimId === item.claimId)
                .scenarioRefs[0],
          ),
      ),
    ],
    copyAudit: `${copyAudit.automaticPasses}/${copyAudit.auditedClaims}`,
    longformCharacters: longform.totalNonWhitespaceCharacters,
    chapterCount: longform.chapters.length,
    neighborClaimCount: neighbor.claimCount,
    customerVisibleClaims: scenario.summary.customerVisibleClaims,
  };
}

function checkClaimContains(fileName, claimId, expectedPhrases) {
  const packet = read(fileName);
  const claim = packet.claims.find((item) => item.claimId === claimId);
  return {
    claimId,
    expectedPhrases,
    passed:
      Boolean(claim) &&
      expectedPhrases.every((phrase) => claim.assertion.includes(phrase)),
  };
}

function read(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
