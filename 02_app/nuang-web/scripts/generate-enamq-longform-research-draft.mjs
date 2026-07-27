import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "ENAMQ",
  roleName: "마음과 상상을 펼치는 이야기꾼",
  baseAnchor: "ENAKQ",
  editorialFile:
    "src/features/nuang-code/enamq-longform-editorial-v2.ts",
  editorialExport: "enamqLongformEditorialV2",
  foundationFile:
    "src/features/nuang-code/enamq-foundation-candidates-v2.ts",
  foundationExport: "enamqFoundationClaimsV2",
  scenarioFile: "ENAMQ_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "ENAMQ_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "ENAMQ_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/ENAMQ",
  command: "npm run research:trait-map:v2:enamq-longform",
  checkOnly: process.argv.includes("--check"),
});
