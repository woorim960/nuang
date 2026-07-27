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
  "TRAIT_MAP_32_PROFILE_COMPLETENESS_AUDIT_V2.json",
);
const checkOnly = process.argv.includes("--check");
const expectedCodes = cartesianCodes();
const namingCatalog = readNamingCatalog();
const directAudit = readGenerated(
  "DIRECT_DERIVED_PROFILE_COMPLETENESS_AUDIT_V2.json",
);
const batchAudits = [1, 2, 3, 4].map((batchNumber) =>
  readGenerated(`REMAINING_BATCH${batchNumber}_CALIBRATION_AUDIT_V2.json`),
);
const profiles = expectedCodes.map(auditProfile);
const actualCodes = profiles.map((profile) => profile.code);
const exactCodeCoverage =
  actualCodes.length === 32 &&
  new Set(actualCodes).size === 32 &&
  expectedCodes.every((code) => actualCodes.includes(code));
const allProfileStructuresComplete = profiles.every(
  (profile) =>
    profile.scenarioCount === 72 &&
    profile.scenarioClaimCount === 288 &&
    profile.uniqueScenarioClaimIds === 288 &&
    profile.copyAudit === "288/288" &&
    profile.chapterCount === 16 &&
    profile.longformCharacters >= 50_000 &&
    profile.structuredClaimCount === 314 &&
    profile.evidenceSourceCount >= 30 &&
    profile.neighborCount === 5 &&
    profile.neighborClaimCount === 20 &&
    profile.exactNeighborSet &&
    profile.manuscriptPresent,
);
const namingSystemComplete =
  Object.keys(namingCatalog).length === 32 &&
  new Set(Object.values(namingCatalog).map((entry) => entry.shortName)).size ===
    32 &&
  new Set(Object.values(namingCatalog).map((entry) => entry.displayName))
    .size === 32 &&
  profiles.every(
    (profile) =>
      profile.longformNameMatchesCatalog &&
      profile.shortName.length >= 3 &&
      profile.shortName.length <= 6 &&
      profile.profileName.split(/\s+/).length <= 4 &&
      profile.profileName.endsWith(profile.shortName) &&
      profile.familyMatchesCode &&
      !/(천재|완벽|우월|치유|정상|문제형)/.test(profile.profileName),
  );
const reciprocalNeighborNetwork = profiles.every((profile) =>
  profile.neighborCodes.every((neighborCode) => {
    const neighborProfile = profiles.find((item) => item.code === neighborCode);
    return neighborProfile?.neighborCodes.includes(profile.code);
  }),
);
const allContentResearchOnly = profiles.every(
  (profile) =>
    profile.customerVisibleScenarioClaims === 0 &&
    profile.customerApprovedClaims === 0,
);
const allStageAuditsPassed =
  directAudit.status ===
    "TEN_DIRECT_DERIVED_PROFILES_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED" &&
  batchAudits.every((audit) =>
    audit.status.endsWith(
      "_REMAINING_BATCH_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED",
    ),
  );
const totals = {
  profiles: profiles.length,
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
  directedNeighborLinks: profiles.reduce(
    (total, profile) => total + profile.neighborCount,
    0,
  ),
  undirectedNeighborPairs:
    profiles.reduce((total, profile) => total + profile.neighborCount, 0) / 2,
  longformCharacters: profiles.reduce(
    (total, profile) => total + profile.longformCharacters,
    0,
  ),
  customerApprovedClaims: profiles.reduce(
    (total, profile) => total + profile.customerApprovedClaims,
    0,
  ),
};
const exactTotals =
  totals.profiles === 32 &&
  totals.scenarios === 2_304 &&
  totals.scenarioClaims === 9_216 &&
  totals.structuredClaims === 10_048 &&
  totals.neighborClaims === 640 &&
  totals.directedNeighborLinks === 160 &&
  totals.undirectedNeighborPairs === 80 &&
  totals.customerApprovedClaims === 0;
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "TRAIT-MAP-32-PROFILE-COMPLETENESS-AUDIT.0.1",
  status:
    exactCodeCoverage &&
    allProfileStructuresComplete &&
    namingSystemComplete &&
    reciprocalNeighborNetwork &&
    allContentResearchOnly &&
    allStageAuditsPassed &&
    exactTotals
      ? "ALL_32_PROFILE_RESEARCH_PACKAGES_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED"
      : "TRAIT_MAP_32_PROFILE_COMPLETENESS_FAILED",
  checks: {
    exactCodeCoverage,
    allProfileStructuresComplete,
    namingSystemComplete,
    reciprocalNeighborNetwork,
    allContentResearchOnly,
    allStageAuditsPassed,
    exactTotals,
  },
  directionOrder: [
    ["E", "I"],
    ["R", "N"],
    ["G", "A"],
    ["K", "M"],
    ["C", "Q"],
  ],
  profiles,
  stageAudits: {
    directDerived: directAudit.status,
    remainingBatches: batchAudits.map((audit) => ({
      batchId: audit.batchId,
      status: audit.status,
      profiles: audit.profiles.map((profile) => profile.code),
    })),
  },
  totals,
  interpretation:
    "32개 코드 조합의 연구 패키지가 같은 구조와 계보 계약을 충족하고, 32개 짧은 별칭·긴 별칭이 중복 없이 연구 원장에 일치한다는 자동 감사 결과다. 문장의 심리측정 타당도, 사람의 이름 이해도, 고객 발행 승인을 뜻하지 않는다.",
  nextGate: [
    "코드를 가린 별칭 이해도·회상·오해 검사를 진행하고 문제가 반복되는 별칭만 교체",
    "코드 이름을 가린 인지 인터뷰로 문장 이해·생각/행동 구분·낙인 가능성을 확인",
    "각 축과 한 글자 이웃의 구분력, 반복 응답 재현성, 상황 강도 영향을 정량 검증",
    "검증 결과에 따라 claim 단위로 유지·수정·폐기하고 승인된 claim만 제품 DB에 발행",
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
      "32-profile completeness audit is stale. Run npm run research:trait-map:v2:all-32-audit.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}

console.log(
  `32-profile audit: ${report.status}; ${totals.scenarioClaims} scenario claims, ${totals.longformCharacters} longform characters.`,
);

function auditProfile(code) {
  const scenario = readGenerated(`${code}_SCENARIO_REVIEW_V2.json`);
  const copyAudit = readGenerated(`${code}_SCENARIO_COPY_AUDIT_V2.json`);
  const longform = readGenerated(`${code}_LONGFORM_RESEARCH_MANIFEST_V2.json`);
  const neighbor = readNeighbor(code);
  const scenarioCount =
    scenario.summary.scenarioCount ?? scenario.summary.newScenarioCount;
  const scenarioClaimCount =
    scenario.summary.claimCount ?? scenario.summary.newClaimCount;
  const customerVisibleScenarioClaims = scenario.summary.customerVisibleClaims;
  const expectedNeighbors = oneLetterNeighbors(code);
  const naming = namingCatalog[code];
  return {
    code,
    profileName: longform.profileName,
    shortName: naming?.shortName ?? "",
    familyId: naming?.familyId ?? "",
    longformNameMatchesCatalog:
      longform.profileName === naming?.displayName &&
      (!scenario.roleName || scenario.roleName === naming?.displayName),
    familyMatchesCode: naming?.familyId === expectedFamilyId(code),
    scenarioCount,
    scenarioClaimCount,
    uniqueScenarioClaimIds: new Set(
      scenario.claims.map((claim) => claim.claimId),
    ).size,
    copyAudit: `${copyAudit.automaticPasses}/${copyAudit.auditedClaims}`,
    chapterCount: longform.chapters.length,
    longformCharacters: longform.totalNonWhitespaceCharacters,
    structuredClaimCount: longform.researchMetrics.structuredClaims,
    evidenceSourceCount: longform.evidenceSourceRefs.length,
    neighborCodes: neighbor.neighborCodes,
    neighborCount: neighbor.neighborCodes.length,
    neighborClaimCount: neighbor.claimCount,
    exactNeighborSet: sameSet(neighbor.neighborCodes, expectedNeighbors),
    customerVisibleScenarioClaims,
    customerApprovedClaims: longform.researchMetrics.customerApprovedClaims,
    manuscriptPresent: fs.existsSync(
      path.join(
        projectRoot,
        `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
      ),
    ),
  };
}

function readNamingCatalog() {
  const source = fs.readFileSync(
    path.join(
      projectRoot,
      "src/features/nuang-code/candidate-profile-names.ts",
    ),
    "utf8",
  );
  const start = source.indexOf("export const candidateProfileNameCatalog");
  const end = source.indexOf("export const candidateRoleNames", start);
  if (start < 0 || end < 0) {
    throw new Error("Candidate profile name catalog could not be located.");
  }

  const catalog = {};
  const pattern =
    /^\s{2}([A-Z]{5}): \{\n\s{4}shortName: "([^"]+)",\n\s{4}displayName: "([^"]+)",\n\s{4}familyId: "([^"]+)",\n\s{2}\},/gm;
  for (const match of source.slice(start, end).matchAll(pattern)) {
    catalog[match[1]] = {
      shortName: match[2],
      displayName: match[3],
      familyId: match[4],
    };
  }
  return catalog;
}

function expectedFamilyId(code) {
  return {
    RG: "PRACTICAL_SOLUTION",
    RA: "CONCRETE_CARE",
    NG: "POSSIBILITY_SOLUTION",
    NA: "POSSIBILITY_CONNECTION",
  }[code.slice(1, 3)];
}

function readNeighbor(code) {
  if (code === "ENAKQ") {
    const packet = JSON.parse(
      fs.readFileSync(
        path.join(
          projectRoot,
          "src/features/nuang-code/fixtures/enakq-v2-neighbor-claims.generated.json",
        ),
        "utf8",
      ),
    );
    return {
      neighborCodes: packet.neighborCodes,
      claimCount: packet.claimCount,
    };
  }
  const packet = readGenerated(`${code}_NEIGHBOR_REVIEW_V2.json`);
  return {
    neighborCodes: packet.neighborCodes,
    claimCount: packet.claimCount,
  };
}

function cartesianCodes() {
  const result = [];
  for (const first of ["E", "I"])
    for (const second of ["R", "N"])
      for (const third of ["G", "A"])
        for (const fourth of ["K", "M"])
          for (const fifth of ["C", "Q"])
            result.push(`${first}${second}${third}${fourth}${fifth}`);
  return result.sort();
}

function oneLetterNeighbors(code) {
  const pairs = [
    ["E", "I"],
    ["R", "N"],
    ["G", "A"],
    ["K", "M"],
    ["C", "Q"],
  ];
  return code.split("").map((symbol, index) => {
    const replacement =
      pairs[index][0] === symbol ? pairs[index][1] : pairs[index][0];
    return `${code.slice(0, index)}${replacement}${code.slice(index + 1)}`;
  });
}

function sameSet(left, right) {
  return (
    JSON.stringify([...new Set(left)].sort()) ===
    JSON.stringify([...new Set(right)].sort())
  );
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
