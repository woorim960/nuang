import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const migrationPath = path.join(
  projectRoot,
  "src/features/nuang-code/fixtures/enakq-v2-migration.generated.json",
);
const outputPath = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2/generated/EVIDENCE_INVENTORY_V2.json",
);
const evidenceFiles = [
  "src/features/nuang-code/trait-map-change-context-evidence-v2.ts",
  "src/features/nuang-code/trait-map-foundation-evidence-v2.ts",
  "src/features/nuang-code/trait-map-friendship-evidence-v2.ts",
  "src/features/nuang-code/trait-map-relationship-evidence-v2.ts",
  "src/features/nuang-code/trait-map-process-evidence-v2.ts",
  "src/features/nuang-code/trait-map-work-evidence-v2.ts",
];
const aliases = {
  "SRC-BERKELEY-BFI": "SRC-BFI2-2017",
  "SRC-TEST-ADAPTATION-ITC": "SRC-ITC-2017",
};
const checkOnly = process.argv.includes("--check");

const normalizedSources = evidenceFiles.flatMap((fileName) =>
  parseNormalizedSources(
    fs.readFileSync(path.join(projectRoot, fileName), "utf8"),
    fileName,
  ),
);
const normalizedFindings = evidenceFiles.flatMap((fileName) =>
  parseFindingIds(fs.readFileSync(path.join(projectRoot, fileName), "utf8")),
);
const sourceById = new Map(
  normalizedSources.map((source) => [source.sourceId, source]),
);
const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));

const candidateRows = migration.sourceCandidates.map((candidate) => {
  const normalized = sourceById.get(candidate.sourceId);
  const aliasTarget = aliases[candidate.sourceId];
  if (normalized) {
    return {
      sourceId: candidate.sourceId,
      status:
        normalized.screeningStatus === "excluded"
          ? "normalized_excluded"
          : "normalized_included",
      normalizedSourceId: normalized.sourceId,
      sourceFile: normalized.sourceFile,
    };
  }
  if (aliasTarget && sourceById.has(aliasTarget)) {
    return {
      sourceId: candidate.sourceId,
      status: "alias_needs_source_id_merge",
      normalizedSourceId: aliasTarget,
      sourceFile: sourceById.get(aliasTarget).sourceFile,
    };
  }
  return {
    sourceId: candidate.sourceId,
    status: "normalization_pending",
    normalizedSourceId: null,
    sourceFile: null,
  };
});

const count = (status) =>
  candidateRows.filter((row) => row.status === status).length;
const supplementalSources = normalizedSources
  .filter(
    (source) =>
      !candidateRows.some(
        (row) => row.normalizedSourceId === source.sourceId,
      ),
  )
  .map((source) => ({
    sourceId: source.sourceId,
    screeningStatus: source.screeningStatus,
    sourceFile: source.sourceFile,
  }));

const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "TRAIT-MAP-EVIDENCE-INVENTORY.0.1",
  status: "RESEARCH_INVENTORY_NOT_FOR_PRODUCTION",
  normalizedRegistry: {
    totalSources: normalizedSources.length,
    includedSources: normalizedSources.filter(
      (source) => source.screeningStatus === "included",
    ).length,
    excludedSources: normalizedSources.filter(
      (source) => source.screeningStatus === "excluded",
    ).length,
    totalFindings: normalizedFindings.length,
  },
  enakqLegacyCandidateAudit: {
    totalCandidates: candidateRows.length,
    normalizedIncluded: count("normalized_included"),
    normalizedExcluded: count("normalized_excluded"),
    aliasesNeedingMerge: count("alias_needs_source_id_merge"),
    normalizationPending: count("normalization_pending"),
  },
  candidateRows,
  supplementalSources,
  nextRule:
    "normalization_pending 자료는 원문 서지·방법·결과·제한을 확인하기 전까지 claim에 연결하지 않는다.",
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});

if (checkOnly) {
  if (
    !fs.existsSync(outputPath) ||
    fs.readFileSync(outputPath, "utf8") !== output
  ) {
    console.error(
      "Trait-map evidence inventory is stale. Run npm run research:trait-map:v2:evidence-inventory.",
    );
    process.exit(1);
  }
  console.log(
    `Evidence inventory is current: ${report.normalizedRegistry.includedSources} included, ${report.normalizedRegistry.excludedSources} excluded, ${report.enakqLegacyCandidateAudit.normalizationPending} ENAKQ candidates pending.`,
  );
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(
    `Generated ${path.relative(projectRoot, outputPath)} with ${report.normalizedRegistry.totalSources} normalized sources and ${report.normalizedRegistry.totalFindings} findings.`,
  );
}

function parseNormalizedSources(source, sourceFile) {
  const sourceSection = source.split(
    /export const .*EvidenceFindingsV2\s*=/,
  )[0];
  return [
    ...sourceSection.matchAll(
      /sourceId:\s*"(SRC-[A-Z0-9-]+)"[\s\S]*?screeningStatus:\s*"(candidate|included|excluded|replaced)"/g,
    ),
  ].map((match) => ({
    sourceId: match[1],
    screeningStatus: match[2],
    sourceFile,
  }));
}

function parseFindingIds(source) {
  const findingSection =
    source.split(/export const .*EvidenceFindingsV2\s*=/)[1] ?? "";
  return [
    ...findingSection.matchAll(/findingId:\s*"(FND-[A-Z0-9-]+)"/g),
  ].map((match) => match[1]);
}
