import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateTransformedNeighborReview({
  projectRoot,
  code: "IRGMQ",
  outputFile: "IRGMQ_NEIGHBOR_REVIEW_V2.json",
  command: "npm run research:trait-map:v2:irgmq-neighbors",
  checkOnly: process.argv.includes("--check"),
  transformations: [
    {
      sourceNeighbor: "ERGMC",
      targetNeighbor: "ERGMQ",
      changedAxis: "SE_energy_and_expression",
      changedLetters: "I↔E",
      codeMap: { IRGMC: "IRGMQ", ERGMC: "ERGMQ" },
    },
    {
      sourceNeighbor: "INGMC",
      targetNeighbor: "INGMQ",
      changedAxis: "OE_exploration_and_interest",
      changedLetters: "R↔N",
      codeMap: { IRGMC: "IRGMQ", INGMC: "INGMQ" },
    },
    {
      sourceNeighbor: "IRAMC",
      targetNeighbor: "IRAMQ",
      changedAxis: "RO_relational_attention",
      changedLetters: "G↔A",
      codeMap: { IRGMC: "IRGMQ", IRAMC: "IRAMQ" },
    },
    {
      sourceNeighbor: "IRGKC",
      targetNeighbor: "IRGKQ",
      changedAxis: "SM_execution_and_structure",
      changedLetters: "M↔K",
      codeMap: { IRGMC: "IRGMQ", IRGKC: "IRGKQ" },
    },
    {
      sourceNeighbor: "IRGMQ",
      targetNeighbor: "IRGMC",
      changedAxis: "ER_emotional_activation_and_worry",
      changedLetters: "Q↔C",
      codeMap: { IRGMC: "IRGMC", IRGMQ: "IRGMQ" },
    },
  ],
});
