import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const outputRoot = path.join(
  projectRoot,
  "docs/research/core-m04/v0.2/post-adjudication/generated",
);
const reviewerSlots = ["R01", "R02", "R03", "R04", "R05", "R06", "R07", "R08"];

const generationCheck = spawnSync(
  process.execPath,
  [
    path.join(
      projectRoot,
      "scripts/generate-core-m04-v02-post-adjudication-kits.mjs",
    ),
    "--check",
  ],
  { cwd: projectRoot, encoding: "utf8" },
);
if (generationCheck.status !== 0) {
  process.stderr.write(generationCheck.stderr || generationCheck.stdout);
  process.exit(1);
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(outputRoot, "packet_manifest.json"), "utf8"),
);
if (
  manifest.status !== "PREPARED_NOT_RUN_NOT_EXTERNAL_VALIDATION" ||
  manifest.m04_candidate_count !== 1 ||
  manifest.m04_reviewer_packet_count !== reviewerSlots.length ||
  manifest.m05_protocol_version !==
    "m05-core-cognitive-kit.v0.2-targeted-remediation-smrl" ||
  manifest.m05_candidate_count !== 5
) {
  throw new Error("Manifest scope/status mismatch");
}
for (const entry of manifest.files) {
  const filePath = path.join(outputRoot, entry.file);
  if (!fs.existsSync(filePath))
    throw new Error(`Missing manifest file: ${entry.file}`);
  if (sha256File(filePath) !== entry.sha256) {
    throw new Error(`Manifest hash mismatch: ${entry.file}`);
  }
}

const lockRows = readCsvObjects(
  path.join(outputRoot, "m04/internal/packet_lock_log.csv"),
);
if (lockRows.length !== reviewerSlots.length) {
  throw new Error("M04 lock log reviewer count mismatch");
}
for (const reviewerSlot of reviewerSlots) {
  const stage1Path = path.join(
    outputRoot,
    `m04/reviewer/${reviewerSlot}_stage1_blind.csv`,
  );
  const stage2Path = path.join(
    outputRoot,
    `m04/internal/DO_NOT_RELEASE_UNTIL_STAGE1_LOCKED_${reviewerSlot}_stage2_target_reveal.csv`,
  );
  const stage1 = readCsv(stage1Path);
  const stage2 = readCsv(stage2Path);
  if (stage1.rows.length !== 1 || stage2.rows.length !== 1) {
    throw new Error(`${reviewerSlot}: expected one M04 item`);
  }
  for (const forbiddenColumn of [
    "target_facet",
    "keyed_direction",
    "source_candidate_id",
    "revision_candidate_id",
  ]) {
    if (stage1.header.includes(forbiddenColumn)) {
      throw new Error(`${reviewerSlot}: Stage 1 target leak in header`);
    }
  }
  const stage1Text = fs.readFileSync(stage1Path, "utf8");
  if (/SM-RL|SMRL-C11|\bHIGH\b/.test(stage1Text)) {
    throw new Error(`${reviewerSlot}: Stage 1 target leak in content`);
  }
  const first = stage1.objects[0];
  const second = stage2.objects[0];
  for (const column of [
    "reviewer_slot",
    "sequence",
    "opaque_item_id",
    "context_label",
    "prompt_text",
  ]) {
    if (first[column] !== second[column]) {
      throw new Error(`${reviewerSlot}: Stage 1/2 metadata mismatch`);
    }
  }
  if (
    second.target_facet !== "SM-RL" ||
    second.keyed_direction !== "HIGH" ||
    second.revision_candidate_id !== "SMRL-C11-r3"
  ) {
    throw new Error(`${reviewerSlot}: Stage 2 target contract mismatch`);
  }
  const lock = lockRows.find((row) => row.reviewer_slot === reviewerSlot);
  if (
    !lock ||
    lock.stage1_packet_sha256 !== sha256File(stage1Path) ||
    lock.stage2_packet_sha256 !== sha256File(stage2Path) ||
    lock.stage2_released_at
  ) {
    throw new Error(`${reviewerSlot}: packet lock contract mismatch`);
  }
}

const m05Form = readCsv(
  path.join(outputRoot, "m05/reviewer/01_TARGETED_ITEM_FORM.csv"),
);
if (m05Form.rows.length !== 5) throw new Error("Expected five M05 items");
for (const forbiddenColumn of [
  "target_facet",
  "keyed_direction",
  "item_revision_id",
]) {
  if (m05Form.header.includes(forbiddenColumn)) {
    throw new Error(`M05 natural-response target leak: ${forbiddenColumn}`);
  }
}
const opaqueIds = m05Form.objects.map((row) => row.opaque_item_id);
if (
  new Set(opaqueIds).size !== 5 ||
  opaqueIds.some((id) => !/^CIT-\d{3}$/.test(id))
) {
  throw new Error("M05 opaque item IDs are invalid");
}
const m05FormText = fs.readFileSync(
  path.join(outputRoot, "m05/reviewer/01_TARGETED_ITEM_FORM.csv"),
  "utf8",
);
if (/SM-RL|SMRL-C11|\bHIGH\b/.test(m05FormText)) {
  throw new Error("M05 natural-response target leak in content");
}
const m05Json = JSON.parse(
  fs.readFileSync(
    path.join(outputRoot, "m05/reviewer/02_TARGETED_ITEM_FORM.json"),
    "utf8",
  ),
);
if (
  m05Json.protocolVersion !== manifest.m05_protocol_version ||
  m05Json.formId !== "M05-TARGETED-R2-A" ||
  m05Json.responseFormatId !== "FREQUENCY_5_WITH_UNSURE_V1" ||
  m05Json.items?.length !== 5
) {
  throw new Error("M05 participant JSON contract mismatch");
}
for (const [index, item] of m05Form.objects.entries()) {
  const jsonItem = m05Json.items[index];
  if (
    jsonItem.opaqueItemId !== item.opaque_item_id ||
    jsonItem.orderIndex !== Number(item.order_index) ||
    jsonItem.contextLabel !== item.context_label ||
    jsonItem.promptText !== item.prompt_text ||
    Object.keys(jsonItem).sort().join("|") !==
      "contextLabel|opaqueItemId|orderIndex|promptText"
  ) {
    throw new Error(`${item.opaque_item_id}: participant JSON drift`);
  }
}
if (
  /SM-RL|SMRL-C11|\bHIGH\b|targetFacet|keyedDirection|probe/.test(
    JSON.stringify(m05Json),
  )
) {
  throw new Error("M05 participant JSON target or probe leak");
}

const m05Mapping = readCsvObjects(
  path.join(outputRoot, "m05/internal/01_OPAQUE_ITEM_MAPPING.csv"),
);
const m05Probes = readCsvObjects(
  path.join(outputRoot, "m05/internal/02_ITEM_MAPPING_AND_PROBES.csv"),
);
if (m05Mapping.length !== 5 || m05Probes.length !== 5) {
  throw new Error("M05 mapping/probe item count mismatch");
}

const smrlMapping = m05Mapping.find(
  (row) => row.item_revision_id === "SMRL-C11-r3",
);
const smrlProbe = m05Probes.find(
  (row) => row.item_revision_id === "SMRL-C11-r3",
);
if (
  !smrlMapping ||
  !smrlProbe ||
  smrlMapping.opaque_item_id !== "CIT-001" ||
  smrlMapping.target_facet !== "SM-RL" ||
  smrlMapping.keyed_direction !== "HIGH"
) {
  throw new Error("SMRL M05 target mapping is missing or invalid");
}
for (const column of [
  "seam_probe",
  "constraint_probe",
  "experience_probe",
  "desirability_probe",
  "wording_probe",
]) {
  if (!smrlProbe[column]?.trim()) {
    throw new Error(`SMRL M05 mandatory probe missing: ${column}`);
  }
}
for (const item of m05Form.objects) {
  const mapping = m05Mapping.find(
    (row) => row.opaque_item_id === item.opaque_item_id,
  );
  const probe = m05Probes.find(
    (row) => row.opaque_item_id === item.opaque_item_id,
  );
  if (!mapping || !probe)
    throw new Error(`${item.opaque_item_id}: missing internal mapping`);
  if (
    mapping.item_revision_id !== probe.item_revision_id ||
    mapping.target_facet !== probe.target_facet ||
    mapping.keyed_direction !== probe.keyed_direction ||
    item.context_label !== probe.context_label ||
    item.prompt_text !== probe.prompt_text
  ) {
    throw new Error(`${item.opaque_item_id}: M05 metadata mismatch`);
  }
  for (const column of [
    "comprehension_probe",
    "recall_probe",
    "judgment_probe",
    "desirability_probe",
    "access_probe",
    "pass_evidence",
  ]) {
    if (!probe[column]?.trim()) {
      throw new Error(`${item.opaque_item_id}: empty ${column}`);
    }
  }
}

const sessionLog = readCsv(
  path.join(outputRoot, "m05/internal/03_SESSION_LOG_TEMPLATE.csv"),
);
for (const requiredColumn of [
  "participant_id_pseudonymous",
  "opaque_item_id",
  "first_response_value",
  "first_difficult_reason",
  "paraphrase_summary",
  "issue_codes",
  "severity",
  "adjudicated_decision",
  "seam_probe_summary",
  "constraint_probe_summary",
  "experience_probe_summary",
  "wording_preference",
]) {
  if (!sessionLog.header.includes(requiredColumn)) {
    throw new Error(`M05 session log missing ${requiredColumn}`);
  }
}

const decisionTemplate = readCsv(
  path.join(outputRoot, "m05/internal/05_ITEM_DECISION_TEMPLATE.csv"),
);
if (decisionTemplate.rows.length !== 5) {
  throw new Error("M05 decision template item count mismatch");
}
for (const requiredColumn of [
  "mandatory_probe_completion",
  "mandatory_probe_evidence_summary",
]) {
  if (!decisionTemplate.header.includes(requiredColumn)) {
    throw new Error(`M05 decision template missing ${requiredColumn}`);
  }
}

console.log(
  JSON.stringify(
    {
      manifest_files_checked: manifest.files.length,
      m04_stage1_packets_checked: reviewerSlots.length,
      m04_stage2_packets_checked: reviewerSlots.length,
      m05_items_checked: m05Form.rows.length,
      status: "PASS",
    },
    null,
    2,
  ),
);

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
    rows: nonemptyRows,
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
