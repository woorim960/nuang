import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "ERGMC",
  roleName: "유연하게 답을 찾는 대응가",
  baseAnchor: "IRGMC",
  changedAxis: "SE_energy_and_expression",
  changedLetters: "I/E",
  baseInputFile: "IRGMC_SCENARIO_REVIEW_V2.json",
  outputFile: "ERGMC_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/ergmc-ei-scenario-overrides-v2.ts",
  overridesExport: "ergmcEiScenarioOverridesV2",
  evidenceExport: "ergmcEiAxisEvidenceV2",
  command: "npm run research:trait-map:v2:ergmc-scenarios",
  checkOnly: process.argv.includes("--check"),
});
