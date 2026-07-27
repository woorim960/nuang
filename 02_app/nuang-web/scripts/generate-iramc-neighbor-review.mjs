import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateTransformedNeighborReview({
  projectRoot,
  code: "IRAMC",
  outputFile: "IRAMC_NEIGHBOR_REVIEW_V2.json",
  command: "npm run research:trait-map:v2:iramc-neighbors",
  checkOnly: process.argv.includes("--check"),
  transformations: [
    {
      sourceNeighbor: "ERGMC",
      targetNeighbor: "ERAMC",
      changedAxis: "SE_energy_and_expression",
      changedLetters: "I↔E",
      codeMap: { IRGMC: "IRAMC", ERGMC: "ERAMC" },
    },
    {
      sourceNeighbor: "INGMC",
      targetNeighbor: "INAMC",
      changedAxis: "OE_exploration_and_interest",
      changedLetters: "R↔N",
      codeMap: { IRGMC: "IRAMC", INGMC: "INAMC" },
    },
    {
      sourceNeighbor: "IRAMC",
      targetNeighbor: "IRGMC",
      changedAxis: "RO_relational_attention",
      changedLetters: "A↔G",
      codeMap: { IRGMC: "IRGMC", IRAMC: "IRAMC" },
    },
    {
      sourceNeighbor: "IRGKC",
      targetNeighbor: "IRAKC",
      changedAxis: "SM_execution_and_structure",
      changedLetters: "M↔K",
      codeMap: { IRGMC: "IRAMC", IRGKC: "IRAKC" },
    },
    {
      sourceNeighbor: "IRGMQ",
      targetNeighbor: "IRAMQ",
      changedAxis: "ER_emotional_activation_and_worry",
      changedLetters: "C↔Q",
      codeMap: { IRGMC: "IRAMC", IRGMQ: "IRAMQ" },
    },
  ],
});
