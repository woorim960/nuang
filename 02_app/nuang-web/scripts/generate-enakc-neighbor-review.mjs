import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

await generateTransformedNeighborReview({
  projectRoot,
  code: "ENAKC",
  outputFile: "ENAKC_NEIGHBOR_REVIEW_V2.json",
  command: "npm run research:trait-map:v2:enakc-neighbors",
  checkOnly: process.argv.includes("--check"),
  transformations: [
    {
      sourceNeighbor: "ERGMC",
      targetNeighbor: "INAKC",
      changedAxis: "SE_energy_and_expression",
      changedLetters: "E↔I",
      codeMap: { IRGMC: "INAKC", ERGMC: "ENAKC" },
    },
    {
      sourceNeighbor: "INGMC",
      targetNeighbor: "ERAKC",
      changedAxis: "OE_exploration_and_interest",
      changedLetters: "N↔R",
      codeMap: { IRGMC: "ERAKC", INGMC: "ENAKC" },
    },
    {
      sourceNeighbor: "IRAMC",
      targetNeighbor: "ENGKC",
      changedAxis: "RO_relational_attention",
      changedLetters: "A↔G",
      codeMap: { IRGMC: "ENGKC", IRAMC: "ENAKC" },
    },
    {
      sourceNeighbor: "IRGKC",
      targetNeighbor: "ENAMC",
      changedAxis: "SM_execution_and_structure",
      changedLetters: "K↔M",
      codeMap: { IRGMC: "ENAMC", IRGKC: "ENAKC" },
    },
    {
      sourceNeighbor: "IRGMQ",
      targetNeighbor: "ENAKQ",
      changedAxis: "ER_emotional_activation_and_worry",
      changedLetters: "C↔Q",
      codeMap: { IRGMC: "ENAKC", IRGMQ: "ENAKQ" },
    },
  ],
});
