import { spawnSync } from "node:child_process";
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
const waveIds = ["W1", "W2", "W3"];
const minimumReviewers = 6;
const accessRiskFlags = new Set([
  "ACCESS",
  "EDUCATION",
  "OCCUPATION",
  "RELATIONSHIP_STATUS",
  "DIGITAL_ACCESS",
  "CULTURAL_ROLE",
]);

const intakeRoot = resolveArgument("--intake-root");
const outputRoot = resolveArgument("--output-root");
const allowIncompletePreview = process.argv.includes(
  "--allow-incomplete-preview",
);
const force = process.argv.includes("--force");

if (!intakeRoot || !outputRoot) {
  console.error(
    "Usage: node scripts/analyze-core-expert-review.mjs --intake-root <path> --output-root <new-path> [--allow-incomplete-preview] [--force]",
  );
  process.exit(1);
}

const validation = spawnSync(
  process.execPath,
  [
    path.join(scriptDir, "check-core-expert-review-intake.mjs"),
    "--intake-root",
    intakeRoot,
  ],
  { cwd: projectRoot, encoding: "utf8" },
);
if (validation.status !== 0) {
  process.stderr.write(validation.stderr || validation.stdout);
  process.exit(1);
}

if (isNonEmptyDirectory(outputRoot) && !force) {
  console.error(
    `Output folder is not empty: ${outputRoot}. Use a new versioned folder or pass --force.`,
  );
  process.exit(1);
}
if (path.resolve(outputRoot).startsWith(path.resolve(generatedRoot))) {
  console.error("Analysis output must not overwrite the generated packet kit.");
  process.exit(1);
}

const roster = readCsvObjects(path.join(intakeRoot, "reviewer_roster.csv"));
const completeSlots = roster
  .filter((row) => row.status === "COMPLETE")
  .map((row) => row.reviewer_slot)
  .sort();
const completeRosterRows = roster.filter((row) =>
  completeSlots.includes(row.reviewer_slot),
);
const roleCoverage = {
  psychometric: countYes(completeRosterRows, "psychometric_coverage"),
  personality: countYes(completeRosterRows, "personality_coverage"),
  korean_item: countYes(completeRosterRows, "korean_item_coverage"),
  ux_2030: countYes(completeRosterRows, "ux_2030_coverage"),
  accessibility_or_bias: countYes(
    completeRosterRows,
    "accessibility_or_bias_coverage",
  ),
};

if (completeSlots.length < minimumReviewers && !allowIncompletePreview) {
  console.error(
    `At least ${minimumReviewers} COMPLETE reviewers are required; found ${completeSlots.length}.`,
  );
  process.exit(1);
}
if (completeSlots.length === 0) {
  console.error("No COMPLETE reviewer is available for analysis.");
  process.exit(1);
}
const roleGatePassed =
  roleCoverage.psychometric >= 2 &&
  roleCoverage.personality >= 1 &&
  roleCoverage.korean_item >= 1 &&
  roleCoverage.ux_2030 >= 1 &&
  roleCoverage.accessibility_or_bias >= 1;
if (!roleGatePassed && !allowIncompletePreview) {
  console.error(
    `Reviewer role coverage gate failed: ${JSON.stringify(roleCoverage)}`,
  );
  process.exit(1);
}

const mapping = readCsvObjects(
  path.join(generatedRoot, "internal", "opaque_item_mapping.csv"),
);
const stage1ByItem = new Map(mapping.map((row) => [row.opaque_item_id, []]));
const stage2ByItem = new Map(mapping.map((row) => [row.opaque_item_id, []]));

for (const reviewerSlot of completeSlots) {
  for (const waveId of waveIds) {
    const stage1Rows = readCsvObjects(
      path.join(
        intakeRoot,
        "stage1",
        `${reviewerSlot}_${waveId}_stage1_response.csv`,
      ),
    );
    const stage2Rows = readCsvObjects(
      path.join(
        intakeRoot,
        "stage2",
        `${reviewerSlot}_${waveId}_stage2_response.csv`,
      ),
    );
    for (const row of stage1Rows) {
      stage1ByItem.get(row.opaque_item_id)?.push({ reviewerSlot, ...row });
    }
    for (const row of stage2Rows) {
      stage2ByItem.get(row.opaque_item_id)?.push({ reviewerSlot, ...row });
    }
  }
}

const itemMetrics = mapping
  .map((item) => buildItemMetrics(item))
  .sort((left, right) => left.candidate_id.localeCompare(right.candidate_id));
const confusionRows = buildConfusionMatrix(itemMetrics);
const qualitativeRows = buildQualitativeEvidence();
const reviewerRows = roster.map((row) => ({
  reviewer_slot: row.reviewer_slot,
  roster_status: row.status,
  included_in_analysis: completeSlots.includes(row.reviewer_slot)
    ? "YES"
    : "NO",
  role_codes: row.role_codes,
  conflict_disclosure_status: row.conflict_disclosure_status,
  all_stage1_locked_at: row.all_stage1_locked_at,
  all_stage2_locked_at: row.all_stage2_locked_at,
}));

const decisionCounts = countBy(itemMetrics, (row) => row.proposed_decision);
const stage1ResponseRows = itemMetrics.reduce(
  (total, row) => total + row.stage1_response_count,
  0,
);
const stage2ResponseRows = itemMetrics.reduce(
  (total, row) => total + row.stage2_response_count,
  0,
);
const summary = {
  protocol_version: protocolVersion,
  analysis_status: allowIncompletePreview
    ? "INCOMPLETE_INTERNAL_PREVIEW_NOT_FOR_ADJUDICATION"
    : "READY_FOR_HUMAN_ADJUDICATION_NOT_FINAL",
  reviewer_count: completeSlots.length,
  minimum_reviewer_gate: minimumReviewers,
  reviewer_role_coverage: roleCoverage,
  reviewer_role_gate_passed: roleGatePassed,
  candidate_count: itemMetrics.length,
  stage1_response_rows: stage1ResponseRows,
  stage2_response_rows: stage2ResponseRows,
  total_stage_response_rows: stage1ResponseRows + stage2ResponseRows,
  proposed_decision_counts: decisionCounts,
  fatal_risk_item_count: itemMetrics.filter((row) => row.fatal_risk_count > 0)
    .length,
  seam_flag_item_count: itemMetrics.filter(
    (row) => row.same_non_target_30pct_flag === "YES",
  ).length,
  warning:
    "Automated decisions are preregistered triage suggestions. Final item decisions require adjudication, dissent preservation, and owner sign-off.",
};

fs.mkdirSync(outputRoot, { recursive: true });
writeJson(path.join(outputRoot, "analysis_summary.json"), summary);
writeCsv(path.join(outputRoot, "item_metrics.csv"), itemMetrics);
writeCsv(path.join(outputRoot, "mapping_confusion_matrix.csv"), confusionRows);
writeCsv(path.join(outputRoot, "qualitative_evidence.csv"), qualitativeRows);
writeCsv(path.join(outputRoot, "reviewer_inclusion.csv"), reviewerRows);

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
    stage1.length !== completeSlots.length ||
    stage2.length !== completeSlots.length
  ) {
    throw new Error(
      `${item.opaque_item_id}: expected ${completeSlots.length} complete Stage 1/2 responses, found ${stage1.length}/${stage2.length}`,
    );
  }

  const targetCount = stage1.filter(
    (row) =>
      normalizeConstructCode(row.first_construct_mapping) === item.target_facet,
  ).length;
  const directionMatchCount = stage1.filter(
    (row) => row.direction_guess === item.keyed_direction,
  ).length;
  const nonTargetCounts = countBy(
    stage1.filter(
      (row) =>
        normalizeConstructCode(row.first_construct_mapping) !==
        item.target_facet,
    ),
    (row) => row.first_construct_mapping,
  );
  const [dominantNonTarget = "", dominantNonTargetCount = 0] = Object.entries(
    nonTargetCounts,
  ).sort((left, right) => right[1] - left[1])[0] ?? ["", 0];
  const fatalRiskCount = stage1.filter(
    (row) => row.fatal_risk_note.trim().toUpperCase() !== "NONE",
  ).length;
  const allRiskFlags = stage1.flatMap((row) =>
    row.risk_flags === "NONE" ? [] : row.risk_flags.split(";"),
  );
  const riskCounts = countBy(allRiskFlags, (flag) => flag);
  const accessRiskReviewerCount = new Set(
    stage1
      .filter((row) =>
        row.risk_flags.split(";").some((flag) => accessRiskFlags.has(flag)),
      )
      .map((row) => row.reviewerSlot),
  ).size;
  const metrics = {
    candidate_id: item.candidate_id,
    opaque_item_id: item.opaque_item_id,
    target_domain: item.target_domain,
    target_facet: item.target_facet,
    keyed_direction: item.keyed_direction,
    evidence_role: item.evidence_role,
    expert_count: stage1.length,
    stage1_response_count: stage1.length,
    stage2_response_count: stage2.length,
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
    access_risk_reviewer_count: accessRiskReviewerCount,
    fatal_risk_count: fatalRiskCount,
    risk_flag_counts: stableJson(riskCounts),
    stage2_recommendation_counts: stableJson(
      countBy(stage2, (row) => row.recommendation),
    ),
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

function buildConfusionMatrix(itemRows) {
  const facets = [...new Set(mapping.map((row) => row.target_facet))].sort();
  const mappingValues = [
    ...facets.map((facet) => facet.replaceAll("-", "_")),
    "METHOD",
    "NONE",
  ];
  return facets.map((targetFacet) => {
    const targetItems = itemRows.filter(
      (row) => row.target_facet === targetFacet,
    );
    const responses = targetItems.flatMap(
      (item) => stage1ByItem.get(item.opaque_item_id) ?? [],
    );
    return Object.fromEntries([
      ["target_facet", targetFacet],
      ...mappingValues.map((mappingValue) => [
        `${mappingValue}_count`,
        responses.filter((row) => row.first_construct_mapping === mappingValue)
          .length,
      ]),
      ["total", responses.length],
    ]);
  });
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
          candidate_id: item.candidate_id,
          opaque_item_id: item.opaque_item_id,
          target_facet: item.target_facet,
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
      `${left.candidate_id}-${left.reviewer_slot}`.localeCompare(
        `${right.candidate_id}-${right.reviewer_slot}`,
      ),
    );
}

function resolveArgument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) return null;
  return path.resolve(projectRoot, process.argv[index + 1]);
}

function isNonEmptyDirectory(directory) {
  return fs.existsSync(directory) && fs.readdirSync(directory).length > 0;
}

function readCsvObjects(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing CSV: ${filePath}`);
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
  return rows;
}

function writeCsv(filePath, rows) {
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const content = [
    columns,
    ...rows.map((row) => columns.map((column) => row[column] ?? "")),
  ]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");
  fs.writeFileSync(filePath, `${content}\n`, "utf8");
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
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

function countYes(rows, column) {
  return rows.filter((row) => row[column] === "YES").length;
}

function normalizeConstructCode(value) {
  return value === "METHOD" || value === "NONE"
    ? value
    : value.replaceAll("_", "-");
}
