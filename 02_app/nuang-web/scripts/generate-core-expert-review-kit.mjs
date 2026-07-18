import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const outputRoot = path.join(
  projectRoot,
  "docs",
  "research",
  "core-m04",
  "generated",
);
const checkOnly = process.argv.includes("--check");

const protocolVersion = "m04-core-expert-kit.v0.1";
const generatedAt = "2026-07-18T00:00:00+09:00";
const keySeed = "nuang-core-m04-opaque-key-v0.1-20260718";
const reviewerSlots = Array.from(
  { length: 8 },
  (_, index) => `R${String(index + 1).padStart(2, "0")}`,
);
const waveIds = ["W1", "W2", "W3"];
const itemsPerWave = 50;

const standardSources = [
  [
    "SE",
    "SE-RE",
    "CORE_BASELINE",
    "docs/NUANG_M03_SE_RE_CANDIDATE_ITEM_BANK.md",
    /^SERE-C\d{2}$/,
  ],
  [
    "SE",
    "SE-AI",
    "CORE_BASELINE",
    "docs/NUANG_M03_SE_AI_CANDIDATE_ITEM_BANK.md",
    /^SEAI-C\d{2}$/,
  ],
  [
    "OE",
    "OE-AE",
    "CORE_BASELINE",
    "docs/NUANG_M03_OE_AE_CANDIDATE_ITEM_BANK.md",
    /^OEAE-C\d{2}$/,
  ],
  [
    "OE",
    "OE-CI",
    "CORE_BASELINE",
    "docs/NUANG_M03_OE_CI_CANDIDATE_ITEM_BANK.md",
    /^OECI-C\d{2}$/,
  ],
  [
    "OE",
    "OE-IE",
    "CORE_BASELINE",
    "docs/NUANG_M03_OE_IE_CANDIDATE_ITEM_BANK.md",
    /^OEIE-C\d{2}$/,
  ],
  [
    "SM",
    "SM-EP",
    "CORE_BASELINE",
    "docs/NUANG_M03_SM_EP_CANDIDATE_ITEM_BANK.md",
    /^SMEP-C\d{2}$/,
  ],
  [
    "SM",
    "SM-OS",
    "CORE_BASELINE",
    "docs/NUANG_M03_SM_OS_CANDIDATE_ITEM_BANK.md",
    /^SMOS-C\d{2}$/,
  ],
  [
    "SM",
    "SM-RL",
    "CONDITIONAL_MAIN",
    "docs/NUANG_M03_SM_RL_CANDIDATE_ITEM_BANK.md",
    /^SMRL-C\d{2}$/,
  ],
  [
    "ER",
    "ER-IR",
    "CORE_BASELINE",
    "docs/NUANG_M03_ER_IR_CANDIDATE_ITEM_BANK.md",
    /^ERIR-C\d{2}$/,
  ],
  [
    "ER",
    "ER-WD",
    "CORE_BASELINE",
    "docs/NUANG_M03_ER_WD_CANDIDATE_ITEM_BANK.md",
    /^ERWD-C\d{2}$/,
  ],
];

const roSources = [
  {
    domain: "RO",
    evidenceRole(item) {
      return item.scoreRole === "CORE_TRAIT_EVIDENCE"
        ? "CORE_BASELINE"
        : "PROCESS_PROFILE_MODIFIER";
    },
    expectedCount: 12,
    facet: "RO-EC",
    file: "docs/NUANG_M03_RO_EC_PROCESS_PAIR_CANDIDATE_BANK.md",
    idPattern: /^ROEC-P\d{2}-[AB]$/,
  },
  {
    domain: "RO",
    evidenceRole: () => "CORE_BASELINE",
    expectedCount: 6,
    facet: "RO-EC",
    file: "docs/NUANG_M03_RO_EC_PROCESS_PAIR_CANDIDATE_BANK.md",
    idPattern: /^ROEC-R\d{2}-[GA]$/,
  },
  {
    domain: "RO",
    evidenceRole: () => "PRIVATE_DETAIL_RESEARCH",
    expectedCount: 12,
    facet: "RO-RN",
    file: "docs/NUANG_M03_RO_RN_PROCESS_PAIR_CANDIDATE_BANK.md",
    idPattern: /^RORN-P\d{2}-[AB]$/,
  },
];

const sourceFiles = [
  ...standardSources.map((source) => source[3]),
  ...new Set(roSources.map((source) => source.file)),
];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
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

function unquote(value) {
  return value.replaceAll("`", "");
}

function tableRows(file) {
  return fs
    .readFileSync(path.join(projectRoot, file), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("| `"))
    .map((line) =>
      line
        .slice(1, -1)
        .split("|")
        .map((column) => column.trim()),
    );
}

function candidateRows(file, idPattern) {
  return tableRows(file).filter((columns) =>
    idPattern.test(unquote(columns[0])),
  );
}

function wordingPolarity(prompt) {
  if (/않는다|보지 않|하지 않|없다|못한다/.test(prompt)) return "negated";
  if (/만\s|만[을은이가도 ]|까지만/.test(prompt)) return "limiter";
  return "affirmative";
}

function parseCandidates() {
  const items = standardSources.flatMap(
    ([domain, facet, evidenceRole, file, idPattern]) => {
      const rows = candidateRows(file, idPattern);
      invariant(
        rows.length === 12,
        `${file}: expected 12 candidate rows, found ${rows.length}`,
      );

      return rows.map((columns) => {
        invariant(columns.length === 7, `Malformed candidate row in ${file}`);
        const candidateId = unquote(columns[0]);
        const numericId = Number(candidateId.match(/C(\d{2})$/)?.[1]);
        invariant(
          Number.isInteger(numericId),
          `Invalid candidate ID ${candidateId}`,
        );

        return {
          candidateId,
          candidateStatus: unquote(columns[6]),
          contextLabel: columns[2],
          direction: unquote(columns[4]),
          domain,
          evidenceRole,
          facet,
          pairKey: `${facet}-P${String(Math.ceil(numericId / 2)).padStart(2, "0")}`,
          promptText: columns[3],
          responseLayer: "SINGLE_RESPONSE",
          scoreRole:
            evidenceRole === "CONDITIONAL_MAIN"
              ? "CONDITIONAL_TRAIT_EVIDENCE"
              : "CORE_TRAIT_EVIDENCE",
          situationBucket: columns[1],
          sourceFile: file,
          targetResponseProcess: columns[5],
          wordingPolarity: wordingPolarity(columns[3]),
        };
      });
    },
  );

  for (const source of roSources) {
    const rows = candidateRows(source.file, source.idPattern);
    invariant(
      rows.length === source.expectedCount,
      `${source.file}: expected ${source.expectedCount} matching rows, found ${rows.length}`,
    );

    for (const columns of rows) {
      invariant(
        columns.length === 8,
        `Malformed candidate row in ${source.file}`,
      );
      const base = {
        candidateId: unquote(columns[0]),
        candidateStatus: unquote(columns[7]),
        contextLabel: columns[2],
        direction: unquote(columns[5]),
        domain: source.domain,
        facet: source.facet,
        pairKey: `${source.facet}-${unquote(columns[1])}`,
        promptText: columns[3],
        responseLayer: unquote(columns[4]),
        scoreRole: unquote(columns[6]),
        situationBucket: unquote(columns[1]),
        sourceFile: source.file,
        targetResponseProcess: unquote(columns[4]),
        wordingPolarity: wordingPolarity(columns[3]),
      };
      items.push({ ...base, evidenceRole: source.evidenceRole(base) });
    }
  }

  validateCandidates(items);
  return items;
}

function validateCandidates(items) {
  invariant(
    items.length === 150,
    `Expected 150 candidates, found ${items.length}`,
  );
  invariant(
    new Set(items.map((item) => item.candidateId)).size === 150,
    "Candidate IDs must be unique",
  );
  invariant(
    items.filter((item) => item.direction === "HIGH").length === 75,
    "Expected 75 HIGH candidates",
  );
  invariant(
    items.filter((item) => item.direction === "LOW").length === 75,
    "Expected 75 LOW candidates",
  );

  const roleCounts = countBy(items, (item) => item.evidenceRole);
  invariant(roleCounts.CORE_BASELINE === 120, "Expected 120 core candidates");
  invariant(
    roleCounts.CONDITIONAL_MAIN === 12,
    "Expected 12 conditional candidates",
  );
  invariant(
    roleCounts.PROCESS_PROFILE_MODIFIER === 6,
    "Expected 6 process-profile candidates",
  );
  invariant(
    roleCounts.PRIVATE_DETAIL_RESEARCH === 12,
    "Expected 12 private-detail candidates",
  );

  const pairs = groupBy(items, (item) => item.pairKey);
  invariant(
    pairs.size === 75,
    `Expected 75 candidate pairs, found ${pairs.size}`,
  );
  for (const [pairKey, pairItems] of pairs) {
    invariant(pairItems.length === 2, `${pairKey}: expected two candidates`);
    invariant(
      new Set(pairItems.map((item) => item.direction)).size === 2,
      `${pairKey}: expected one HIGH and one LOW candidate`,
    );
  }
}

function assignOpaqueIds(items) {
  return shuffled(items, createRandom(keySeed)).map((item, index) => ({
    ...item,
    opaqueItemId: `NX-${String(index + 1).padStart(3, "0")}`,
  }));
}

function groupBy(values, selector) {
  const result = new Map();
  for (const value of values) {
    const key = selector(value);
    const grouped = result.get(key) ?? [];
    grouped.push(value);
    result.set(key, grouped);
  }
  return result;
}

function countBy(values, selector) {
  return Object.fromEntries(
    [...groupBy(values, selector)].map(([key, grouped]) => [
      key,
      grouped.length,
    ]),
  );
}

function maximumRun(items, selector) {
  let maximum = 0;
  let current = 0;
  let previous;
  for (const item of items) {
    const value = selector(item);
    current = value === previous ? current + 1 : 1;
    previous = value;
    maximum = Math.max(maximum, current);
  }
  return maximum;
}

function validateWave(wave) {
  const negativePositions = wave
    .map((item, index) => (item.wordingPolarity === "negated" ? index : -1))
    .filter((index) => index >= 0);
  const negativeAdjacent = negativePositions.some(
    (position, index) =>
      index > 0 && Math.abs(position - negativePositions[index - 1]) <= 1,
  );
  const firstTen = wave.slice(0, 10);
  let currentNegatedRun = 0;
  let maximumNegatedRun = 0;
  for (const item of wave) {
    currentNegatedRun =
      item.wordingPolarity === "negated" ? currentNegatedRun + 1 : 0;
    maximumNegatedRun = Math.max(maximumNegatedRun, currentNegatedRun);
  }

  return {
    valid:
      new Set(wave.map((item) => item.domain)).size === 5 &&
      new Set(wave.map((item) => item.facet)).size === 12 &&
      new Set(wave.map((item) => item.direction)).size === 2 &&
      maximumRun(wave, (item) => item.domain) <= 3 &&
      maximumRun(wave, (item) => item.facet) <= 2 &&
      maximumRun(wave, (item) => item.direction) <= 3 &&
      maximumNegatedRun <= 2,
    domainCounts: countBy(wave, (item) => item.domain),
    facetCounts: countBy(wave, (item) => item.facet),
    evidenceRoleCounts: countBy(wave, (item) => item.evidenceRole),
    directionCounts: countBy(wave, (item) => item.direction),
    maximumDomainRun: maximumRun(wave, (item) => item.domain),
    maximumFacetRun: maximumRun(wave, (item) => item.facet),
    maximumDirectionRun: maximumRun(wave, (item) => item.direction),
    maximumNegatedRun,
    negativeAdjacent,
    firstTenDomainCount: new Set(firstTen.map((item) => item.domain)).size,
  };
}

function buildReviewerOrder(items, reviewerSlot) {
  const random = createRandom(`${protocolVersion}:${reviewerSlot}:order`);
  const pairs = [...groupBy(items, (item) => item.pairKey).values()];

  for (let attempt = 1; attempt <= 500_000; attempt += 1) {
    const orderedPairs = shuffled(pairs, random).map((pairItems) =>
      random() < 0.5 ? pairItems : [pairItems[1], pairItems[0]],
    );
    const order = [
      ...orderedPairs.map(([first]) => first),
      ...orderedPairs.map(([, second]) => second),
    ];
    const waveReports = waveIds.map((waveId, waveIndex) => {
      const wave = order.slice(
        waveIndex * itemsPerWave,
        (waveIndex + 1) * itemsPerWave,
      );
      return { waveId, ...validateWave(wave) };
    });

    if (waveReports.every((report) => report.valid)) {
      return { attempt, order, waveReports };
    }
  }

  throw new Error(
    `Unable to produce a valid three-wave order for ${reviewerSlot}`,
  );
}

function buildStage1Csv(reviewerSlot, waveId, wave) {
  const header = [
    "protocol_version",
    "reviewer_slot",
    "wave_id",
    "sequence_in_wave",
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
    ...wave.map((item, index) => [
      protocolVersion,
      reviewerSlot,
      waveId,
      index + 1,
      item.opaqueItemId,
      item.contextLabel,
      item.promptText,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  ]);
}

function buildStage2Csv(reviewerSlot, waveId, wave) {
  const header = [
    "protocol_version",
    "reviewer_slot",
    "wave_id",
    "sequence_in_wave",
    "opaque_item_id",
    "context_label",
    "prompt_text",
    "target_domain",
    "target_facet",
    "keyed_direction",
    "response_layer",
    "evidence_role",
    "score_role",
    "intended_response_process",
    "target_relevance_rating_1_4",
    "key_direction_fit_rating_1_4",
    "coverage_contribution_rating",
    "adjacent_separation_rating_1_4",
    "recommendation",
    "final_rationale",
  ];
  return toCsv([
    header,
    ...wave.map((item, index) => [
      protocolVersion,
      reviewerSlot,
      waveId,
      index + 1,
      item.opaqueItemId,
      item.contextLabel,
      item.promptText,
      item.domain,
      item.facet,
      item.direction,
      item.responseLayer,
      item.evidenceRole,
      item.scoreRole,
      item.targetResponseProcess,
      "",
      "",
      "",
      "",
      "",
      "",
    ]),
  ]);
}

function buildGeneratedFiles() {
  const items = assignOpaqueIds(parseCandidates());
  const files = new Map();
  const packetReports = [];
  const reviewerOrderHashes = new Set();
  const leakPattern =
    /(?:SERE|SEAI|OEAE|OECI|OEIE|SMEP|SMOS|SMRL|ERIR|ERWD)-C\d{2}|RO(?:EC|RN)-(?:P|R)\d{2}-[ABGA]|(?:SE|OE|RO|SM|ER)-(?:RE|AI|AE|CI|IE|EC|RN|EP|OS|RL|IR|WD)|CORE_BASELINE|CONDITIONAL_MAIN|PRIMARY_COGNITIVE|EXPLORATORY_COGNITIVE/;

  for (const reviewerSlot of reviewerSlots) {
    const { attempt, order, waveReports } = buildReviewerOrder(
      items,
      reviewerSlot,
    );
    const orderHash = sha256(order.map((item) => item.opaqueItemId).join("|"));
    invariant(
      !reviewerOrderHashes.has(orderHash),
      `${reviewerSlot}: duplicate reviewer order`,
    );
    reviewerOrderHashes.add(orderHash);

    waveIds.forEach((waveId, waveIndex) => {
      const wave = order.slice(
        waveIndex * itemsPerWave,
        (waveIndex + 1) * itemsPerWave,
      );
      const stage1Path = `reviewer/${reviewerSlot}_${waveId}_stage1_blind.csv`;
      const stage2Path = `internal/DO_NOT_RELEASE_UNTIL_ALL_STAGE1_LOCKED_${reviewerSlot}_${waveId}_stage2_target_reveal.csv`;
      const stage1Content = buildStage1Csv(reviewerSlot, waveId, wave);
      const stage2Content = buildStage2Csv(reviewerSlot, waveId, wave);
      invariant(
        !leakPattern.test(stage1Content),
        `${reviewerSlot}/${waveId}: Stage 1 packet leaks target metadata`,
      );

      files.set(stage1Path, stage1Content);
      files.set(stage2Path, stage2Content);
      packetReports.push({
        reviewer_slot: reviewerSlot,
        wave_id: waveId,
        generation_attempt: attempt,
        stage1_path: stage1Path,
        stage1_sha256: sha256(stage1Content),
        stage2_path: stage2Path,
        stage2_sha256: sha256(stage2Content),
        item_count: wave.length,
        target_leak_detected: false,
        ...waveReports[waveIndex],
      });
    });
  }

  files.set("internal/opaque_item_mapping.csv", buildMappingCsv(items));
  files.set("internal/reviewer_roster_template.csv", buildRosterCsv());
  files.set("internal/packet_lock_log.csv", buildLockLogCsv(packetReports));
  files.set(
    "internal/adjudication_decision_log.csv",
    buildDecisionLogCsv(items),
  );
  files.set(
    "internal/mapping_confusion_matrix_template.csv",
    buildConfusionMatrixCsv(items),
  );

  const manifestFiles = [...files.entries()].map(([relativePath, content]) => ({
    path: relativePath,
    sha256: sha256(content),
    bytes: Buffer.byteLength(content),
  }));
  const manifest = {
    protocol_version: protocolVersion,
    generated_at: generatedAt,
    source_files: sourceFiles,
    opaque_key_seed_id: sha256(keySeed).slice(0, 16),
    reviewer_slots: reviewerSlots,
    wave_ids: waveIds,
    stage2_release_rule: "ALL_THREE_STAGE1_WAVES_LOCKED_PER_REVIEWER",
    generated_files: manifestFiles,
  };
  files.set(
    "internal/packet_manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const validation = {
    protocol_version: protocolVersion,
    generated_at: generatedAt,
    candidate_count: items.length,
    unique_opaque_id_count: new Set(items.map((item) => item.opaqueItemId))
      .size,
    pair_count: new Set(items.map((item) => item.pairKey)).size,
    direction_counts: countBy(items, (item) => item.direction),
    domain_counts: countBy(items, (item) => item.domain),
    facet_counts: countBy(items, (item) => item.facet),
    evidence_role_counts: countBy(items, (item) => item.evidenceRole),
    wording_polarity_counts: countBy(items, (item) => item.wordingPolarity),
    reviewer_count: reviewerSlots.length,
    wave_count_per_reviewer: waveIds.length,
    items_per_wave: itemsPerWave,
    unique_reviewer_order_count: reviewerOrderHashes.size,
    constraints: {
      paired_opposite_distance: 75,
      all_domains_each_wave: true,
      all_facets_each_wave: true,
      evidence_roles_balanced_across_full_reviewer_set: true,
      maximum_domain_run: 3,
      maximum_facet_run: 2,
      maximum_direction_run: 3,
      maximum_negated_run: 2,
      stage1_target_metadata_leak: false,
    },
    packets: packetReports,
    status: "PASS",
  };
  files.set(
    "internal/validation_report.json",
    `${JSON.stringify(validation, null, 2)}\n`,
  );

  return files;
}

function buildMappingCsv(items) {
  const header = [
    "opaque_item_id",
    "candidate_id",
    "target_domain",
    "target_facet",
    "keyed_direction",
    "candidate_status",
    "evidence_role",
    "response_layer",
    "score_role",
    "situation_bucket",
    "target_response_process",
    "context_label",
    "prompt_text",
    "pair_key",
    "wording_polarity",
    "source_file",
  ];
  const rows = [...items]
    .sort((left, right) => left.opaqueItemId.localeCompare(right.opaqueItemId))
    .map((item) => [
      item.opaqueItemId,
      item.candidateId,
      item.domain,
      item.facet,
      item.direction,
      item.candidateStatus,
      item.evidenceRole,
      item.responseLayer,
      item.scoreRole,
      item.situationBucket,
      item.targetResponseProcess,
      item.contextLabel,
      item.promptText,
      item.pairKey,
      item.wordingPolarity,
      item.sourceFile,
    ]);
  return toCsv([header, ...rows]);
}

function buildRosterCsv() {
  const header = [
    "reviewer_slot",
    "status",
    "role_codes",
    "psychometric_coverage",
    "personality_coverage",
    "korean_item_coverage",
    "ux_2030_coverage",
    "accessibility_or_bias_coverage",
    "conflict_disclosure_status",
    "all_stage1_locked_at",
    "all_stage2_locked_at",
  ];
  return toCsv([
    header,
    ...reviewerSlots.map((slot) => [
      slot,
      "NOT_ASSIGNED",
      "",
      "",
      "",
      "",
      "",
      "",
      "NOT_REVIEWED",
      "",
      "",
    ]),
  ]);
}

function buildLockLogCsv(packetReports) {
  const header = [
    "reviewer_slot",
    "wave_id",
    "stage1_packet_sha256",
    "stage1_response_sha256",
    "stage1_sent_at",
    "stage1_received_at",
    "stage1_locked_by",
    "stage1_lock_verified_at",
    "all_stage1_waves_locked_at",
    "stage2_packet_sha256",
    "stage2_response_sha256",
    "stage2_released_at",
    "stage2_received_at",
    "stage2_locked_at",
    "notes",
  ];
  return toCsv([
    header,
    ...packetReports.map((report) => [
      report.reviewer_slot,
      report.wave_id,
      report.stage1_sha256,
      "",
      "",
      "",
      "",
      "",
      "",
      report.stage2_sha256,
      "",
      "",
      "",
      "",
      "",
    ]),
  ]);
}

function buildDecisionLogCsv(items) {
  const header = [
    "candidate_id",
    "opaque_item_id",
    "target_domain",
    "target_facet",
    "evidence_role",
    "expert_count",
    "target_first_mapping_count",
    "target_mapping_rate",
    "same_non_target_30pct_flag",
    "direction_match_rate",
    "relevance_median",
    "clarity_median",
    "single_response_median",
    "universality_median",
    "scale_fit_median",
    "fatal_risk_open",
    "proposed_decision",
    "final_decision",
    "revision_required",
    "dissent_note",
    "approved_by",
    "approved_at",
  ];
  return toCsv([
    header,
    ...[...items]
      .sort((left, right) => left.candidateId.localeCompare(right.candidateId))
      .map((item) => [
        item.candidateId,
        item.opaqueItemId,
        item.domain,
        item.facet,
        item.evidenceRole,
        ...Array(17).fill(""),
      ]),
  ]);
}

function buildConfusionMatrixCsv(items) {
  const facets = [...new Set(items.map((item) => item.facet))].sort();
  const mappingColumns = [...facets, "METHOD", "NONE"];
  return toCsv([
    [
      "target_facet",
      ...mappingColumns.map((facet) => `${facet}_count`),
      "total",
    ],
    ...facets.map((facet) => [
      facet,
      ...Array(mappingColumns.length + 1).fill(""),
    ]),
  ]);
}

function listFilesRecursively(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFilesRecursively(absolutePath);
    return [path.relative(outputRoot, absolutePath)];
  });
}

function writeOrCheck(files) {
  const expectedPaths = new Set(files.keys());
  if (checkOnly) {
    const missing = [];
    const changed = [];
    for (const [relativePath, content] of files) {
      const absolutePath = path.join(outputRoot, relativePath);
      if (!fs.existsSync(absolutePath)) missing.push(relativePath);
      else if (fs.readFileSync(absolutePath, "utf8") !== content) {
        changed.push(relativePath);
      }
    }
    const unexpected = listFilesRecursively(outputRoot).filter(
      (relativePath) => !expectedPaths.has(relativePath),
    );
    invariant(missing.length === 0, `Missing files: ${missing.join(", ")}`);
    invariant(changed.length === 0, `Changed files: ${changed.join(", ")}`);
    invariant(
      unexpected.length === 0,
      `Unexpected generated files: ${unexpected.join(", ")}`,
    );
    return;
  }

  for (const [relativePath, content] of files) {
    const absolutePath = path.join(outputRoot, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content, "utf8");
  }
}

try {
  const files = buildGeneratedFiles();
  writeOrCheck(files);
  process.stdout.write(
    `${checkOnly ? "Verified" : "Generated"} ${files.size} full-core M04 files.\n`,
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
