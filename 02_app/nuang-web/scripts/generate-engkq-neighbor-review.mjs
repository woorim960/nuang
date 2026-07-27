import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateTransformedNeighborReview({
  projectRoot,
  code: "ENGKQ",
  outputFile: "ENGKQ_NEIGHBOR_REVIEW_V2.json",
  command: "npm run research:trait-map:v2:engkq-neighbors",
  checkOnly: process.argv.includes("--check"),
  transformations: [
    {
      sourceNeighbor: "ERGMC",
      targetNeighbor: "INGKQ",
      changedAxis: "SE_energy_and_expression",
      changedLetters: "E↔I",
      codeMap: { IRGMC: "INGKQ", ERGMC: "ENGKQ" },
    },
    {
      sourceNeighbor: "INGMC",
      targetNeighbor: "ERGKQ",
      changedAxis: "OE_exploration_and_interest",
      changedLetters: "N↔R",
      codeMap: { IRGMC: "ERGKQ", INGMC: "ENGKQ" },
    },
    {
      sourceNeighbor: "IRAMC",
      targetNeighbor: "ENAKQ",
      changedAxis: "RO_relational_attention",
      changedLetters: "G↔A",
      codeMap: { IRGMC: "ENGKQ", IRAMC: "ENAKQ" },
    },
    {
      sourceNeighbor: "IRGKC",
      targetNeighbor: "ENGMQ",
      changedAxis: "SM_execution_and_structure",
      changedLetters: "K↔M",
      codeMap: { IRGMC: "ENGMQ", IRGKC: "ENGKQ" },
    },
    {
      sourceNeighbor: "IRGMQ",
      targetNeighbor: "ENGKC",
      changedAxis: "ER_emotional_activation_and_worry",
      changedLetters: "Q↔C",
      codeMap: { IRGMC: "ENGKC", IRGMQ: "ENGKQ" },
    },
  ],
});
