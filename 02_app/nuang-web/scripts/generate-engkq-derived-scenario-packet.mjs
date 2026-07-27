import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "ENGKQ",
  roleName: "변화에 답하는 혁신가",
  baseAnchor: "ENAKQ",
  changedAxis: "RO_relational_attention",
  changedLetters: "A/G",
  baseInputFile: "ENAKQ_SCENARIO_REVIEW_V2.json",
  outputFile: "ENGKQ_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/engkq-ag-scenario-overrides-v2.ts",
  overridesExport: "engkqAgScenarioOverridesV2",
  evidenceExport: "engkqAgAxisEvidenceV2",
  command: "npm run research:trait-map:v2:engkq-scenarios",
  checkOnly: process.argv.includes("--check"),
});
