import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const standardBanks = [
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

const items = standardBanks.flatMap(
  ([domain, facet, evidenceRole, file, idPattern]) => {
    const rows = candidateRows(file, idPattern);
    assert(
      rows.length === 12,
      `${file}: expected 12 candidate rows, found ${rows.length}`,
    );

    return rows.map((columns) => ({
      id: unquote(columns[0]),
      domain,
      facet,
      evidenceRole,
      context: columns[2],
      prompt: columns[3],
      direction: unquote(columns[4]),
      layer: "SINGLE_RESPONSE",
      candidateStatus: unquote(columns[6]),
      sourceFile: file,
    }));
  },
);

items.push(
  ...processPairRows(
    "RO",
    "RO-EC",
    "docs/NUANG_M03_RO_EC_PROCESS_PAIR_CANDIDATE_BANK.md",
    /^ROEC-P\d{2}-[AB]$/,
    (row) =>
      row.scoreRole === "CORE_TRAIT_EVIDENCE"
        ? "CORE_BASELINE"
        : "PROCESS_PROFILE_MODIFIER",
  ),
  ...processPairRows(
    "RO",
    "RO-EC",
    "docs/NUANG_M03_RO_EC_PROCESS_PAIR_CANDIDATE_BANK.md",
    /^ROEC-R\d{2}-[GA]$/,
    () => "CORE_BASELINE",
    6,
  ),
  ...processPairRows(
    "RO",
    "RO-RN",
    "docs/NUANG_M03_RO_RN_PROCESS_PAIR_CANDIDATE_BANK.md",
    /^RORN-P\d{2}-[AB]$/,
    () => "PRIVATE_DETAIL_RESEARCH",
  ),
);

const roCoreRepairRecordRows = candidateRows(
  "docs/NUANG_M03_RO_EC_CORE_REDUNDANCY_REPAIR.md",
  /^ROEC-R\d{2}-[GA]$/,
);
assert(
  roCoreRepairRecordRows.length === 6,
  `RO core repair record: expected 6 candidate rows, found ${roCoreRepairRecordRows.length}`,
);

const roCoreRepairRecord = roCoreRepairRecordRows.map((columns) => ({
  id: unquote(columns[0]),
  pair: unquote(columns[1]),
  context: columns[2],
  prompt: columns[3],
  layer: unquote(columns[4]),
  codeDirection: unquote(columns[5]),
  direction: unquote(columns[6]),
  scoreRole: unquote(columns[7]),
  candidateStatus: unquote(columns[8]),
  situationBucket: unquote(columns[9]),
}));

for (const item of roCoreRepairRecord) {
  assert(
    item.layer === "REPORTED_FIRST_ORIENTATION",
    `${item.id}: repair candidates must measure first orientation`,
  );
  assert(
    item.scoreRole === "CORE_TRAIT_EVIDENCE",
    `${item.id}: invalid score role`,
  );
  assert(
    (item.codeDirection === "G" && item.direction === "LOW") ||
      (item.codeDirection === "A" && item.direction === "HIGH"),
    `${item.id}: G/A and HIGH/LOW mapping mismatch`,
  );
  assert(
    item.context.length <= 40,
    `${item.id}: context exceeds 40 characters`,
  );
  assert(item.prompt.length <= 70, `${item.id}: prompt exceeds 70 characters`);
}

assertSummary(summarize(roCoreRepairRecord), {
  total: 6,
  high: 3,
  low: 3,
  primary: 4,
  exploratory: 2,
});
assert(
  new Set(roCoreRepairRecord.map((item) => item.situationBucket)).size === 3,
  "RO core repair must contain three situation buckets",
);

for (const pairItems of groupBy(
  roCoreRepairRecord,
  (item) => item.pair,
).values()) {
  assert(
    pairItems.length === 2,
    "each RO repair pair must contain two candidates",
  );
  assert(
    new Set(pairItems.map((item) => item.context)).size === 1,
    `${pairItems[0].pair}: pair contexts must match`,
  );
  assert(
    new Set(pairItems.map((item) => item.codeDirection)).size === 2,
    `${pairItems[0].pair}: pair must contain G and A`,
  );
}

const officialROCoreRepair = items.filter((item) =>
  /^ROEC-R\d{2}-[GA]$/.test(item.id),
);
assertSummary(summarize(officialROCoreRepair), {
  total: 6,
  high: 3,
  low: 3,
  primary: 4,
  exploratory: 2,
});

const officialRepairById = new Map(
  officialROCoreRepair.map((item) => [item.id, item]),
);
for (const record of roCoreRepairRecord) {
  const official = officialRepairById.get(record.id);
  assert(official, `${record.id}: missing from official RO-EC v0.5 bank`);
  assert(
    official.context === record.context &&
      official.prompt === record.prompt &&
      official.layer === record.layer &&
      official.direction === record.direction &&
      official.scoreRole === record.scoreRole &&
      official.candidateStatus === record.candidateStatus,
    `${record.id}: official bank and approval record differ`,
  );
}

const preRepairROCore = items.filter(
  (item) =>
    item.facet === "RO-EC" &&
    item.evidenceRole === "CORE_BASELINE" &&
    !/^ROEC-R\d{2}-[GA]$/.test(item.id),
);
assert(preRepairROCore.length === 6, "pre-repair RO core baseline must be six");
const preRepairROContexts = new Set(
  preRepairROCore.map((item) => normalize(item.context)),
);
assert(
  officialROCoreRepair.every(
    (item) => !preRepairROContexts.has(normalize(item.context)),
  ),
  "repair contexts must not exactly duplicate pre-repair RO core contexts",
);

const approvedROCore = items.filter(
  (item) => item.facet === "RO-EC" && item.evidenceRole === "CORE_BASELINE",
);
assertSummary(summarize(approvedROCore), {
  total: 12,
  high: 6,
  low: 6,
  primary: 8,
  exploratory: 4,
});

assert(
  new Set(items.map((item) => item.id)).size === items.length,
  "candidate IDs must be unique",
);
assert(
  items.length === 150,
  `expected 150 research candidates, found ${items.length}`,
);

for (const item of items) {
  assert(
    ["HIGH", "LOW"].includes(item.direction),
    `${item.id}: invalid direction`,
  );
  assert(
    item.context.length <= 40,
    `${item.id}: context exceeds 40 characters`,
  );
  assert(item.prompt.length <= 70, `${item.id}: prompt exceeds 70 characters`);
}

const duplicatePrompts = duplicates(items, (item) => normalize(item.prompt));
assert(
  duplicatePrompts.length === 0,
  `exact prompt duplicates: ${duplicatePrompts.join(", ")}`,
);

const overall = summarize(items);
const publicAndCandidate = summarize(
  items.filter((item) => item.evidenceRole !== "PRIVATE_DETAIL_RESEARCH"),
);
const coreBaseline = summarize(
  items.filter((item) => item.evidenceRole === "CORE_BASELINE"),
);
const conditionalMain = summarize(
  items.filter((item) => item.evidenceRole === "CONDITIONAL_MAIN"),
);
const processProfile = summarize(
  items.filter((item) => item.evidenceRole === "PROCESS_PROFILE_MODIFIER"),
);
const privateDetail = summarize(
  items.filter((item) => item.evidenceRole === "PRIVATE_DETAIL_RESEARCH"),
);

assertSummary(overall, {
  total: 150,
  high: 75,
  low: 75,
  primary: 100,
  exploratory: 50,
});
assertSummary(publicAndCandidate, {
  total: 138,
  high: 69,
  low: 69,
  primary: 92,
  exploratory: 46,
});
assertSummary(coreBaseline, {
  total: 120,
  high: 60,
  low: 60,
  primary: 80,
  exploratory: 40,
});
assertSummary(conditionalMain, {
  total: 12,
  high: 6,
  low: 6,
  primary: 8,
  exploratory: 4,
});
assertSummary(processProfile, {
  total: 6,
  high: 3,
  low: 3,
  primary: 4,
  exploratory: 2,
});
assertSummary(privateDetail, {
  total: 12,
  high: 6,
  low: 6,
  primary: 8,
  exploratory: 4,
});

const exactCrossDomainContexts = [
  ...groupBy(items, (item) => normalize(item.context)).entries(),
]
  .filter(([, grouped]) => new Set(grouped.map((item) => item.domain)).size > 1)
  .map(([context, grouped]) => ({
    context,
    domains: [...new Set(grouped.map((item) => item.domain))].sort(),
    itemIds: grouped.map((item) => item.id).sort(),
  }));

const wording = Object.fromEntries(
  ["SE", "OE", "RO", "SM", "ER"].map((domain) => {
    const domainItems = items.filter(
      (item) =>
        item.domain === domain &&
        item.evidenceRole !== "PRIVATE_DETAIL_RESEARCH",
    );
    return [
      domain,
      {
        all: wordingFlags(domainItems),
        HIGH: wordingFlags(
          domainItems.filter((item) => item.direction === "HIGH"),
        ),
        LOW: wordingFlags(
          domainItems.filter((item) => item.direction === "LOW"),
        ),
      },
    ];
  }),
);

const situationCoverage = Object.fromEntries(
  ["SE", "OE", "RO", "SM", "ER"].map((domain) => {
    const domainItems = items.filter(
      (item) =>
        item.domain === domain &&
        item.evidenceRole !== "PRIVATE_DETAIL_RESEARCH",
    );
    return [domain, situationFlags(domainItems)];
  }),
);

console.log(
  JSON.stringify(
    {
      status: "PASS_M03_INTEGRATED_INVENTORY",
      repairStatus: "PASS_RO_3G_3A_OWNER_APPROVED_AND_MERGED",
      inventory: {
        allResearchCandidates: overall,
        publicAndConditionalCandidates: publicAndCandidate,
        coreBaselineEvidence: coreBaseline,
        conditionalMain_SM_RL: conditionalMain,
        ROProcessProfileModifier: processProfile,
        privateDetailResearch_RO_RN: privateDetail,
        approvedROCoreRepair: summarize(officialROCoreRepair),
        approvedROCoreAfterMerge: summarize(approvedROCore),
      },
      exactCrossDomainContexts,
      wording,
      situationCoverage,
    },
    null,
    2,
  ),
);

function candidateRows(file, idPattern) {
  return tableRows(file).filter((columns) =>
    idPattern.test(unquote(columns[0])),
  );
}

function processPairRows(
  domain,
  facet,
  file,
  idPattern,
  roleResolver,
  expectedCount = 12,
) {
  const rows = candidateRows(file, idPattern);
  assert(
    rows.length === expectedCount,
    `${file}: expected ${expectedCount} matching rows, found ${rows.length}`,
  );
  return rows.map((columns) => {
    const row = {
      id: unquote(columns[0]),
      domain,
      facet,
      context: columns[2],
      prompt: columns[3],
      layer: unquote(columns[4]),
      direction: unquote(columns[5]),
      scoreRole: unquote(columns[6]),
      candidateStatus: unquote(columns[7]),
      sourceFile: file,
    };
    return { ...row, evidenceRole: roleResolver(row) };
  });
}

function tableRows(file) {
  return readFileSync(resolve(root, file), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("| `"))
    .map((line) =>
      line
        .slice(1, -1)
        .split("|")
        .map((column) => column.trim()),
    );
}

function summarize(source) {
  return {
    total: source.length,
    high: source.filter((item) => item.direction === "HIGH").length,
    low: source.filter((item) => item.direction === "LOW").length,
    primary: source.filter(
      (item) => item.candidateStatus === "PRIMARY_COGNITIVE",
    ).length,
    exploratory: source.filter(
      (item) => item.candidateStatus === "EXPLORATORY_COGNITIVE",
    ).length,
  };
}

function assertSummary(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    assert(
      actual[key] === value,
      `${key}: expected ${value}, found ${actual[key]}`,
    );
  }
}

function wordingFlags(source) {
  return {
    items: source.length,
    negationOrAbsence: countPrompt(source, /않|없|못/),
    limiter: countPrompt(source, /까지만|만\s|만\.|만큼/),
    firstOrBefore: countPrompt(source, /처음|먼저|부터|전에|앞서/),
    repetitionOrDuration: countPrompt(
      source,
      /반복|여러 번|계속|오래|한동안|다시/,
    ),
    checkOrConfirm: countPrompt(source, /확인|살핀|알아본|비교/),
  };
}

function situationFlags(source) {
  return {
    relationship: countContext(source, /사람|상대|누군가|여럿|대화|의견/),
    taskOrDecision: countContext(
      source,
      /할 일|해야|일을|자료|물건|문제|평가|선택|약속|결정/,
    ),
    digitalOrMedia: countContext(source, /앱|인터넷|영상|사진|글|미디어/),
    visualOrAuditory: countContext(source, /볼 때|보일 때|음악|소리|듣/),
  };
}

function countPrompt(source, pattern) {
  return source.filter((item) => pattern.test(item.prompt)).length;
}

function countContext(source, pattern) {
  return source.filter((item) => pattern.test(item.context)).length;
}

function duplicates(source, keySelector) {
  return [...groupBy(source, keySelector).entries()]
    .filter(([, grouped]) => grouped.length > 1)
    .map(
      ([key, grouped]) =>
        `${key} (${grouped.map((item) => item.id).join(", ")})`,
    );
}

function groupBy(source, keySelector) {
  const result = new Map();
  for (const item of source) {
    const key = keySelector(item);
    const grouped = result.get(key) ?? [];
    grouped.push(item);
    result.set(key, grouped);
  }
  return result;
}

function normalize(value) {
  return value.replace(/[\s.!?·,]/g, "").toLowerCase();
}

function unquote(value) {
  return value.replaceAll("`", "");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
