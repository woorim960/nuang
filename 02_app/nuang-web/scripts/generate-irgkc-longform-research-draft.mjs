import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "IRGKC",
  roleName: "차근차근 답을 쌓는 분석가",
  baseAnchor: "IRGMC",
  editorialFile:
    "src/features/nuang-code/irgkc-longform-editorial-v2.ts",
  editorialExport: "irgkcLongformEditorialV2",
  foundationFile:
    "src/features/nuang-code/irgkc-foundation-candidates-v2.ts",
  foundationExport: "irgkcFoundationClaimsV2",
  scenarioFile: "IRGKC_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "IRGKC_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "IRGKC_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/IRGKC",
  command: "npm run research:trait-map:v2:irgkc-longform",
  checkOnly: process.argv.includes("--check"),
});
