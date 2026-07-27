import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateTransformedNeighborReview({
  projectRoot,
  code: "INGMC",
  outputFile: "INGMC_NEIGHBOR_REVIEW_V2.json",
  command: "npm run research:trait-map:v2:ingmc-neighbors",
  checkOnly: process.argv.includes("--check"),
  transformations: [
    {
      sourceNeighbor: "ERGMC",
      targetNeighbor: "ENGMC",
      changedAxis: "SE_energy_and_expression",
      changedLetters: "I↔E",
      codeMap: { IRGMC: "INGMC", ERGMC: "ENGMC" },
    },
    {
      sourceNeighbor: "INGMC",
      targetNeighbor: "IRGMC",
      changedAxis: "OE_exploration_and_interest",
      changedLetters: "N↔R",
      codeMap: { IRGMC: "IRGMC", INGMC: "INGMC" },
    },
    {
      sourceNeighbor: "IRAMC",
      targetNeighbor: "INAMC",
      changedAxis: "RO_relational_attention",
      changedLetters: "G↔A",
      codeMap: { IRGMC: "INGMC", IRAMC: "INAMC" },
    },
    {
      sourceNeighbor: "IRGKC",
      targetNeighbor: "INGKC",
      changedAxis: "SM_execution_and_structure",
      changedLetters: "M↔K",
      codeMap: { IRGMC: "INGMC", IRGKC: "INGKC" },
    },
    {
      sourceNeighbor: "IRGMQ",
      targetNeighbor: "INGMQ",
      changedAxis: "ER_emotional_activation_and_worry",
      changedLetters: "C↔Q",
      codeMap: { IRGMC: "INGMC", IRGMQ: "INGMQ" },
    },
  ],
});
