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
  "EI_BRIDGE_CALIBRATION_AUDIT_V2.json",
);
const checkOnly = process.argv.includes("--check");
const bridgePlan = read("BRIDGE_PROFILE_PRODUCTION_PLAN_V2.json");
const eiPlan = bridgePlan.pairs.find(
  (pair) => pair.axis === "SE_energy_and_expression",
);
const pairs = [buildPair("ENAKQ", "INAKQ"), buildPair("IRGMC", "ERGMC")];
const expectedScenarioIds = [...eiPlan.discriminatingScenarioIds].sort();
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
    "INAKQ_SCENARIO_REVIEW_V2.json",
    "INAKQ.scenario.general.aftermath.response",
    ["혼자", "정리"],
  ),
  checkClaimContains(
    "ERGMC_SCENARIO_REVIEW_V2.json",
    "ERGMC.scenario.general.aftermath.response",
    ["사람", "정리"],
  ),
  checkClaimContains(
    "INAKQ_SCENARIO_REVIEW_V2.json",
    "INAKQ.scenario.general.group_participation.response",
    ["흐름을 지켜보다가", "생각이 정리되면"],
  ),
  checkClaimContains(
    "ERGMC_SCENARIO_REVIEW_V2.json",
    "ERGMC.scenario.general.group_participation.response",
    ["질문을 먼저", "행동"],
  ),
];
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "EI-BRIDGE-CALIBRATION-AUDIT.0.1",
  status:
    sameOverrideScenes &&
    balancedDerivation &&
    fullStructure &&
    directionalSceneChecks.every((item) => item.passed)
      ? "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED"
      : "STRUCTURAL_CALIBRATION_FAILED",
  axis: "SE_energy_and_expression",
  pairs,
  checks: {
    sameTenDiscriminatingScenes: sameOverrideScenes,
    balancedInheritanceAndOverrides: balancedDerivation,
    fullProfileResearchStructure: fullStructure,
    directionalSceneChecks,
  },
  customerApprovedProfiles: 0,
  nextGate: [
    "코드 이름을 가린 E/I 양방향 인지 인터뷰",
    "같은 장면에서 참여 시작·대화 중 사고·혼자 회복을 각각 평정",
    "ENAKQ·INAKQ와 IRGMC·ERGMC 두 배경에서 E/I 판별 문항의 방향 일치 확인",
    "E/I 차이를 사교성·친구 수·관계 능력으로 오해하지 않는지 확인",
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
      "E/I bridge calibration audit is stale. Run npm run research:trait-map:v2:ei-calibration.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `E/I bridge calibration audit: ${report.status}, ${pairs.length} derived profiles checked.`,
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
