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
const baseInputPath = path.join(
  generatedDirectory,
  "ENAKQ_SCENARIO_REVIEW_V2.json",
);
const outputPath = path.join(
  generatedDirectory,
  "INAKQ_SCENARIO_REVIEW_V2.json",
);
const overrideSourcePath = path.join(
  projectRoot,
  "src/features/nuang-code/inakq-ei-scenario-overrides-v2.ts",
);
const checkOnly = process.argv.includes("--check");
const basePacket = JSON.parse(fs.readFileSync(baseInputPath, "utf8"));
const overrideModule = loadTypeScriptDataModule(overrideSourcePath);
const overrides = new Map(
  overrideModule.inakqEiScenarioOverridesV2.map((item) => [
    item.scenarioId,
    item,
  ]),
);
const axisEvidence = overrideModule.inakqEiAxisEvidenceV2;
const assertionKeys = {
  attention: "attention",
  first_thought: "firstThought",
  actual_response: "actualResponse",
  communication: "communication",
};

const claims = [];
const lineage = [];
for (const sourceClaim of basePacket.claims) {
  const scenarioId = sourceClaim.scenarioRefs[0];
  const override = overrides.get(scenarioId);
  const assertionKey = assertionKeys[sourceClaim.claimKind];
  const isOverride = Boolean(override && assertionKey);
  const claimId = sourceClaim.claimId.replace(/^ENAKQ\./, "INAKQ.");
  const claim = {
    ...sourceClaim,
    claimId,
    entity: { kind: "profile", ref: "INAKQ" },
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
  };
  claims.push(claim);
  lineage.push({
    claimId,
    sourceClaimId: sourceClaim.claimId,
    derivationMode: isOverride ? "axis_override" : "inherited",
    changedAxis: "SE_energy_and_expression",
    rationale: isOverride
      ? "E/I가 참여 시작, 혼자 정리하는 시간, 표현 시점과 회복 방식에 직접 영향을 주는 판별 장면이어서 INAKQ 문장으로 다시 작성했다."
      : "이 장면의 문장은 E/I보다 N·A·K·Q 또는 공통 상황 과정에 초점을 두므로 ENAKQ 문장을 근거와 함께 상속했다.",
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
          "ENAKQ와 같은 문장을 상속해도 E/I 차이를 가리지 않는지 blind 비교할 것",
          "INAKQ 참여자가 문장을 자신의 경험과 연결해 이해하는지 확인할 것",
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
  packetId: "INAKQ-DERIVED-SCENARIO-REVIEW.0.1",
  status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
  code: "INAKQ",
  roleName: "마음과 가능성을 살피는 안내자",
  baseAnchor: "ENAKQ",
  changedAxis: "SE_energy_and_expression",
  changedLetters: "E/I",
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
if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "INAKQ derived scenario packet is stale. Run npm run research:trait-map:v2:inakq-scenarios.",
    );
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
}
console.log(
  `INAKQ derived scenario packet is current: ${packet.summary.scenarioCount} scenarios, ${inheritedClaimCount} inherited claims, ${axisOverrideClaimCount} E/I overrides.`,
);

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
        `INAKQ override module must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}
