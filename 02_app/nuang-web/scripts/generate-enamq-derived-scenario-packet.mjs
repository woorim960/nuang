import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "ENAMQ",
  roleName: "마음과 상상을 펼치는 이야기꾼",
  baseAnchor: "ENAKQ",
  changedAxis: "SM_execution_and_structure",
  changedLetters: "K/M",
  baseInputFile: "ENAKQ_SCENARIO_REVIEW_V2.json",
  outputFile: "ENAMQ_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/enamq-km-scenario-overrides-v2.ts",
  overridesExport: "enamqKmScenarioOverridesV2",
  evidenceExport: "enamqKmAxisEvidenceV2",
  command: "npm run research:trait-map:v2:enamq-scenarios",
  checkOnly: process.argv.includes("--check"),
});
