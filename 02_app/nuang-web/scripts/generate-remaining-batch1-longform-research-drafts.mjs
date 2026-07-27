import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const checkOnly = process.argv.includes("--check");
const batchNumber = Number(
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1] ?? "1",
);
const productionPlan = JSON.parse(
  fs.readFileSync(
    path.join(
      projectRoot,
      "docs/research/trait-map-data-center-v2/generated/REMAINING_PROFILE_PRODUCTION_PLAN_V2.json",
    ),
    "utf8",
  ),
);
const batch = productionPlan.batches[batchNumber - 1];
if (!batch) {
  throw new Error(`Unknown remaining-profile batch: ${batchNumber}`);
}
const profiles = batch.profiles.map((profile) => [
  profile.code,
  profile.roleName,
  profile.code.toLowerCase(),
  `${profile.code.toLowerCase()}FoundationClaimsV2`,
]);

for (const [code, roleName, exportPrefix, foundationExport] of profiles) {
  await generateDerivedLongformResearchDraft({
    projectRoot,
    code,
    roleName,
    baseAnchor: batch.anchor,
    editorialFile: `src/features/nuang-code/remaining-batch${batchNumber}-longform-editorial-v2.ts`,
    editorialExport: `${exportPrefix}LongformEditorialV2`,
    foundationFile: `src/features/nuang-code/remaining-batch${batchNumber}-foundation-candidates-v2.ts`,
    foundationExport,
    scenarioFile: `${code}_SCENARIO_REVIEW_V2.json`,
    copyAuditFile: `${code}_SCENARIO_COPY_AUDIT_V2.json`,
    neighborFile: `${code}_NEIGHBOR_REVIEW_V2.json`,
    outputDirectory: `docs/trait-maps/${code}`,
    command: `npm run research:trait-map:v2:remaining-batch${batchNumber}-longforms`,
    checkOnly,
  });
}
