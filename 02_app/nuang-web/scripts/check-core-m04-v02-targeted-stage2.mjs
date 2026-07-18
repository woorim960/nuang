import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const generatedRoot = path.join(
  projectRoot,
  "docs",
  "research",
  "core-m04",
  "v0.2",
  "generated",
);
const intakeRoot = path.resolve(
  projectRoot,
  argumentValue("--intake-root") ??
    "docs/research/core-m04/v0.2/internal-critique/v0.1",
);
const requireAll = process.argv.includes("--require-all");
const requireLocked = process.argv.includes("--require-locked");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message) {
  throw new Error(message);
}

function sha256File(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
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
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (cell || row.length) rows.push([...row, cell.replace(/\r$/, "")]);
  if (quoted) fail("CSV contains an unterminated quoted cell");
  return rows;
}

function readCsvObjects(filePath) {
  const [header, ...rows] = parseCsv(fs.readFileSync(filePath, "utf8"));
  return {
    header,
    rows: rows.map((row) =>
      Object.fromEntries(
        header.map((column, index) => [column, row[index] ?? ""]),
      ),
    ),
  };
}

function requireValue(value, allowed, label) {
  if (!allowed.includes(value))
    fail(`${label}: invalid value ${value || "<empty>"}`);
}

function validateResponse(reviewerSlot, packetPath, responsePath) {
  const packet = readCsvObjects(packetPath);
  const response = readCsvObjects(responsePath);
  if (packet.header.join("|") !== response.header.join("|")) {
    fail(`${reviewerSlot}: response header differs from packet`);
  }
  if (response.rows.length !== 8) {
    fail(`${reviewerSlot}: expected 8 rows, found ${response.rows.length}`);
  }
  const metadata = [
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
  ];
  response.rows.forEach((row, index) => {
    const source = packet.rows[index];
    for (const column of metadata) {
      if (row[column] !== source[column]) {
        fail(`${reviewerSlot}/${row.opaque_item_id}: changed ${column}`);
      }
    }
    requireValue(
      row.target_relevance_rating_1_4,
      ["1", "2", "3", "4"],
      `${reviewerSlot}/${row.opaque_item_id}/target_relevance`,
    );
    requireValue(
      row.key_direction_fit_rating_1_4,
      ["1", "2", "3", "4"],
      `${reviewerSlot}/${row.opaque_item_id}/direction_fit`,
    );
    requireValue(
      row.coverage_contribution_rating,
      ["REDUNDANT", "SOME", "IMPORTANT"],
      `${reviewerSlot}/${row.opaque_item_id}/coverage`,
    );
    requireValue(
      row.adjacent_separation_rating_1_4,
      ["1", "2", "3", "4"],
      `${reviewerSlot}/${row.opaque_item_id}/adjacent_separation`,
    );
    requireValue(
      row.recommendation,
      ["KEEP", "COPY_REVISE", "CONSTRUCT_REWRITE", "HOLD", "EXCLUDE"],
      `${reviewerSlot}/${row.opaque_item_id}/recommendation`,
    );
    if (!row.final_rationale.trim()) {
      fail(`${reviewerSlot}/${row.opaque_item_id}: final_rationale is empty`);
    }
  });
}

try {
  const roster = readCsvObjects(
    path.join(intakeRoot, "reviewer_roster.csv"),
  ).rows;
  const lockRows = readCsvObjects(
    path.join(intakeRoot, "packet_lock_log.csv"),
  ).rows;
  const hashes = {};
  const unlockedSlots = [];
  let responseCount = 0;
  for (const reviewer of roster) {
    const reviewerSlot = reviewer.reviewer_slot;
    const lock = lockRows.find((row) => row.reviewer_slot === reviewerSlot);
    if (!lock) fail(`${reviewerSlot}: missing lock row`);
    const stage1ResponsePath = path.join(
      intakeRoot,
      "stage1",
      `${reviewerSlot}_stage1_response.csv`,
    );
    if (
      sha256File(stage1ResponsePath) !== lock.stage1_response_sha256 ||
      !lock.stage1_locked_at
    ) {
      fail(`${reviewerSlot}: Stage 1 lock is no longer valid`);
    }
    if (
      !lock.stage2_released_at ||
      lock.stage2_released_at <= lock.stage1_locked_at
    ) {
      fail(`${reviewerSlot}: Stage 2 release order is invalid`);
    }
    const packetPath = path.join(
      generatedRoot,
      "internal",
      `DO_NOT_RELEASE_UNTIL_STAGE1_LOCKED_${reviewerSlot}_stage2_target_reveal.csv`,
    );
    if (sha256File(packetPath) !== lock.stage2_packet_sha256) {
      fail(`${reviewerSlot}: Stage 2 packet hash mismatch`);
    }
    const responsePath = path.join(
      intakeRoot,
      "stage2",
      `${reviewerSlot}_stage2_response.csv`,
    );
    if (!fs.existsSync(responsePath)) {
      unlockedSlots.push(reviewerSlot);
      continue;
    }
    validateResponse(reviewerSlot, packetPath, responsePath);
    responseCount += 1;
    const responseHash = sha256File(responsePath);
    hashes[reviewerSlot] = responseHash;
    const locked =
      lock.stage2_response_sha256 === responseHash &&
      Boolean(lock.stage2_locked_at) &&
      reviewer.status === "STAGE2_LOCKED" &&
      Boolean(reviewer.stage2_locked_at);
    if (!locked) unlockedSlots.push(reviewerSlot);
  }
  if (requireAll && responseCount !== roster.length) {
    fail(`Expected ${roster.length} responses, found ${responseCount}`);
  }
  if (requireLocked && unlockedSlots.length > 0) {
    fail(`Unverified Stage 2 locks: ${unlockedSlots.join(", ")}`);
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        protocol_version: "m04-core-expert-kit.v0.2-targeted",
        reviewer_count: roster.length,
        responses_checked: responseCount,
        response_rows_checked: responseCount * 8,
        response_sha256: hashes,
        unlocked_slots: unlockedSlots,
        status: "PASS",
      },
      null,
      2,
    )}\n`,
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
