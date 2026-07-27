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
  "AG_BRIDGE_CALIBRATION_AUDIT_V2.json",
);
const checkOnly = process.argv.includes("--check");
const bridgePlan = read("BRIDGE_PROFILE_PRODUCTION_PLAN_V2.json");
const agPlan = bridgePlan.pairs.find(
  (pair) => pair.axis === "RO_relational_attention",
);
const pairs = [buildPair("ENAKQ", "ENGKQ"), buildPair("IRGMC", "IRAMC")];
const expectedScenarioIds = [...agPlan.discriminatingScenarioIds].sort();
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
    "ENGKQ_SCENARIO_REVIEW_V2.json",
    "ENGKQ.scenario.general.support_requested.attention",
    ["어떤 일이 있었고", "무엇을 바꾸면"],
  ),
  checkClaimContains(
    "IRAMC_SCENARIO_REVIEW_V2.json",
    "IRAMC.scenario.general.support_requested.attention",
    ["느낀 마음", "필요한 반응"],
  ),
  checkClaimContains(
    "ENGKQ_SCENARIO_REVIEW_V2.json",
    "ENGKQ.scenario.partner.disagreement.process",
    ["핵심 원인", "행동을 바꾸면"],
  ),
  checkClaimContains(
    "IRAMC_SCENARIO_REVIEW_V2.json",
    "IRAMC.scenario.partner.disagreement.process",
    ["어떤 마음", "안전하다고"],
  ),
  checkClaimContains(
    "ENGKQ_SCENARIO_REVIEW_V2.json",
    "ENGKQ.scenario.general.support_requested.response",
    ["원하는 지원", "방식을 고르는"],
  ),
  checkClaimContains(
    "IRAMC_SCENARIO_REVIEW_V2.json",
    "IRAMC.scenario.general.support_requested.response",
    ["원하는 지원", "해결 행동"],
  ),
];
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "AG-BRIDGE-CALIBRATION-AUDIT.0.1",
  status:
    sameOverrideScenes &&
    balancedDerivation &&
    fullStructure &&
    directionalSceneChecks.every((item) => item.passed)
      ? "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED"
      : "STRUCTURAL_CALIBRATION_FAILED",
  axis: "RO_relational_attention",
  pairs,
  checks: {
    sameTenDiscriminatingScenes: sameOverrideScenes,
    balancedInheritanceAndOverrides: balancedDerivation,
    fullProfileResearchStructure: fullStructure,
    directionalSceneChecks,
    firstThoughtAndActualResponseSeparated: directionalSceneChecks
      .filter((item) => item.claimId.endsWith(".response"))
      .every((item) => item.passed),
  },
  customerApprovedProfiles: 0,
  nextGate: [
    "코드 이름을 가린 A/G 양방향 인지 인터뷰",
    "같은 갈등·지원 장면에서 마음·관계 영향과 원인·해결 중 처음 향한 주의를 각각 평정",
    "처음 드는 생각과 실제 나타나는 반응을 별도 응답으로 수집",
    "A/G 차이를 착함·차가움·논리성·공감 능력의 우열로 오해하지 않는지 확인",
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
      "A/G bridge calibration audit is stale. Run npm run research:trait-map:v2:ag-calibration.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `A/G bridge calibration audit: ${report.status}, ${pairs.length} derived profiles checked.`,
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
