import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "IRAMC",
  roleName: "조용히 곁을 맞추는 지원가",
  baseAnchor: "IRGMC",
  editorialFile:
    "src/features/nuang-code/iramc-longform-editorial-v2.ts",
  editorialExport: "iramcLongformEditorialV2",
  foundationFile:
    "src/features/nuang-code/iramc-foundation-candidates-v2.ts",
  foundationExport: "iramcFoundationClaimsV2",
  scenarioFile: "IRAMC_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "IRAMC_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "IRAMC_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/IRAMC",
  command: "npm run research:trait-map:v2:iramc-longform",
  checkOnly: process.argv.includes("--check"),
});
