import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const contractRoot = path.join(
  projectRoot,
  "docs",
  "research",
  "core-m04",
  "v0.2",
);
const outputRoot = path.join(contractRoot, "generated");
const protocolVersion = "m04-core-expert-kit.v0.2-targeted";
const generatedAt = "2026-07-18T21:00:00+09:00";
const keySeed = "nuang-core-m04-v02-targeted-20260718";
const reviewerSlots = Array.from(
  { length: 8 },
  (_, index) => `R${String(index + 1).padStart(2, "0")}`,
);
const checkOnly = process.argv.includes("--check");

const directionPath = path.join(contractRoot, "02_DIRECTION_ANCHORS.csv");
const revisionPath = path.join(contractRoot, "03_ITEM_REVISION_REGISTER.csv");
const guidePath = path.join(contractRoot, "04_TARGETED_REVIEWER_GUIDE.md");
const baseCodebookPath = path.join(
  projectRoot,
  "docs",
  "research",
  "core-m04",
  "reviewer",
  "02_BLIND_CONSTRUCT_CODEBOOK.md",
);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
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
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  invariant(!quoted, "CSV contains an unterminated quoted cell");
  return rows;
}

function readCsvObjects(filePath) {
  const [header, ...rows] = parseCsv(fs.readFileSync(filePath, "utf8"));
  return rows.map((row) =>
    Object.fromEntries(
      header.map((column, index) => [column, row[index] ?? ""]),
    ),
  );
}

function seedToInt(seed) {
  return crypto.createHash("sha256").update(seed).digest().readUInt32LE(0);
}

function createRandom(seed) {
  let state = seedToInt(seed);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function buildCodebook(directionRows) {
  const base = fs
    .readFileSync(baseCodebookPath, "utf8")
    .replaceAll("m04-core-expert-kit.v0.1", protocolVersion);
  const table = [
    "",
    "## v0.2 HIGH/LOW 중립 방향 앵커",
    "",
    "| 입력 코드 | HIGH | LOW | 가치 판단 방지 |",
    "| --- | --- | --- | --- |",
    ...directionRows.map(
      (row) =>
        `| \`${row.construct_code}\` | ${row.high_anchor_ko} | ${row.low_anchor_ko} | ${row.non_value_guardrail} |`,
    ),
    "",
  ];
  return `${base.trimEnd()}\n${table.join("\n")}`;
}

function buildStage1(reviewerSlot, items) {
  const header = [
    "protocol_version",
    "reviewer_slot",
    "sequence",
    "opaque_item_id",
    "context_label",
    "prompt_text",
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
  return toCsv([
    header,
    ...items.map((item, index) => [
      protocolVersion,
      reviewerSlot,
      index + 1,
      item.opaqueItemId,
      item.draft_context_label,
      item.draft_prompt_text,
      ...Array(11).fill(""),
    ]),
  ]);
}

function buildStage2(reviewerSlot, items) {
  const header = [
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
    "target_relevance_rating_1_4",
    "key_direction_fit_rating_1_4",
    "coverage_contribution_rating",
    "adjacent_separation_rating_1_4",
    "recommendation",
    "final_rationale",
  ];
  return toCsv([
    header,
    ...items.map((item, index) => [
      protocolVersion,
      reviewerSlot,
      index + 1,
      item.opaqueItemId,
      item.draft_context_label,
      item.draft_prompt_text,
      item.target_facet,
      item.keyed_direction,
      item.candidate_id,
      item.next_candidate_or_revision,
      ...Array(6).fill(""),
    ]),
  ]);
}

function buildFiles() {
  const directionRows = readCsvObjects(directionPath);
  const revisionRows = readCsvObjects(revisionPath);
  invariant(directionRows.length === 12, "Expected 12 direction anchors");

  const reviewItems = revisionRows.filter(
    (row) =>
      row.next_candidate_or_revision !== "NONE" &&
      row.draft_context_label !== "NONE" &&
      row.draft_prompt_text !== "NONE",
  );
  const retiredItems = revisionRows.filter(
    (row) => row.action === "RETIRE_NO_REPLACEMENT",
  );
  invariant(reviewItems.length === 8, "Expected 8 revised review candidates");
  invariant(
    retiredItems.length === 1,
    "Expected one no-replacement retirement",
  );

  const opaqueItems = shuffled(reviewItems, createRandom(keySeed)).map(
    (item, index) => ({
      ...item,
      opaqueItemId: `NV2-${String(index + 1).padStart(3, "0")}`,
    }),
  );
  const files = new Map();
  const reviewerOrderHashes = new Set();
  const packetReports = [];
  const leakPattern =
    /(?:SMOS-C12|ERWD-C06|ROEC-P03-B|RORN-P05-B|SMOS-C10|OEIE-C09|OEIE-C10|SMOS-C08|SMRL-C11|SE-RE|SE-AI|OE-AE|OE-CI|OE-IE|RO-EC|RO-RN|SM-EP|SM-OS|SM-RL|ER-IR|ER-WD)/;

  files.set("reviewer/00_STAGE1_CODEBOOK.md", buildCodebook(directionRows));
  files.set(
    "reviewer/01_RESPONSE_GUIDE.md",
    fs.readFileSync(guidePath, "utf8"),
  );

  for (const reviewerSlot of reviewerSlots) {
    const ordered = shuffled(
      opaqueItems,
      createRandom(`${protocolVersion}:${reviewerSlot}`),
    );
    const orderHash = sha256(
      ordered.map((item) => item.opaqueItemId).join("|"),
    );
    invariant(
      !reviewerOrderHashes.has(orderHash),
      `${reviewerSlot}: duplicate order`,
    );
    reviewerOrderHashes.add(orderHash);

    const stage1Path = `reviewer/${reviewerSlot}_stage1_blind.csv`;
    const stage2Path = `internal/DO_NOT_RELEASE_UNTIL_STAGE1_LOCKED_${reviewerSlot}_stage2_target_reveal.csv`;
    const stage1 = buildStage1(reviewerSlot, ordered);
    const stage2 = buildStage2(reviewerSlot, ordered);
    invariant(
      !leakPattern.test(stage1),
      `${reviewerSlot}: Stage 1 target leak`,
    );
    files.set(stage1Path, stage1);
    files.set(stage2Path, stage2);
    packetReports.push({
      reviewer_slot: reviewerSlot,
      item_count: ordered.length,
      order_sha256: orderHash,
      stage1_path: stage1Path,
      stage1_sha256: sha256(stage1),
      stage2_path: stage2Path,
      stage2_sha256: sha256(stage2),
      target_leak_detected: false,
    });
  }

  files.set(
    "internal/opaque_item_mapping.csv",
    toCsv([
      [
        "opaque_item_id",
        "source_candidate_id",
        "revision_candidate_id",
        "target_facet",
        "keyed_direction",
        "critical_flag",
        "seam_flag",
        "context_label",
        "prompt_text",
      ],
      ...opaqueItems.map((item) => [
        item.opaqueItemId,
        item.candidate_id,
        item.next_candidate_or_revision,
        item.target_facet,
        item.keyed_direction,
        item.critical_flag,
        item.seam_flag,
        item.draft_context_label,
        item.draft_prompt_text,
      ]),
    ]),
  );
  files.set(
    "internal/retired_item_decisions.csv",
    toCsv([
      ["candidate_id", "opaque_item_id", "action", "decision_reason"],
      ...retiredItems.map((item) => [
        item.candidate_id,
        item.opaque_item_id,
        item.action,
        item.decision_reason,
      ]),
    ]),
  );
  files.set(
    "internal/reviewer_roster_template.csv",
    toCsv([
      [
        "reviewer_slot",
        "status",
        "role_codes",
        "conflict_disclosure_status",
        "stage1_locked_at",
        "stage2_locked_at",
      ],
      ...reviewerSlots.map((slot) => [
        slot,
        "NOT_ASSIGNED",
        "",
        "NOT_REVIEWED",
        "",
        "",
      ]),
    ]),
  );
  files.set(
    "internal/packet_lock_log.csv",
    toCsv([
      [
        "reviewer_slot",
        "stage1_packet_sha256",
        "stage1_response_sha256",
        "stage1_locked_at",
        "stage2_packet_sha256",
        "stage2_response_sha256",
        "stage2_released_at",
        "stage2_locked_at",
      ],
      ...packetReports.map((report) => [
        report.reviewer_slot,
        report.stage1_sha256,
        "",
        "",
        report.stage2_sha256,
        "",
        "",
        "",
      ]),
    ]),
  );

  const manifestEntries = [...files.entries()].map(([filePath, content]) => ({
    path: filePath,
    sha256: sha256(content),
    bytes: Buffer.byteLength(content),
  }));
  const sourceFiles = [
    path.relative(projectRoot, directionPath),
    path.relative(projectRoot, revisionPath),
    path.relative(projectRoot, guidePath),
    path.relative(projectRoot, baseCodebookPath),
  ];
  files.set(
    "internal/packet_manifest.json",
    `${JSON.stringify(
      {
        protocol_version: protocolVersion,
        generated_at: generatedAt,
        purpose: "TARGETED_REVISION_REVIEW_NOT_FULL_M04",
        source_files: sourceFiles,
        source_sha256: Object.fromEntries(
          sourceFiles.map((file) => [
            file,
            sha256(fs.readFileSync(path.join(projectRoot, file), "utf8")),
          ]),
        ),
        reviewer_slots: reviewerSlots,
        stage2_release_rule: "STAGE1_LOCKED_PER_REVIEWER",
        generated_files: manifestEntries,
      },
      null,
      2,
    )}\n`,
  );
  files.set(
    "internal/validation_report.json",
    `${JSON.stringify(
      {
        protocol_version: protocolVersion,
        generated_at: generatedAt,
        purpose: "TARGETED_REVISION_REVIEW_NOT_FULL_M04",
        direction_anchor_count: directionRows.length,
        review_candidate_count: opaqueItems.length,
        major_revision_count: revisionRows.filter(
          (row) => row.action === "MAJOR_REVISION",
        ).length,
        new_candidate_count: revisionRows.filter(
          (row) => row.action === "RETIRE_NEW_CANDIDATE",
        ).length,
        retired_no_replacement_count: retiredItems.length,
        critical_decision_coverage: revisionRows.filter(
          (row) => row.critical_flag === "YES",
        ).length,
        seam_decision_coverage: revisionRows.filter(
          (row) => row.seam_flag === "YES",
        ).length,
        reviewer_count: reviewerSlots.length,
        unique_reviewer_order_count: reviewerOrderHashes.size,
        stage1_target_metadata_leak: false,
        packets: packetReports,
        status: "PASS",
      },
      null,
      2,
    )}\n`,
  );
  return files;
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? listFiles(absolute)
      : [path.relative(outputRoot, absolute)];
  });
}

function writeOrCheck(files) {
  const expected = new Set(files.keys());
  if (checkOnly) {
    const missing = [];
    const changed = [];
    for (const [relativePath, content] of files) {
      const absolute = path.join(outputRoot, relativePath);
      if (!fs.existsSync(absolute)) missing.push(relativePath);
      else if (fs.readFileSync(absolute, "utf8") !== content) {
        changed.push(relativePath);
      }
    }
    const unexpected = listFiles(outputRoot).filter(
      (file) => !expected.has(file),
    );
    invariant(missing.length === 0, `Missing files: ${missing.join(", ")}`);
    invariant(changed.length === 0, `Changed files: ${changed.join(", ")}`);
    invariant(
      unexpected.length === 0,
      `Unexpected files: ${unexpected.join(", ")}`,
    );
    return;
  }
  for (const [relativePath, content] of files) {
    const absolute = path.join(outputRoot, relativePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, "utf8");
  }
}

try {
  const files = buildFiles();
  writeOrCheck(files);
  process.stdout.write(
    `${checkOnly ? "Verified" : "Generated"} ${files.size} M04 v0.2 targeted files.\n`,
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
