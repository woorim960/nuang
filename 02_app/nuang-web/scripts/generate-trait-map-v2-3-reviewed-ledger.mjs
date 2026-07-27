import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const docsDirectory = path.join(
  projectRoot,
  "docs/research/trait-map-data-center-v2",
);
const generatedDirectory = path.join(docsDirectory, "generated");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_REVIEWED_V2_3.json",
);
const auditPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_REVIEWED_RECOMPOSITION_AUDIT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "106_REVIEWED_LEDGER_SAFE_MIGRATION_RECOMPOSITION_AUDIT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const baseLedger = readJson(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2_3.json",
);
const oldLedger = readJson(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P1_PROGRESS_V2_2.json",
);
const profileRebase = readJson(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const oldById = new Map(
  oldLedger.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const migrationRecords = [];
const entries = baseLedger.entries.map((entry) => {
  const old = oldById.get(entry.canonicalVariantId);
  const commonRelease =
    entry.semanticAxes.length === 0
      ? {
          ...entry.release,
          publicationState: "research_only",
          eligibleSurfaces: [],
          prohibitedSurfaces: [
            "result_summary",
            "trait_map_detail",
            "comparison_report",
            "public_profile",
            "share_card",
          ],
        }
      : entry.release;
  if (!old || old.version === 1) {
    return {
      ...entry,
      release: commonRelease,
      commonPersonalizationPolicy:
        entry.semanticAxes.length === 0
          ? "research_lineage_only_block_all_personalized_surfaces"
          : null,
    };
  }
  const revisionType = old.provenance.p1Revision
    ? "p1"
    : old.provenance.p0Revision
      ? "p0"
      : null;
  const revision = old.provenance[`${revisionType}Revision`];
  if (!revisionType || !sameContent(entry.content, revision.previousContent)) {
    throw new Error(
      `Unsafe v2.3 revision migration: ${entry.canonicalVariantId}`,
    );
  }
  migrationRecords.push({
    canonicalVariantId: entry.canonicalVariantId,
    revisionType,
    sourceVersion: "v2.2",
    sourceLedgerReportId: oldLedger.reportId,
    exactCanonicalIdMatch: true,
    exactPreviousContentMatch: true,
  });
  return {
    ...entry,
    version: old.version,
    content: old.content,
    provenance: {
      ...entry.provenance,
      [`${revisionType}Revision`]: revision,
      v23SafeMigration: {
        sourceLedgerReportId: oldLedger.reportId,
        sourceVersion: "v2.2",
        exactCanonicalIdMatch: true,
        exactPreviousContentMatch: true,
        migrationBasis:
          "canonical ID와 교정 전 summary·detail·contentShape가 v2.3 기준 콘텐츠와 정확히 일치한다.",
        migratedAt: "2026-07-24T00:00:00.000Z",
      },
    },
    release: commonRelease,
    commonPersonalizationPolicy:
      entry.semanticAxes.length === 0
        ? "research_lineage_only_block_all_personalized_surfaces"
        : null,
  };
});
const entryById = new Map(
  entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const profileByCode = new Map(
  profileRebase.profiles.map((profile) => [profile.code, profile]),
);
const unresolvedReferences = profileRebase.profiles.flatMap(
  (profile) =>
    profile.claimRefs.filter(
      (claim) => !entryById.has(claim.canonicalVariantId),
    ),
);
const duplicateOutputs = findDuplicateOutputs(entries);
const unsafeFlags = entries.filter((entry) =>
  entry.content.detailParagraphs.some((paragraph) =>
    unsafePattern().test(paragraph),
  ),
);
const commonEntries = entries.filter(
  (entry) => entry.semanticAxes.length === 0,
);
const commonSurfaceViolations = commonEntries.filter(
  (entry) =>
    entry.release.eligibleSurfaces.length > 0 ||
    [
      "result_summary",
      "trait_map_detail",
      "comparison_report",
      "public_profile",
      "share_card",
    ].some(
      (surface) =>
        !entry.release.prohibitedSurfaces.includes(surface),
    ),
);
const neighborEdges = buildNeighborEdges().map(auditNeighborEdge);
const recompositionPassed =
  unresolvedReferences.length === 0 &&
  duplicateOutputs.length === 0 &&
  unsafeFlags.length === 0 &&
  commonSurfaceViolations.length === 0 &&
  neighborEdges.every((edge) => edge.passed);
const p0Migrations = migrationRecords.filter(
  (record) => record.revisionType === "p0",
).length;
const p1Migrations = migrationRecords.filter(
  (record) => record.revisionType === "p1",
).length;
const ledger = {
  ...baseLedger,
  contractVersion:
    "nuang-trait-map-canonical-content-ledger.reviewed.v2.3",
  reportId: "TRAIT-MAP-CANONICAL-CONTENT-LEDGER-REVIEWED.2.3",
  status: recompositionPassed
    ? "V2_3_REVIEWED_LEDGER_STRUCTURALLY_VALID_INDEPENDENT_REVIEW_PENDING"
    : "V2_3_REVIEWED_LEDGER_REPAIR_REQUIRED",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: baseLedger.reportId,
  sourceReviewedLedgerReportId: oldLedger.reportId,
  summary: {
    ...baseLedger.summary,
    safelyMigratedRevisions: migrationRecords.length,
    safelyMigratedP0Revisions: p0Migrations,
    safelyMigratedP1Revisions: p1Migrations,
    unsafeOrRetiredRevisionMigrations: 0,
    axisFreeCommonEntries: commonEntries.length,
    commonEntriesBlockedFromPersonalizedSurfaces:
      commonEntries.length - commonSurfaceViolations.length,
    commonSurfaceViolations: commonSurfaceViolations.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  migrationRecords,
  entries,
};
const audit = {
  contractVersion:
    "nuang-trait-map-reviewed-recomposition-audit.v2.3",
  reportId: "TRAIT-MAP-REVIEWED-RECOMPOSITION-AUDIT.2.3",
  status: recompositionPassed
    ? "V2_3_REVIEWED_RECOMPOSITION_PASSED"
    : "V2_3_REVIEWED_RECOMPOSITION_FAILED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  summary: {
    canonicalVariants: entries.length,
    migratedRevisions: migrationRecords.length,
    p0Migrations,
    p1Migrations,
    profileClaimReferences:
      profileRebase.summary.profileClaimRefs,
    unresolvedReferences: unresolvedReferences.length,
    duplicateOutputsWithinClaim: duplicateOutputs.length,
    unsafeLanguageFlags: unsafeFlags.length,
    commonEntries: commonEntries.length,
    commonSurfaceViolations: commonSurfaceViolations.length,
    neighborEdges: neighborEdges.length,
    neighborEdgesPassed: neighborEdges.filter(
      (edge) => edge.passed,
    ).length,
    unexpectedChanges: neighborEdges.reduce(
      (total, edge) => total + edge.unexpectedChanges,
      0,
    ),
    missingExpectedChanges: neighborEdges.reduce(
      (total, edge) => total + edge.missingExpectedChanges,
      0,
    ),
    indistinguishableExpectedChanges: neighborEdges.reduce(
      (total, edge) => total + edge.indistinguishableExpectedChanges,
      0,
    ),
    recompositionPassed,
  },
  neighborEdges,
  nextGate: {
    name: "V2_3_NEW_COMMON_AND_P2_REVIEW",
    actions: [
      "v2.3에서 새로 합쳐진 COMMON 6개 문장의 의미 손실과 중복을 판독한다.",
      "P2 개인화 문장의 쉬운 한국어·중복·축 선명도를 검사한다.",
      "독립 역할 검토와 사용자 검증 전까지 research_only로 유지한다.",
    ],
  },
};

const ledgerOutput = await prettier.format(JSON.stringify(ledger), {
  parser: "json",
});
const auditOutput = await prettier.format(JSON.stringify(audit), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(ledger, audit), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(auditPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== ledgerOutput ||
    fs.readFileSync(auditPath, "utf8") !== auditOutput ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 reviewed ledger is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, ledgerOutput);
  fs.writeFileSync(auditPath, auditOutput);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Reviewed ledger v2.3: ${entries.length} variants, ${migrationRecords.length} exact migrations (P0 ${p0Migrations}, P1 ${p1Migrations}), common ${commonEntries.length}/${commonEntries.length} blocked, ${audit.summary.neighborEdgesPassed}/${audit.summary.neighborEdges} neighbors, duplicates ${duplicateOutputs.length}, unsafe ${unsafeFlags.length}.`,
);

function auditNeighborEdge(edge) {
  const left = profileByCode.get(edge.leftCode);
  const right = profileByCode.get(edge.rightCode);
  let unexpectedChanges = 0;
  let missingExpectedChanges = 0;
  let indistinguishableExpectedChanges = 0;
  for (let index = 0; index < left.claimRefs.length; index += 1) {
    const leftRef = left.claimRefs[index];
    const rightRef = right.claimRefs[index];
    const leftEntry = entryById.get(leftRef.canonicalVariantId);
    const rightEntry = entryById.get(rightRef.canonicalVariantId);
    const shouldChange = leftEntry.semanticAxes.includes(edge.axisRef);
    const changed =
      leftRef.canonicalVariantId !== rightRef.canonicalVariantId;
    if (shouldChange && !changed) missingExpectedChanges += 1;
    if (!shouldChange && changed) unexpectedChanges += 1;
    if (shouldChange && changed) {
      const leftUnique = leftEntry.content.detailParagraphs.filter(
        (paragraph) =>
          !rightEntry.content.detailParagraphs.includes(paragraph),
      );
      const rightUnique = rightEntry.content.detailParagraphs.filter(
        (paragraph) =>
          !leftEntry.content.detailParagraphs.includes(paragraph),
      );
      if (leftUnique.length === 0 || rightUnique.length === 0) {
        indistinguishableExpectedChanges += 1;
      }
    }
  }
  return {
    ...edge,
    unexpectedChanges,
    missingExpectedChanges,
    indistinguishableExpectedChanges,
    passed:
      unexpectedChanges === 0 &&
      missingExpectedChanges === 0 &&
      indistinguishableExpectedChanges === 0,
  };
}

function buildNeighborEdges() {
  const axes = [
    ["SE", 0, "E", "I"],
    ["OE", 1, "R", "N"],
    ["RO", 2, "G", "A"],
    ["SM", 3, "K", "M"],
    ["ER", 4, "C", "Q"],
  ];
  return profileRebase.profiles.flatMap((profile) =>
    axes
      .filter(([, index, left]) => profile.code[index] === left)
      .map(([axisRef, index, , right]) => ({
        leftCode: profile.code,
        rightCode:
          profile.code.slice(0, index) +
          right +
          profile.code.slice(index + 1),
        axisRef,
      })),
  );
}

function findDuplicateOutputs(items) {
  return [
    ...Map.groupBy(items, (entry) => entry.claimKey).entries(),
  ].flatMap(([claimKey, claimEntries]) => [
    ...Map.groupBy(
      claimEntries,
      (entry) =>
        `${entry.content.summaryText}\n${entry.content.detailParagraphs.join("\n")}`,
    ).entries(),
  ]
    .filter(([, outputEntries]) => outputEntries.length > 1)
    .map(([output, outputEntries]) => ({
      claimKey,
      output,
      canonicalVariantIds: outputEntries.map(
        (entry) => entry.canonicalVariantId,
      ),
    })));
}

function sameContent(left, right) {
  return (
    left.summaryText === right.summaryText &&
    JSON.stringify(left.detailParagraphs) ===
      JSON.stringify(right.detailParagraphs) &&
    left.contentShape === right.contentShape
  );
}

function unsafePattern() {
  return /무조건|절대로|틀림없이|사이코패스|소시오패스|정신질환|성격장애|지능이 낮|도덕성이 낮|나쁜 사람|관계가 실패|헤어지게|성공이 보장|알 수 없다|단정할 수 없다/;
}

function buildMarkdown(ledgerResult, auditResult) {
  return `# v2.3 검토 원장 안전 이관·재조합 감사

- canonical: ${ledgerResult.summary.entries}
- 안전 이관: ${ledgerResult.summary.safelyMigratedRevisions}
- P0 교정: ${ledgerResult.summary.safelyMigratedP0Revisions}
- P1 교정: ${ledgerResult.summary.safelyMigratedP1Revisions}
- 불일치 이관: ${ledgerResult.summary.unsafeOrRetiredRevisionMigrations}
- COMMON 차단: ${ledgerResult.summary.commonEntriesBlockedFromPersonalizedSurfaces}/${ledgerResult.summary.axisFreeCommonEntries}
- 참조: ${auditResult.summary.profileClaimReferences}
- 한 글자 이웃: ${auditResult.summary.neighborEdgesPassed}/${auditResult.summary.neighborEdges}
- 동일 출력: ${auditResult.summary.duplicateOutputsWithinClaim}
- 위험 표현: ${auditResult.summary.unsafeLanguageFlags}

v2.2의 P0 73개와 P1 74개 교정은 canonical ID와 교정 전 문장이 v2.3
기준 문장과 정확히 일치한 경우에만 이관했다. v2.3의 COMMON 61개는
연구 계보로 보존하되 결과·성향지도·비교·프로필·공유에서 모두 차단했다.

모든 문장은 research_only이며 독립 역할 승인과 사용자 검증은 아직
완료되지 않았다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
