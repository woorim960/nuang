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
const roster = readCsvObjects(path.join(intakeRoot, "reviewer_roster.csv"));
const lockRows = readCsvObjects(path.join(intakeRoot, "packet_lock_log.csv"));
const hashes = {};
const unlockedSlots = [];
let responseCount = 0;

for (const reviewer of roster) {
  const reviewerSlot = reviewer.reviewer_slot;
  const lock = lockRows.find((row) => row.reviewer_slot === reviewerSlot);
  if (!lock) throw new Error(`${reviewerSlot}: missing lock row`);
  const stage1PacketPath = path.join(
    generatedRoot,
    `reviewer/${reviewerSlot}_stage1_blind.csv`,
  );
  const stage1ResponsePath = path.join(
    intakeRoot,
    `stage1/${reviewerSlot}_stage1_response.csv`,
  );
  const stage2PacketPath = path.join(
    generatedRoot,
    `internal/DO_NOT_RELEASE_UNTIL_STAGE1_LOCKED_${reviewerSlot}_stage2_target_reveal.csv`,
  );
  const stage2ResponsePath = path.join(
    intakeRoot,
    `stage2/${reviewerSlot}_stage2_response.csv`,
  );

  if (
    sha256File(stage1PacketPath) !== lock.stage1_packet_sha256 ||
    sha256File(stage1ResponsePath) !== lock.stage1_response_sha256 ||
    (fs.statSync(stage1ResponsePath).mode & 0o222) !== 0 ||
    reviewer.stage1_locked_at !== lock.stage1_locked_at
  ) {
    throw new Error(`${reviewerSlot}: Stage 1 lock integrity failed`);
  }
  if (sha256File(stage2PacketPath) !== lock.stage2_packet_sha256) {
    throw new Error(`${reviewerSlot}: Stage 2 packet hash mismatch`);
  }
  if (
    !lock.stage2_released_at ||
    parseTimestamp(lock.stage2_released_at) <=
      parseTimestamp(lock.stage1_locked_at)
  ) {
    throw new Error(`${reviewerSlot}: invalid Stage 2 release order`);
  }
  if (!fs.existsSync(stage2ResponsePath)) {
    unlockedSlots.push(reviewerSlot);
    continue;
  }

  validateResponse(reviewerSlot, stage2PacketPath, stage2ResponsePath);
  responseCount += 1;
  const responseHash = sha256File(stage2ResponsePath);
  hashes[reviewerSlot] = responseHash;
  const locked =
    lock.stage2_response_sha256 === responseHash &&
    Boolean(lock.stage2_locked_at) &&
    parseTimestamp(lock.stage2_locked_at) >=
      parseTimestamp(lock.stage2_released_at) &&
    reviewer.status === "STAGE2_LOCKED" &&
    reviewer.stage2_locked_at === lock.stage2_locked_at &&
    (fs.statSync(stage2ResponsePath).mode & 0o222) === 0;
  if (!locked) unlockedSlots.push(reviewerSlot);
}

if (requireAll && responseCount !== roster.length) {
  throw new Error(
    `Expected ${roster.length} responses, found ${responseCount}`,
  );
}
if (requireLocked && unlockedSlots.length > 0) {
  throw new Error(`Unverified Stage 2 locks: ${unlockedSlots.join(", ")}`);
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
    "target_facet",
    "keyed_direction",
    "source_candidate_id",
    "revision_candidate_id",
  ]) {
    if (row[column] !== source[column]) {
      throw new Error(`${reviewerSlot}: changed ${column}`);
    }
  }
  for (const column of [
    "target_relevance_rating_1_4",
    "key_direction_fit_rating_1_4",
    "adjacent_separation_rating_1_4",
  ]) {
    requireValue(row[column], new Set(["1", "2", "3", "4"]), column);
  }
  requireValue(
    row.coverage_contribution_rating,
    new Set(["REDUNDANT", "SOME", "IMPORTANT"]),
    "coverage contribution",
  );
  requireValue(
    row.recommendation,
    new Set(["KEEP", "COPY_REVISE", "CONSTRUCT_REWRITE", "HOLD", "EXCLUDE"]),
    "recommendation",
  );
  if (!row.final_rationale.trim()) {
    throw new Error(`${reviewerSlot}: empty final_rationale`);
  }
}

function requireValue(value, allowed, label) {
  if (!allowed.has(value))
    throw new Error(`${label}: invalid ${value || "<empty>"}`);
}

function parseTimestamp(value) {
  const parsed = Date.parse(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (!Number.isFinite(parsed)) throw new Error(`Invalid timestamp: ${value}`);
  return parsed;
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
