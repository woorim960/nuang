import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const runRoot = path.join(
  projectRoot,
  "docs/research/ai-prereview/NUANG-AI-MEASUREMENT-PREREVIEW-1.0/2026-08-05-core-candidate-r1",
);

const readJson = async (filePath) =>
  JSON.parse(await readFile(filePath, "utf8"));

const sha256 = async (filePath) =>
  createHash("sha256").update(await readFile(filePath)).digest("hex");

const manifestPath = path.join(runRoot, "packet_manifest.json");
const manifest = await readJson(manifestPath);
const inputManifestPath = path.join(runRoot, "inputs/locked_release_manifest.json");
const inputManifest = await readJson(inputManifestPath);
const failures = [];

if (manifest.runId !== inputManifest.runId) {
  failures.push("packet and input run IDs differ");
}
if (manifest.humanGateEffect !== "none") {
  failures.push("AI prereview must not change human validation gates");
}
if (manifest.containsPersonalData !== false) {
  failures.push("this packet is declared personal-data-free");
}
if (!Object.values(manifest.trackStatuses).every((status) => status === "completed_with_blockers")) {
  failures.push("every track must remain labelled completed_with_blockers");
}

const inputManifestHash = await sha256(inputManifestPath);
if (inputManifestHash !== manifest.lockedInputManifestSha256) {
  failures.push("locked input manifest hash mismatch");
}

for (const entry of inputManifest.inputFiles) {
  const actual = await sha256(path.join(projectRoot, entry.path));
  if (actual !== entry.sha256) {
    failures.push(`locked input hash mismatch: ${entry.path}`);
  }
}

for (const entry of manifest.artifactFiles) {
  const actual = await sha256(path.join(runRoot, entry.path));
  if (actual !== entry.sha256) {
    failures.push(`artifact hash mismatch: ${entry.path}`);
  }
}

for (const entry of manifest.verificationFiles) {
  const actual = await sha256(path.join(projectRoot, entry.path));
  if (actual !== entry.sha256) {
    failures.push(`verification file hash mismatch: ${entry.path}`);
  }
}

const issueLedger = await readFile(
  path.join(runRoot, "analysis/issue_ledger.csv"),
  "utf8",
);
const issueCount = issueLedger.trim().split(/\r?\n/).length - 1;
if (issueCount !== manifest.issueCount) {
  failures.push(`issue ledger count mismatch: ${issueCount}`);
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      artifactCount: manifest.artifactFiles.length,
      humanGateEffect: manifest.humanGateEffect,
      inputCount: inputManifest.inputFiles.length,
      issueCount,
      runId: manifest.runId,
      status: "verified",
      verificationFileCount: manifest.verificationFiles.length,
    },
    null,
    2,
  ),
);
