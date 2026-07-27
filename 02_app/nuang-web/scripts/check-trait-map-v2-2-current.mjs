import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

const checks = [
  ["generate-trait-map-final-axis-decisions-v2-2.mjs"],
  [
    "generate-trait-map-canonical-drafting-queue.mjs",
    "--axis-version=v2-2",
  ],
  [
    "generate-trait-map-lineage-merge-semantic-audit.mjs",
    "--axis-version=v2-2",
  ],
  [
    "generate-trait-map-canonical-authoring-workflow.mjs",
    "--axis-version=v2-2",
  ],
];

for (let index = 1; index <= 12; index += 1) {
  const batchId = `CAB-${String(index).padStart(2, "0")}`;
  const batchArguments = [`--batch=${batchId}`, "--axis-version=v2-2"];
  checks.push(
    ["generate-trait-map-canonical-research-draft-batch.mjs", ...batchArguments],
    ["generate-trait-map-canonical-batch-preflight.mjs", ...batchArguments],
    ["generate-trait-map-canonical-semantic-resolution.mjs", ...batchArguments],
    ["generate-trait-map-targeted-axis-rewrite-packet.mjs", ...batchArguments],
    ["generate-trait-map-targeted-axis-decisions-v2-2.mjs", `--batch=${batchId}`],
    ["generate-trait-map-canonical-corrected-draft.mjs", ...batchArguments],
    [
      "generate-trait-map-canonical-batch-recomposition-audit.mjs",
      ...batchArguments,
    ],
  );
}

checks.push(
  [
    "generate-trait-map-canonical-all-batch-audit.mjs",
    "--axis-version=v2-2",
  ],
  [
    "generate-trait-map-32-profile-canonical-rebase.mjs",
    "--axis-version=v2-2",
  ],
  [
    "generate-trait-map-canonical-content-ledger.mjs",
    "--axis-version=v2-2",
  ],
  ["generate-trait-map-seven-role-review-queue-v2-2.mjs"],
  ["generate-trait-map-p0-sentence-preflight-v2-2.mjs"],
  ["generate-trait-map-p0-flagged-internal-screen-v2-2.mjs"],
  ["generate-trait-map-p0-revised-ledger-v2-2.mjs"],
  ["generate-trait-map-common-surface-audit-v2-2.mjs"],
  ["generate-trait-map-remaining-visible-p0-queue-v2-2.mjs"],
  ["generate-trait-map-remaining-p0-internal-revisions-v2-2.mjs"],
  ["generate-trait-map-p0-complete-ledger-v2-2.mjs"],
  ["generate-trait-map-p0-evidence-packet-v2-2.mjs"],
  ["generate-trait-map-p1-preflight-v2-2.mjs"],
  ["generate-trait-map-p1-inferred-axis-review-batches-v2-2.mjs"],
);

const existingP1ScreenScripts = fs
  .readdirSync(scriptDirectory)
  .filter((fileName) =>
    /^generate-trait-map-p1-inferred-batch-\d{2}-screen-v2-2\.mjs$/.test(
      fileName,
    ),
  )
  .sort((left, right) => left.localeCompare(right, "en"));

checks.push(
  ...existingP1ScreenScripts.map((fileName) => [fileName]),
  ["generate-trait-map-p1-progress-ledger-v2-2.mjs"],
);

for (const [scriptName, ...argumentsList] of checks) {
  const scriptPath = path.join(scriptDirectory, scriptName);
  const result = spawnSync(
    process.execPath,
    [scriptPath, ...argumentsList, "--check"],
    {
      cwd: projectRoot,
      encoding: "utf8",
    },
  );

  if (result.status !== 0) {
    process.stderr.write(
      `v2.2 check failed: ${scriptName} ${argumentsList.join(" ")}\n`,
    );
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
}

console.log(
  `Trait-map v2.2 current baseline: ${checks.length} checks passed (${existingP1ScreenScripts.length}/17 P1 inferred-axis batches screened).`,
);
