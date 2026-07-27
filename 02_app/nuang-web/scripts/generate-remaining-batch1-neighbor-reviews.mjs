import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateTransformedNeighborReview } from "./lib/generate-transformed-neighbor-review.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const checkOnly = process.argv.includes("--check");
const batchNumber = Number(
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1] ?? "1",
);
const productionPlan = JSON.parse(
  fs.readFileSync(
    path.join(
      projectRoot,
      "docs/research/trait-map-data-center-v2/generated/REMAINING_PROFILE_PRODUCTION_PLAN_V2.json",
    ),
    "utf8",
  ),
);
const batch = productionPlan.batches[batchNumber - 1];
if (!batch) {
  throw new Error(`Unknown remaining-profile batch: ${batchNumber}`);
}
const codes = batch.profiles.map((profile) => profile.code);
const axes = [
  {
    sourceNeighbor: "ERGMC",
    changedAxis: "SE_energy_and_expression",
  },
  {
    sourceNeighbor: "INGMC",
    changedAxis: "OE_exploration_and_interest",
  },
  {
    sourceNeighbor: "IRAMC",
    changedAxis: "RO_relational_attention",
  },
  {
    sourceNeighbor: "IRGKC",
    changedAxis: "SM_execution_and_structure",
  },
  {
    sourceNeighbor: "IRGMQ",
    changedAxis: "ER_emotional_activation_and_worry",
  },
];
const directionPairs = [
  ["E", "I"],
  ["R", "N"],
  ["G", "A"],
  ["K", "M"],
  ["C", "Q"],
];

for (const code of codes) {
  await generateTransformedNeighborReview({
    projectRoot,
    code,
    outputFile: `${code}_NEIGHBOR_REVIEW_V2.json`,
    command: `npm run research:trait-map:v2:remaining-batch${batchNumber}-neighbors`,
    checkOnly,
    transformations: axes.map((axis, position) => {
      const targetNeighbor = toggle(code, position);
      return {
        sourceNeighbor: axis.sourceNeighbor,
        targetNeighbor,
        changedAxis: axis.changedAxis,
        changedLetters: `${code[position]}↔${targetNeighbor[position]}`,
        codeMap: {
          IRGMC: code,
          [axis.sourceNeighbor]: targetNeighbor,
        },
      };
    }),
  });
}

function toggle(code, position) {
  const current = code[position];
  const replacement =
    directionPairs[position][0] === current
      ? directionPairs[position][1]
      : directionPairs[position][0];
  return `${code.slice(0, position)}${replacement}${code.slice(position + 1)}`;
}
