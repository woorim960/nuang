import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "ERAKQ",
  roleName: "관계 변화를 살피는 관계지기",
  baseAnchor: "ENAKQ",
  editorialFile:
    "src/features/nuang-code/erakq-longform-editorial-v2.ts",
  editorialExport: "erakqLongformEditorialV2",
  foundationFile:
    "src/features/nuang-code/erakq-foundation-candidates-v2.ts",
  foundationExport: "erakqFoundationClaimsV2",
  scenarioFile: "ERAKQ_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "ERAKQ_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "ERAKQ_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/ERAKQ",
  command: "npm run research:trait-map:v2:erakq-longform",
  checkOnly: process.argv.includes("--check"),
});
