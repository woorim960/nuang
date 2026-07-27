import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import prettier from "prettier";
import ts from "typescript";

export async function generateDerivedScenarioPacket(config) {
  const {
    projectRoot,
    code,
    roleName,
    baseAnchor,
    changedAxis,
    changedLetters,
    baseInputFile,
    outputFile,
    overrideSourceFile,
    overridesExport,
    evidenceExport,
    command,
    checkOnly,
  } = config;
  const generatedDirectory = path.join(
    projectRoot,
    "docs/research/trait-map-data-center-v2/generated",
  );
  const basePacket = JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, baseInputFile), "utf8"),
  );
  const overrideModule = loadTypeScriptDataModule(
    path.join(projectRoot, overrideSourceFile),
  );
  const overrides = new Map(
    overrideModule[overridesExport].map((item) => [
      item.scenarioId,
      item,
    ]),
  );
  const axisEvidence = overrideModule[evidenceExport];
  const assertionKeys = {
    attention: "attention",
    first_thought: "firstThought",
    actual_response: "actualResponse",
    communication: "communication",
  };
  const axisChangeFocus = {
    SE_energy_and_expression:
      "참여 시작, 대화 중 사고, 표현 시점과 회복 방식",
    OE_exploration_and_interest:
      "정보를 붙잡는 출발점, 가능성을 넓히는 순서와 확인 방식",
    RO_relational_attention:
      "관계 문제에서 처음 향하는 주의, 처음 드는 생각과 실제 지원 행동",
    SM_execution_and_structure:
      "실행을 시작하고 이어가는 조건, 계획 변경과 마무리 방식",
    ER_emotional_activation_and_worry:
      "불편함을 알아차리는 시점, 걱정이 커지는 속도와 회복 방식",
  }[changedAxis];
  if (!axisChangeFocus) {
    throw new Error(`Unknown changed axis: ${changedAxis}`);
  }
  const claims = [];
  const lineage = [];

  for (const sourceClaim of basePacket.claims) {
    const scenarioId = sourceClaim.scenarioRefs[0];
    const override = overrides.get(scenarioId);
    const assertionKey = assertionKeys[sourceClaim.claimKind];
    const isOverride = Boolean(override && assertionKey);
    const claimId = sourceClaim.claimId.replace(
      new RegExp(`^${baseAnchor}\\.`),
      `${code}.`,
    );
    claims.push({
      ...sourceClaim,
      claimId,
      entity: { kind: "profile", ref: code },
      assertion: isOverride ? override[assertionKey] : sourceClaim.assertion,
      evidenceFindingRefs: isOverride
        ? unique([
            ...sourceClaim.evidenceFindingRefs,
            ...axisEvidence.evidenceFindingRefs,
          ])
        : sourceClaim.evidenceFindingRefs,
      independentSourceRefs: isOverride
        ? unique([
            ...sourceClaim.independentSourceRefs,
            ...axisEvidence.independentSourceRefs,
          ])
        : sourceClaim.independentSourceRefs,
    });
    lineage.push({
      claimId,
      sourceClaimId: sourceClaim.claimId,
      derivationMode: isOverride ? "axis_override" : "inherited",
      changedAxis,
      rationale: isOverride
        ? `${changedLetters}가 ${axisChangeFocus}에 직접 영향을 주는 판별 장면이어서 ${code} 문장으로 다시 작성했다.`
        : `이 장면의 문장은 ${changedLetters}보다 공유하는 네 축 또는 공통 상황 과정에 초점을 두므로 ${baseAnchor} 문장을 근거와 함께 상속했다.`,
    });
  }

  const validationQueue = basePacket.validationQueue.map((sourceRow) => {
    const override = overrides.get(sourceRow.scenarioId);
    return {
      scenarioId: sourceRow.scenarioId,
      derivationMode: override ? "axis_override" : "inherited",
      reviewFocus: override
        ? override.reviewFocus
        : [
            `${baseAnchor}와 같은 문장을 상속해도 ${changedLetters} 차이를 가리지 않는지 blind 비교할 것`,
            `${code} 참여자가 문장을 자신의 경험과 연결해 이해하는지 확인할 것`,
          ],
      status: "cognitive_review_required",
    };
  });
  const inheritedClaimCount = lineage.filter(
    (item) => item.derivationMode === "inherited",
  ).length;
  const axisOverrideClaimCount = lineage.length - inheritedClaimCount;
  const packet = {
    contractVersion: "nuang-trait-map-data-center.v2",
    packetId: `${code}-DERIVED-SCENARIO-REVIEW.0.1`,
    status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
    code,
    roleName,
    baseAnchor,
    changedAxis,
    changedLetters,
    summary: {
      scenarioCount: new Set(
        claims.flatMap((claim) => claim.scenarioRefs),
      ).size,
      claimCount: claims.length,
      inheritedClaimCount,
      axisOverrideClaimCount,
      customerVisibleClaims: 0,
    },
    validationQueue,
    claims,
    lineage,
  };
  const output = await prettier.format(JSON.stringify(packet), {
    parser: "json",
  });
  const outputPath = path.join(generatedDirectory, outputFile);
  if (checkOnly) {
    if (
      !fs.existsSync(outputPath) ||
      fs.readFileSync(outputPath, "utf8") !== output
    ) {
      console.error(`${code} derived scenario packet is stale. Run ${command}.`);
      process.exit(1);
    }
  } else {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output);
  }
  console.log(
    `${code} derived scenario packet is current: ${packet.summary.scenarioCount} scenarios, ${inheritedClaimCount} inherited claims, ${axisOverrideClaimCount} ${changedLetters} overrides.`,
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
        `Derived override module must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}
