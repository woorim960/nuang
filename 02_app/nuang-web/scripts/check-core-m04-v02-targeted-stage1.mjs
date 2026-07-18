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
  if (!allowed.has(value))
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
  ];
  response.rows.forEach((row, index) => {
    const source = packet.rows[index];
    for (const column of metadata) {
      if (row[column] !== source[column]) {
        fail(`${reviewerSlot}/${row.opaque_item_id}: changed ${column}`);
      }
    }
    requireValue(
      row.first_construct_mapping,
      constructCodes,
      `${reviewerSlot}/${row.opaque_item_id}/first_construct_mapping`,
    );
    requireValue(
      row.second_construct_mapping,
      constructCodes,
      `${reviewerSlot}/${row.opaque_item_id}/second_construct_mapping`,
    );
    requireValue(
      row.direction_guess,
      new Set(["HIGH", "LOW", "UNCLEAR"]),
      `${reviewerSlot}/${row.opaque_item_id}/direction_guess`,
    );
    for (const column of [
      "clarity_rating_1_4",
      "single_response_rating_1_4",
      "universality_rating_1_4",
      "scale_fit_rating_1_4",
    ]) {
      requireValue(
        row[column],
        new Set(["1", "2", "3", "4"]),
        `${reviewerSlot}/${row.opaque_item_id}/${column}`,
      );
    }
    requireValue(
      row.desirable_direction_guess,
      new Set(["HIGH", "LOW", "SIMILAR", "UNCLEAR"]),
      `${reviewerSlot}/${row.opaque_item_id}/desirable_direction_guess`,
    );
    const risks = row.risk_flags.split(";");
    if (risks.includes("NONE") && risks.length !== 1) {
      fail(`${reviewerSlot}/${row.opaque_item_id}: NONE cannot mix with risks`);
    }
    risks.forEach((risk) =>
      requireValue(
        risk,
        riskCodes,
        `${reviewerSlot}/${row.opaque_item_id}/risk_flags`,
      ),
    );
    if (!row.fatal_risk_note.trim()) {
      fail(`${reviewerSlot}/${row.opaque_item_id}: fatal_risk_note is empty`);
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
    const packetPath = path.join(
      generatedRoot,
      "reviewer",
      `${reviewerSlot}_stage1_blind.csv`,
    );
    const responsePath = path.join(
      intakeRoot,
      "stage1",
      `${reviewerSlot}_stage1_response.csv`,
    );
    const lock = lockRows.find((row) => row.reviewer_slot === reviewerSlot);
    if (!lock) fail(`${reviewerSlot}: missing lock row`);
    if (sha256File(packetPath) !== lock.stage1_packet_sha256) {
      fail(`${reviewerSlot}: Stage 1 packet hash mismatch`);
    }
    if (
      lock.stage2_response_sha256 ||
      lock.stage2_released_at ||
      lock.stage2_locked_at
    ) {
      fail(`${reviewerSlot}: Stage 2 must remain unreleased`);
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
      Boolean(reviewer.stage1_locked_at);
    if (!locked) unlockedSlots.push(reviewerSlot);
  }
  if (requireAll && responseCount !== roster.length) {
    fail(`Expected ${roster.length} responses, found ${responseCount}`);
  }
  if (requireLocked && unlockedSlots.length > 0) {
    fail(`Unverified Stage 1 locks: ${unlockedSlots.join(", ")}`);
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
        stage2_released: false,
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
