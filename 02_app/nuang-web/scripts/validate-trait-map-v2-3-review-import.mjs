import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const docsDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2",
);
const generatedDirectory = path.join(docsDirectory, "generated");
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_REVIEW_IMPORT_VALIDATOR_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "132_REVIEW_IMPORT_VALIDATOR_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const inputArgument = process.argv.find((argument) =>
  argument.startsWith("--input="),
);
const customInputPath = inputArgument
  ? path.resolve(process.cwd(), inputArgument.slice("--input=".length))
  : null;
const inputPath =
  customInputPath ??
  path.join(
    reviewDirectory,
    "TRAIT_MAP_REVIEW_IMPORT_EMPTY_V2_3.json",
  );
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const ledger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const protocol = readJson(
  reviewDirectory,
  "TRAIT_MAP_INDEPENDENT_REVIEW_PROTOCOL_V2_3.json",
);
const entryById = new Map(
  ledger.entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const allowedRoles = new Set(protocol.roles.map((role) => role.role));
const allowedIssues = new Set(
  protocol.decisionContract.issueCodes,
);
const errors = [];
const warnings = [];

const requiredTopLevel = [
  "contractVersion",
  "batchId",
  "sourceSystem",
  "exportedAt",
  "reviewers",
  "independentDecisions",
  "cognitiveObservations",
  "revisionProposals",
  "adjudications",
];
const allowedTopLevel = new Set(requiredTopLevel);
for (const field of requiredTopLevel) {
  if (!(field in input)) error("MISSING_TOP_LEVEL_FIELD", field);
}
for (const field of Object.keys(input)) {
  if (!allowedTopLevel.has(field)) error("UNKNOWN_TOP_LEVEL_FIELD", field);
}
if (
  input.contractVersion !== "nuang-trait-map-review-import.v2.3"
) {
  error("CONTRACT_VERSION_MISMATCH", "contractVersion");
}
if (
  ![
    "independent_review_portal",
    "cognitive_interview_capture",
    "controlled_manual_import",
  ].includes(input.sourceSystem)
) {
  error("INVALID_SOURCE_SYSTEM", "sourceSystem");
}
if (!isDateTime(input.exportedAt)) {
  error("INVALID_EXPORTED_AT", "exportedAt");
}
for (const field of [
  "reviewers",
  "independentDecisions",
  "cognitiveObservations",
  "revisionProposals",
  "adjudications",
]) {
  if (!Array.isArray(input[field])) {
    error("EXPECTED_ARRAY", field);
    input[field] = [];
  }
}

const reviewerByRef = new Map();
for (const [index, reviewer] of input.reviewers.entries()) {
  const location = `reviewers[${index}]`;
  if (!nonEmpty(reviewer.reviewerRef, 8))
    error("INVALID_REVIEWER_REF", location);
  if (reviewerByRef.has(reviewer.reviewerRef))
    error("DUPLICATE_REVIEWER_REF", location);
  reviewerByRef.set(reviewer.reviewerRef, reviewer);
  if (!allowedRoles.has(reviewer.role))
    error("INVALID_REVIEWER_ROLE", location);
  if (
    !["VERIFIED", "UNVERIFIED", "REJECTED"].includes(
      reviewer.qualificationState,
    )
  ) {
    error("INVALID_QUALIFICATION_STATE", location);
  }
  if (
    ![
      "NONE_DECLARED",
      "DISCLOSED_MANAGED",
      "DISQUALIFYING",
    ].includes(reviewer.conflictState)
  ) {
    error("INVALID_CONFLICT_STATE", location);
  }
  if (!isDateTime(reviewer.verifiedAt))
    error("INVALID_VERIFIED_AT", location);
}

const eventIds = new Map();
const basisEligibleIds = new Set();
for (const [index, decision] of input.independentDecisions.entries()) {
  const location = `independentDecisions[${index}]`;
  registerEvent(decision.decisionId, "decision", location);
  basisEligibleIds.add(decision.decisionId);
  validateCanonicalEvent(decision, location);
  const reviewer = reviewerByRef.get(decision.reviewerRef);
  if (!reviewer) error("UNKNOWN_REVIEWER_REF", location);
  if (reviewer && reviewer.role !== decision.role)
    error("REVIEWER_ROLE_MISMATCH", location);
  if (!allowedRoles.has(decision.role))
    error("INVALID_DECISION_ROLE", location);
  if (
    !["APPROVE", "REVISE", "HOLD", "REJECT"].includes(
      decision.decision,
    )
  ) {
    error("INVALID_DECISION", location);
  }
  if (!Array.isArray(decision.issueCodes))
    error("ISSUE_CODES_NOT_ARRAY", location);
  else {
    for (const issue of decision.issueCodes) {
      if (!allowedIssues.has(issue))
        error("UNKNOWN_ISSUE_CODE", `${location}.${issue}`);
    }
    if (
      decision.decision === "APPROVE" &&
      decision.issueCodes.length > 0
    ) {
      error("APPROVE_WITH_ISSUES", location);
    }
    if (
      decision.decision !== "APPROVE" &&
      decision.issueCodes.length === 0
    ) {
      error("NON_APPROVE_WITHOUT_ISSUE", location);
    }
  }
  if (!nonEmpty(decision.rationale, 10))
    error("RATIONALE_TOO_SHORT", location);
  if (
    reviewer?.qualificationState !== "VERIFIED" ||
    reviewer?.conflictState === "DISQUALIFYING"
  ) {
    warning("DECISION_NOT_ELIGIBLE_FOR_INDEPENDENT_APPROVAL", location);
  }
  validateHashAndTime(decision, location);
}

for (const [index, observation] of input.cognitiveObservations.entries()) {
  const location = `cognitiveObservations[${index}]`;
  registerEvent(observation.observationId, "observation", location);
  basisEligibleIds.add(observation.observationId);
  validateCanonicalEvent(observation, location);
  if (
    !["ACCURATE", "PARTIAL", "INACCURATE", "NO_RESPONSE"].includes(
      observation.paraphraseAccuracy,
    )
  ) {
    error("INVALID_PARAPHRASE_ACCURACY", location);
  }
  if (
    !["CORRECT", "AMBIGUOUS", "REVERSED", "NO_RESPONSE"].includes(
      observation.axisDiscrimination,
    )
  ) {
    error("INVALID_AXIS_DISCRIMINATION", location);
  }
  if (
    !["NONE", "MINOR", "MATERIAL", "BLOCKING"].includes(
      observation.wordingDifficulty,
    )
  ) {
    error("INVALID_WORDING_DIFFICULTY", location);
  }
  if (
    !nonEmpty(observation.participantRef, 8) ||
    !nonEmpty(observation.sessionRef, 8)
  ) {
    error("INVALID_COGNITIVE_REFERENCE", location);
  }
  validateHashAndTime(observation, location);
}

for (const [index, proposal] of input.revisionProposals.entries()) {
  const location = `revisionProposals[${index}]`;
  registerEvent(proposal.proposalId, "proposal", location);
  validateCanonicalEvent(proposal, location);
  const entry = entryById.get(proposal.canonicalVariantId);
  if (
    entry &&
    proposal.proposedContentVersion !== entry.version + 1
  ) {
    error("PROPOSED_VERSION_NOT_NEXT", location);
  }
  if (
    !Array.isArray(proposal.changeKinds) ||
    proposal.changeKinds.length === 0
  ) {
    error("EMPTY_CHANGE_KINDS", location);
  } else {
    const allowedKinds = new Set([
      "WORDING",
      "AXIS",
      "DIRECTION",
      "EVIDENCE_SCOPE",
      "SURFACE_SCOPE",
      "PRIVACY_SCOPE",
      "RETIRE",
    ]);
    for (const kind of proposal.changeKinds) {
      if (!allowedKinds.has(kind))
        error("UNKNOWN_CHANGE_KIND", `${location}.${kind}`);
    }
    if (
      !proposal.changeKinds.includes("RETIRE") &&
      !nonEmpty(proposal.replacementText, 1)
    ) {
      error("REPLACEMENT_TEXT_REQUIRED", location);
    }
  }
  validateBasisEvents(proposal.basisEventIds, location);
  basisEligibleIds.add(proposal.proposalId);
  validateHashAndTime(proposal, location);
}

for (const [index, adjudication] of input.adjudications.entries()) {
  const location = `adjudications[${index}]`;
  registerEvent(
    adjudication.adjudicationId,
    "adjudication",
    location,
  );
  validateCanonicalEvent(adjudication, location);
  if (
    ![
      "APPROVE_CURRENT",
      "APPLY_REVISION",
      "HOLD_EVIDENCE",
      "REJECT_RETAIN_LINEAGE",
    ].includes(adjudication.outcome)
  ) {
    error("INVALID_ADJUDICATION_OUTCOME", location);
  }
  validateBasisEvents(adjudication.basisEventIds, location);
  if (!nonEmpty(adjudication.rationale, 10))
    error("RATIONALE_TOO_SHORT", location);
  validateHashAndTime(adjudication, location);
}

const eventCount =
  input.independentDecisions.length +
  input.cognitiveObservations.length +
  input.revisionProposals.length +
  input.adjudications.length;
if (input.batchId === "EMPTY-NOT-FOR-IMPORT" || eventCount === 0) {
  warning(
    "EMPTY_TEMPLATE_VALID_BUT_NOT_IMPORTABLE",
    "batchId",
  );
}
const safeToImport =
  errors.length === 0 &&
  eventCount > 0 &&
  input.batchId !== "EMPTY-NOT-FOR-IMPORT";
const result = {
  contractVersion: "nuang-trait-map-review-import-validator.v2.3",
  reportId: "TRAIT-MAP-REVIEW-IMPORT-VALIDATOR.2.3",
  status:
    errors.length > 0
      ? "INVALID_IMPORT_BLOCKED"
      : safeToImport
        ? "VALID_IMPORT_READY_FOR_IMPACT_DRY_RUN"
        : "VALID_EMPTY_TEMPLATE_NOT_IMPORTABLE",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  input: {
    path: path.relative(projectRoot, inputPath),
    customInput: Boolean(customInputPath),
    batchId: input.batchId,
    sourceSystem: input.sourceSystem,
  },
  summary: {
    knownCanonicalVariants: entryById.size,
    reviewerCount: input.reviewers.length,
    independentDecisionCount: input.independentDecisions.length,
    cognitiveObservationCount: input.cognitiveObservations.length,
    revisionProposalCount: input.revisionProposals.length,
    adjudicationCount: input.adjudications.length,
    eventCount,
    errorCount: errors.length,
    warningCount: warnings.length,
    schemaAndRegistryValid: errors.length === 0,
    safeToImport,
    commitPerformed: false,
  },
  errors,
  warnings,
  nextGate: safeToImport
    ? {
        name: "REVISION_IMPACT_DRY_RUN",
        command:
          "node scripts/generate-trait-map-v2-3-revision-impact-dry-run.mjs --input=<validated-file>",
      }
    : {
        name: "WAIT_FOR_REAL_REVIEW_OR_COGNITIVE_EVENTS",
        command: null,
      },
};

if (customInputPath) {
  process.stdout.write(
    await prettier.format(JSON.stringify(result), { parser: "json" }),
  );
  process.exit(errors.length === 0 ? 0 : 1);
}
if (
  errors.length !== 0 ||
  safeToImport ||
  eventCount !== 0 ||
  !warnings.some(
    (warningItem) =>
      warningItem.code === "EMPTY_TEMPLATE_VALID_BUT_NOT_IMPORTABLE",
  )
) {
  throw new Error("Default empty import validator invariants failed.");
}

const output = await prettier.format(JSON.stringify(result), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(result), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 review import validator is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Review import validator v2.3: errors ${errors.length}, warnings ${warnings.length}, events ${eventCount}, safe to import ${safeToImport}.`,
);

function validateCanonicalEvent(event, location) {
  const entry = entryById.get(event.canonicalVariantId);
  if (!entry) {
    error("UNKNOWN_CANONICAL_VARIANT", location);
    return;
  }
  if (event.contentVersion !== entry.version) {
    error("CONTENT_VERSION_MISMATCH", location);
  }
}

function validateHashAndTime(event, location) {
  if (!/^[a-f0-9]{64}$/.test(event.sourceRecordHash ?? ""))
    error("INVALID_SOURCE_RECORD_HASH", location);
  if (!isDateTime(event.recordedAt))
    error("INVALID_RECORDED_AT", location);
  if (
    isDateTime(event.recordedAt) &&
    isDateTime(input.exportedAt) &&
    Date.parse(event.recordedAt) > Date.parse(input.exportedAt)
  ) {
    error("EVENT_AFTER_EXPORT", location);
  }
}

function validateBasisEvents(basisEventIds, location) {
  if (!Array.isArray(basisEventIds) || basisEventIds.length === 0) {
    error("EMPTY_BASIS_EVENTS", location);
    return;
  }
  for (const eventId of basisEventIds) {
    if (!basisEligibleIds.has(eventId))
      error("UNKNOWN_BASIS_EVENT", `${location}.${eventId}`);
  }
}

function registerEvent(eventId, kind, location) {
  if (!nonEmpty(eventId, 8)) {
    error("INVALID_EVENT_ID", location);
    return;
  }
  if (eventIds.has(eventId)) {
    error("DUPLICATE_EVENT_ID", location);
    return;
  }
  eventIds.set(eventId, kind);
}

function nonEmpty(value, minimum) {
  return typeof value === "string" && value.trim().length >= minimum;
}

function isDateTime(value) {
  return (
    typeof value === "string" &&
    !Number.isNaN(Date.parse(value)) &&
    value.includes("T")
  );
}

function error(code, location) {
  errors.push({ code, location });
}

function warning(code, location) {
  warnings.push({ code, location });
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}

function buildMarkdown(validation) {
  return `# v2.3 검토 import validator

- 알려진 canonical: ${validation.summary.knownCanonicalVariants}
- 입력 event: ${validation.summary.eventCount}
- error: ${validation.summary.errorCount}
- warning: ${validation.summary.warningCount}
- import 가능: ${validation.summary.safeToImport}
- commit: ${validation.summary.commitPerformed}

기본 실행은 빈 template의 구조가 맞는지만 검사한다. 빈 template는
오류가 없더라도 실제 event가 없으므로 import할 수 없다. 실제 파일은
canonical ID와 version, reviewer 역할·자격·이해충돌, issue code, event
중복, 근거 event, SHA-256, 시간 순서를 모두 통과해야 영향 dry-run으로
넘어간다.

사용 예:

\`\`\`bash
node scripts/validate-trait-map-v2-3-review-import.mjs \\
  --input=/absolute/path/to/review-import.json
\`\`\`
`;
}
