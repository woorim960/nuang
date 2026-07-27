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
  "REMAINING_PROFILE_PRODUCTION_PLAN_V2.json",
);
const checkOnly = process.argv.includes("--check");
const completenessAudit = read(
  "DIRECT_DERIVED_PROFILE_COMPLETENESS_AUDIT_V2.json",
);
const completedProfiles = new Set([
  ...completenessAudit.scope.baseAnchors,
  ...completenessAudit.profiles.map((profile) => profile.code),
]);
const axisOrder = [
  "SE_energy_and_expression",
  "OE_exploration_and_interest",
  "RO_relational_attention",
  "SM_execution_and_structure",
  "ER_emotional_activation_and_worry",
];
const axisMeta = {
  SE_energy_and_expression: {
    position: 0,
    direct: { ENAKQ: "INAKQ", IRGMC: "ERGMC" },
  },
  OE_exploration_and_interest: {
    position: 1,
    direct: { ENAKQ: "ERAKQ", IRGMC: "INGMC" },
  },
  RO_relational_attention: {
    position: 2,
    direct: { ENAKQ: "ENGKQ", IRGMC: "IRAMC" },
  },
  SM_execution_and_structure: {
    position: 3,
    direct: { ENAKQ: "ENAMQ", IRGMC: "IRGKC" },
  },
  ER_emotional_activation_and_worry: {
    position: 4,
    direct: { ENAKQ: "ENAKC", IRGMC: "IRGMQ" },
  },
};
const roleNames = {
  IRAKQ: "마음 변화를 살피는 관찰자",
  ERGKQ: "변수에 빠르게 반응하는 해결사",
  ENGMQ: "가능성을 펼치는 발상가",
  ENAMC: "상상과 마음을 나누는 소통가",
  INAKC: "조용히 관계를 잇는 조정자",
  INGKQ: "가능성과 변수를 살피는 구상가",
  INAMQ: "마음의 이야기를 품는 기록가",
  ERAMQ: "마음에 바로 반응하는 공감자",
  ERAKC: "차분히 관계를 맞추는 조율가",
  ENGKC: "가능성을 계획하는 기획자",
  ENGMC: "새 길을 여는 개척자",
  INAMC: "마음과 가능성을 그리는 상상가",
  IRAKC: "조용히 마음을 지키는 수호자",
  IRGKQ: "변수를 꼼꼼히 살피는 전략가",
  ERGMQ: "빠르게 움직이는 현장해결가",
  ERAMC: "유연하게 곁을 걷는 동행가",
  ERGKC: "차분히 답을 세우는 운영가",
  INGKC: "가능성을 차근차근 짓는 설계자",
  INGMQ: "가능성을 깊이 좇는 사색가",
  IRAMQ: "마음 변화를 듣는 경청자",
};
const cyclePairs = [
  [axisOrder[0], axisOrder[1]],
  [axisOrder[1], axisOrder[2]],
  [axisOrder[2], axisOrder[3]],
  [axisOrder[3], axisOrder[4]],
  [axisOrder[4], axisOrder[0]],
];
const complementPairs = [
  [axisOrder[0], axisOrder[2]],
  [axisOrder[0], axisOrder[3]],
  [axisOrder[1], axisOrder[3]],
  [axisOrder[1], axisOrder[4]],
  [axisOrder[2], axisOrder[4]],
];
const batchConfigs = [
  {
    batchId: "BATCH-1-ENAKQ-CYCLE",
    anchor: "ENAKQ",
    pairs: cyclePairs,
  },
  {
    batchId: "BATCH-2-ENAKQ-COMPLEMENT",
    anchor: "ENAKQ",
    pairs: complementPairs,
  },
  {
    batchId: "BATCH-3-IRGMC-CYCLE",
    anchor: "IRGMC",
    pairs: cyclePairs,
  },
  {
    batchId: "BATCH-4-IRGMC-COMPLEMENT",
    anchor: "IRGMC",
    pairs: complementPairs,
  },
];
const batches = batchConfigs.map((batch, batchIndex) => {
  const profiles = batch.pairs.map(([firstAxis, secondAxis], profileIndex) =>
    buildProfilePlan({
      anchor: batch.anchor,
      firstAxis,
      secondAxis,
      productionOrder: batchIndex * 5 + profileIndex + 1,
    }),
  );
  return {
    batchId: batch.batchId,
    productionOrder: batchIndex + 1,
    anchor: batch.anchor,
    strategy:
      "두 개의 완성된 한 글자 부모 경로를 함께 사용하고, 두 축 판별 장면이 겹치는 곳만 상호작용 문장으로 새로 작성한다.",
    profileCount: profiles.length,
    interactionScenarioCount: profiles.reduce(
      (total, profile) => total + profile.interactionScenarioIds.length,
      0,
    ),
    interactionClaimCount: profiles.reduce(
      (total, profile) => total + profile.composition.interactionClaims,
      0,
    ),
    profiles,
  };
});
const flattenedProfiles = batches.flatMap((batch) => batch.profiles);
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  planId: "REMAINING-PROFILE-PRODUCTION-PLAN.0.1",
  status: "FOUR_BATCHES_LOCKED_FIRST_BATCH_AUTHORING_READY",
  completedFoundation: {
    anchorProfiles: completenessAudit.scope.baseAnchors,
    directDerivedProfiles: completenessAudit.profiles.map(
      (profile) => profile.code,
    ),
    structuralAuditStatus: completenessAudit.status,
  },
  productionRules: [
    "각 목표 코드는 완성된 한 글자 부모 2개에서 독립적으로 도달할 수 있어야 한다.",
    "한 축에만 민감한 장면은 해당 직접 파생 부모 문장을 계보와 함께 재사용한다.",
    "두 축 판별 장면이 겹치면 어느 한쪽 문장을 덮어쓰지 않고 4개 채널을 상호작용 문장으로 다시 작성한다.",
    "두 경로에서 공통으로 도출되는 비중첩 문장은 assertion과 근거 참조가 같아야 한다.",
    "모든 문장은 research_only를 유지하고 사람 검증 전 고객 화면에 발행하지 않는다.",
    "각 코드가 72개 상황·288개 상황 claim·16개 장·5만~6만 자·이웃 5개 비교를 충족해야 묶음 감사를 시작한다.",
  ],
  batches,
  totals: {
    remainingProfiles: flattenedProfiles.length,
    batches: batches.length,
    interactionScenarios: batches.reduce(
      (total, batch) => total + batch.interactionScenarioCount,
      0,
    ),
    interactionClaims: batches.reduce(
      (total, batch) => total + batch.interactionClaimCount,
      0,
    ),
  },
  firstBatchGate: [
    "IRAKQ·ERGKQ·ENGMQ·ENAMC·INAKC 상황 패킷을 두 부모 경로로 각각 생성",
    "중첩 4개 장면의 주의·처음 생각·실제 반응·말하기 상호작용 문장 16개를 독립 작성",
    "비중첩 문장의 경로 수렴과 근거 계보 자동 감사",
    "기초 정의·프로필 가설·한 글자 이웃 5개 비교 연결",
    "장문 원장 제작 전 코드 이름을 가린 문장 감사 준비",
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
      "Remaining-profile production plan is stale. Run npm run research:trait-map:v2:remaining-plan.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `Remaining-profile plan: ${flattenedProfiles.length} profiles in ${batches.length} batches; batch 1 has ${batches[0].interactionScenarioCount} interaction scenes.`,
);

function buildProfilePlan({ anchor, firstAxis, secondAxis, productionOrder }) {
  const firstParent = axisMeta[firstAxis].direct[anchor];
  const secondParent = axisMeta[secondAxis].direct[anchor];
  if (
    !completedProfiles.has(firstParent) ||
    !completedProfiles.has(secondParent)
  ) {
    throw new Error(
      `Incomplete parent path for ${anchor}: ${firstParent}, ${secondParent}`,
    );
  }
  const targetCode = toggleAxis(toggleAxis(anchor, firstAxis), secondAxis);
  const firstScenes = getOverrideScenarioIds(firstParent);
  const secondScenes = getOverrideScenarioIds(secondParent);
  const interactionScenarioIds = [...firstScenes]
    .filter((scenarioId) => secondScenes.has(scenarioId))
    .sort();
  const singleAxisScenarioCount =
    firstScenes.size + secondScenes.size - interactionScenarioIds.length * 2;
  const untouchedScenarioCount =
    72 - (firstScenes.size + secondScenes.size - interactionScenarioIds.length);
  return {
    productionOrder,
    code: targetCode,
    roleName: roleNames[targetCode],
    anchor,
    changedAxes: [firstAxis, secondAxis],
    primaryPath: {
      parent: firstParent,
      applyAxis: secondAxis,
    },
    alternatePath: {
      parent: secondParent,
      applyAxis: firstAxis,
    },
    interactionScenarioIds,
    composition: {
      untouchedAnchorClaims: untouchedScenarioCount * 4,
      singleAxisClaims: singleAxisScenarioCount * 4,
      interactionClaims: interactionScenarioIds.length * 4,
      totalClaims: 288,
    },
    status: "authoring_ready_research_only",
  };
}

function getOverrideScenarioIds(code) {
  const packet = read(`${code}_SCENARIO_REVIEW_V2.json`);
  return new Set(
    packet.lineage
      .filter((item) => item.derivationMode === "axis_override")
      .map(
        (item) =>
          packet.claims.find((claim) => claim.claimId === item.claimId)
            .scenarioRefs[0],
      ),
  );
}

function toggleAxis(code, axis) {
  const position = axisMeta[axis].position;
  const pairs = [
    ["E", "I"],
    ["R", "N"],
    ["G", "A"],
    ["K", "M"],
    ["C", "Q"],
  ];
  const current = code[position];
  const replacement =
    pairs[position][0] === current ? pairs[position][1] : pairs[position][0];
  return `${code.slice(0, position)}${replacement}${code.slice(position + 1)}`;
}

function read(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
