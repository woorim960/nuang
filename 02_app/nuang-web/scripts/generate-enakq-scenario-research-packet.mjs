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
const coverageInputPath = path.join(
  generatedDirectory,
  "ENAKQ_SCENARIO_COVERAGE.json",
);
const migrationPath = path.join(
  projectRoot,
  "src/features/nuang-code/fixtures/enakq-v2-migration.generated.json",
);
const reviewOutputPath = path.join(
  generatedDirectory,
  "ENAKQ_SCENARIO_REVIEW_V2.json",
);
const coverageOutputPath = path.join(
  generatedDirectory,
  "ENAKQ_SCENARIO_RESEARCH_COVERAGE_V2.json",
);
const checkOnly = process.argv.includes("--check");

const p0 = loadTypeScriptDataModule(
  path.join(
    projectRoot,
    "src/features/nuang-code/enakq-p0-scenario-candidates-v2.ts",
  ),
);
const p1 = loadTypeScriptDataModule(
  path.join(
    projectRoot,
    "src/features/nuang-code/enakq-p1-scenario-candidates-v2.ts",
  ),
);
const p2 = loadTypeScriptDataModule(
  path.join(
    projectRoot,
    "src/features/nuang-code/enakq-p2-scenario-candidates-v2.ts",
  ),
);
const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
const coverageInput = JSON.parse(fs.readFileSync(coverageInputPath, "utf8"));

const p0ScenarioIds = new Set(
  p0.enakqP0ScenarioValidationQueueV2.map((item) => item.scenarioId),
);
const p1ScenarioIds = new Set(
  p1.enakqP1ScenarioValidationQueueV2.map((item) => item.scenarioId),
);
const p2ScenarioIds = new Set(
  p2.enakqP2ScenarioValidationQueueV2.map((item) => item.scenarioId),
);
const legacyScenarioIds = new Set(
  migration.claims.flatMap((item) => item.v2Claim.scenarioRefs),
);

const rows = coverageInput.rows.map((row) => {
  const layers = [];
  if (legacyScenarioIds.has(row.scenarioId)) layers.push("legacy_candidate");
  if (p0ScenarioIds.has(row.scenarioId)) layers.push("p0_review_candidate");
  if (p1ScenarioIds.has(row.scenarioId)) layers.push("p1_review_candidate");
  if (p2ScenarioIds.has(row.scenarioId)) layers.push("p2_review_candidate");
  return {
    scenarioId: row.scenarioId,
    relationshipContext: row.relationshipContext,
    moment: row.moment,
    researchCandidateLayers: layers,
    researchCandidateCovered: layers.length > 0,
    customerApproved: false,
  };
});

const coverageReport = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "ENAKQ-SCENARIO-RESEARCH-COVERAGE.0.1",
  status: "RESEARCH_COVERAGE_NOT_FOR_PRODUCTION",
  code: "ENAKQ",
  canonicalScenarioCount: rows.length,
  legacyCandidateCovered: rows.filter((row) =>
    row.researchCandidateLayers.includes("legacy_candidate"),
  ).length,
  newReviewCandidateCovered: rows.filter((row) =>
    row.researchCandidateLayers.some((layer) =>
      layer.endsWith("review_candidate"),
    ),
  ).length,
  totalResearchCandidateCovered: rows.filter(
    (row) => row.researchCandidateCovered,
  ).length,
  remainingResearchGaps: rows.filter(
    (row) => !row.researchCandidateCovered,
  ).length,
  customerApprovedScenarios: 0,
  rows,
};

const candidateClaims = [
  ...p0.enakqP0ScenarioCandidatesV2,
  ...p1.enakqP1ScenarioCandidatesV2,
  ...p2.enakqP2ScenarioCandidatesV2,
];
const validationQueue = [
  ...p0.enakqP0ScenarioValidationQueueV2,
  ...p1.enakqP1ScenarioValidationQueueV2,
  ...p2.enakqP2ScenarioValidationQueueV2,
];
const reviewPacket = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packetId: "ENAKQ-SCENARIO-REVIEW.0.1",
  status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
  code: "ENAKQ",
  summary: {
    newScenarioCount: validationQueue.length,
    newClaimCount: candidateClaims.length,
    firstThoughtActualResponsePairs: validationQueue.length,
    customerVisibleClaims: 0,
    researchCoverage: `${coverageReport.totalResearchCandidateCovered}/${coverageReport.canonicalScenarioCount}`,
  },
  reviewOrder: [
    "P0: 일상·연인·마음에 드는 사람 18개 장면",
    "P1: 가족·친구·일과 공부 24개 장면",
    "P2: 기존 장문만 연결돼 있던 30개 장면을 동일한 네 채널로 표준화",
    "인지 인터뷰 뒤 문장 수정",
    "인접 코드 blind 비교",
    "전문 검토와 정량 파일럿 뒤에만 고객 승인 후보로 전환",
  ],
  validationQueue,
  claims: candidateClaims,
};

await writeOrCheck(reviewOutputPath, reviewPacket, "scenario review packet");
await writeOrCheck(
  coverageOutputPath,
  coverageReport,
  "scenario research coverage",
);

console.log(
  `ENAKQ research scenario packet is current: ${coverageReport.totalResearchCandidateCovered}/${coverageReport.canonicalScenarioCount} scenarios covered, ${candidateClaims.length} new claims, 0 customer-approved.`,
);

async function writeOrCheck(filePath, value, label) {
  const output = await prettier.format(JSON.stringify(value), {
    parser: "json",
  });
  if (checkOnly) {
    if (!fs.existsSync(filePath) || fs.readFileSync(filePath, "utf8") !== output) {
      console.error(
        `ENAKQ ${label} is stale. Run npm run research:trait-map:v2:enakq-scenarios.`,
      );
      process.exit(1);
    }
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, output);
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
        `Scenario data modules must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}
