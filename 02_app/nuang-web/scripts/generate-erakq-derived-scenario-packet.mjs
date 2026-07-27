import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "ERAKQ",
  roleName: "관계 변화를 살피는 관계지기",
  baseAnchor: "ENAKQ",
  changedAxis: "OE_exploration_and_interest",
  changedLetters: "N/R",
  baseInputFile: "ENAKQ_SCENARIO_REVIEW_V2.json",
  outputFile: "ERAKQ_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/erakq-nr-scenario-overrides-v2.ts",
  overridesExport: "erakqNrScenarioOverridesV2",
  evidenceExport: "erakqNrAxisEvidenceV2",
  command: "npm run research:trait-map:v2:erakq-scenarios",
  checkOnly: process.argv.includes("--check"),
});
