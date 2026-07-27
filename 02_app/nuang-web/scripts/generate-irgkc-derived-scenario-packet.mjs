import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "IRGKC",
  roleName: "차근차근 답을 쌓는 분석가",
  baseAnchor: "IRGMC",
  changedAxis: "SM_execution_and_structure",
  changedLetters: "M/K",
  baseInputFile: "IRGMC_SCENARIO_REVIEW_V2.json",
  outputFile: "IRGKC_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/irgkc-km-scenario-overrides-v2.ts",
  overridesExport: "irgkcKmScenarioOverridesV2",
  evidenceExport: "irgkcKmAxisEvidenceV2",
  command: "npm run research:trait-map:v2:irgkc-scenarios",
  checkOnly: process.argv.includes("--check"),
});
