import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateTransformedNeighborReview({
  projectRoot,
  code: "IRGKC",
  outputFile: "IRGKC_NEIGHBOR_REVIEW_V2.json",
  command: "npm run research:trait-map:v2:irgkc-neighbors",
  checkOnly: process.argv.includes("--check"),
  transformations: [
    {
      sourceNeighbor: "ERGMC",
      targetNeighbor: "ERGKC",
      changedAxis: "SE_energy_and_expression",
      changedLetters: "I↔E",
      codeMap: { IRGMC: "IRGKC", ERGMC: "ERGKC" },
    },
    {
      sourceNeighbor: "INGMC",
      targetNeighbor: "INGKC",
      changedAxis: "OE_exploration_and_interest",
      changedLetters: "R↔N",
      codeMap: { IRGMC: "IRGKC", INGMC: "INGKC" },
    },
    {
      sourceNeighbor: "IRAMC",
      targetNeighbor: "IRAKC",
      changedAxis: "RO_relational_attention",
      changedLetters: "G↔A",
      codeMap: { IRGMC: "IRGKC", IRAMC: "IRAKC" },
    },
    {
      sourceNeighbor: "IRGKC",
      targetNeighbor: "IRGMC",
      changedAxis: "SM_execution_and_structure",
      changedLetters: "K↔M",
      codeMap: { IRGMC: "IRGMC", IRGKC: "IRGKC" },
    },
    {
      sourceNeighbor: "IRGMQ",
      targetNeighbor: "IRGKQ",
      changedAxis: "ER_emotional_activation_and_worry",
      changedLetters: "C↔Q",
      codeMap: { IRGMC: "IRGKC", IRGMQ: "IRGKQ" },
    },
  ],
});
