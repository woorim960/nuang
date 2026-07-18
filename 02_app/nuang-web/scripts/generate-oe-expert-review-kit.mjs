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
  "oe-m04",
  "generated",
);
const checkOnly = process.argv.includes("--check");

const protocolVersion = "m04-oe-expert-kit.v0.1";
const generatedAt = "2026-07-17T00:00:00+09:00";
const keySeed = "nuang-oe-m04-opaque-key-v0.1-20260717";
const reviewerSlots = Array.from(
  { length: 8 },
  (_, index) => `R${String(index + 1).padStart(2, "0")}`,
);

const sources = [
  {
    facet: "OE-AE",
    file: "docs/NUANG_M03_OE_AE_CANDIDATE_ITEM_BANK.md",
    rowPattern: /^\| `OEAE-C\d{2}`/,
  },
  {
    facet: "OE-CI",
    file: "docs/NUANG_M03_OE_CI_CANDIDATE_ITEM_BANK.md",
    rowPattern: /^\| `OECI-C\d{2}`/,
  },
  {
    facet: "OE-IE",
    file: "docs/NUANG_M03_OE_IE_CANDIDATE_ITEM_BANK.md",
    rowPattern: /^\| `OEIE-C\d{2}`/,
  },
];

function invariant(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
  const digest = crypto.createHash("sha256").update(seed).digest();
  return digest.readUInt32LE(0);
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

function parseCandidateRows() {
  const items = [];

  for (const source of sources) {
    const absolutePath = path.join(projectRoot, source.file);
    const lines = fs.readFileSync(absolutePath, "utf8").split(/\r?\n/);
    const candidateRows = lines.filter((line) => source.rowPattern.test(line));

    invariant(
      candidateRows.length === 12,
      `${source.facet}: expected 12 candidates, found ${candidateRows.length}`,
    );

    for (const line of candidateRows) {
      const columns = line
        .split("|")
        .slice(1, -1)
        .map((value) => value.trim().replace(/^`|`$/g, ""));

      invariant(columns.length === 7, `Malformed candidate row: ${line}`);

      const candidateId = columns[0];
      const numericId = Number(candidateId.match(/C(\d{2})$/)?.[1]);
      invariant(
        Number.isInteger(numericId),
        `Invalid candidate ID: ${candidateId}`,
      );

      items.push({
        facet: source.facet,
        candidateId,
        numericId,
        pairKey: `${source.facet}-P${String(Math.ceil(numericId / 2)).padStart(2, "0")}`,
        situationBucket: columns[1],
        contextLabel: columns[2],
        promptText: columns[3],
        direction: columns[4],
        targetResponseProcess: columns[5],
        candidateStatus: columns[6],
        wordingPolarity: /않는다|보지 않|하지 않/.test(columns[3])
          ? "negated"
          : /만\s|만[을은이가도 ]|까지만/.test(columns[3])
            ? "limiter"
            : "affirmative",
      });
    }
  }

  invariant(
    items.length === 36,
    `Expected 36 candidates, found ${items.length}`,
  );
  invariant(
    new Set(items.map((item) => item.candidateId)).size === 36,
    "Candidate IDs must be unique",
  );
  invariant(
    items.filter((item) => item.direction === "HIGH").length === 18,
    "Expected 18 HIGH candidates",
  );
  invariant(
    items.filter((item) => item.direction === "LOW").length === 18,
    "Expected 18 LOW candidates",
  );

  return items;
}

function assignOpaqueIds(items) {
  const randomized = shuffled(items, createRandom(keySeed));
  return randomized.map((item, index) => ({
    ...item,
    opaqueItemId: `OX-${String(index + 1).padStart(3, "0")}`,
  }));
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

function validateOrder(order) {
  const positionsByPair = new Map();
  order.forEach((item, index) => {
    const positions = positionsByPair.get(item.pairKey) ?? [];
    positions.push(index);
    positionsByPair.set(item.pairKey, positions);
  });

  const pairDistances = [...positionsByPair.values()].map(([first, second]) =>
    Math.abs(first - second),
  );
  const minimumPairDistance = Math.min(...pairDistances);
  const negativePositions = order
    .map((item, index) => (item.wordingPolarity === "negated" ? index : -1))
    .filter((index) => index >= 0);
  const negativeAdjacent = negativePositions.some(
    (position, index) =>
      index > 0 && Math.abs(position - negativePositions[index - 1]) <= 1,
  );
  const firstSix = order.slice(0, 6);

  return {
    valid:
      minimumPairDistance >= 8 &&
      maximumRun(order, (item) => item.facet) <= 2 &&
      maximumRun(order, (item) => item.direction) <= 3 &&
      !negativeAdjacent &&
      new Set(firstSix.map((item) => item.facet)).size === 3 &&
      new Set(firstSix.map((item) => item.direction)).size === 2,
    minimumPairDistance,
    maxFacetRun: maximumRun(order, (item) => item.facet),
    maxDirectionRun: maximumRun(order, (item) => item.direction),
    negativeAdjacent,
    firstSixFacetCount: new Set(firstSix.map((item) => item.facet)).size,
    firstSixDirectionCount: new Set(firstSix.map((item) => item.direction))
      .size,
  };
}

function buildReviewerOrder(items, reviewerSlot) {
  const random = createRandom(
    `${protocolVersion}:${reviewerSlot}:stage1-order`,
  );
  const pairGroups = new Map();
  for (const item of items) {
    const pairItems = pairGroups.get(item.pairKey) ?? [];
    pairItems.push(item);
    pairGroups.set(item.pairKey, pairItems);
  }
  const pairs = [...pairGroups.entries()].map(([pairKey, pairItems]) => {
    invariant(pairItems.length === 2, `${pairKey}: expected exactly two items`);
    invariant(
      new Set(pairItems.map((item) => item.direction)).size === 2,
      `${pairKey}: expected one HIGH and one LOW item`,
    );
    return pairItems;
  });

  for (let attempt = 1; attempt <= 250_000; attempt += 1) {
    // Put one member of every pair in each half, using the same pair order.
    // This guarantees an 18-item separation while randomising both the pair
    // sequence and which keyed direction appears first.
    const orderedPairs = shuffled(pairs, random).map((pairItems) =>
      random() < 0.5 ? pairItems : [pairItems[1], pairItems[0]],
    );
    const order = [
      ...orderedPairs.map(([first]) => first),
      ...orderedPairs.map(([, second]) => second),
    ];
    const validation = validateOrder(order);
    if (validation.valid) {
      return { order, validation, attempt };
    }
  }

  throw new Error(`Unable to produce a valid order for ${reviewerSlot}`);
}

function buildStage1Csv(reviewerSlot, order) {
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
  const rows = order.map((item, index) => [
    protocolVersion,
    reviewerSlot,
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
  ]);
  return toCsv([header, ...rows]);
}

function buildStage2Csv(reviewerSlot, order) {
  const header = [
    "protocol_version",
    "reviewer_slot",
    "sequence",
    "opaque_item_id",
    "context_label",
    "prompt_text",
    "target_facet",
    "keyed_direction",
    "intended_response_process",
    "target_relevance_rating_1_4",
    "key_direction_fit_rating_1_4",
    "coverage_contribution_rating",
    "adjacent_separation_rating_1_4",
    "recommendation",
    "final_rationale",
  ];
  const rows = order.map((item, index) => [
    protocolVersion,
    reviewerSlot,
    index + 1,
    item.opaqueItemId,
    item.contextLabel,
    item.promptText,
    item.facet,
    item.direction,
    item.targetResponseProcess,
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  return toCsv([header, ...rows]);
}

function buildGeneratedFiles() {
  const items = assignOpaqueIds(parseCandidateRows());
  const files = new Map();
  const packetReports = [];
  const orderHashes = new Set();

  for (const reviewerSlot of reviewerSlots) {
    const { order, validation, attempt } = buildReviewerOrder(
      items,
      reviewerSlot,
    );
    const orderHash = sha256(order.map((item) => item.opaqueItemId).join("|"));
    invariant(
      !orderHashes.has(orderHash),
      `Duplicate reviewer order: ${reviewerSlot}`,
    );
    orderHashes.add(orderHash);

    const stage1Path = `reviewer/${reviewerSlot}_stage1_blind.csv`;
    const stage2Path = `internal/DO_NOT_RELEASE_BEFORE_STAGE1_LOCK_${reviewerSlot}_stage2_target_reveal.csv`;
    const stage1Content = buildStage1Csv(reviewerSlot, order);
    const stage2Content = buildStage2Csv(reviewerSlot, order);

    invariant(
      !/OE(?:AE|CI|IE)-C\d{2}|PRIMARY_COGNITIVE|EXPLORATORY_COGNITIVE/.test(
        stage1Content,
      ),
      `${reviewerSlot}: Stage 1 packet leaks internal metadata`,
    );

    files.set(stage1Path, stage1Content);
    files.set(stage2Path, stage2Content);
    packetReports.push({
      reviewer_slot: reviewerSlot,
      generation_attempt: attempt,
      stage1_path: stage1Path,
      stage1_sha256: sha256(stage1Content),
      stage2_path: stage2Path,
      stage2_sha256: sha256(stage2Content),
      order_sha256: orderHash,
      item_count: order.length,
      target_leak_detected: false,
      ...validation,
    });
  }

  const mappingHeader = [
    "opaque_item_id",
    "candidate_id",
    "target_facet",
    "keyed_direction",
    "candidate_status",
    "situation_bucket",
    "target_response_process",
    "context_label",
    "prompt_text",
    "pair_key",
    "wording_polarity",
  ];
  const mappingRows = [...items]
    .sort((left, right) => left.opaqueItemId.localeCompare(right.opaqueItemId))
    .map((item) => [
      item.opaqueItemId,
      item.candidateId,
      item.facet,
      item.direction,
      item.candidateStatus,
      item.situationBucket,
      item.targetResponseProcess,
      item.contextLabel,
      item.promptText,
      item.pairKey,
      item.wordingPolarity,
    ]);
  files.set(
    "internal/opaque_item_mapping.csv",
    toCsv([mappingHeader, ...mappingRows]),
  );

  const rosterHeader = [
    "reviewer_slot",
    "status",
    "role_codes",
    "psychometric_or_personality_coverage",
    "korean_item_coverage",
    "ux_coverage",
    "accessibility_or_bias_coverage",
    "conflict_disclosure_status",
    "stage1_sent_at",
    "stage1_locked_at",
    "stage2_released_at",
    "stage2_locked_at",
  ];
  files.set(
    "internal/reviewer_roster_template.csv",
    toCsv([
      rosterHeader,
      ...reviewerSlots.map((slot) => [
        slot,
        "NOT_RECRUITED",
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
    ]),
  );

  const lockHeader = [
    "reviewer_slot",
    "stage1_packet_sha256",
    "stage1_sent_at",
    "stage1_received_at",
    "stage1_locked_by",
    "stage1_lock_verified_at",
    "stage2_packet_sha256",
    "stage2_released_at",
    "stage2_received_at",
    "notes",
  ];
  files.set(
    "internal/packet_lock_log.csv",
    toCsv([
      lockHeader,
      ...packetReports.map((report) => [
        report.reviewer_slot,
        report.stage1_sha256,
        "",
        "",
        "",
        "",
        report.stage2_sha256,
        "",
        "",
        "",
      ]),
    ]),
  );

  const decisionHeader = [
    "candidate_id",
    "opaque_item_id",
    "target_facet",
    "expert_count",
    "target_first_mapping_count",
    "target_mapping_rate",
    "same_non_target_30pct_flag",
    "relevance_median",
    "clarity_median",
    "fatal_risk_open",
    "proposed_decision",
    "final_decision",
    "revision_required",
    "dissent_note",
    "approved_by",
    "approved_at",
  ];
  files.set(
    "internal/adjudication_decision_log.csv",
    toCsv([
      decisionHeader,
      ...[...items]
        .sort((left, right) =>
          left.candidateId.localeCompare(right.candidateId),
        )
        .map((item) => [
          item.candidateId,
          item.opaqueItemId,
          item.facet,
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
          "",
          "",
        ]),
    ]),
  );

  const hashedFiles = [...files.entries()].map(([relativePath, content]) => ({
    path: relativePath,
    sha256: sha256(content),
    bytes: Buffer.byteLength(content),
  }));
  const manifest = {
    protocol_version: protocolVersion,
    generated_at: generatedAt,
    source_files: sources.map((source) => source.file),
    opaque_key_seed_id: sha256(keySeed).slice(0, 16),
    reviewer_slots: reviewerSlots,
    generated_files: hashedFiles,
  };
  files.set(
    "internal/packet_manifest.json",
    `${JSON.stringify(manifest, null, 2)}\n`,
  );

  const validationReport = {
    protocol_version: protocolVersion,
    generated_at: generatedAt,
    candidate_count: items.length,
    unique_opaque_id_count: new Set(items.map((item) => item.opaqueItemId))
      .size,
    direction_counts: {
      HIGH: items.filter((item) => item.direction === "HIGH").length,
      LOW: items.filter((item) => item.direction === "LOW").length,
    },
    facet_counts: Object.fromEntries(
      sources.map((source) => [
        source.facet,
        items.filter((item) => item.facet === source.facet).length,
      ]),
    ),
    wording_polarity_counts: Object.fromEntries(
      ["affirmative", "limiter", "negated"].map((polarity) => [
        polarity,
        items.filter((item) => item.wordingPolarity === polarity).length,
      ]),
    ),
    reviewer_order_count: packetReports.length,
    unique_reviewer_order_count: orderHashes.size,
    constraints: {
      minimum_pair_distance: 8,
      maximum_facet_run: 2,
      maximum_direction_run: 3,
      negative_items_adjacent: false,
      first_six_include_all_facets: true,
      first_six_include_both_directions: true,
      stage1_target_metadata_leak: false,
    },
    packets: packetReports,
    status: "PASS",
  };
  files.set(
    "internal/validation_report.json",
    `${JSON.stringify(validationReport, null, 2)}\n`,
  );

  return files;
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
      if (!fs.existsSync(absolutePath)) {
        missing.push(relativePath);
      } else if (fs.readFileSync(absolutePath, "utf8") !== content) {
        changed.push(relativePath);
      }
    }

    const unexpected = listFilesRecursively(outputRoot).filter(
      (relativePath) => !expectedPaths.has(relativePath),
    );

    invariant(
      missing.length === 0,
      `Missing generated files: ${missing.join(", ")}`,
    );
    invariant(
      changed.length === 0,
      `Changed generated files: ${changed.join(", ")}`,
    );
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
    `${checkOnly ? "Verified" : "Generated"} ${files.size} OE expert-review kit files.\n`,
  );
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
