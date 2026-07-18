import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const protocolVersion = "m04-core-expert-kit.v0.2-smrl-r3";
const reviewerSlots = ["R01", "R02", "R03", "R04", "R05", "R06"];
const reviewRoot = path.join(
  projectRoot,
  "docs/research/core-m04/v0.2/post-adjudication/internal-critique/v0.1",
);
const outputRoot = path.join(reviewRoot, "analysis");
const check = process.argv.includes("--check");

const validation = spawnSync(
  process.execPath,
  [
    path.join(projectRoot, "scripts/check-core-m04-v02-smrl-r3-stage2.mjs"),
    "--require-all",
    "--require-locked",
  ],
  { cwd: projectRoot, encoding: "utf8" },
);
if (validation.status !== 0) {
  process.stderr.write(validation.stderr || validation.stdout);
  process.exit(1);
}

if (
  !check &&
  fs.existsSync(outputRoot) &&
  fs.readdirSync(outputRoot).length > 0
) {
  throw new Error(`Analysis output already exists: ${outputRoot}`);
}

const stage1 = reviewerSlots.map((reviewerSlot) => ({
  reviewerSlot,
  ...readCsvObjects(
    path.join(reviewRoot, `stage1/${reviewerSlot}_stage1_response.csv`),
  )[0],
}));
const stage2 = reviewerSlots.map((reviewerSlot) => ({
  reviewerSlot,
  ...readCsvObjects(
    path.join(reviewRoot, `stage2/${reviewerSlot}_stage2_response.csv`),
  )[0],
}));
const targetCode = "SM_RL";
const keyedDirection = "HIGH";
const targetCount = stage1.filter(
  (row) => row.first_construct_mapping === targetCode,
).length;
const directionMatchCount = stage1.filter(
  (row) => row.direction_guess === keyedDirection,
).length;
const riskFlags = stage1.flatMap((row) =>
  row.risk_flags === "NONE" ? [] : row.risk_flags.split(";"),
);
const accessRiskReviewerCount = new Set(
  stage1
    .filter((row) =>
      row.risk_flags
        .split(";")
        .some((risk) =>
          new Set([
            "ACCESS",
            "EDUCATION",
            "OCCUPATION",
            "RELATIONSHIP_STATUS",
            "DIGITAL_ACCESS",
            "CULTURAL_ROLE",
          ]).has(risk),
        ),
    )
    .map((row) => row.reviewerSlot),
).size;

const metricsBase = {
  opaque_item_id: "NX3-001",
  revision_candidate_id: "SMRL-C11-r3",
  target_facet: "SM-RL",
  keyed_direction: keyedDirection,
  expert_count: reviewerSlots.length,
  target_first_mapping_count: targetCount,
  target_mapping_rate: ratio(targetCount, reviewerSlots.length),
  direction_match_count: directionMatchCount,
  direction_match_rate: ratio(directionMatchCount, reviewerSlots.length),
  relevance_median: median(
    stage2.map((row) => Number(row.target_relevance_rating_1_4)),
  ),
  direction_fit_median: median(
    stage2.map((row) => Number(row.key_direction_fit_rating_1_4)),
  ),
  clarity_median: median(stage1.map((row) => Number(row.clarity_rating_1_4))),
  single_response_median: median(
    stage1.map((row) => Number(row.single_response_rating_1_4)),
  ),
  universality_median: median(
    stage1.map((row) => Number(row.universality_rating_1_4)),
  ),
  scale_fit_median: median(
    stage1.map((row) => Number(row.scale_fit_rating_1_4)),
  ),
  adjacent_separation_median: median(
    stage2.map((row) => Number(row.adjacent_separation_rating_1_4)),
  ),
  important_coverage_count: stage2.filter(
    (row) => row.coverage_contribution_rating === "IMPORTANT",
  ).length,
  access_risk_reviewer_count: accessRiskReviewerCount,
  fatal_risk_count: stage1.filter(
    (row) => row.fatal_risk_note.trim().toUpperCase() !== "NONE",
  ).length,
  first_mapping_counts: stableJson(
    countBy(stage1, (row) => row.first_construct_mapping),
  ),
  second_mapping_counts: stableJson(
    countBy(stage1, (row) => row.second_construct_mapping),
  ),
  risk_flag_counts: stableJson(countBy(riskFlags, (risk) => risk)),
  stage2_recommendation_counts: stableJson(
    countBy(stage2, (row) => row.recommendation),
  ),
};
const itemMetrics = [
  { ...metricsBase, automated_triage: proposeDecision(metricsBase) },
];
const qualitativeEvidence = reviewerSlots.map((reviewerSlot) => {
  const blind = stage1.find((row) => row.reviewerSlot === reviewerSlot);
  const revealed = stage2.find((row) => row.reviewerSlot === reviewerSlot);
  return {
    reviewer_slot: reviewerSlot,
    first_construct_mapping: blind.first_construct_mapping,
    second_construct_mapping: blind.second_construct_mapping,
    direction_guess: blind.direction_guess,
    clarity_rating_1_4: blind.clarity_rating_1_4,
    single_response_rating_1_4: blind.single_response_rating_1_4,
    universality_rating_1_4: blind.universality_rating_1_4,
    scale_fit_rating_1_4: blind.scale_fit_rating_1_4,
    risk_flags: blind.risk_flags,
    fatal_risk_note: blind.fatal_risk_note,
    stage1_notes: blind.stage1_notes,
    target_relevance_rating_1_4: revealed.target_relevance_rating_1_4,
    key_direction_fit_rating_1_4: revealed.key_direction_fit_rating_1_4,
    coverage_contribution_rating: revealed.coverage_contribution_rating,
    adjacent_separation_rating_1_4: revealed.adjacent_separation_rating_1_4,
    recommendation: revealed.recommendation,
    final_rationale: revealed.final_rationale,
  };
});
const summary = {
  protocol_version: protocolVersion,
  analysis_status: "INTERNAL_AGGREGATION_COMPLETE_NOT_EXTERNAL_VALIDATION",
  reviewer_count: reviewerSlots.length,
  candidate_count: 1,
  stage1_response_rows: stage1.length,
  stage2_response_rows: stage2.length,
  automated_triage: itemMetrics[0].automated_triage,
  fatal_risk_count: itemMetrics[0].fatal_risk_count,
  warning:
    "This is an internal AI critique aggregation, not external expert validation, user evidence, or production approval.",
};
const outputs = new Map([
  ["analysis_summary.json", `${JSON.stringify(summary, null, 2)}\n`],
  ["item_metrics.csv", serializeCsv(itemMetrics)],
  ["qualitative_evidence.csv", serializeCsv(qualitativeEvidence)],
]);

if (check) {
  for (const [filename, expected] of outputs) {
    const filePath = path.join(outputRoot, filename);
    if (!fs.existsSync(filePath))
      throw new Error(`Missing analysis: ${filePath}`);
    if (fs.readFileSync(filePath, "utf8") !== expected) {
      throw new Error(`Analysis drift: ${filePath}`);
    }
  }
} else {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const [filename, content] of outputs) {
    fs.writeFileSync(path.join(outputRoot, filename), content, "utf8");
  }
}

console.log(
  JSON.stringify(
    { ...summary, mode: check ? "check" : "write", status: "PASS" },
    null,
    2,
  ),
);

function proposeDecision(metrics) {
  if (metrics.fatal_risk_count > 0) return "HOLD_FOR_RISK_REVIEW";
  if (metrics.target_mapping_rate < 0.5 || metrics.relevance_median < 2) {
    return "EXCLUDE_OR_REBUILD";
  }
  if (metrics.target_mapping_rate < 0.75 || metrics.relevance_median < 3) {
    return "CONSTRUCT_REWRITE";
  }
  if (
    metrics.access_risk_reviewer_count >= Math.ceil(metrics.expert_count * 0.3)
  ) {
    return "HOLD_FOR_ACCESS";
  }
  if (
    metrics.direction_match_rate < 0.75 ||
    metrics.direction_fit_median < 3 ||
    metrics.clarity_median < 3 ||
    metrics.single_response_median < 3 ||
    metrics.universality_median < 3 ||
    metrics.scale_fit_median < 3 ||
    metrics.adjacent_separation_median < 3
  ) {
    return "COPY_REVISE";
  }
  return "PASS_TO_COGNITIVE";
}

function readCsvObjects(filePath) {
  const [header, ...rows] = parseCsv(fs.readFileSync(filePath, "utf8"));
  return rows
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

function serializeCsv(rows) {
  const columns = Object.keys(rows[0] ?? {});
  return `${[
    columns,
    ...rows.map((row) => columns.map((column) => row[column] ?? "")),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n")}\n`;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function ratio(numerator, denominator) {
  return Number((numerator / denominator).toFixed(4));
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function countBy(values, selector) {
  const counts = {};
  for (const value of values) {
    const key = selector(value);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function stableJson(value) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(value).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  );
}
