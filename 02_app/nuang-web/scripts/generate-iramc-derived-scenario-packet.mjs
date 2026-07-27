import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "IRAMC",
  roleName: "조용히 곁을 맞추는 지원가",
  baseAnchor: "IRGMC",
  changedAxis: "RO_relational_attention",
  changedLetters: "G/A",
  baseInputFile: "IRGMC_SCENARIO_REVIEW_V2.json",
  outputFile: "IRAMC_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/iramc-ag-scenario-overrides-v2.ts",
  overridesExport: "iramcAgScenarioOverridesV2",
  evidenceExport: "iramcAgAxisEvidenceV2",
  command: "npm run research:trait-map:v2:iramc-scenarios",
  checkOnly: process.argv.includes("--check"),
});
