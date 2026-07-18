import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const generatedRoot = path.join(
  projectRoot,
  "docs/research/core-m04/v0.2/post-adjudication/generated/m04",
);
const intakeRoot = path.join(
  projectRoot,
  "docs/research/core-m04/v0.2/post-adjudication/internal-critique/v0.1",
);
const requireAll = process.argv.includes("--require-all");
const requireLocked = process.argv.includes("--require-locked");
const constructCodes = new Set([
  "SE_RE",
  "SE_AI",
  "OE_AE",
  "OE_CI",
  "OE_IE",
  "RO_EC",
  "RO_RN",
  "SM_EP",
  "SM_OS",
  "SM_RL",
  "ER_IR",
  "ER_WD",
  "METHOD",
  "NONE",
]);
const riskCodes = new Set([
  "ABILITY",
  "ACCESS",
  "EDUCATION",
  "OCCUPATION",
  "RELATIONSHIP_STATUS",
  "DIGITAL_ACCESS",
  "CULTURAL_ROLE",
  "SOCIAL_DESIRABILITY",
  "RESPONSE_OPTION",
  "NEGATION",
  "LIMITER",
  "MEMORY",
  "ATTENTION",
  "ADJACENT_CONSTRUCT",
  "CLINICAL_CONTAMINATION",
  "PRIVACY",
  "OTHER",
  "NONE",
]);

const roster = readCsvObjects(path.join(intakeRoot, "reviewer_roster.csv"));
const lockRows = readCsvObjects(path.join(intakeRoot, "packet_lock_log.csv"));
const hashes = {};
const unlockedSlots = [];
let responseCount = 0;

for (const reviewer of roster) {
  const reviewerSlot = reviewer.reviewer_slot;
  const packetPath = path.join(
    generatedRoot,
    `reviewer/${reviewerSlot}_stage1_blind.csv`,
  );
  const responsePath = path.join(
    intakeRoot,
    `stage1/${reviewerSlot}_stage1_response.csv`,
  );
  const lock = lockRows.find((row) => row.reviewer_slot === reviewerSlot);
  if (!lock) throw new Error(`${reviewerSlot}: missing lock row`);
  if (sha256File(packetPath) !== lock.stage1_packet_sha256) {
    throw new Error(`${reviewerSlot}: Stage 1 packet hash mismatch`);
  }
  const stage2Path = path.join(
    generatedRoot,
    `internal/DO_NOT_RELEASE_UNTIL_STAGE1_LOCKED_${reviewerSlot}_stage2_target_reveal.csv`,
  );
  if (sha256File(stage2Path) !== lock.stage2_packet_sha256) {
    throw new Error(`${reviewerSlot}: Stage 2 packet hash mismatch`);
  }
  if (
    lock.stage2_response_sha256 ||
    lock.stage2_released_at ||
    lock.stage2_locked_at ||
    reviewer.stage2_locked_at
  ) {
    throw new Error(`${reviewerSlot}: Stage 2 must remain unreleased`);
  }
  if (!fs.existsSync(responsePath)) {
    unlockedSlots.push(reviewerSlot);
    continue;
  }
  validateResponse(reviewerSlot, packetPath, responsePath);
  responseCount += 1;
  const responseHash = sha256File(responsePath);
  hashes[reviewerSlot] = responseHash;
  const locked =
    lock.stage1_response_sha256 === responseHash &&
    Boolean(lock.stage1_locked_at) &&
    reviewer.status === "STAGE1_LOCKED" &&
    reviewer.stage1_locked_at === lock.stage1_locked_at &&
    (fs.statSync(responsePath).mode & 0o222) === 0;
  if (!locked) unlockedSlots.push(reviewerSlot);
}

if (requireAll && responseCount !== roster.length) {
  throw new Error(
    `Expected ${roster.length} responses, found ${responseCount}`,
  );
}
if (requireLocked && unlockedSlots.length > 0) {
  throw new Error(`Unverified Stage 1 locks: ${unlockedSlots.join(", ")}`);
}

console.log(
  JSON.stringify(
    {
      protocol_version: "m04-core-expert-kit.v0.2-smrl-r3",
      reviewer_count: roster.length,
      responses_checked: responseCount,
      response_rows_checked: responseCount,
      response_sha256: hashes,
      unlocked_slots: unlockedSlots,
      stage2_released: false,
      status: "PASS",
    },
    null,
    2,
  ),
);

function validateResponse(reviewerSlot, packetPath, responsePath) {
  const packet = readCsv(packetPath);
  const response = readCsv(responsePath);
  if (packet.header.join("|") !== response.header.join("|")) {
    throw new Error(`${reviewerSlot}: response header differs from packet`);
  }
  if (response.objects.length !== 1) {
    throw new Error(`${reviewerSlot}: expected one response row`);
  }
  const source = packet.objects[0];
  const row = response.objects[0];
  for (const column of [
    "protocol_version",
    "reviewer_slot",
    "sequence",
    "opaque_item_id",
    "context_label",
    "prompt_text",
  ]) {
    if (row[column] !== source[column]) {
      throw new Error(`${reviewerSlot}: changed ${column}`);
    }
  }
  requireValue(row.first_construct_mapping, constructCodes, "first construct");
  requireValue(
    row.second_construct_mapping,
    constructCodes,
    "second construct",
  );
  requireValue(
    row.direction_guess,
    new Set(["HIGH", "LOW", "UNCLEAR"]),
    "direction",
  );
  for (const column of [
    "clarity_rating_1_4",
    "single_response_rating_1_4",
    "universality_rating_1_4",
    "scale_fit_rating_1_4",
  ]) {
    requireValue(row[column], new Set(["1", "2", "3", "4"]), column);
  }
  requireValue(
    row.desirable_direction_guess,
    new Set(["HIGH", "LOW", "SIMILAR", "UNCLEAR"]),
    "desirable direction",
  );
  const risks = row.risk_flags.split(";");
  if (risks.includes("NONE") && risks.length !== 1) {
    throw new Error(`${reviewerSlot}: NONE cannot mix with risks`);
  }
  for (const risk of risks) requireValue(risk, riskCodes, "risk flag");
  for (const column of ["fatal_risk_note", "stage1_notes"]) {
    if (!row[column].trim())
      throw new Error(`${reviewerSlot}: empty ${column}`);
  }
}

function requireValue(value, allowed, label) {
  if (!allowed.has(value))
    throw new Error(`${label}: invalid ${value || "<empty>"}`);
}

function sha256File(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function readCsv(filePath) {
  const [header, ...rows] = parseCsv(fs.readFileSync(filePath, "utf8"));
  const nonemptyRows = rows.filter((row) => row.some((cell) => cell !== ""));
  return {
    header,
    objects: nonemptyRows.map((row) =>
      Object.fromEntries(
        header.map((column, index) => [column, row[index] ?? ""]),
      ),
    ),
  };
}

function readCsvObjects(filePath) {
  return readCsv(filePath).objects;
}

function parseCsv(content) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) rows.push([...row, cell.replace(/\r$/, "")]);
  return rows;
}
