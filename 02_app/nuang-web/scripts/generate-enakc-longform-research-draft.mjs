import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "ENAKC",
  roleName: "사람과 가능성을 잇는 연결가",
  baseAnchor: "ENAKQ",
  editorialFile: "src/features/nuang-code/enakc-longform-editorial-v2.ts",
  editorialExport: "enakcLongformEditorialV2",
  foundationFile: "src/features/nuang-code/enakc-foundation-candidates-v2.ts",
  foundationExport: "enakcFoundationClaimsV2",
  scenarioFile: "ENAKC_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "ENAKC_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "ENAKC_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/ENAKC",
  command: "npm run research:trait-map:v2:enakc-longform",
  checkOnly: process.argv.includes("--check"),
});
