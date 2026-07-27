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
  "docs/research/trait-map-data-center-v2/generated/ENAKQ_SCENARIO_COVERAGE.json",
);
const checkOnly = process.argv.includes("--check");

const contexts = [
  "GENERAL",
  "FAMILY",
  "FRIEND",
  "PARTNER",
  "PERSON-OF-INTEREST",
  "WORK",
];
const moments = [
  "ordinary_choice",
  "new_encounter",
  "group_participation",
  "plan_change",
  "uncertainty",
  "disagreement",
  "support_requested",
  "need_expression",
  "boundary",
  "success",
  "setback",
  "aftermath",
];
const migration = JSON.parse(fs.readFileSync(migrationPath, "utf8"));
const claimsByScenario = new Map();

for (const item of migration.claims) {
  for (const scenarioRef of item.v2Claim.scenarioRefs) {
    const current = claimsByScenario.get(scenarioRef) ?? [];
    current.push(item.v2Claim.claimId);
    claimsByScenario.set(scenarioRef, current);
  }
}

const rows = contexts.flatMap((context) =>
  moments.map((moment, index) => {
    const scenarioId = `SCN-${context}-${index + 1}`;
    const claimRefs = [...new Set(claimsByScenario.get(scenarioId) ?? [])].sort();
    return {
      scenarioId,
      relationshipContext: context.toLowerCase().replaceAll("-", "_"),
      moment,
      claimRefs,
      status:
        claimRefs.length > 0
          ? "candidate_linked_needs_review"
          : "gap_needs_claim",
    };
  }),
);

const covered = rows.filter((row) => row.claimRefs.length > 0).length;
const report = {
  contractVersion: "nuang-trait-map-data-center.v2",
  reportId: "ENAKQ-SCENARIO-COVERAGE.0.1",
  code: "ENAKQ",
  status: "RESEARCH_GAP_AUDIT_NOT_FOR_PRODUCTION",
  totalCanonicalScenarios: rows.length,
  candidateCoveredScenarios: covered,
  gapScenarios: rows.length - covered,
  coveragePercent: Number(((covered / rows.length) * 100).toFixed(1)),
  rows,
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
      "ENAKQ scenario coverage report is stale. Run npm run research:trait-map:v2:enakq-coverage.",
    );
    process.exit(1);
  }
  console.log(
    `ENAKQ scenario coverage is current: ${covered}/${rows.length} candidate-covered, ${rows.length - covered} gaps.`,
  );
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output);
  console.log(
    `Generated ${path.relative(projectRoot, outputPath)} with ${covered}/${rows.length} candidate-covered scenarios.`,
  );
}
