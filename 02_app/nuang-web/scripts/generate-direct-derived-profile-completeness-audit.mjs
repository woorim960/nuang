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
  "DIRECT_DERIVED_PROFILE_COMPLETENESS_AUDIT_V2.json",
);
const checkOnly = process.argv.includes("--check");
const expectedProfiles = [
  ["INAKQ", "SE_energy_and_expression", "ENAKQ"],
  ["ERGMC", "SE_energy_and_expression", "IRGMC"],
  ["ERAKQ", "OE_exploration_and_interest", "ENAKQ"],
  ["INGMC", "OE_exploration_and_interest", "IRGMC"],
  ["ENGKQ", "RO_relational_attention", "ENAKQ"],
  ["IRAMC", "RO_relational_attention", "IRGMC"],
  ["ENAMQ", "SM_execution_and_structure", "ENAKQ"],
  ["IRGKC", "SM_execution_and_structure", "IRGMC"],
  ["ENAKC", "ER_emotional_activation_and_worry", "ENAKQ"],
  ["IRGMQ", "ER_emotional_activation_and_worry", "IRGMC"],
];
const profiles = expectedProfiles.map(([code, axis, baseAnchor]) =>
  auditProfile(code, axis, baseAnchor),
);
const calibrationFiles = [
  "EI_BRIDGE_CALIBRATION_AUDIT_V2.json",
  "NR_BRIDGE_CALIBRATION_AUDIT_V2.json",
  "AG_BRIDGE_CALIBRATION_AUDIT_V2.json",
  "KM_BRIDGE_CALIBRATION_AUDIT_V2.json",
  "QC_BRIDGE_CALIBRATION_AUDIT_V2.json",
];
const calibrations = calibrationFiles.map((fileName) => {
  const audit = read(fileName);
  return {
    reportId: audit.reportId,
    axis: audit.axis,
    status: audit.status,
    derivedProfiles: audit.pairs.map((pair) => pair.derivedCode),
    customerApprovedProfiles: audit.customerApprovedProfiles,
  };
});
const allProfilesComplete = profiles.every(
  (profile) =>
    profile.scenarioCount === 72 &&
    profile.scenarioClaimCount === 288 &&
    profile.inheritedClaimCount === 248 &&
    profile.axisOverrideClaimCount === 40 &&
    profile.copyAudit === "288/288" &&
    profile.chapterCount === 16 &&
    profile.longformCharacters >= 50_000 &&
    profile.structuredClaimCount === 314 &&
    profile.neighborCount === 5 &&
    profile.neighborClaimCount === 20 &&
    profile.customerVisibleScenarioClaims === 0 &&
    profile.customerApprovedClaims === 0 &&
    profile.manuscriptPresent &&
    profile.lineageMatchesPlan,
);
const allAxesCalibrated = calibrations.every(
  (audit) =>
    audit.status ===
      "STRUCTURAL_CALIBRATION_PASSED_HUMAN_VALIDATION_REQUIRED" &&
    audit.derivedProfiles.length === 2 &&
    audit.customerApprovedProfiles === 0,
);
const exactProfileCoverage =
  new Set(profiles.map((profile) => profile.code)).size === 10 &&
  expectedProfiles.every(([code]) =>
    profiles.some((profile) => profile.code === code),
  );
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "DIRECT-DERIVED-PROFILE-COMPLETENESS-AUDIT.0.1",
  status:
    allProfilesComplete && allAxesCalibrated && exactProfileCoverage
      ? "TEN_DIRECT_DERIVED_PROFILES_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED"
      : "DIRECT_DERIVED_PROFILE_COMPLETENESS_FAILED",
  scope: {
    baseAnchors: ["ENAKQ", "IRGMC"],
    directDerivedProfileCount: 10,
    axes: [
      "SE_energy_and_expression",
      "OE_exploration_and_interest",
      "RO_relational_attention",
      "SM_execution_and_structure",
      "ER_emotional_activation_and_worry",
    ],
  },
  checks: {
    exactProfileCoverage,
    allProfilesComplete,
    allAxesStructurallyCalibrated: allAxesCalibrated,
    allContentResearchOnly: profiles.every(
      (profile) =>
        profile.customerVisibleScenarioClaims === 0 &&
        profile.customerApprovedClaims === 0,
    ),
  },
  profiles,
  calibrations,
  totals: {
    scenarios: profiles.reduce(
      (total, profile) => total + profile.scenarioCount,
      0,
    ),
    scenarioClaims: profiles.reduce(
      (total, profile) => total + profile.scenarioClaimCount,
      0,
    ),
    structuredClaims: profiles.reduce(
      (total, profile) => total + profile.structuredClaimCount,
      0,
    ),
    neighborClaims: profiles.reduce(
      (total, profile) => total + profile.neighborClaimCount,
      0,
    ),
    longformCharacters: profiles.reduce(
      (total, profile) => total + profile.longformCharacters,
      0,
    ),
    customerApprovedClaims: profiles.reduce(
      (total, profile) => total + profile.customerApprovedClaims,
      0,
    ),
  },
  nextGate: [
    "5개 축별 코드 이름을 가린 양방향 인지 인터뷰",
    "처음 드는 생각·실제 나타나는 반응·시간이 지난 뒤의 회복을 분리해 평정",
    "한 글자 이웃과의 구분력·반복 응답 재현성·상황 강도 영향을 정량 확인",
    "사람 검증이 끝나기 전 연구 문장을 고객용 성향지도와 리포트에 발행하지 않음",
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
      "Direct-derived profile completeness audit is stale. Run npm run research:trait-map:v2:direct-derived-audit.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `Direct-derived completeness audit: ${report.status}, ${profiles.length} profiles and ${calibrations.length} axes checked.`,
);

function auditProfile(code, expectedAxis, expectedBaseAnchor) {
  const scenario = read(`${code}_SCENARIO_REVIEW_V2.json`);
  const copyAudit = read(`${code}_SCENARIO_COPY_AUDIT_V2.json`);
  const neighbor = read(`${code}_NEIGHBOR_REVIEW_V2.json`);
  const longform = read(`${code}_LONGFORM_RESEARCH_MANIFEST_V2.json`);
  const manuscriptPath = path.join(
    projectRoot,
    `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
  );
  return {
    code,
    profileName: longform.profileName,
    baseAnchor: scenario.baseAnchor,
    expectedBaseAnchor,
    changedAxis: scenario.changedAxis,
    expectedAxis,
    changedLetters: scenario.changedLetters,
    scenarioCount: scenario.summary.scenarioCount,
    scenarioClaimCount: scenario.summary.claimCount,
    inheritedClaimCount: scenario.summary.inheritedClaimCount,
    axisOverrideClaimCount: scenario.summary.axisOverrideClaimCount,
    copyAudit: `${copyAudit.automaticPasses}/${copyAudit.auditedClaims}`,
    chapterCount: longform.chapters.length,
    longformCharacters: longform.totalNonWhitespaceCharacters,
    structuredClaimCount: longform.researchMetrics.structuredClaims,
    evidenceSourceCount: longform.evidenceSourceRefs.length,
    neighborCount: neighbor.neighborCodes.length,
    neighborClaimCount: neighbor.claimCount,
    customerVisibleScenarioClaims: scenario.summary.customerVisibleClaims,
    customerApprovedClaims: longform.researchMetrics.customerApprovedClaims,
    manuscriptPresent: fs.existsSync(manuscriptPath),
    lineageMatchesPlan:
      scenario.baseAnchor === expectedBaseAnchor &&
      scenario.changedAxis === expectedAxis,
  };
}

function read(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
