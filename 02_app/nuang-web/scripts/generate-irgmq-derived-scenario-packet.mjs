import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "IRGMQ",
  roleName: "변화의 원인을 좇는 추적자",
  baseAnchor: "IRGMC",
  changedAxis: "ER_emotional_activation_and_worry",
  changedLetters: "C/Q",
  baseInputFile: "IRGMC_SCENARIO_REVIEW_V2.json",
  outputFile: "IRGMQ_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/irgmq-qc-scenario-overrides-v2.ts",
  overridesExport: "irgmqQcScenarioOverridesV2",
  evidenceExport: "irgmqQcAxisEvidenceV2",
  command: "npm run research:trait-map:v2:irgmq-scenarios",
  checkOnly: process.argv.includes("--check"),
});
