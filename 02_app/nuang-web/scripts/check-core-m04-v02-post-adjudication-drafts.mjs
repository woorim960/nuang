import fs from "node:fs";
import path from "node:path";

const draftPath = path.join(
  process.cwd(),
  "docs/research/core-m04/v0.2/05_POST_ADJUDICATION_ITEM_DRAFTS.csv",
);
const expected = new Map([
  [
    "NV2-001",
    [
      "SMRL-C11-r2",
      "SMRL-C11-r3",
      "MAJOR",
      "SM-RL",
      "HIGH",
      "LIMITED_M04_THEN_M05",
    ],
  ],
  [
    "NV2-003",
    ["ERWD-C06-r2", "ERWD-C06-r3", "MINOR", "ER-WD", "LOW", "M05_COGNITIVE"],
  ],
  [
    "NV2-005",
    [
      "RORN-P05-B-r2",
      "RORN-P05-B-r3",
      "MINOR",
      "RO-RN",
      "LOW",
      "M05_COGNITIVE",
    ],
  ],
  [
    "NV2-006",
    ["SMOS-C08-r2", "SMOS-C08-r3", "MINOR", "SM-OS", "LOW", "M05_COGNITIVE"],
  ],
  [
    "NV2-008",
    ["OEIE-C09-r2", "OEIE-C09-r3", "MINOR", "OE-IE", "HIGH", "M05_COGNITIVE"],
  ],
]);

const rows = readCsvObjects(draftPath);
if (rows.length !== expected.size) {
  throw new Error(`Expected ${expected.size} drafts, found ${rows.length}`);
}
if (
  new Set(rows.map((row) => row.source_opaque_item_id)).size !== rows.length
) {
  throw new Error("Duplicate source_opaque_item_id");
}
if (
  new Set(rows.map((row) => row.next_revision_candidate_id)).size !==
  rows.length
) {
  throw new Error("Duplicate next_revision_candidate_id");
}

for (const row of rows) {
  const contract = expected.get(row.source_opaque_item_id);
  if (!contract)
    throw new Error(`Unexpected source: ${row.source_opaque_item_id}`);
  const actual = [
    row.source_revision_candidate_id,
    row.next_revision_candidate_id,
    row.revision_level,
    row.target_facet,
    row.keyed_direction,
    row.required_next_gate,
  ];
  if (actual.join("|") !== contract.join("|")) {
    throw new Error(`${row.source_opaque_item_id}: lineage contract mismatch`);
  }
  if (
    row.protocol_version !== "m04-core-expert-kit.v0.2-post-adjudication" ||
    row.status !== "DRAFT_NOT_REVIEWED"
  ) {
    throw new Error(`${row.source_opaque_item_id}: invalid protocol/status`);
  }
  for (const column of [
    "draft_context_label",
    "draft_prompt_text",
    "primary_issue_removed",
    "residual_risk",
  ]) {
    if (!row[column]?.trim()) {
      throw new Error(`${row.source_opaque_item_id}: empty ${column}`);
    }
  }
  if (
    row.draft_context_label.length > 45 ||
    row.draft_prompt_text.length > 55
  ) {
    throw new Error(
      `${row.source_opaque_item_id}: mobile copy length exceeded`,
    );
  }
}

const bySource = new Map(rows.map((row) => [row.source_opaque_item_id, row]));
const smrl = bySource.get("NV2-001");
if (`${smrl.draft_context_label}${smrl.draft_prompt_text}`.includes("알림")) {
  throw new Error("NV2-001: memory aid condition returned");
}
const erwd = bySource.get("NV2-003");
if (
  erwd.draft_prompt_text.includes("반복되지는 않는다") ||
  !erwd.draft_prompt_text.includes("마무리한다")
) {
  throw new Error("NV2-003: action boundary or negation fix missing");
}
const rorn = bySource.get("NV2-005");
if (!rorn.draft_context_label.includes("각자 다르게 골라도")) {
  throw new Error("NV2-005: independent choice condition missing");
}
const smos = bySource.get("NV2-006");
if (
  !smos.draft_context_label.includes("시간을 자유롭게 정할 수") ||
  smos.draft_prompt_text.includes("시작")
) {
  throw new Error("NV2-006: schedule autonomy or start-behavior fix missing");
}
const oeie = bySource.get("NV2-008");
if (
  !oeie.draft_context_label.includes("이해한 뒤") ||
  !oeie.draft_prompt_text.includes("더 알아본다")
) {
  throw new Error("NV2-008: post-understanding exploration fix missing");
}

console.log(
  JSON.stringify({ drafts_checked: rows.length, status: "PASS" }, null, 2),
);

function readCsvObjects(filePath) {
  const [header, ...data] = parseCsv(fs.readFileSync(filePath, "utf8"));
  return data
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) =>
      Object.fromEntries(
        header.map((column, index) => [column, row[index] ?? ""]),
      ),
    );
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
