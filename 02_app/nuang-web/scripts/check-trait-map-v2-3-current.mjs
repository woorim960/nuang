import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const skipFinalAudit = process.argv.includes("--skip-final-audit");
const checks = [
  ["generate-trait-map-final-axis-decisions-v2-3.mjs"],
  ["generate-trait-map-canonical-drafting-queue.mjs", "--axis-version=v2-3"],
  [
    "generate-trait-map-lineage-merge-semantic-audit.mjs",
    "--axis-version=v2-3",
  ],
  [
    "generate-trait-map-canonical-authoring-workflow.mjs",
    "--axis-version=v2-3",
  ],
];

for (let index = 1; index <= 12; index += 1) {
  const batchId = `CAB-${String(index).padStart(2, "0")}`;
  const batchArguments = [`--batch=${batchId}`, "--axis-version=v2-3"];
  checks.push(
    [
      "generate-trait-map-canonical-research-draft-batch.mjs",
      ...batchArguments,
    ],
    ["generate-trait-map-canonical-batch-preflight.mjs", ...batchArguments],
    ["generate-trait-map-canonical-semantic-resolution.mjs", ...batchArguments],
    ["generate-trait-map-targeted-axis-rewrite-packet.mjs", ...batchArguments],
    [
      "generate-trait-map-targeted-axis-decisions-v2-3.mjs",
      `--batch=${batchId}`,
    ],
    ["generate-trait-map-canonical-corrected-draft.mjs", ...batchArguments],
    [
      "generate-trait-map-canonical-batch-recomposition-audit.mjs",
      ...batchArguments,
    ],
  );
}

checks.push(
  ["generate-trait-map-canonical-all-batch-audit.mjs", "--axis-version=v2-3"],
  ["generate-trait-map-32-profile-canonical-rebase.mjs", "--axis-version=v2-3"],
  ["generate-trait-map-canonical-content-ledger.mjs", "--axis-version=v2-3"],
  ["generate-trait-map-v2-3-reviewed-ledger.mjs"],
  ["generate-trait-map-v2-3-common-isolation-audit.mjs"],
  ["generate-trait-map-v2-3-independent-review-queue.mjs"],
  ["generate-trait-map-v2-3-p0-independent-review-packet.mjs"],
  ["generate-trait-map-v2-3-p2-preflight.mjs"],
  ["generate-trait-map-v2-3-p2-flagged-manual-screen.mjs"],
  ["generate-trait-map-v2-3-p2-screened-ledger.mjs"],
  ["generate-trait-map-v2-3-independent-review-queue.mjs", "--post-p2"],
  ["generate-trait-map-v2-3-p0-independent-review-packet.mjs", "--post-p2"],
  ["generate-trait-map-v2-3-p2-stratified-review-sample.mjs"],
  ["generate-trait-map-v2-3-p1-independent-review-packet.mjs"],
  ["generate-trait-map-v2-3-evidence-trace-audit.mjs"],
  ["generate-trait-map-v2-3-evidence-dependence-audit.mjs"],
  ["generate-trait-map-v2-3-shared-author-dependence-review.mjs"],
  ["generate-trait-map-v2-3-hidden-dataset-reuse-review.mjs"],
  ["generate-trait-map-v2-3-sample-level-finding-trace.mjs"],
  ["generate-trait-map-v2-3-canonical-claim-finding-scope-triage.mjs"],
  [
    "generate-trait-map-v2-3-remaining-finding-context-applicability-screen.mjs",
  ],
  ["generate-trait-map-v2-3-p0-context-evidence-gap-protocol.mjs"],
  ["generate-trait-map-v2-3-p0-background-source-extraction.mjs"],
  ["generate-trait-map-v2-3-p0-opposite-direction-discrimination-audit.mjs"],
  ["generate-trait-map-v2-3-all-canonical-context-applicability-audit.mjs"],
  ["generate-trait-map-v2-3-no-exact-context-gap-groups.mjs"],
  ["generate-trait-map-v2-3-scenario-gap-priority-matrix.mjs"],
  ["generate-trait-map-v2-3-p0-direct-validation-module-spec.mjs"],
  ["generate-trait-map-v2-3-p0-direct-validation-data-contract.mjs"],
  ["validate-trait-map-v2-3-p0-direct-validation-fixture.mjs"],
  ["run-trait-map-v2-3-p0-direct-validation-synthetic-analysis.mjs"],
  ["run-trait-map-v2-3-p0-direct-validation-ready-path.mjs"],
  ["generate-trait-map-v2-3-p0-model-output-contract.mjs"],
  ["generate-trait-map-v2-3-p0-positive-synthetic-boundary.mjs"],
  ["generate-trait-map-v2-3-p0-preregistration-decision-table.mjs"],
  ["generate-trait-map-v2-3-p0-participant-rights-lifecycle.mjs"],
  ["generate-trait-map-v2-3-multi-evidence-conflict-contract.mjs"],
  ["generate-trait-map-v2-3-revision-gate-reopen-matrix.mjs"],
  ["generate-trait-map-v2-3-withdrawal-fallback-runtime-contract.mjs"],
  ["generate-trait-map-v2-3-runtime-resolver-harness.mjs"],
  ["generate-enakq-longform-research-draft.mjs"],
  ["generate-irgmc-longform-research-draft.mjs"],
  ["check-direct-derived-profile-suite.mjs"],
  ["check-remaining-batch1-profile-suite.mjs", "--batch=1"],
  ["check-remaining-batch1-profile-suite.mjs", "--batch=2"],
  ["check-remaining-batch1-profile-suite.mjs", "--batch=3"],
  ["check-remaining-batch1-profile-suite.mjs", "--batch=4"],
  ["generate-trait-map-32-profile-completeness-audit.mjs"],
  ["generate-trait-map-32-content-quality-audit.mjs"],
  ["generate-trait-map-32-master-completeness-reaudit.mjs"],
  ["generate-trait-map-v2-3-completeness-gap-register.mjs"],
  ["generate-trait-map-v2-3-wave1-longform-remediation-packets.mjs"],
  ["generate-trait-map-v2-3-definition-of-done.mjs"],
  ["generate-trait-map-v2-3-publication-gate.mjs"],
  ["generate-trait-map-v2-3-cognitive-interview-protocol.mjs"],
  ["generate-trait-map-v2-3-cognitive-interview-data-contract.mjs"],
  ["generate-trait-map-v2-3-cognitive-exposure-plan.mjs"],
  ["generate-trait-map-v2-3-independent-review-protocol.mjs"],
  ["generate-trait-map-v2-3-validity-argument.mjs"],
  ["generate-trait-map-v2-3-quantitative-validation-plan.mjs"],
  ["generate-trait-map-v2-3-analysis-input-contract.mjs"],
  ["generate-trait-map-v2-3-monte-carlo-harness.mjs"],
  ["generate-trait-map-v2-3-statistical-engine-spec.mjs"],
  ["generate-trait-map-v2-3-synthetic-ordinal-fixture.mjs"],
  ["generate-trait-map-v2-3-review-import-contract.mjs"],
  ["generate-trait-map-v2-3-revision-impact-dry-run.mjs"],
  ["validate-trait-map-v2-3-review-import.mjs"],
);

if (!skipFinalAudit) {
  checks.push(["generate-trait-map-v2-3-final-completion-audit.mjs"]);
}
checks.push(["generate-trait-map-v2-3-current-manifest.mjs"]);

for (const [scriptName, ...argumentsList] of checks) {
  const scriptPath = path.join(scriptDirectory, scriptName);
  if (!fs.existsSync(scriptPath)) {
    console.error(`v2.3 check script missing: ${scriptName}`);
    process.exit(1);
  }
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
      `v2.3 check failed: ${scriptName} ${argumentsList.join(" ")}\n`,
    );
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
}

console.log(
  `Trait-map v2.3 current baseline: ${checks.length} reproducibility checks passed, including 12/12 canonical batches and post-P2 review artifacts.`,
);
