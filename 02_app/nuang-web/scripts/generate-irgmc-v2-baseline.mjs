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
  "src/features/nuang-code/irgmc-foundation-candidates-v2.ts",
);
const evidenceInventoryPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/EVIDENCE_INVENTORY_V2.json",
);
const scenarioCoveragePath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_RESEARCH_COVERAGE_V2.json",
);
const irgmcScenarioCoveragePath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/IRGMC_SCENARIO_RESEARCH_COVERAGE_V2.json",
);
const irgmcLongformManifestPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/IRGMC_LONGFORM_RESEARCH_MANIFEST_V2.json",
);
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/IRGMC_RESEARCH_BASELINE_V2.json",
);
const checkOnly = process.argv.includes("--check");
const sourceModule = loadTypeScriptDataModule(sourcePath);
const evidenceInventory = JSON.parse(
  fs.readFileSync(evidenceInventoryPath, "utf8"),
);
const scenarioCoverage = JSON.parse(
  fs.readFileSync(scenarioCoveragePath, "utf8"),
);
const irgmcScenarioCoverage = fs.existsSync(irgmcScenarioCoveragePath)
  ? JSON.parse(fs.readFileSync(irgmcScenarioCoveragePath, "utf8"))
  : null;
const irgmcLongformManifest = fs.existsSync(irgmcLongformManifestPath)
  ? JSON.parse(fs.readFileSync(irgmcLongformManifestPath, "utf8"))
  : null;

const baseline = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packageId: "IRGMC-RESEARCH-BASELINE.0.1",
  status:
    irgmcScenarioCoverage?.totalResearchCandidateCovered === 72 &&
    irgmcLongformManifest?.totalNonWhitespaceCharacters >= 50_000
      ? "RESEARCH_DRAFT_NOT_FOR_PRODUCTION"
      : "RESEARCH_SCAFFOLD_NOT_FOR_PRODUCTION",
  code: "IRGMC",
  profileName: "단서로 답을 찾는 탐구자",
  oppositeAnchor: "ENAKQ",
  nonCopyRule:
    "ENAKQ 문장의 주어와 형용사만 반대로 바꾸지 않는다. IRGMC의 주의·생각·실제 반응을 상황별로 새로 검증한다.",
  metrics: {
    foundationClaimCount: sourceModule.irgmcFoundationClaimsV2.length,
    chapterQuestionCount:
      sourceModule.irgmcResearchQuestionsByChapterV2.length,
    canonicalScenarioCount: scenarioCoverage.canonicalScenarioCount,
    authoredScenarioCount:
      irgmcScenarioCoverage?.totalResearchCandidateCovered ?? 0,
    oneLetterNeighborCount: sourceModule.irgmcNeighborCodesV2.length,
    availableIncludedEvidenceSources:
      evidenceInventory.normalizedRegistry.includedSources,
    longformNonWhitespaceCharacters:
      irgmcLongformManifest?.totalNonWhitespaceCharacters ?? 0,
    customerApprovedClaims: 0,
  },
  foundationClaims: sourceModule.irgmcFoundationClaimsV2,
  chapterResearchQuestions:
    sourceModule.irgmcResearchQuestionsByChapterV2.map(
      ([chapterId, question]) => ({ chapterId, question }),
    ),
  scenarioInventory: scenarioCoverage.rows.map((row) => ({
    scenarioId: row.scenarioId,
    relationshipContext: row.relationshipContext,
    moment: row.moment,
    authoringStatus: "not_started",
  })),
  oneLetterNeighbors: sourceModule.irgmcNeighborCodesV2,
  completedAuthoringBatches: [
    "IRGMC-P0: 일상·연인·마음에 드는 사람 우선 상황",
    "IRGMC-P1: 가족·친구·일과 공부 우선 상황",
    "IRGMC-P2: 남은 공통 상황",
    "IRGMC-LONGFORM: 16개 장 50,000~60,000자 연구 원문",
  ],
  publicationBlockers: [
    "인지 인터뷰 전",
    "정량 파일럿 전",
    "다섯 인접 코드 blind 비교 전",
    "성격심리·심리측정·관계심리·임상안전·쉬운 한국어·제품·디자인 검토 전",
  ],
};

const output = await prettier.format(JSON.stringify(baseline), {
  parser: "json",
});
if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "IRGMC baseline is stale. Run npm run research:trait-map:v2:irgmc-baseline.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `IRGMC baseline is current: ${baseline.metrics.foundationClaimCount} foundation claims, ${baseline.metrics.chapterQuestionCount} chapters, ${baseline.metrics.canonicalScenarioCount} planned scenarios.`,
);

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
        `IRGMC foundation module must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}
