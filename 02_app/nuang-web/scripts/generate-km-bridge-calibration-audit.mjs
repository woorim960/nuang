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
  "KM_BRIDGE_CALIBRATION_AUDIT_V2.json",
);
const checkOnly = process.argv.includes("--check");
const bridgePlan = read("BRIDGE_PROFILE_PRODUCTION_PLAN_V2.json");
const kmPlan = bridgePlan.pairs.find(
  (pair) => pair.axis === "SM_execution_and_structure",
);
const pairs = [buildPair("ENAKQ", "ENAMQ"), buildPair("IRGMC", "IRGKC")];
const expectedScenarioIds = [...kmPlan.discriminatingScenarioIds].sort();
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
    "ENAMQ_SCENARIO_REVIEW_V2.json",
    "ENAMQ.scenario.general.ordinary_choice.attention",
    ["지금 가장 마음이 가는", "에너지"],
  ),
  checkClaimContains(
    "IRGKC_SCENARIO_REVIEW_V2.json",
    "IRGKC.scenario.general.ordinary_choice.attention",
    ["목표와 완료 기준", "순서"],
  ),
  checkClaimContains(
    "ENAMQ_SCENARIO_REVIEW_V2.json",
    "ENAMQ.scenario.work.plan_change.response",
    ["작업 순서와 방법을 유연하게", "다시 정하는"],
  ),
  checkClaimContains(
    "IRGKC_SCENARIO_REVIEW_V2.json",
    "IRGKC.scenario.work.plan_change.response",
    ["작업 순서", "완료 시점을 다시 정하고"],
  ),
];
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "KM-BRIDGE-CALIBRATION-AUDIT.0.1",
  status:
    sameOverrideScenes &&
    balancedDerivation &&
    fullStructure &&
    directionalSceneChecks.every((item) => item.passed)
      ? "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED"
      : "STRUCTURAL_CALIBRATION_FAILED",
  axis: "SM_execution_and_structure",
  pairs,
  checks: {
    sameTenDiscriminatingScenes: sameOverrideScenes,
    balancedInheritanceAndOverrides: balancedDerivation,
    fullProfileResearchStructure: fullStructure,
    directionalSceneChecks,
  },
  customerApprovedProfiles: 0,
  nextGate: [
    "코드 이름을 가린 K/M 양방향 인지 인터뷰",
    "같은 목표에서 실제 시작·지속·방해 뒤 복귀·마무리를 각각 평정",
    "미리 정한 순서·완료 기준과 현재 흥미·마감·에너지·지원 조건의 상대적 영향 확인",
    "K/M 차이를 책임감·성실성·게으름·융통성의 우열로 오해하지 않는지 확인",
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
      "K/M bridge calibration audit is stale. Run npm run research:trait-map:v2:km-calibration.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `K/M bridge calibration audit: ${report.status}, ${pairs.length} derived profiles checked.`,
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
