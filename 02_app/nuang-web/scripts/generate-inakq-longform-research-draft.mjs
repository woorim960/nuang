import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "INAKQ",
  roleName: "마음과 가능성을 살피는 안내자",
  baseAnchor: "ENAKQ",
  editorialFile: "src/features/nuang-code/inakq-longform-editorial-v2.ts",
  editorialExport: "inakqLongformEditorialV2",
  foundationFile: "src/features/nuang-code/inakq-foundation-candidates-v2.ts",
  foundationExport: "inakqFoundationClaimsV2",
  scenarioFile: "INAKQ_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "INAKQ_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "INAKQ_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/INAKQ",
  command: "npm run research:trait-map:v2:inakq-longform",
  checkOnly: process.argv.includes("--check"),
});
