import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const packetRoot = path.join(
  projectRoot,
  "docs/research/enakq-map-v0.1/generated/reviewer",
);
const critiqueRoot = path.join(
  projectRoot,
  "docs/research/enakq-map-v0.1/internal-critique/v0.1",
);

const columns = [
  "claim_id",
  "decision",
  "construct_fit_rating_1_4",
  "evidence_fit_rating_1_4",
  "inference_scope_rating_1_4",
  "language_safety_rating_1_4",
  "risk_flags",
  "required_revision",
  "rationale",
  "reviewer_confidence",
];
const decisionValues = new Set([
  "accept",
  "revise",
  "reject",
  "insufficient_evidence",
]);
const riskValues = new Set([
  "none",
  "ability_inference",
  "clinical_overreach",
  "cultural_norm",
  "deterministic_language",
  "discrimination_risk",
  "evidence_mismatch",
  "privacy_scope",
  "relationship_determinism",
  "stigma_or_value_judgment",
  "unmeasured_inference",
  "unclear_korean",
  "other",
]);
const confidenceValues = new Set(["low", "medium", "high"]);
const roleConfigs = [
  {
    expectedCount: 86,
    file: "personality_psychology_review.csv",
    packetPrefix: "personality_psychology",
    role: "personality_psychology",
  },
  {
    expectedCount: 119,
    file: "psychometrics_review.csv",
    packetPrefix: "psychometrics",
    role: "psychometrics",
  },
  {
    expectedCount: 98,
    file: "relationship_safety_review.csv",
    packetPrefix: "relationship_safety",
    role: "relationship_safety",
  },
];

const failures = [];
const summaries = [];

for (const config of roleConfigs) {
  const expectedClaimIds = readExpectedClaimIds(config.packetPrefix);
  if (expectedClaimIds.size !== config.expectedCount) {
    fail(
      `${config.role} packet expected ${config.expectedCount} claims, found ${expectedClaimIds.size}`,
    );
  }

  const responsePath = path.join(critiqueRoot, config.file);
  if (!fs.existsSync(responsePath)) {
    fail(`${config.role} response file is missing: ${config.file}`);
    continue;
  }

  const { headers, rows } = readCsv(responsePath);
  if (JSON.stringify(headers) !== JSON.stringify(columns)) {
    fail(`${config.file} columns do not match the internal critique contract`);
  }
  if (rows.length !== config.expectedCount) {
    fail(
      `${config.file} expected ${config.expectedCount} rows, found ${rows.length}`,
    );
  }

  const seenClaimIds = new Set();
  const decisionCounts = {};
  const riskCounts = {};
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const claimId = row.claim_id;
    if (!expectedClaimIds.has(claimId)) {
      fail(`${config.file}:${rowNumber} unexpected claim ${claimId}`);
    }
    if (seenClaimIds.has(claimId)) {
      fail(`${config.file}:${rowNumber} duplicate claim ${claimId}`);
    }
    seenClaimIds.add(claimId);

    if (!decisionValues.has(row.decision)) {
      fail(`${config.file}:${rowNumber} invalid decision ${row.decision}`);
    }
    for (const ratingColumn of columns.slice(2, 6)) {
      const rating = Number(row[ratingColumn]);
      if (!Number.isInteger(rating) || rating < 1 || rating > 4) {
        fail(
          `${config.file}:${rowNumber} ${ratingColumn} must be an integer from 1 to 4`,
        );
      }
    }
    const riskFlags = row.risk_flags
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean);
    if (riskFlags.length === 0) {
      fail(`${config.file}:${rowNumber} risk_flags is required`);
    }
    if (new Set(riskFlags).size !== riskFlags.length) {
      fail(`${config.file}:${rowNumber} has duplicate risk flags`);
    }
    if (riskFlags.includes("none") && riskFlags.length > 1) {
      fail(`${config.file}:${rowNumber} mixes none with another risk flag`);
    }
    for (const riskFlag of riskFlags) {
      if (!riskValues.has(riskFlag)) {
        fail(`${config.file}:${rowNumber} invalid risk flag ${riskFlag}`);
      }
      riskCounts[riskFlag] = (riskCounts[riskFlag] ?? 0) + 1;
    }
    if (row.decision === "accept" && !riskFlags.includes("none")) {
      fail(`${config.file}:${rowNumber} accepts a claim with a risk flag`);
    }
    if (row.decision === "revise" && row.required_revision.trim() === "") {
      fail(`${config.file}:${rowNumber} revise requires required_revision`);
    }
    if (row.rationale.trim() === "") {
      fail(`${config.file}:${rowNumber} rationale is required`);
    }
    if (!confidenceValues.has(row.reviewer_confidence)) {
      fail(
        `${config.file}:${rowNumber} invalid reviewer confidence ${row.reviewer_confidence}`,
      );
    }
    decisionCounts[row.decision] = (decisionCounts[row.decision] ?? 0) + 1;
  }

  for (const expectedClaimId of expectedClaimIds) {
    if (!seenClaimIds.has(expectedClaimId)) {
      fail(`${config.file} is missing ${expectedClaimId}`);
    }
  }

  summaries.push({
    claims: rows.length,
    decisions: decisionCounts,
    risks: riskCounts,
    role: config.role,
  });
}

if (failures.length > 0) {
  console.error("ENAKQ internal agent critique check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      status: "PASS_INTERNAL_AGENT_CRITIQUE_NOT_EXTERNAL_REVIEW",
      summaries,
    },
    null,
    2,
  ),
);

function readExpectedClaimIds(packetPrefix) {
  const claimIds = new Set();
  for (const file of fs
    .readdirSync(packetRoot)
    .filter(
      (name) => name.startsWith(`${packetPrefix}_W`) && name.endsWith(".csv"),
    )
    .sort()) {
    const { rows } = readCsv(path.join(packetRoot, file));
    for (const row of rows) claimIds.add(row.claim_id);
  }
  return claimIds;
}

function readCsv(filePath) {
  const parsedRows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const headers = parsedRows[0] ?? [];
  const rows = parsedRows
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""]),
      ),
    );
  return { headers, rows };
}

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (value !== "" || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function fail(message) {
  failures.push(message);
}
