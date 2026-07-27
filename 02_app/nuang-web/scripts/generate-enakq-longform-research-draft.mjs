import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "ENAKQ",
  roleName: "관계를 여는 지휘자",
  baseAnchor: "IRGMC",
  editorialFile: "src/features/nuang-code/enakq-longform-editorial-v2.ts",
  editorialExport: "enakqLongformEditorialV2",
  foundationFile: "src/features/nuang-code/enakq-foundation-candidates-v2.ts",
  foundationExport: "enakqFoundationClaimsV2",
  scenarioFile: "ENAKQ_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "ENAKQ_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile:
    "src/features/nuang-code/fixtures/enakq-v2-neighbor-claims.generated.json",
  outputDirectory: "docs/trait-maps/ENAKQ",
  command: "npm run research:trait-map:v2:enakq-longform",
  checkOnly: process.argv.includes("--check"),
});
