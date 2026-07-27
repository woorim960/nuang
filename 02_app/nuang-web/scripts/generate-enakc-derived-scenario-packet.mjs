import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "ENAKC",
  roleName: "사람과 가능성을 잇는 연결가",
  baseAnchor: "ENAKQ",
  changedAxis: "ER_emotional_activation_and_worry",
  changedLetters: "Q/C",
  baseInputFile: "ENAKQ_SCENARIO_REVIEW_V2.json",
  outputFile: "ENAKC_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/enakc-qc-scenario-overrides-v2.ts",
  overridesExport: "enakcQcScenarioOverridesV2",
  evidenceExport: "enakcQcAxisEvidenceV2",
  command: "npm run research:trait-map:v2:enakc-scenarios",
  checkOnly: process.argv.includes("--check"),
});
