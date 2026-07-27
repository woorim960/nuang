import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedLongformResearchDraft } from "./lib/generate-derived-longform-research-draft.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedLongformResearchDraft({
  projectRoot,
  code: "IRGMQ",
  roleName: "변화의 원인을 좇는 추적자",
  baseAnchor: "IRGMC",
  editorialFile: "src/features/nuang-code/irgmq-longform-editorial-v2.ts",
  editorialExport: "irgmqLongformEditorialV2",
  foundationFile: "src/features/nuang-code/irgmq-foundation-candidates-v2.ts",
  foundationExport: "irgmqFoundationClaimsV2",
  scenarioFile: "IRGMQ_SCENARIO_REVIEW_V2.json",
  copyAuditFile: "IRGMQ_SCENARIO_COPY_AUDIT_V2.json",
  neighborFile: "IRGMQ_NEIGHBOR_REVIEW_V2.json",
  outputDirectory: "docs/trait-maps/IRGMQ",
  command: "npm run research:trait-map:v2:irgmq-longform",
  checkOnly: process.argv.includes("--check"),
});
