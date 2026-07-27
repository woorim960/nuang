import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "ERGMC",
  roleName: "유연하게 답을 찾는 대응가",
  baseAnchor: "IRGMC",
  editorialFile:
    "src/features/nuang-code/ergmc-longform-editorial-v2.ts",
  editorialExport: "ergmcLongformEditorialV2",
  foundationFile:
    "src/features/nuang-code/ergmc-foundation-candidates-v2.ts",
  foundationExport: "ergmcFoundationClaimsV2",
  scenarioFile: "ERGMC_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "ERGMC_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "ERGMC_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/ERGMC",
  command: "npm run research:trait-map:v2:ergmc-longform",
  checkOnly: process.argv.includes("--check"),
});
