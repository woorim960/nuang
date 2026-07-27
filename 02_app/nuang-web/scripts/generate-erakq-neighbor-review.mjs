import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateTransformedNeighborReview({
  projectRoot,
  code: "ERAKQ",
  outputFile: "ERAKQ_NEIGHBOR_REVIEW_V2.json",
  command: "npm run research:trait-map:v2:erakq-neighbors",
  checkOnly: process.argv.includes("--check"),
  transformations: [
    {
      sourceNeighbor: "ERGMC",
      targetNeighbor: "IRAKQ",
      changedAxis: "SE_energy_and_expression",
      changedLetters: "E↔I",
      codeMap: { IRGMC: "IRAKQ", ERGMC: "ERAKQ" },
    },
    {
      sourceNeighbor: "INGMC",
      targetNeighbor: "ENAKQ",
      changedAxis: "OE_exploration_and_interest",
      changedLetters: "R↔N",
      codeMap: { IRGMC: "ERAKQ", INGMC: "ENAKQ" },
    },
    {
      sourceNeighbor: "IRAMC",
      targetNeighbor: "ERGKQ",
      changedAxis: "RO_relational_attention",
      changedLetters: "A↔G",
      codeMap: { IRGMC: "ERGKQ", IRAMC: "ERAKQ" },
    },
    {
      sourceNeighbor: "IRGKC",
      targetNeighbor: "ERAMQ",
      changedAxis: "SM_execution_and_structure",
      changedLetters: "K↔M",
      codeMap: { IRGMC: "ERAMQ", IRGKC: "ERAKQ" },
    },
    {
      sourceNeighbor: "IRGMQ",
      targetNeighbor: "ERAKC",
      changedAxis: "ER_emotional_activation_and_worry",
      changedLetters: "Q↔C",
      codeMap: { IRGMC: "ERAKC", IRGMQ: "ERAKQ" },
    },
  ],
});
