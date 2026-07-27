import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import ts from "typescript";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const generatedDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated",
);
const checkOnly = process.argv.includes("--check");
const batchNumber = Number(
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1] ?? "1",
);
const plan = read("REMAINING_PROFILE_PRODUCTION_PLAN_V2.json");
const batch = plan.batches[batchNumber - 1];
if (!batch) {
  throw new Error(`Unknown remaining-profile batch: ${batchNumber}`);
}
const overrideModule = loadTypeScriptDataModule(
  path.join(
    projectRoot,
    `src/features/nuang-code/remaining-batch${batchNumber}-interaction-overrides-v2.ts`,
  ),
);
const interactionOverrides =
  overrideModule[`remainingBatch${batchNumber}InteractionOverridesV2`];
if (!interactionOverrides) {
  throw new Error(
    `Missing remainingBatch${batchNumber}InteractionOverridesV2 export`,
  );
}
const assertionKeys = {
  attention: "attention",
  first_thought: "firstThought",
  actual_response: "actualResponse",
  communication: "communication",
};

for (const profilePlan of batch.profiles) {
  await generateProfilePacket(profilePlan);
}

async function generateProfilePacket(profilePlan) {
  const anchorPacket = read(`${profilePlan.anchor}_SCENARIO_REVIEW_V2.json`);
  const firstParentPacket = read(
    `${profilePlan.primaryPath.parent}_SCENARIO_REVIEW_V2.json`,
  );
  const secondParentPacket = read(
    `${profilePlan.alternatePath.parent}_SCENARIO_REVIEW_V2.json`,
  );
  const firstOverrideScenes = getOverrideScenarioIds(firstParentPacket);
  const secondOverrideScenes = getOverrideScenarioIds(secondParentPacket);
  const interactionByScenario = new Map(
    interactionOverrides[profilePlan.code].map((item) => [
      item.scenarioId,
      item,
    ]),
  );
  const firstClaims = indexClaims(firstParentPacket);
  const secondClaims = indexClaims(secondParentPacket);
  const claims = [];
  const lineage = [];

  for (const anchorClaim of anchorPacket.claims) {
    const scenarioId = anchorClaim.scenarioRefs[0];
    const claimKind = anchorClaim.claimKind;
    const suffix = getClaimSuffix(anchorClaim.claimId);
    const firstClaim = firstClaims.get(suffix);
    const secondClaim = secondClaims.get(suffix);
    const interaction = interactionByScenario.get(scenarioId);
    const assertionKey = assertionKeys[claimKind];
    const isFirstAxis = firstOverrideScenes.has(scenarioId);
    const isSecondAxis = secondOverrideScenes.has(scenarioId);
    const isInteraction = isFirstAxis && isSecondAxis;
    let sourceClaim = anchorClaim;
    let assertion = anchorClaim.assertion;
    let derivationMode = "anchor_inherited";
    let sourceClaimIds = [anchorClaim.claimId];

    if (isInteraction) {
      if (!interaction || !assertionKey) {
        throw new Error(
          `${profilePlan.code} is missing interaction copy for ${scenarioId}/${claimKind}`,
        );
      }
      assertion = interaction[assertionKey];
      derivationMode = "interaction_override";
      sourceClaimIds = [firstClaim.claimId, secondClaim.claimId];
    } else if (isFirstAxis) {
      sourceClaim = firstClaim;
      assertion = firstClaim.assertion;
      derivationMode = "first_axis_inherited";
      sourceClaimIds = [firstClaim.claimId];
    } else if (isSecondAxis) {
      sourceClaim = secondClaim;
      assertion = secondClaim.assertion;
      derivationMode = "second_axis_inherited";
      sourceClaimIds = [secondClaim.claimId];
    }

    const evidenceFindingRefs = isInteraction
      ? unique([
          ...firstClaim.evidenceFindingRefs,
          ...secondClaim.evidenceFindingRefs,
        ])
      : sourceClaim.evidenceFindingRefs;
    const independentSourceRefs = isInteraction
      ? unique([
          ...firstClaim.independentSourceRefs,
          ...secondClaim.independentSourceRefs,
        ])
      : sourceClaim.independentSourceRefs;
    const claimId = `${profilePlan.code}${suffix}`;
    claims.push({
      ...anchorClaim,
      claimId,
      entity: { kind: "profile", ref: profilePlan.code },
      assertion,
      evidenceFindingRefs,
      independentSourceRefs,
    });
    lineage.push({
      claimId,
      derivationMode,
      sourceClaimIds,
      anchorClaimId: anchorClaim.claimId,
      changedAxes: profilePlan.changedAxes,
      rationale:
        derivationMode === "interaction_override"
          ? "두 축의 판별 장면이 겹쳐 한쪽 부모 문장을 덮어쓰지 않고 주의·처음 생각·실제 반응·말하기를 함께 다시 작성했다."
          : derivationMode === "anchor_inherited"
            ? "두 축보다 공유하는 세 축 또는 공통 상황 과정에 초점을 둔 문장이어서 기준 성향 문장을 근거와 함께 상속했다."
            : "두 축 중 한 축에만 직접 민감한 장면이어서 해당 한 글자 부모의 검토 문장을 계보와 함께 상속했다.",
    });
  }

  const validationQueue = anchorPacket.validationQueue.map((row) => {
    const isFirstAxis = firstOverrideScenes.has(row.scenarioId);
    const isSecondAxis = secondOverrideScenes.has(row.scenarioId);
    const interaction = interactionByScenario.get(row.scenarioId);
    return {
      scenarioId: row.scenarioId,
      derivationMode:
        isFirstAxis && isSecondAxis
          ? "interaction_override"
          : isFirstAxis
            ? "first_axis_inherited"
            : isSecondAxis
              ? "second_axis_inherited"
              : "anchor_inherited",
      reviewFocus: interaction?.reviewFocus ?? [
        "코드 이름을 가린 상태에서 두 부모 경로가 같은 생활 경험으로 이해되는지 확인할 것",
        "두 축 외의 상황 조건·관계 역할·최근 상태가 문장 선택을 대신하지 않는지 확인할 것",
      ],
      status: "cognitive_review_required",
    };
  });
  const modeCounts = Object.fromEntries(
    [
      "anchor_inherited",
      "first_axis_inherited",
      "second_axis_inherited",
      "interaction_override",
    ].map((mode) => [
      mode,
      lineage.filter((item) => item.derivationMode === mode).length,
    ]),
  );
  const packet = {
    contractVersion: "nuang-trait-map-data-center.v2",
    packetId: `${profilePlan.code}-MULTI-AXIS-SCENARIO-REVIEW.0.1`,
    status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
    code: profilePlan.code,
    roleName: profilePlan.roleName,
    anchor: profilePlan.anchor,
    changedAxes: profilePlan.changedAxes,
    parentPaths: [profilePlan.primaryPath, profilePlan.alternatePath],
    summary: {
      scenarioCount: new Set(claims.flatMap((claim) => claim.scenarioRefs))
        .size,
      claimCount: claims.length,
      ...modeCounts,
      inheritedClaimCount:
        modeCounts.anchor_inherited +
        modeCounts.first_axis_inherited +
        modeCounts.second_axis_inherited,
      axisOverrideClaimCount: modeCounts.interaction_override,
      customerVisibleClaims: 0,
    },
    validationQueue,
    claims,
    lineage,
  };
  const output = await prettier.format(JSON.stringify(packet), {
    parser: "json",
  });
  const outputPath = path.join(
    generatedDirectory,
    `${profilePlan.code}_SCENARIO_REVIEW_V2.json`,
  );
  if (checkOnly) {
    if (
      !fs.existsSync(outputPath) ||
      fs.readFileSync(outputPath, "utf8") !== output
    ) {
      console.error(
        `${profilePlan.code} multi-axis scenario packet is stale. Run npm run research:trait-map:v2:remaining-batch${batchNumber}-scenarios.`,
      );
      process.exit(1);
    }
  } else {
    fs.writeFileSync(outputPath, output);
  }
  console.log(
    `${profilePlan.code}: ${packet.summary.scenarioCount} scenarios, ${packet.summary.claimCount} claims, ${modeCounts.interaction_override} interaction claims.`,
  );
}

function indexClaims(packet) {
  return new Map(
    packet.claims.map((claim) => [getClaimSuffix(claim.claimId), claim]),
  );
}

function getClaimSuffix(claimId) {
  return claimId.slice(claimId.indexOf("."));
}

function getOverrideScenarioIds(packet) {
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

function unique(values) {
  return [...new Set(values)];
}

function loadTypeScriptDataModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: filePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(specifier) {
      throw new Error(
        `Interaction override module must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}

function read(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
