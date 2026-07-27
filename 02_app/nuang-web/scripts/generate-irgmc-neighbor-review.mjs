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
  "src/features/nuang-code/irgmc-neighbor-contrast-candidates-v2.ts",
);
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/IRGMC_NEIGHBOR_REVIEW_V2.json",
);
const checkOnly = process.argv.includes("--check");
const sourceModule = loadTypeScriptDataModule(sourcePath);
const packet = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packetId: "IRGMC-NEIGHBOR-CONTRASTS.0.1",
  status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
  code: "IRGMC",
  neighborCodes: sourceModule.irgmcNeighborReviewQueueV2.map(
    (item) => item.code,
  ),
  claimCount: sourceModule.irgmcNeighborContrastClaimsV2.length,
  claims: sourceModule.irgmcNeighborContrastClaimsV2,
  reviewQueue: sourceModule.irgmcNeighborReviewQueueV2.map((item) => ({
    ...item,
    claims: sourceModule.irgmcNeighborContrastClaimsV2
      .filter((claim) => claim.entity.ref === `IRGMC<>${item.code}`)
      .map((claim) => claim.claimId),
    requiredReviews: [
      "one_letter_difference",
      "bidirectional_symmetry",
      "value_bias",
      "plain_korean_cognitive_interview",
      "quantitative_neighbor_discrimination",
    ],
    status: "not_started",
  })),
  approvedClaims: 0,
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
      "IRGMC neighbor review is stale. Run npm run research:trait-map:v2:irgmc-neighbors.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `IRGMC neighbor review is current: ${packet.claimCount} claims across ${packet.neighborCodes.length} neighbors.`,
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
        `IRGMC neighbor module must stay runtime dependency-free; found ${specifier}.`,
      );
    },
  });
  return module.exports;
}
