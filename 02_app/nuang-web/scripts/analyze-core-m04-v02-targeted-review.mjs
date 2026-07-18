import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const protocolVersion = "m04-core-expert-kit.v0.2-targeted";
const reviewerSlots = ["R01", "R02", "R03", "R04", "R05", "R06"];
const reviewRoot = path.join(
  projectRoot,
  "docs/research/core-m04/v0.2/internal-critique/v0.1",
);
const generatedRoot = path.join(
  projectRoot,
  "docs/research/core-m04/v0.2/generated",
);
const outputRoot = path.join(reviewRoot, "analysis");
const check = process.argv.includes("--check");
const accessRiskFlags = new Set([
  "ACCESS",
  "EDUCATION",
  "OCCUPATION",
  "RELATIONSHIP_STATUS",
  "DIGITAL_ACCESS",
  "CULTURAL_ROLE",
]);

const validation = spawnSync(
  process.execPath,
  [
    path.join(projectRoot, "scripts/check-core-m04-v02-targeted-stage2.mjs"),
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
  console.error(`Analysis output already exists: ${outputRoot}`);
  process.exit(1);
}

const mapping = readCsvObjects(
  path.join(generatedRoot, "internal/opaque_item_mapping.csv"),
);
const roster = readCsvObjects(path.join(reviewRoot, "reviewer_roster.csv"));
const stage1ByItem = new Map(mapping.map((item) => [item.opaque_item_id, []]));
const stage2ByItem = new Map(mapping.map((item) => [item.opaque_item_id, []]));

for (const reviewerSlot of reviewerSlots) {
  const stage1 = readCsvObjects(
    path.join(reviewRoot, `stage1/${reviewerSlot}_stage1_response.csv`),
  );
  const stage2 = readCsvObjects(
    path.join(reviewRoot, `stage2/${reviewerSlot}_stage2_response.csv`),
  );
  for (const row of stage1) {
    stage1ByItem.get(row.opaque_item_id)?.push({ reviewerSlot, ...row });
  }
  for (const row of stage2) {
    stage2ByItem.get(row.opaque_item_id)?.push({ reviewerSlot, ...row });
  }
}

const itemMetrics = mapping
  .map(buildItemMetrics)
  .sort((left, right) =>
    left.opaque_item_id.localeCompare(right.opaque_item_id),
  );
const qualitativeEvidence = buildQualitativeEvidence();
const reviewerInclusion = roster.map((row) => ({
  reviewer_slot: row.reviewer_slot,
  role_codes: row.role_codes,
  roster_status: row.status,
  included_in_analysis: row.status === "STAGE2_LOCKED" ? "YES" : "NO",
  conflict_disclosure_status: row.conflict_disclosure_status,
  stage1_locked_at: row.stage1_locked_at,
  stage2_locked_at: row.stage2_locked_at,
}));
const summary = {
  protocol_version: protocolVersion,
  analysis_status: "INTERNAL_AGGREGATION_COMPLETE_NOT_EXTERNAL_VALIDATION",
  reviewer_count: reviewerSlots.length,
  candidate_count: mapping.length,
  stage1_response_rows: qualitativeEvidence.length,
  stage2_response_rows: qualitativeEvidence.length,
  proposed_decision_counts: countBy(
    itemMetrics,
    (row) => row.proposed_decision,
  ),
  fatal_risk_item_count: itemMetrics.filter((row) => row.fatal_risk_count > 0)
    .length,
  seam_flag_item_count: itemMetrics.filter(
    (row) => row.same_non_target_30pct_flag === "YES",
  ).length,
  warning:
    "This is an internal AI critique aggregation. Proposed decisions are triage suggestions, not external validity evidence or production approval.",
};

const generatedOutputs = new Map([
  ["analysis_summary.json", serializeJson(summary)],
  ["item_metrics.csv", serializeCsv(itemMetrics)],
  ["qualitative_evidence.csv", serializeCsv(qualitativeEvidence)],
  ["reviewer_inclusion.csv", serializeCsv(reviewerInclusion)],
]);

if (check) {
  for (const [filename, expected] of generatedOutputs) {
    const filePath = path.join(outputRoot, filename);
    if (!fs.existsSync(filePath))
      throw new Error(`Missing analysis: ${filePath}`);
    if (fs.readFileSync(filePath, "utf8") !== expected) {
      throw new Error(`Analysis drift: ${filePath}`);
    }
  }
} else {
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const [filename, content] of generatedOutputs) {
    fs.writeFileSync(path.join(outputRoot, filename), content, "utf8");
  }
}

console.log(
  JSON.stringify(
    { ...summary, output_root: outputRoot, status: "PASS" },
    null,
    2,
  ),
);

function buildItemMetrics(item) {
  const stage1 = stage1ByItem.get(item.opaque_item_id) ?? [];
  const stage2 = stage2ByItem.get(item.opaque_item_id) ?? [];
  if (
    stage1.length !== reviewerSlots.length ||
    stage2.length !== reviewerSlots.length
  ) {
    throw new Error(
      `${item.opaque_item_id}: expected ${reviewerSlots.length} Stage 1/2 responses, found ${stage1.length}/${stage2.length}`,
    );
  }

  const targetCode = item.target_facet.replaceAll("-", "_");
  const targetCount = stage1.filter(
    (row) => row.first_construct_mapping === targetCode,
  ).length;
  const directionMatchCount = stage1.filter(
    (row) => row.direction_guess === item.keyed_direction,
  ).length;
  const nonTargetCounts = countBy(
    stage1.filter((row) => row.first_construct_mapping !== targetCode),
    (row) => row.first_construct_mapping,
  );
  const [dominantNonTarget = "", dominantNonTargetCount = 0] =
    Object.entries(nonTargetCounts).sort(
      (left, right) => right[1] - left[1],
    )[0] ?? [];
  const allRiskFlags = stage1.flatMap((row) =>
    row.risk_flags === "NONE" ? [] : row.risk_flags.split(";"),
  );
  const accessRiskReviewerCount = new Set(
    stage1
      .filter((row) =>
        row.risk_flags.split(";").some((risk) => accessRiskFlags.has(risk)),
      )
      .map((row) => row.reviewerSlot),
  ).size;
  const recommendationCounts = countBy(stage2, (row) => row.recommendation);
  const metrics = {
    opaque_item_id: item.opaque_item_id,
    source_candidate_id: item.source_candidate_id,
    revision_candidate_id: item.revision_candidate_id,
    target_facet: item.target_facet,
    keyed_direction: item.keyed_direction,
    critical_flag: item.critical_flag,
    seam_flag: item.seam_flag,
    expert_count: stage1.length,
    target_first_mapping_count: targetCount,
    target_mapping_rate: ratio(targetCount, stage1.length),
    dominant_non_target_mapping: dominantNonTarget,
    dominant_non_target_count: dominantNonTargetCount,
    same_non_target_30pct_flag:
      dominantNonTargetCount >= Math.ceil(stage1.length * 0.3) ? "YES" : "NO",
    direction_match_count: directionMatchCount,
    direction_match_rate: ratio(directionMatchCount, stage1.length),
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
    risk_flag_counts: stableJson(countBy(allRiskFlags, (risk) => risk)),
    stage2_recommendation_counts: stableJson(recommendationCounts),
  };
  return { ...metrics, proposed_decision: proposeDecision(metrics) };
}

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

function buildQualitativeEvidence() {
  return mapping
    .flatMap((item) => {
      const stage2ByReviewer = new Map(
        (stage2ByItem.get(item.opaque_item_id) ?? []).map((row) => [
          row.reviewerSlot,
          row,
        ]),
      );
      return (stage1ByItem.get(item.opaque_item_id) ?? []).map((stage1) => {
        const stage2 = stage2ByReviewer.get(stage1.reviewerSlot);
        return {
          opaque_item_id: item.opaque_item_id,
          revision_candidate_id: item.revision_candidate_id,
          reviewer_slot: stage1.reviewerSlot,
          first_construct_mapping: stage1.first_construct_mapping,
          second_construct_mapping: stage1.second_construct_mapping,
          direction_guess: stage1.direction_guess,
          risk_flags: stage1.risk_flags,
          fatal_risk_note: stage1.fatal_risk_note,
          stage1_notes: stage1.stage1_notes,
          recommendation: stage2?.recommendation ?? "",
          final_rationale: stage2?.final_rationale ?? "",
        };
      });
    })
    .sort((left, right) =>
      `${left.opaque_item_id}-${left.reviewer_slot}`.localeCompare(
        `${right.opaque_item_id}-${right.reviewer_slot}`,
      ),
    );
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
  const content = [
    columns,
    ...rows.map((row) => columns.map((column) => row[column] ?? "")),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  return `${content}\n`;
}

function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return 0;
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
