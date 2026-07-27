import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import ts from "typescript";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourcePath = path.join(
  projectRoot,
  "src/features/nuang-code/enakq-p0-scenario-candidates-v2.ts",
);
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/ENAKQ_P0_SCENARIO_REVIEW.json",
);
const checkOnly = process.argv.includes("--check");
const {
  enakqP0ScenarioCandidatesV2,
  enakqP0ScenarioValidationQueueV2,
} = loadTypeScriptDataModule(sourcePath);

const contexts = ["general", "partner", "person_of_interest"];
const packet = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packetId: "ENAKQ-P0-SCENARIO-REVIEW.0.1",
  status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
  code: "ENAKQ",
  summary: {
    scenarioCount: enakqP0ScenarioValidationQueueV2.length,
    claimCount: enakqP0ScenarioCandidatesV2.length,
    contextCounts: Object.fromEntries(
      contexts.map((context) => [
        context,
        enakqP0ScenarioValidationQueueV2.filter(
          (item) => item.context === context,
        ).length,
      ]),
    ),
    firstThoughtActualResponsePairs:
      enakqP0ScenarioValidationQueueV2.length,
    customerVisibleClaims: 0,
  },
  nonNegotiableGates: [
    "인지 인터뷰에서 장면이 구체적으로 떠오르는지 확인",
    "처음 드는 생각과 실제 나타나는 반응을 별도 질문으로 검증",
    "다른 코드와의 blind 비교로 바넘 문장 여부 확인",
    "관계 결과·호감·능력·진단으로 확대되는 표현 차단",
    "쉬운 한국어 검토와 전 필수 전문가 검토 통과 전 공개 금지",
  ],
  validationQueue: enakqP0ScenarioValidationQueueV2,
  claims: enakqP0ScenarioCandidatesV2,
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
      "ENAKQ P0 scenario review packet is stale. Run npm run research:trait-map:v2:enakq-p0.",
    );
    process.exit(1);
  }
  console.log(
    `ENAKQ P0 scenario review is current: ${packet.summary.scenarioCount} scenarios and ${packet.summary.claimCount} claims.`,
  );
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(
    `Generated ${path.relative(projectRoot, outputPath)} with ${packet.summary.scenarioCount} scenarios and ${packet.summary.claimCount} claims.`,
  );
}

function loadTypeScriptDataModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: filePath,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(specifier) {
      throw new Error(
        `The P0 data module must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}
