import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const mappingPath = path.join(
  projectRoot,
  "docs/research/core-m04/generated/internal/opaque_item_mapping.csv",
);
const metricsPath = path.join(
  projectRoot,
  "docs/research/core-m04/internal-critique/v0.1/analysis/item_metrics.csv",
);
const outputPath = path.join(
  projectRoot,
  "content-seed/items/core-beta-item-set.v1.0.json",
);
const checkOnly = process.argv.includes("--check");

const facetOrder = [
  "SE-RE",
  "OE-AE",
  "RO-EC",
  "SM-EP",
  "ER-IR",
  "SE-AI",
  "OE-CI",
  "SM-OS",
  "ER-WD",
  "OE-IE",
];
const decisionRank = new Map([
  ["PASS_TO_COGNITIVE", 0],
  ["COPY_REVISE", 1],
  ["HOLD_FOR_ACCESS", 2],
  ["HOLD_FOR_RISK_REVIEW", 3],
  ["CONSTRUCT_REWRITE", 4],
  ["EXCLUDE_OR_REBUILD", 5],
]);

const mapping = readCsvObjects(mappingPath);
const metrics = readCsvObjects(metricsPath);
const metricByOpaqueId = new Map(
  metrics.map((item) => [item.opaque_item_id, item]),
);
const eligible = mapping
  .filter((item) => item.evidence_role === "CORE_BASELINE")
  .filter((item) => facetOrder.includes(item.target_facet))
  .map((item) => ({ ...item, metric: metricByOpaqueId.get(item.opaque_item_id) }))
  .filter((item) => item.metric);

const selectedByFacet = new Map();
for (const facetId of facetOrder) {
  const selected = ["HIGH", "LOW"].flatMap((direction) => {
    const candidates = eligible
      .filter(
        (item) =>
          item.target_facet === facetId && item.keyed_direction === direction,
      )
      .sort(compareCandidates);

    if (candidates.length < 3) {
      throw new Error(
        `${facetId}/${direction}: expected at least 3 eligible candidates, found ${candidates.length}`,
      );
    }
    return candidates.slice(0, 3);
  });
  selectedByFacet.set(facetId, interleaveDirections(selected));
}

const orderedCandidates = Array.from({ length: 6 }, (_, round) =>
  facetOrder.map((facetId) => selectedByFacet.get(facetId)[round]),
).flat();
const items = orderedCandidates.map((item, index) => ({
  item_id: `NU-B1-${String(index + 1).padStart(3, "0")}`,
  source_opaque_item_id: item.opaque_item_id,
  source_candidate_id: item.candidate_id,
  domain_id: item.target_domain,
  construct_id: item.target_facet,
  context_label: item.context_label,
  text_ko: item.prompt_text,
  keyed_direction: item.keyed_direction,
  scoring_key: item.keyed_direction === "HIGH" ? "direct" : "reverse",
  internal_review_decision: item.metric.proposed_decision,
  status: "BETA_RESEARCH_NOT_VALIDATED",
}));
const output = {
  item_set_id: "nuang-core-beta-60",
  item_set_version: "1.0",
  assessment_release_id: "NUANG-CORE-BETA-1.0",
  code_scheme_version: "NUANG-CODE-5AXIS-CANDIDATE-1.0",
  status: "BETA_RESEARCH_NOT_FOR_VALIDATED_SCORING",
  generated_from: "m04-core-expert-kit.v0.1-internal-critique",
  selection_rule:
    "10 public facets × 3 HIGH + 3 LOW; internal triage rank then mapping, clarity, universality and access risk",
  excluded_from_representative_code: ["SM-RL", "RO-RN"],
  baseOrder: items.map((item) => item.item_id),
  items,
};
const serialized = `${JSON.stringify(output, null, 2)}\n`;

if (checkOnly) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, "utf8") !== serialized) {
    console.error("Beta item set is missing or stale. Regenerate it first.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, serialized, "utf8");
}

console.log(
  JSON.stringify(
    {
      status: checkOnly ? "PASS_BETA_ITEM_SET_CURRENT" : "WROTE_BETA_ITEM_SET",
      itemCount: items.length,
      high: items.filter((item) => item.keyed_direction === "HIGH").length,
      low: items.filter((item) => item.keyed_direction === "LOW").length,
      facetCounts: Object.fromEntries(
        facetOrder.map((facetId) => [
          facetId,
          items.filter((item) => item.construct_id === facetId).length,
        ]),
      ),
      outputPath: path.relative(projectRoot, outputPath),
    },
    null,
    2,
  ),
);

function compareCandidates(left, right) {
  const leftMetric = left.metric;
  const rightMetric = right.metric;
  return (
    (decisionRank.get(leftMetric.proposed_decision) ?? 99) -
      (decisionRank.get(rightMetric.proposed_decision) ?? 99) ||
    Number(rightMetric.target_mapping_rate) -
      Number(leftMetric.target_mapping_rate) ||
    Number(rightMetric.direction_match_rate) -
      Number(leftMetric.direction_match_rate) ||
    Number(rightMetric.clarity_median) - Number(leftMetric.clarity_median) ||
    Number(rightMetric.universality_median) -
      Number(leftMetric.universality_median) ||
    Number(leftMetric.access_risk_reviewer_count) -
      Number(rightMetric.access_risk_reviewer_count) ||
    left.candidate_id.localeCompare(right.candidate_id)
  );
}

function interleaveDirections(items) {
  const high = items.filter((item) => item.keyed_direction === "HIGH");
  const low = items.filter((item) => item.keyed_direction === "LOW");
  return [high[0], low[0], low[1], high[1], high[2], low[2]];
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
  return rows;
}
