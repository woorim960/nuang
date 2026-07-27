import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import ts from "typescript";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(
  projectRoot,
  "src/features/nuang-code",
);
const baseModule = loadTypeScriptDataModule(
  path.join(sourceDirectory, "irgmc-neighbor-contrast-candidates-v2.ts"),
);
const sourceModule = loadTypeScriptDataModule(
  path.join(sourceDirectory, "ergmc-neighbor-contrast-candidates-v2.ts"),
  {
    "@/features/nuang-code/irgmc-neighbor-contrast-candidates-v2":
      baseModule,
  },
);
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/ERGMC_NEIGHBOR_REVIEW_V2.json",
);
const checkOnly = process.argv.includes("--check");
const packet = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packetId: "ERGMC-NEIGHBOR-CONTRASTS.0.1",
  status: "RESEARCH_CANDIDATE_NOT_FOR_PRODUCTION",
  code: "ERGMC",
  neighborCodes: sourceModule.ergmcNeighborReviewQueueV2.map(
    (item) => item.code,
  ),
  claimCount: sourceModule.ergmcNeighborContrastClaimsV2.length,
  claims: sourceModule.ergmcNeighborContrastClaimsV2,
  reviewQueue: sourceModule.ergmcNeighborReviewQueueV2.map((item) => ({
    ...item,
    claims: sourceModule.ergmcNeighborContrastClaimsV2
      .filter((claim) => claim.entity.ref === `ERGMC<>${item.code}`)
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
      "ERGMC neighbor review is stale. Run npm run research:trait-map:v2:ergmc-neighbors.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
}
console.log(
  `ERGMC neighbor review is current: ${packet.claimCount} claims across ${packet.neighborCodes.length} neighbors.`,
);

function loadTypeScriptDataModule(filePath, dependencies = {}) {
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
      if (dependencies[specifier]) return dependencies[specifier];
      throw new Error(
        `ERGMC neighbor module has an unregistered runtime dependency: ${specifier}.`,
      );
    },
  });
  return module.exports;
}
