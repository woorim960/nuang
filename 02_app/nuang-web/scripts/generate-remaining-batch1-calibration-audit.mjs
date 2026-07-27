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
const batchNumber = Number(
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1] ?? "1",
);
const outputPath = path.join(
  generatedDirectory,
  `REMAINING_BATCH${batchNumber}_CALIBRATION_AUDIT_V2.json`,
);
const checkOnly = process.argv.includes("--check");
const productionPlan = read("REMAINING_PROFILE_PRODUCTION_PLAN_V2.json");
const batchPlan = productionPlan.batches[batchNumber - 1];
if (!batchPlan) {
  throw new Error(`Unknown remaining-profile batch: ${batchNumber}`);
}
const expectedCodes = batchPlan.profiles.map((profile) => profile.code);
const expectedInteractionScenes = batchPlan.profiles
  .flatMap((profile) =>
    profile.interactionScenarioIds.map(
      (scenarioId) => `${profile.code}:${scenarioId}`,
    ),
  )
  .sort();
const profiles = batchPlan.profiles.map(auditProfile);
const directionalSceneChecks = getDirectionalSceneChecks(batchNumber);
const exactProfileCoverage =
  profiles.length === expectedCodes.length &&
  new Set(profiles.map((profile) => profile.code)).size ===
    expectedCodes.length &&
  expectedCodes.every((code) =>
    profiles.some((profile) => profile.code === code),
  );
const exactInteractionCoverage =
  JSON.stringify(
    profiles
      .flatMap((profile) =>
        profile.interactionScenarioIds.map(
          (scenarioId) => `${profile.code}:${scenarioId}`,
        ),
      )
      .sort(),
  ) === JSON.stringify(expectedInteractionScenes);
const fullResearchStructure = profiles.every(
  (profile) =>
    profile.scenarioCount === 72 &&
    profile.scenarioClaimCount === 288 &&
    profile.copyAudit === "288/288" &&
    profile.chapterCount === 16 &&
    profile.longformCharacters >= 50_000 &&
    profile.structuredClaimCount === 314 &&
    profile.neighborCount === 5 &&
    profile.neighborClaimCount === 20 &&
    profile.manuscriptPresent,
);
const pathConvergencePassed = profiles.every(
  (profile) =>
    profile.parentPathsMatchPlan &&
    profile.lineageCountsMatchPlan &&
    profile.parentCopyConvergencePassed,
);
const allContentResearchOnly = profiles.every(
  (profile) =>
    profile.customerVisibleScenarioClaims === 0 &&
    profile.customerApprovedClaims === 0,
);
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: `REMAINING-BATCH${batchNumber}-CALIBRATION-AUDIT.0.1`,
  status:
    exactProfileCoverage &&
    exactInteractionCoverage &&
    fullResearchStructure &&
    pathConvergencePassed &&
    allContentResearchOnly &&
    directionalSceneChecks.every((item) => item.passed)
      ? `${ordinalStatus(batchNumber)}_REMAINING_BATCH_STRUCTURALLY_COMPLETE_HUMAN_VALIDATION_REQUIRED`
      : `${ordinalStatus(batchNumber)}_REMAINING_BATCH_CALIBRATION_FAILED`,
  batchId: batchPlan.batchId,
  anchor: batchPlan.anchor,
  checks: {
    exactProfileCoverage,
    exactInteractionCoverage,
    fullResearchStructure,
    twoParentPathConvergence: pathConvergencePassed,
    directionalSceneChecks,
    allContentResearchOnly,
  },
  profiles,
  totals: {
    profiles: profiles.length,
    scenarios: profiles.reduce(
      (total, profile) => total + profile.scenarioCount,
      0,
    ),
    scenarioClaims: profiles.reduce(
      (total, profile) => total + profile.scenarioClaimCount,
      0,
    ),
    inheritedScenarioClaims: profiles.reduce(
      (total, profile) => total + profile.inheritedClaimCount,
      0,
    ),
    interactionScenarioClaims: profiles.reduce(
      (total, profile) => total + profile.interactionClaimCount,
      0,
    ),
    interactionScenes: profiles.reduce(
      (total, profile) => total + profile.interactionScenarioIds.length,
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
  interpretation:
    "자동 감사는 두 부모 경로의 계보·구조·문장 방향이 설계 계약과 일치함을 확인한다. 사람 대상 인지 인터뷰와 정량 검증을 통과했다는 뜻은 아니다.",
  nextGate: [
    "코드 이름을 가린 상태에서 두 부모 경로 문장이 같은 생활 경험으로 이해되는지 확인",
    "두 축 상호작용 문장 16개에서 처음 드는 생각과 실제 나타나는 반응이 분리되는지 확인",
    "한 글자 이웃 5개와의 구분력·반복 응답 재현성·상황 강도 영향을 정량 확인",
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
      `Remaining batch ${batchNumber} calibration audit is stale. Run npm run research:trait-map:v2:remaining-batch${batchNumber}-audit.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}

console.log(
  `Remaining batch ${batchNumber} audit: ${report.status}, ${profiles.length} profiles and ${report.totals.interactionScenarioClaims} interaction claims checked.`,
);

function auditProfile(profilePlan) {
  const code = profilePlan.code;
  const scenario = read(`${code}_SCENARIO_REVIEW_V2.json`);
  const copyAudit = read(`${code}_SCENARIO_COPY_AUDIT_V2.json`);
  const neighbor = read(`${code}_NEIGHBOR_REVIEW_V2.json`);
  const longform = read(`${code}_LONGFORM_RESEARCH_MANIFEST_V2.json`);
  const manuscriptPath = path.join(
    projectRoot,
    `docs/trait-maps/${code}/${code}_DATA_CENTER_V2_RESEARCH_DRAFT.md`,
  );
  const interactionScenarioIds = [
    ...new Set(
      scenario.lineage
        .filter((item) => item.derivationMode === "interaction_override")
        .map(
          (item) =>
            scenario.claims.find((claim) => claim.claimId === item.claimId)
              .scenarioRefs[0],
        ),
    ),
  ].sort();
  return {
    code,
    profileName: longform.profileName,
    anchor: scenario.anchor,
    changedAxes: scenario.changedAxes,
    parentPaths: scenario.parentPaths,
    scenarioCount: scenario.summary.scenarioCount,
    scenarioClaimCount: scenario.summary.claimCount,
    inheritedClaimCount: scenario.summary.inheritedClaimCount,
    interactionClaimCount: scenario.summary.interaction_override,
    interactionScenarioIds,
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
    parentPathsMatchPlan:
      scenario.anchor === profilePlan.anchor &&
      sameJson(scenario.changedAxes, profilePlan.changedAxes) &&
      sameJson(scenario.parentPaths, [
        profilePlan.primaryPath,
        profilePlan.alternatePath,
      ]),
    lineageCountsMatchPlan:
      scenario.summary.anchor_inherited ===
        profilePlan.composition.untouchedAnchorClaims &&
      scenario.summary.first_axis_inherited +
        scenario.summary.second_axis_inherited ===
        profilePlan.composition.singleAxisClaims &&
      scenario.summary.interaction_override ===
        profilePlan.composition.interactionClaims &&
      sameJson(interactionScenarioIds, profilePlan.interactionScenarioIds),
    parentCopyConvergencePassed: checkParentCopyConvergence(
      scenario,
      profilePlan,
    ),
  };
}

function checkParentCopyConvergence(scenario, profilePlan) {
  const anchor = read(`${profilePlan.anchor}_SCENARIO_REVIEW_V2.json`);
  const firstParent = read(
    `${profilePlan.primaryPath.parent}_SCENARIO_REVIEW_V2.json`,
  );
  const secondParent = read(
    `${profilePlan.alternatePath.parent}_SCENARIO_REVIEW_V2.json`,
  );
  const anchorClaims = indexBySuffix(anchor.claims);
  const firstClaims = indexBySuffix(firstParent.claims);
  const secondClaims = indexBySuffix(secondParent.claims);
  const lineageByClaim = new Map(
    scenario.lineage.map((item) => [item.claimId, item]),
  );
  return scenario.claims.every((claim) => {
    const suffix = getSuffix(claim.claimId);
    const lineage = lineageByClaim.get(claim.claimId);
    if (!lineage) return false;
    if (lineage.derivationMode === "anchor_inherited") {
      return claim.assertion === anchorClaims.get(suffix)?.assertion;
    }
    if (lineage.derivationMode === "first_axis_inherited") {
      return claim.assertion === firstClaims.get(suffix)?.assertion;
    }
    if (lineage.derivationMode === "second_axis_inherited") {
      return claim.assertion === secondClaims.get(suffix)?.assertion;
    }
    if (lineage.derivationMode === "interaction_override") {
      const firstClaim = firstClaims.get(suffix);
      const secondClaim = secondClaims.get(suffix);
      return (
        Boolean(firstClaim) &&
        Boolean(secondClaim) &&
        claim.assertion !== firstClaim.assertion &&
        claim.assertion !== secondClaim.assertion &&
        sameJson(lineage.sourceClaimIds, [
          firstClaim.claimId,
          secondClaim.claimId,
        ]) &&
        sameSet(claim.evidenceFindingRefs, [
          ...firstClaim.evidenceFindingRefs,
          ...secondClaim.evidenceFindingRefs,
        ]) &&
        sameSet(claim.independentSourceRefs, [
          ...firstClaim.independentSourceRefs,
          ...secondClaim.independentSourceRefs,
        ])
      );
    }
    return false;
  });
}

function checkClaimContains(code, claimId, expectedPhrases) {
  const scenario = read(`${code}_SCENARIO_REVIEW_V2.json`);
  const claim = scenario.claims.find((item) => item.claimId === claimId);
  return {
    code,
    claimId,
    expectedPhrases,
    passed:
      Boolean(claim) &&
      expectedPhrases.every((phrase) => claim.assertion.includes(phrase)),
  };
}

function getDirectionalSceneChecks(currentBatchNumber) {
  const checks = {
    1: [
      [
        "IRAKQ",
        "IRAKQ.scenario.general.new_encounter.attention",
        ["바로 대화를 시작하기보다", "실제로 보이는 행동과 말"],
      ],
      [
        "ERGKQ",
        "ERGKQ.scenario.work.boundary.process",
        ["걱정이 생겨도", "현재 계획", "우선순위"],
      ],
      [
        "ENGMQ",
        "ENGMQ.scenario.general.uncertainty.communication",
        ["가능성", "우려", "계획"],
      ],
      [
        "ENAMC",
        "ENAMC.scenario.general.plan_change.response",
        ["감정이 크게 올라오기 전", "유연하게"],
      ],
      [
        "INAKC",
        "INAKC.scenario.general.aftermath.response",
        ["혼자", "시간이 지나"],
      ],
    ],
    2: [
      [
        "INGKQ",
        "INGKQ.scenario.work.setback.attention",
        ["실패 원인", "놓친 가능성", "실행 순서"],
      ],
      [
        "INAMQ",
        "INAMQ.scenario.partner.uncertainty.process",
        ["가능성", "걱정"],
      ],
      [
        "ERAMQ",
        "ERAMQ.scenario.general.ordinary_choice.response",
        ["이전 경험", "지금", "조정"],
      ],
      [
        "ERAKC",
        "ERAKC.scenario.general.uncertainty.communication",
        ["확인된 건", "아직 몰라", "마음"],
      ],
      [
        "ENGKC",
        "ENGKC.scenario.work.setback.response",
        ["원인", "수정 계획", "후속 행동", "피로"],
      ],
    ],
    3: [
      [
        "ENGMC",
        "ENGMC.scenario.general.new_encounter.attention",
        ["먼저 말을", "여러 면", "가능성"],
      ],
      [
        "INAMC",
        "INAMC.scenario.general.disagreement.response",
        ["상대 관점", "자신의 생각", "유연하게"],
      ],
      [
        "IRAKC",
        "IRAKC.scenario.partner.plan_change.response",
        ["변경 이유", "새 일정", "흐름"],
      ],
      [
        "IRGKQ",
        "IRGKQ.scenario.general.plan_change.response",
        ["걱정되는 항목", "새 순서", "완료 기준"],
      ],
      [
        "ERGMQ",
        "ERGMQ.scenario.general.aftermath.response",
        ["필요한 사람", "재발 방지", "걱정과 피로"],
      ],
    ],
    4: [
      [
        "ERAMC",
        "ERAMC.scenario.general.disagreement.response",
        ["상대 관점", "자신의 생각", "유연하게"],
      ],
      [
        "ERGKC",
        "ERGKC.scenario.work.setback.response",
        ["영향 범위", "수정 행동", "점검"],
      ],
      [
        "INGKC",
        "INGKC.scenario.general.ordinary_choice.response",
        ["여러 가능성", "완료 기준", "꾸준히"],
      ],
      [
        "INGMQ",
        "INGMQ.scenario.general.uncertainty.communication",
        ["가능한 설명", "가장 걱정", "한 가지부터 확인"],
      ],
      [
        "IRAMQ",
        "IRAMQ.scenario.partner.uncertainty.communication",
        ["관계가 걱정", "본 변화", "실제 마음"],
      ],
    ],
  };
  const selected = checks[currentBatchNumber];
  if (!selected) {
    throw new Error(
      `Missing directional scene checks for batch ${currentBatchNumber}`,
    );
  }
  return selected.map(([code, claimId, phrases]) =>
    checkClaimContains(code, claimId, phrases),
  );
}

function ordinalStatus(currentBatchNumber) {
  return ["", "FIRST", "SECOND", "THIRD", "FOURTH"][currentBatchNumber];
}

function indexBySuffix(claims) {
  return new Map(claims.map((claim) => [getSuffix(claim.claimId), claim]));
}

function getSuffix(claimId) {
  return claimId.slice(claimId.indexOf("."));
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sameSet(left, right) {
  return sameJson([...new Set(left)].sort(), [...new Set(right)].sort());
}

function read(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
