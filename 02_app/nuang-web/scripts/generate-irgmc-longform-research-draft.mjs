import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "IRGMC",
  roleName: "단서로 답을 찾는 탐구자",
  baseAnchor: "ENAKQ",
  editorialFile: "src/features/nuang-code/irgmc-longform-editorial-v2.ts",
  editorialExport: "irgmcLongformEditorialV2",
  foundationFile: "src/features/nuang-code/irgmc-foundation-candidates-v2.ts",
  foundationExport: "irgmcFoundationClaimsV2",
  scenarioFile: "IRGMC_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "IRGMC_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "IRGMC_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/IRGMC",
  command: "npm run research:trait-map:v2:irgmc-longform",
  checkOnly: process.argv.includes("--check"),
});
