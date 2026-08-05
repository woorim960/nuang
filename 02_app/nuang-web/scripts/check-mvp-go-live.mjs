import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const gatesPath = resolve("scripts/mvp-go-live-gates.json");
const catalog = JSON.parse(readFileSync(gatesPath, "utf8"));
const schemeSource = readFileSync(
  resolve("src/features/nuang-code/next-code-scheme.ts"),
  "utf8",
);
const blockers = [];
const supportedTracks = new Set(["validated_release", "value_validation_beta"]);

if (!supportedTracks.has(catalog.track)) {
  blockers.push(`unsupported release track: ${catalog.track ?? "missing"}`);
}

if (!Array.isArray(catalog.gates) || catalog.gates.length === 0) {
  blockers.push("go-live gate catalog is empty");
} else {
  for (const gate of catalog.gates) {
    if (gate.required === false) {
      if (gate.status === "passed") {
        if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
          blockers.push(`${gate.id}: passed without evidence`);
        }
        continue;
      }
      if (
        gate.status !== "deferred" ||
        typeof gate.deferredAt !== "string" ||
        typeof gate.deferredReason !== "string" ||
        gate.deferredReason.trim().length === 0 ||
        typeof gate.revisitTrigger !== "string" ||
        gate.revisitTrigger.trim().length === 0
      ) {
        blockers.push(`${gate.id}: invalid deferral record`);
      }
      continue;
    }
    if (gate.status !== "passed") {
      blockers.push(`${gate.id}: ${gate.status ?? "missing_status"}`);
      continue;
    }
    if (!Array.isArray(gate.evidence) || gate.evidence.length === 0) {
      blockers.push(`${gate.id}: passed without evidence`);
    }
  }
}

if (catalog.track === "validated_release") {
  if (/status:\s*"candidate"/.test(schemeSource)) {
    blockers.push("measurement scheme is still candidate");
  }
  if (
    /\b(?:cognitiveReview|fairnessAndInvariance|quantitativePilot|reliabilityAndStructure):\s*"not_started"/.test(
      schemeSource,
    )
  ) {
    blockers.push("measurement validation gates are not complete");
  }
} else if (catalog.track === "value_validation_beta") {
  const policy = catalog.candidateResultPolicy;
  if (
    policy?.customerClaim !== "exploratory_beta_only" ||
    policy?.humanValidationState !== "deferred_not_approved" ||
    policy?.publicIdentityPropagation !== "blocked_until_human_validation"
  ) {
    blockers.push("beta candidate result policy is incomplete");
  }
}

console.log(`NUANG MVP go-live gate check (${catalog.asOf ?? "unknown"})`);
if (blockers.length > 0) {
  for (const blocker of blockers) console.log(`BLOCKED ${blocker}`);
  console.error(`go-live blocked: ${blockers.length} unresolved gate(s)`);
  process.exit(1);
}

console.log("go-live gates passed with recorded evidence.");
