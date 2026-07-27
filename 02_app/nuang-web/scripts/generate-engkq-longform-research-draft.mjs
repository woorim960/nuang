import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "ENGKQ",
  roleName: "변화에 답하는 혁신가",
  baseAnchor: "ENAKQ",
  editorialFile:
    "src/features/nuang-code/engkq-longform-editorial-v2.ts",
  editorialExport: "engkqLongformEditorialV2",
  foundationFile:
    "src/features/nuang-code/engkq-foundation-candidates-v2.ts",
  foundationExport: "engkqFoundationClaimsV2",
  scenarioFile: "ENGKQ_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "ENGKQ_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "ENGKQ_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/ENGKQ",
  command: "npm run research:trait-map:v2:engkq-longform",
  checkOnly: process.argv.includes("--check"),
});
