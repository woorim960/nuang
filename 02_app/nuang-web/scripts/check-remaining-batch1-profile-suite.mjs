import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const batchNumber = Number(
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1] ?? "1",
);
const batchArgument = `--batch=${batchNumber}`;
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

run("generate-remaining-profile-production-plan.mjs", ["--check"]);
run("generate-remaining-batch1-scenario-packets.mjs", [
  batchArgument,
  "--check",
]);
for (const { code } of batch.profiles) {
  run("generate-derived-scenario-copy-audit.mjs", [code, "--check"]);
}
run("generate-remaining-batch1-neighbor-reviews.mjs", [
  batchArgument,
  "--check",
]);
run("generate-remaining-batch1-longform-research-drafts.mjs", [
  batchArgument,
  "--check",
]);
run("generate-remaining-batch1-calibration-audit.mjs", [
  batchArgument,
  "--check",
]);

console.log(
  `Remaining batch ${batchNumber} suite is current: ${batch.profiles.length} profiles, ${batch.interactionScenarioCount} interaction scenes, 1 calibration audit.`,
);

function run(script, args) {
  const result = spawnSync(
    process.execPath,
    [path.join(scriptDirectory, script), ...args],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}
