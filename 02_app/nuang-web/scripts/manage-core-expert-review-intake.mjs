import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const generatedRoot = path.join(
  projectRoot,
  "docs",
  "research",
  "core-m04",
  "generated",
);
const reviewerSlots = new Set(
  Array.from(
    { length: 8 },
    (_, index) => `R${String(index + 1).padStart(2, "0")}`,
  ),
);
const waveIds = ["W1", "W2", "W3"];
const coverageColumns = {
  accessibility: "accessibility_or_bias_coverage",
  korean: "korean_item_coverage",
  personality: "personality_coverage",
  psychometric: "psychometric_coverage",
  ux: "ux_2030_coverage",
};

const action = argument("--action");
const intakeRootArgument = argument("--intake-root");
const reviewerSlot = argument("--reviewer-slot");
const timestamp = argument("--timestamp") ?? new Date().toISOString();

if (!action || !intakeRootArgument || !reviewerSlot) usage();
if (!reviewerSlots.has(reviewerSlot))
  fail(`Invalid reviewer slot: ${reviewerSlot}`);
if (Number.isNaN(new Date(timestamp).getTime())) {
  fail(`Invalid ISO 8601 timestamp: ${timestamp}`);
}

const intakeRoot = path.resolve(projectRoot, intakeRootArgument);
if (path.resolve(intakeRoot).startsWith(path.resolve(generatedRoot))) {
  fail("The generated packet kit cannot be used as a mutable intake root.");
}
const rosterPath = path.join(intakeRoot, "reviewer_roster.csv");
const lockLogPath = path.join(intakeRoot, "packet_lock_log.csv");
const rosterCsv = readCsv(rosterPath);
const lockCsv = readCsv(lockLogPath);
const rosterRow = rosterCsv.rows.find(
  (row) => row.reviewer_slot === reviewerSlot,
);
if (!rosterRow) fail(`Missing roster row: ${reviewerSlot}`);
const lockRows = waveIds.map((waveId) => {
  const row = lockCsv.rows.find(
    (candidate) =>
      candidate.reviewer_slot === reviewerSlot && candidate.wave_id === waveId,
  );
  if (!row) fail(`Missing lock row: ${reviewerSlot}-${waveId}`);
  return row;
});

if (action === "configure") configureReviewer();
else if (action === "lock-stage1") lockStage1();
else if (action === "release-stage2") releaseStage2();
else if (action === "lock-stage2") lockStage2();
else usage();

writeCsv(rosterPath, rosterCsv.header, rosterCsv.rows);
writeCsv(lockLogPath, lockCsv.header, lockCsv.rows);
console.log(
  JSON.stringify(
    { action, intake_root: intakeRoot, reviewer_slot: reviewerSlot, timestamp },
    null,
    2,
  ),
);

function configureReviewer() {
  const roleCode = argument("--role-code");
  const coverage = (argument("--coverage") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!roleCode) fail("--role-code is required for configure.");
  for (const value of coverage) {
    if (!coverageColumns[value]) fail(`Unknown coverage value: ${value}`);
  }
  rosterRow.role_codes = roleCode;
  for (const column of Object.values(coverageColumns)) rosterRow[column] = "NO";
  for (const value of coverage) rosterRow[coverageColumns[value]] = "YES";
  rosterRow.conflict_disclosure_status = "CLEARED";
  if (rosterRow.status === "NOT_ASSIGNED") rosterRow.status = "ASSIGNED";
}

function lockStage1() {
  const lockedBy = argument("--locked-by");
  if (!lockedBy) fail("--locked-by is required for lock-stage1.");
  for (const row of lockRows) {
    const responsePath = path.join(
      intakeRoot,
      "stage1",
      `${reviewerSlot}_${row.wave_id}_stage1_response.csv`,
    );
    requireFile(responsePath);
    row.stage1_response_sha256 = sha256File(responsePath);
    row.stage1_received_at ||= timestamp;
    row.stage1_locked_by = lockedBy;
    row.stage1_lock_verified_at = timestamp;
    row.all_stage1_waves_locked_at = timestamp;
    fs.chmodSync(responsePath, 0o444);
  }
  rosterRow.status = "ACTIVE";
  rosterRow.all_stage1_locked_at = timestamp;
}

function releaseStage2() {
  for (const row of lockRows) {
    if (!row.stage1_response_sha256 || !row.stage1_lock_verified_at) {
      fail(`${reviewerSlot}-${row.wave_id} Stage 1 is not locked.`);
    }
    const stage1Path = path.join(
      intakeRoot,
      "stage1",
      `${reviewerSlot}_${row.wave_id}_stage1_response.csv`,
    );
    requireFile(stage1Path);
    if (sha256File(stage1Path) !== row.stage1_response_sha256) {
      fail(`${reviewerSlot}-${row.wave_id} Stage 1 changed after lock.`);
    }
  }

  fs.mkdirSync(path.join(intakeRoot, "stage2"), { recursive: true });
  for (const row of lockRows) {
    const sourcePath = path.join(
      generatedRoot,
      "internal",
      `DO_NOT_RELEASE_UNTIL_ALL_STAGE1_LOCKED_${reviewerSlot}_${row.wave_id}_stage2_target_reveal.csv`,
    );
    const responsePath = path.join(
      intakeRoot,
      "stage2",
      `${reviewerSlot}_${row.wave_id}_stage2_response.csv`,
    );
    if (fs.existsSync(responsePath)) {
      fail(`Refusing to overwrite existing Stage 2 response: ${responsePath}`);
    }
    fs.copyFileSync(sourcePath, responsePath, fs.constants.COPYFILE_EXCL);
    row.stage2_released_at = timestamp;
  }
}

function lockStage2() {
  for (const row of lockRows) {
    if (!row.stage2_released_at) {
      fail(`${reviewerSlot}-${row.wave_id} Stage 2 was not released.`);
    }
    const responsePath = path.join(
      intakeRoot,
      "stage2",
      `${reviewerSlot}_${row.wave_id}_stage2_response.csv`,
    );
    requireFile(responsePath);
    row.stage2_response_sha256 = sha256File(responsePath);
    row.stage2_received_at ||= timestamp;
    row.stage2_locked_at = timestamp;
    fs.chmodSync(responsePath, 0o444);
  }
  rosterRow.status = "COMPLETE";
  rosterRow.all_stage2_locked_at = timestamp;
}

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function usage() {
  fail(
    "Usage: node scripts/manage-core-expert-review-intake.mjs --action <configure|lock-stage1|release-stage2|lock-stage2> --intake-root <path> --reviewer-slot R01 [action options]",
  );
}

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`Missing file: ${filePath}`);
}

function sha256File(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function readCsv(filePath) {
  requireFile(filePath);
  const [header, ...dataRows] = parseCsv(fs.readFileSync(filePath, "utf8"));
  return {
    header,
    rows: dataRows
      .filter((row) => row.some((cell) => cell !== ""))
      .map((row) =>
        Object.fromEntries(
          header.map((column, index) => [column, row[index] ?? ""]),
        ),
      ),
  };
}

function writeCsv(filePath, header, rows) {
  const content = [
    header,
    ...rows.map((row) => header.map((column) => row[column] ?? "")),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  fs.writeFileSync(filePath, `${content}\n`, "utf8");
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
  return rows;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
