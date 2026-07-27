import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const enakqDirectory = path.join(projectRoot, "docs/trait-maps/ENAKQ");
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/ENAKQ_BASELINE_MANIFEST.json",
);
const registryPath = path.join(
  projectRoot,
  "src/features/nuang-code/fixtures/enakq-claim-registry.generated.json",
);
const checkOnly = process.argv.includes("--check");

const chapterIdByNumber = {
  1: "overview",
  2: "role_name_and_values",
  3: "five_code_positions",
  4: "code_interactions",
  5: "first_thought_and_actual_response",
  6: "daily_choice_and_change",
  7: "family",
  8: "friend",
  9: "partner",
  10: "person_of_interest",
  11: "work_and_study",
  12: "conflict_stress_and_recovery",
  13: "strength_overuse_and_growth",
  14: "misunderstanding_and_communication",
  15: "evidence_and_method",
};

const requiredChapterIds = [
  "overview",
  "role_name_and_values",
  "five_code_positions",
  "code_interactions",
  "first_thought_and_actual_response",
  "daily_choice_and_change",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work_and_study",
  "conflict_stress_and_recovery",
  "strength_overuse_and_growth",
  "misunderstanding_and_communication",
  "neighbor_contrasts",
  "evidence_and_method",
];

const draftFiles = Array.from(
  { length: 5 },
  (_, index) => `ENAKQ_MAP_DRAFT_PART${index + 1}_V0_1.md`,
);
const evidenceLedgerFiles = Array.from(
  { length: 5 },
  (_, index) => `ENAKQ_EVIDENCE_LEDGER_PART${index + 1}_V0_1.md`,
);

const chapters = [];
let totalNonWhitespaceCharacters = 0;

for (const fileName of draftFiles) {
  const source = fs.readFileSync(path.join(enakqDirectory, fileName), "utf8");
  totalNonWhitespaceCharacters += countNonWhitespace(source);

  const headings = [...source.matchAll(/^## (\d+)\. ([^\n]+)$/gm)];
  headings.forEach((heading, index) => {
    const chapterNumber = Number(heading[1]);
    const bodyStart = heading.index + heading[0].length;
    const bodyEnd = headings[index + 1]?.index ?? source.length;
    const body = source.slice(bodyStart, bodyEnd);
    chapters.push({
      chapterNumber,
      chapterId: chapterIdByNumber[chapterNumber],
      title: heading[2].trim(),
      sourceFile: fileName,
      nonWhitespaceCharacters: countNonWhitespace(body),
    });
  });
}

chapters.sort((left, right) => left.chapterNumber - right.chapterNumber);

const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const evidenceSourceIds = new Set();
for (const fileName of evidenceLedgerFiles) {
  const source = fs.readFileSync(path.join(enakqDirectory, fileName), "utf8");
  for (const match of source.matchAll(/^### `(SRC-[^`]+)`$/gm)) {
    evidenceSourceIds.add(match[1]);
  }
}

const evidenceStatusCounts = Object.fromEntries(
  Object.entries(
    Object.groupBy(registry.entries, (entry) => entry.evidenceStatus),
  )
    .map(([status, entries]) => [status, entries.length])
    .sort(([left], [right]) => left.localeCompare(right, "en")),
);
const publicationStateCounts = Object.fromEntries(
  Object.entries(
    Object.groupBy(registry.entries, (entry) => entry.publicationState),
  )
    .map(([status, entries]) => [status, entries.length])
    .sort(([left], [right]) => left.localeCompare(right, "en")),
);
const actualChapterIds = chapters.map((chapter) => chapter.chapterId);
const missingChapterIds = requiredChapterIds.filter(
  (chapterId) => !actualChapterIds.includes(chapterId),
);

const manifest = {
  contractVersion: "nuang-trait-map-data-center.v2",
  packageId: "ENAKQ.map.v2-migration-baseline",
  code: "ENAKQ",
  profileName: "관계를 여는 지휘자",
  sourceMapVersion: registry.mapVersion,
  migrationStatus: "MIGRATION_REQUIRED_NOT_FOR_PRODUCTION",
  sourceInventory: {
    draftFiles,
    evidenceLedgerFiles,
    registryFile: path.relative(projectRoot, registryPath),
  },
  currentMetrics: {
    totalNonWhitespaceCharacters,
    chapterCount: chapters.length,
    claimCount: registry.entries.length,
    uniqueContentKeyCount: new Set(
      registry.entries.map((entry) => entry.contentKey),
    ).size,
    evidenceSourceCount: evidenceSourceIds.size,
    structuredScenarioCount: 0,
    structuredNeighborContrastCount: 0,
    approvedClaimCount: registry.entries.filter(
      (entry) => entry.publicationState === "approved",
    ).length,
  },
  chapters,
  evidenceSourceIds: [...evidenceSourceIds].sort(),
  evidenceStatusCounts,
  publicationStateCounts,
  v2GateAudit: [
    {
      gate: "longform_characters",
      required: "50,000~60,000 non-whitespace characters",
      actual: totalNonWhitespaceCharacters,
      status:
        totalNonWhitespaceCharacters >= 50_000 &&
        totalNonWhitespaceCharacters <= 60_000
          ? "PASS"
          : "NEEDS_REVISION",
    },
    {
      gate: "required_chapters",
      required: "16 exact chapter IDs",
      actual: chapters.length,
      status: missingChapterIds.length === 0 ? "PASS" : "NEEDS_REVISION",
      missing: missingChapterIds,
    },
    {
      gate: "canonical_claims",
      required: "at least 100 claims",
      actual: registry.entries.length,
      status: registry.entries.length >= 100 ? "PASS" : "NEEDS_REVISION",
    },
    {
      gate: "evidence_sources",
      required: "at least 30 traceable sources",
      actual: evidenceSourceIds.size,
      status: evidenceSourceIds.size >= 30 ? "PASS" : "NEEDS_REVISION",
    },
    {
      gate: "scenario_coverage",
      required: "72 structured canonical scenarios",
      actual: 0,
      status: "NEEDS_MIGRATION",
    },
    {
      gate: "neighbor_contrasts",
      required: "five one-letter neighbor comparisons",
      actual: 0,
      status: "NEEDS_MIGRATION",
    },
    {
      gate: "external_expert_review",
      required: "independent qualified reviewers",
      actual: 0,
      status: "NOT_STARTED",
    },
    {
      gate: "cognitive_content_validity",
      required: "target-user comprehension evidence",
      actual: 0,
      status: "NOT_STARTED",
    },
    {
      gate: "quantitative_validation",
      required: "preregistered measurement and claim validation",
      actual: 0,
      status: "NOT_STARTED",
    },
  ],
  nextMigrationTasks: [
    "Map the 158 v0.1 claims to the v2 entity, scope, risk, and required-signal fields.",
    "Link current context claims to the 72 canonical scenario IDs.",
    "Add the missing neighbor_contrasts chapter and five one-letter comparison packets.",
    "Convert the 42 source headings into normalized source and finding records.",
    "Run external expert, cognitive, quantitative, and product release gates.",
  ],
};

const output = await prettier.format(JSON.stringify(manifest), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "ENAKQ v2 baseline manifest is stale. Run npm run research:trait-map:v2:baseline.",
    );
    process.exit(1);
  }
  console.log(
    `ENAKQ v2 baseline is current: ${totalNonWhitespaceCharacters} characters, ${chapters.length} chapters, ${registry.entries.length} claims, ${evidenceSourceIds.size} sources.`,
  );
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(
    `Generated ${path.relative(projectRoot, outputPath)} with ${chapters.length} chapters and ${registry.entries.length} claims.`,
  );
}

function countNonWhitespace(source) {
  return source.replace(/\s/g, "").length;
}
