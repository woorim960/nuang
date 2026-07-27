import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateDerivedScenarioPacket } from "./lib/generate-derived-scenario-packet.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateDerivedScenarioPacket({
  projectRoot,
  code: "INGMC",
  roleName: "새 가능성을 찾는 탐험가",
  baseAnchor: "IRGMC",
  changedAxis: "OE_exploration_and_interest",
  changedLetters: "R/N",
  baseInputFile: "IRGMC_SCENARIO_REVIEW_V2.json",
  outputFile: "INGMC_SCENARIO_REVIEW_V2.json",
  overrideSourceFile:
    "src/features/nuang-code/ingmc-nr-scenario-overrides-v2.ts",
  overridesExport: "ingmcNrScenarioOverridesV2",
  evidenceExport: "ingmcNrAxisEvidenceV2",
  command: "npm run research:trait-map:v2:ingmc-scenarios",
  checkOnly: process.argv.includes("--check"),
});
