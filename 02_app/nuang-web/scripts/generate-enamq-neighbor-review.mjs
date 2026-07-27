import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateTransformedNeighborReview({
  projectRoot,
  code: "ENAMQ",
  outputFile: "ENAMQ_NEIGHBOR_REVIEW_V2.json",
  command: "npm run research:trait-map:v2:enamq-neighbors",
  checkOnly: process.argv.includes("--check"),
  transformations: [
    {
      sourceNeighbor: "ERGMC",
      targetNeighbor: "INAMQ",
      changedAxis: "SE_energy_and_expression",
      changedLetters: "E↔I",
      codeMap: { IRGMC: "INAMQ", ERGMC: "ENAMQ" },
    },
    {
      sourceNeighbor: "INGMC",
      targetNeighbor: "ERAMQ",
      changedAxis: "OE_exploration_and_interest",
      changedLetters: "N↔R",
      codeMap: { IRGMC: "ERAMQ", INGMC: "ENAMQ" },
    },
    {
      sourceNeighbor: "IRAMC",
      targetNeighbor: "ENGMQ",
      changedAxis: "RO_relational_attention",
      changedLetters: "A↔G",
      codeMap: { IRGMC: "ENGMQ", IRAMC: "ENAMQ" },
    },
    {
      sourceNeighbor: "IRGKC",
      targetNeighbor: "ENAKQ",
      changedAxis: "SM_execution_and_structure",
      changedLetters: "M↔K",
      codeMap: { IRGMC: "ENAMQ", IRGKC: "ENAKQ" },
    },
    {
      sourceNeighbor: "IRGMQ",
      targetNeighbor: "ENAMC",
      changedAxis: "ER_emotional_activation_and_worry",
      changedLetters: "Q↔C",
      codeMap: { IRGMC: "ENAMC", IRGMQ: "ENAMQ" },
    },
  ],
});
