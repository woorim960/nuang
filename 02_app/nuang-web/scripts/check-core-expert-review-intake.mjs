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
const protocolVersion = "m04-core-expert-kit.v0.1";
const reviewerSlots = Array.from(
  { length: 8 },
  (_, index) => `R${String(index + 1).padStart(2, "0")}`,
);
const waveIds = ["W1", "W2", "W3"];
const identityColumnsStage1 = [
  "protocol_version",
  "reviewer_slot",
  "wave_id",
  "sequence_in_wave",
  "opaque_item_id",
  "context_label",
  "prompt_text",
];
const identityColumnsStage2 = [
  ...identityColumnsStage1,
  "target_domain",
  "target_facet",
  "keyed_direction",
  "response_layer",
  "evidence_role",
  "score_role",
  "intended_response_process",
];
const stage1ResponseColumns = [
  "first_construct_mapping",
  "second_construct_mapping",
  "direction_guess",
  "clarity_rating_1_4",
  "single_response_rating_1_4",
  "universality_rating_1_4",
  "scale_fit_rating_1_4",
  "desirable_direction_guess",
  "risk_flags",
  "fatal_risk_note",
  "stage1_notes",
];
const stage2ResponseColumns = [
  "target_relevance_rating_1_4",
  "key_direction_fit_rating_1_4",
  "coverage_contribution_rating",
  "adjacent_separation_rating_1_4",
  "recommendation",
  "final_rationale",
];
const directionValues = new Set(["HIGH", "LOW", "UNCLEAR"]);
const desirableValues = new Set(["HIGH", "LOW", "SIMILAR", "UNCLEAR"]);
const coverageValues = new Set(["REDUNDANT", "SOME", "IMPORTANT"]);
const recommendationValues = new Set([
  "KEEP",
  "COPY_REVISE",
  "CONSTRUCT_REWRITE",
  "HOLD",
  "EXCLUDE",
]);
const riskValues = new Set([
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

const intakeArgumentIndex = process.argv.indexOf("--intake-root");
const intakeRoot =
  intakeArgumentIndex >= 0
    ? path.resolve(projectRoot, process.argv[intakeArgumentIndex + 1] ?? "")
    : null;

const failures = [];
const summary = {
  mode: intakeRoot ? "INTAKE" : "PREFLIGHT",
  protocol_version: protocolVersion,
  stage1_packets_checked: 0,
  stage2_packets_checked: 0,
  stage1_submissions_checked: 0,
  stage2_submissions_checked: 0,
  reviewer_slots_with_stage1: 0,
  reviewer_slots_with_stage2: 0,
};

if (intakeArgumentIndex >= 0 && !process.argv[intakeArgumentIndex + 1]) {
  fail("--intake-root 뒤에 응답 폴더 경로가 필요합니다.");
}

const mappingRows = readCsvObjects(
  path.join(generatedRoot, "internal", "opaque_item_mapping.csv"),
);
const facetValues = new Set(
  mappingRows.map((row) => row.target_facet.replaceAll("-", "_")),
);
const constructValues = new Set([...facetValues, "METHOD", "NONE"]);

const templates = new Map();
for (const reviewerSlot of reviewerSlots) {
  for (const waveId of waveIds) {
    const key = `${reviewerSlot}-${waveId}`;
    const stage1Path = path.join(
      generatedRoot,
      "reviewer",
      `${reviewerSlot}_${waveId}_stage1_blind.csv`,
    );
    const stage2Path = path.join(
      generatedRoot,
      "internal",
      `DO_NOT_RELEASE_UNTIL_ALL_STAGE1_LOCKED_${reviewerSlot}_${waveId}_stage2_target_reveal.csv`,
    );
    const stage1 = readCsvObjects(stage1Path);
    const stage2 = readCsvObjects(stage2Path);
    validateTemplatePair(key, stage1, stage2);
    templates.set(key, { stage1, stage1Path, stage2, stage2Path });
  }
}

validateGeneratedOperationsFiles();

if (intakeRoot) {
  validateIntake(intakeRoot);
}

if (failures.length > 0) {
  console.error("M04 expert review intake check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({ ...summary, status: "PASS" }, null, 2));

function validateTemplatePair(key, stage1, stage2) {
  if (stage1.length !== 50) fail(`${key} Stage 1은 50행이어야 합니다.`);
  if (stage2.length !== 50) fail(`${key} Stage 2는 50행이어야 합니다.`);

  stage1.forEach((row, index) => {
    validateIdentity(row, key, index, identityColumnsStage1);
    for (const column of stage1ResponseColumns) {
      if ((row[column] ?? "") !== "") {
        fail(
          `${key} Stage 1 template ${index + 1}행 ${column}은 비어 있어야 합니다.`,
        );
      }
    }
  });

  stage2.forEach((row, index) => {
    validateIdentity(row, key, index, identityColumnsStage2);
    for (const column of stage2ResponseColumns) {
      if ((row[column] ?? "") !== "") {
        fail(
          `${key} Stage 2 template ${index + 1}행 ${column}은 비어 있어야 합니다.`,
        );
      }
    }

    const stage1Row = stage1[index];
    for (const column of identityColumnsStage1) {
      if (stage1Row?.[column] !== row[column]) {
        fail(`${key} ${index + 1}행 Stage 1/2의 ${column}이 다릅니다.`);
      }
    }
  });

  summary.stage1_packets_checked += 1;
  summary.stage2_packets_checked += 1;
}

function validateIdentity(row, key, index, columns) {
  for (const column of columns) {
    if (!(column in row)) fail(`${key}에 ${column} 열이 없습니다.`);
  }
  if (row.protocol_version !== protocolVersion) {
    fail(`${key} ${index + 1}행 protocol version이 다릅니다.`);
  }
  if (`${row.reviewer_slot}-${row.wave_id}` !== key) {
    fail(`${key} ${index + 1}행 slot 또는 wave가 다릅니다.`);
  }
  if (row.sequence_in_wave !== String(index + 1)) {
    fail(`${key} ${index + 1}행 순서 값이 다릅니다.`);
  }
}

function validateGeneratedOperationsFiles() {
  const roster = readCsvObjects(
    path.join(generatedRoot, "internal", "reviewer_roster_template.csv"),
  );
  const lockLog = readCsvObjects(
    path.join(generatedRoot, "internal", "packet_lock_log.csv"),
  );
  if (roster.length !== 8) fail("reviewer roster는 8행이어야 합니다.");
  if (lockLog.length !== 24) fail("packet lock log는 24행이어야 합니다.");

  for (const row of lockLog) {
    const key = `${row.reviewer_slot}-${row.wave_id}`;
    const template = templates.get(key);
    if (!template) {
      fail(`packet lock log에 알 수 없는 ${key}가 있습니다.`);
      continue;
    }
    if (row.stage1_packet_sha256 !== sha256File(template.stage1Path)) {
      fail(`${key} Stage 1 packet hash가 다릅니다.`);
    }
    if (row.stage2_packet_sha256 !== sha256File(template.stage2Path)) {
      fail(`${key} Stage 2 packet hash가 다릅니다.`);
    }
    for (const requiredColumn of [
      "stage1_response_sha256",
      "stage2_response_sha256",
      "stage1_lock_verified_at",
      "all_stage1_waves_locked_at",
      "stage2_released_at",
      "stage2_locked_at",
    ]) {
      if (!(requiredColumn in row)) {
        fail(`packet lock log에 ${requiredColumn} 열이 없습니다.`);
      }
    }
  }
}

function validateIntake(root) {
  if (!fs.existsSync(root)) {
    fail(`intake 폴더가 없습니다: ${root}`);
    return;
  }

  const rosterPath = path.join(root, "reviewer_roster.csv");
  const lockLogPath = path.join(root, "packet_lock_log.csv");
  const roster = readCsvObjects(rosterPath);
  const lockLog = readCsvObjects(lockLogPath);
  const lockByKey = new Map(
    lockLog.map((row) => [`${row.reviewer_slot}-${row.wave_id}`, row]),
  );
  validateRoster(roster);

  const slotsWithStage1 = new Set();
  const slotsWithStage2 = new Set();
  const availableStage1 = new Set();

  for (const reviewerSlot of reviewerSlots) {
    for (const waveId of waveIds) {
      const key = `${reviewerSlot}-${waveId}`;
      const stage1Path = path.join(
        root,
        "stage1",
        `${reviewerSlot}_${waveId}_stage1_response.csv`,
      );
      if (fs.existsSync(stage1Path)) {
        const rows = readCsvObjects(stage1Path);
        validateSubmittedRows(
          `${key} Stage 1`,
          rows,
          templates.get(key)?.stage1 ?? [],
          identityColumnsStage1,
        );
        validateStage1Responses(key, rows);
        validateLockedResponse(key, "stage1", stage1Path, lockByKey.get(key));
        availableStage1.add(key);
        slotsWithStage1.add(reviewerSlot);
        summary.stage1_submissions_checked += 1;
      }
    }
  }

  for (const reviewerSlot of reviewerSlots) {
    for (const waveId of waveIds) {
      const key = `${reviewerSlot}-${waveId}`;
      const stage2Path = path.join(
        root,
        "stage2",
        `${reviewerSlot}_${waveId}_stage2_response.csv`,
      );
      if (fs.existsSync(stage2Path)) {
        const rows = readCsvObjects(stage2Path);
        validateSubmittedRows(
          `${key} Stage 2`,
          rows,
          templates.get(key)?.stage2 ?? [],
          identityColumnsStage2,
        );
        validateStage2Responses(key, rows);
        validateStage2Release(key, reviewerSlot, lockByKey, availableStage1);
        validateLockedResponse(key, "stage2", stage2Path, lockByKey.get(key));
        slotsWithStage2.add(reviewerSlot);
        summary.stage2_submissions_checked += 1;
      }
    }
  }

  if (availableStage1.size === 0 && slotsWithStage2.size === 0) {
    fail("intake 폴더에 검토 응답 파일이 없습니다.");
  }
  for (const reviewerSlot of slotsWithStage1) {
    const rosterRow = roster.find((row) => row.reviewer_slot === reviewerSlot);
    if (rosterRow?.status === "NOT_ASSIGNED") {
      fail(`${reviewerSlot} 응답이 있지만 roster 상태가 NOT_ASSIGNED입니다.`);
    }
  }
  summary.reviewer_slots_with_stage1 = slotsWithStage1.size;
  summary.reviewer_slots_with_stage2 = slotsWithStage2.size;
}

function validateRoster(rows) {
  if (rows.length !== 8) fail("intake reviewer roster는 8행이어야 합니다.");
  for (const reviewerSlot of reviewerSlots) {
    const row = rows.find(
      (candidate) => candidate.reviewer_slot === reviewerSlot,
    );
    if (!row) {
      fail(`intake reviewer roster에 ${reviewerSlot}이 없습니다.`);
      continue;
    }
    if (
      !["NOT_ASSIGNED", "ASSIGNED", "ACTIVE", "COMPLETE", "EXCLUDED"].includes(
        row.status,
      )
    ) {
      fail(`${reviewerSlot} roster status가 허용 값이 아닙니다.`);
    }
    if (row.status === "COMPLETE") {
      if (!(row.role_codes ?? "").trim()) {
        fail(`${reviewerSlot} COMPLETE roster에는 role_codes가 필요합니다.`);
      }
      for (const coverageColumn of [
        "psychometric_coverage",
        "personality_coverage",
        "korean_item_coverage",
        "ux_2030_coverage",
        "accessibility_or_bias_coverage",
      ]) {
        if (!["YES", "NO"].includes(row[coverageColumn])) {
          fail(`${reviewerSlot} ${coverageColumn}은 YES 또는 NO여야 합니다.`);
        }
      }
      if (
        !["CLEARED", "DECLARED_MANAGED"].includes(
          row.conflict_disclosure_status,
        )
      ) {
        fail(`${reviewerSlot} COMPLETE roster의 이해상충 확인이 필요합니다.`);
      }
      parseTimestamp(
        `${reviewerSlot} roster all_stage1_locked_at`,
        row.all_stage1_locked_at,
      );
      parseTimestamp(
        `${reviewerSlot} roster all_stage2_locked_at`,
        row.all_stage2_locked_at,
      );
    }
  }
}

function validateSubmittedRows(label, rows, template, identityColumns) {
  if (rows.length !== 50) fail(`${label}은 50행이어야 합니다.`);
  rows.forEach((row, index) => {
    const templateRow = template[index];
    if (!templateRow) return;
    for (const column of identityColumns) {
      if (row[column] !== templateRow[column]) {
        fail(`${label} ${index + 1}행 ${column}이 template과 다릅니다.`);
      }
    }
  });
}

function validateStage1Responses(key, rows) {
  rows.forEach((row, index) => {
    const label = `${key} Stage 1 ${index + 1}행`;
    requireAllowed(label, "first_construct_mapping", row, constructValues);
    requireAllowed(label, "second_construct_mapping", row, constructValues);
    if (
      row.second_construct_mapping !== "NONE" &&
      row.second_construct_mapping === row.first_construct_mapping
    ) {
      fail(`${label}의 first/second mapping은 같을 수 없습니다.`);
    }
    requireAllowed(label, "direction_guess", row, directionValues);
    for (const column of [
      "clarity_rating_1_4",
      "single_response_rating_1_4",
      "universality_rating_1_4",
      "scale_fit_rating_1_4",
    ]) {
      requireAllowed(label, column, row, new Set(["1", "2", "3", "4"]));
    }
    requireAllowed(label, "desirable_direction_guess", row, desirableValues);
    validateRiskFlags(label, row.risk_flags ?? "");
    if (
      (row.risk_flags ?? "").split(";").includes("OTHER") &&
      !(row.stage1_notes ?? "").trim()
    ) {
      fail(
        `${label}에서 OTHER 위험을 선택하면 stage1_notes 근거가 필요합니다.`,
      );
    }
    if (!(row.fatal_risk_note ?? "").trim()) {
      fail(`${label}의 fatal_risk_note는 NONE 또는 근거가 필요합니다.`);
    }
  });
}

function validateStage2Responses(key, rows) {
  rows.forEach((row, index) => {
    const label = `${key} Stage 2 ${index + 1}행`;
    for (const column of [
      "target_relevance_rating_1_4",
      "key_direction_fit_rating_1_4",
      "adjacent_separation_rating_1_4",
    ]) {
      requireAllowed(label, column, row, new Set(["1", "2", "3", "4"]));
    }
    requireAllowed(label, "coverage_contribution_rating", row, coverageValues);
    requireAllowed(label, "recommendation", row, recommendationValues);
    if (!(row.final_rationale ?? "").trim()) {
      fail(`${label}의 final_rationale은 필수입니다.`);
    }
  });
}

function validateRiskFlags(label, value) {
  if (!value) {
    fail(`${label}의 risk_flags는 NONE 또는 위험 코드가 필요합니다.`);
    return;
  }
  const flags = value.split(";").map((flag) => flag.trim());
  if (flags.includes("NONE") && flags.length > 1) {
    fail(`${label}의 risk_flags에서 NONE과 다른 코드를 함께 쓸 수 없습니다.`);
  }
  for (const flag of flags) {
    if (!riskValues.has(flag)) fail(`${label}의 알 수 없는 risk flag: ${flag}`);
  }
}

function validateStage2Release(key, reviewerSlot, lockByKey, availableStage1) {
  const reviewerKeys = waveIds.map((waveId) => `${reviewerSlot}-${waveId}`);
  if (
    !reviewerKeys.every((candidateKey) => availableStage1.has(candidateKey))
  ) {
    fail(
      `${key} Stage 2 전 ${reviewerSlot}의 Stage 1 세 회차가 모두 필요합니다.`,
    );
  }

  const rows = reviewerKeys.map((candidateKey) => lockByKey.get(candidateKey));
  if (rows.some((row) => !row?.all_stage1_waves_locked_at)) {
    fail(`${key} Stage 2 전 all_stage1_waves_locked_at 기록이 필요합니다.`);
    return;
  }
  const row = lockByKey.get(key);
  const lockedTimes = rows.map((lockRow, index) =>
    parseTimestamp(
      `${reviewerKeys[index]} all_stage1_waves_locked_at`,
      lockRow?.all_stage1_waves_locked_at,
    ),
  );
  const releasedAt = parseTimestamp(
    `${key} stage2_released_at`,
    row?.stage2_released_at,
  );
  const validLockedTimes = lockedTimes.filter(Boolean);
  const latestLockedAt =
    validLockedTimes.length === 3
      ? new Date(Math.max(...validLockedTimes.map((date) => date.getTime())))
      : null;
  if (latestLockedAt && releasedAt && releasedAt < latestLockedAt) {
    fail(`${key} Stage 2가 Stage 1 전체 잠금 전에 공개됐습니다.`);
  }
}

function validateLockedResponse(key, stage, responsePath, lockRow) {
  if (!lockRow) {
    fail(`${key}의 packet lock log 행이 없습니다.`);
    return;
  }
  const hashColumn = `${stage}_response_sha256`;
  const lockColumn =
    stage === "stage1" ? "stage1_lock_verified_at" : "stage2_locked_at";
  if (!lockRow[hashColumn]) fail(`${key} ${hashColumn} 기록이 필요합니다.`);
  else if (lockRow[hashColumn] !== sha256File(responsePath)) {
    fail(`${key} ${stage} 응답 hash가 잠금 기록과 다릅니다.`);
  }
  parseTimestamp(`${key} ${lockColumn}`, lockRow[lockColumn]);
}

function requireAllowed(label, column, row, allowed) {
  const value = row[column] ?? "";
  if (!allowed.has(value)) {
    fail(`${label}의 ${column} 허용 값이 아닙니다: ${value || "[blank]"}`);
  }
}

function parseTimestamp(label, value) {
  if (!value) {
    fail(`${label} 시각이 필요합니다.`);
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    fail(`${label} 시각 형식이 올바르지 않습니다: ${value}`);
    return null;
  }
  return parsed;
}

function readCsvObjects(filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`필수 CSV가 없습니다: ${path.relative(projectRoot, filePath)}`);
    return [];
  }
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  if (rows.length === 0) {
    fail(`CSV가 비어 있습니다: ${path.relative(projectRoot, filePath)}`);
    return [];
  }
  const [header, ...dataRows] = rows;
  if (new Set(header).size !== header.length) {
    fail(`CSV header가 중복됩니다: ${path.relative(projectRoot, filePath)}`);
  }
  return dataRows
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row, index) => {
      if (row.length !== header.length) {
        fail(
          `${path.relative(projectRoot, filePath)} ${index + 2}행 열 수가 ${header.length}개가 아닙니다.`,
        );
      }
      return Object.fromEntries(
        header.map((column, columnIndex) => [column, row[columnIndex] ?? ""]),
      );
    });
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

  if (quoted) fail("CSV의 따옴표가 닫히지 않았습니다.");
  if (cell !== "" || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

function sha256File(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function fail(message) {
  failures.push(message);
}
