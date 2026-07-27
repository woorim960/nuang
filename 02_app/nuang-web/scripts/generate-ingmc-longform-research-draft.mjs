import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "INGMC",
  roleName: "새 가능성을 찾는 탐험가",
  baseAnchor: "IRGMC",
  editorialFile:
    "src/features/nuang-code/ingmc-longform-editorial-v2.ts",
  editorialExport: "ingmcLongformEditorialV2",
  foundationFile:
    "src/features/nuang-code/ingmc-foundation-candidates-v2.ts",
  foundationExport: "ingmcFoundationClaimsV2",
  scenarioFile: "INGMC_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "INGMC_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "INGMC_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/INGMC",
  command: "npm run research:trait-map:v2:ingmc-longform",
  checkOnly: process.argv.includes("--check"),
});
