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
const baselinePath = path.join(
  generatedDirectory,
  "IRGMC_RESEARCH_BASELINE_V2.json",
);
const reviewOutputPath = path.join(
  generatedDirectory,
  "IRGMC_SCENARIO_REVIEW_V2.json",
);
const coverageOutputPath = path.join(
  generatedDirectory,
  "IRGMC_SCENARIO_RESEARCH_COVERAGE_V2.json",
);
const checkOnly = process.argv.includes("--check");

const modules = ["p0", "p1", "p2"].map((priority) =>
  loadTypeScriptDataModule(
    path.join(
      projectRoot,
      `src/features/nuang-code/irgmc-${priority}-scenario-candidates-v2.ts`,
    ),
  ),
);
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const claims = [
  ...modules[0].irgmcP0ScenarioCandidatesV2,
  ...modules[1].irgmcP1ScenarioCandidatesV2,
  ...modules[2].irgmcP2ScenarioCandidatesV2,
];
const validationQueue = [
  ...modules[0].irgmcP0ScenarioValidationQueueV2,
  ...modules[1].irgmcP1ScenarioValidationQueueV2,
  ...modules[2].irgmcP2ScenarioValidationQueueV2,
];
const priorityByScenario = new Map(
  validationQueue.map((item, index) => [
    item.scenarioId,
    index < 18 ? "p0" : index < 42 ? "p1" : "p2",
  ]),
);
const claimCountByScenario = new Map();
for (const claim of claims) {
  const scenarioId = claim.scenarioRefs[0];
  claimCountByScenario.set(
    scenarioId,
    (claimCountByScenario.get(scenarioId) ?? 0) + 1,
  );
}

const rows = baseline.scenarioInventory.map((scenario) => ({
  scenarioId: scenario.scenarioId,
  relationshipContext: scenario.relationshipContext,
  moment: scenario.moment,
  priority: priorityByScenario.get(scenario.scenarioId) ?? null,
  claimCount: claimCountByScenario.get(scenario.scenarioId) ?? 0,
  researchCandidateCovered: claimCountByScenario.has(scenario.scenarioId),
  customerApproved: false,
}));
const coverageReport = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "IRGMC-SCENARIO-RESEARCH-COVERAGE.0.1",
  status: "RESEARCH_COVERAGE_NOT_FOR_PRODUCTION",
  code: "IRGMC",
  canonicalScenarioCount: rows.length,
  totalResearchCandidateCovered: rows.filter(
    (row) => row.researchCandidateCovered,
  ).length,
  remainingResearchGaps: rows.filter(
    (row) => !row.researchCandidateCovered,
  ).length,
  researchCandidateClaims: claims.length,
  customerApprovedScenarios: 0,
  contextCounts: Object.fromEntries(
    [
      "general",
      "family",
      "friend",
      "partner",
      "person_of_interest",
      "work",
    ].map((context) => [
      context,
      rows.filter(
        (row) =>
          row.relationshipContext === context &&
          row.researchCandidateCovered,
      ).length,
    ]),
  ),
  rows,
};
const reviewPacket = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packetId: "IRGMC-SCENARIO-REVIEW.0.1",
  status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
  code: "IRGMC",
  roleName: "단서로 답을 찾는 탐구자",
  summary: {
    scenarioCount: validationQueue.length,
    claimCount: claims.length,
    firstThoughtActualResponsePairs: validationQueue.length,
    customerVisibleClaims: 0,
    researchCoverage: `${coverageReport.totalResearchCandidateCovered}/${coverageReport.canonicalScenarioCount}`,
  },
  reviewOrder: [
    "P0: 일상·연인·마음에 드는 사람의 우선 장면 18개",
    "P1: 가족·친구·일과 공부의 우선 장면 24개",
    "P2: 평범한 선택·도움·욕구·경계 등 남은 장면 30개",
    "인지 인터뷰 뒤 쉬운 문장으로 수정",
    "ENAKQ와 한 글자 이웃 코드 blind 비교",
    "전문 검토와 정량 파일럿 뒤에만 고객 승인 후보로 전환",
  ],
  authoringBoundary: [
    "I를 대인 기피로 쓰지 않는다.",
    "R을 상상력이나 창의성 부족으로 쓰지 않는다.",
    "G를 공감 부족으로 쓰지 않는다.",
    "M을 무계획이나 무책임으로 쓰지 않는다.",
    "C를 무감정으로 쓰지 않는다.",
    "ENAKQ 문장을 반대로 바꾸는 방식으로 만들지 않는다.",
  ],
  validationQueue,
  claims,
};

await writeOrCheck(reviewOutputPath, reviewPacket, "scenario review packet");
await writeOrCheck(
  coverageOutputPath,
  coverageReport,
  "scenario research coverage",
);

console.log(
  `IRGMC research scenario packet is current: ${coverageReport.totalResearchCandidateCovered}/${coverageReport.canonicalScenarioCount} scenarios, ${claims.length} claims, 0 customer-approved.`,
);

async function writeOrCheck(filePath, value, label) {
  const output = await prettier.format(JSON.stringify(value), {
    parser: "json",
  });
  if (checkOnly) {
    if (
      !fs.existsSync(filePath) ||
      fs.readFileSync(filePath, "utf8") !== output
    ) {
      console.error(
        `IRGMC ${label} is stale. Run npm run research:trait-map:v2:irgmc-scenarios.`,
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
        `IRGMC scenario modules must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}
