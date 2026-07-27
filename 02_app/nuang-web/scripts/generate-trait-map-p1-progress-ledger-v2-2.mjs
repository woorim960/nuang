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
const reviewDirectory = path.join(docsDirectory, "review");
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P1_PROGRESS_V2_2.json",
);
const auditPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_P1_PROGRESS_RECOMPOSITION_AUDIT_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "75_P1_PROGRESS_LEDGER_RECOMPOSITION_AUDIT_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const baseLedger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_COMPLETE_V2_2.json",
);
const profileRebase = readJson(
  generatedDirectory,
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_2.json",
);
const screenFileNames = fs
  .readdirSync(reviewDirectory)
  .filter((fileName) =>
    /^TRAIT_MAP_P1_INFERRED_AXIS_INTERNAL_SCREEN_BATCH_\d+_V2_2\.json$/.test(
      fileName,
    ),
  )
  .sort();
const screens = screenFileNames.map((fileName) =>
  readJson(reviewDirectory, fileName),
);
const revisionEntries = screens.flatMap((screen) =>
  screen.entries.filter((entry) => entry.proposedRevision),
);
const scopeRemovalEntries = screens.flatMap((screen) =>
  screen.entries.filter(
    (entry) =>
      entry.internalScreening.decision ===
      "remove_inferred_axis_from_claim",
  ),
);
const scopeRemovalClaimKeys = new Set(
  scopeRemovalEntries.map(
    (entry) => `${entry.claimKey}::${entry.proposedAxisAmendment.axisRef}`,
  ),
);
const revisionById = new Map(
  revisionEntries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
if (revisionById.size !== revisionEntries.length) {
  throw new Error("Overlapping P1 progress revisions.");
}
const entries = baseLedger.entries.map((entry) => {
  const revision = revisionById.get(entry.canonicalVariantId);
  if (!revision) return entry;
  if (!sameContent(entry.content, revision.originalContent)) {
    throw new Error(
      `P1 revision source mismatch: ${entry.canonicalVariantId}`,
    );
  }
  return {
    ...entry,
    version: entry.version + 1,
    content: revision.proposedRevision,
    provenance: {
      ...entry.provenance,
      p1Revision: {
        previousContent: revision.originalContent,
        internalScreening: revision.internalScreening,
        sourceScreenReportId: screens.find((screen) =>
          screen.entries.some(
            (candidate) =>
              candidate.canonicalVariantId ===
              entry.canonicalVariantId,
          ),
        ).reportId,
        state:
          "internal_editorial_candidate_independent_review_required",
      },
    },
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
const neighborEdges = buildNeighborEdges().map(auditNeighborEdge);
const recompositionPassed =
  unresolvedReferences.length === 0 &&
  duplicateOutputs.length === 0 &&
  unsafeFlags.length === 0 &&
  neighborEdges.every((edge) => edge.passed);
const ledger = {
  ...baseLedger,
  contractVersion:
    "nuang-trait-map-canonical-content-ledger.p1-progress.v2.2",
  reportId: "TRAIT-MAP-CANONICAL-CONTENT-LEDGER-P1-PROGRESS.0.1",
  status: recompositionPassed
    ? scopeRemovalEntries.length > 0
      ? "P1_PROGRESS_STRUCTURALLY_VALID_SCOPE_AMENDMENT_REQUIRED"
      : "P1_PROGRESS_STRUCTURALLY_VALID_INTERNAL_REVIEW_CONTINUES"
    : "P1_PROGRESS_REPAIR_REQUIRED",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: baseLedger.reportId,
  sourceP1ScreenReportIds: screens.map((screen) => screen.reportId),
  summary: {
    ...baseLedger.summary,
    p1BatchesScreened: screens.length,
    p1ClaimAxisReviewsScreened: screens.reduce(
      (total, screen) =>
        total + screen.summary.claimAxisReviews,
      0,
    ),
    p1VariantsScreened: screens.reduce(
      (total, screen) => total + screen.summary.variants,
      0,
    ),
    p1RevisedEntries: revisionEntries.length,
    p1ScopeRemovalClaimAxes: scopeRemovalClaimKeys.size,
    p1ScopeRemovalVariants: scopeRemovalEntries.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  p1RevisionLineage: screens.flatMap((screen) =>
    screen.entries.map((entry) => ({
      sourceScreenReportId: screen.reportId,
      canonicalVariantId: entry.canonicalVariantId,
      internalScreening: entry.internalScreening,
      proposedRevision: entry.proposedRevision,
    })),
  ),
  entries,
};
const audit = {
  contractVersion:
    "nuang-trait-map-p1-progress-recomposition-audit.v2.2",
  reportId: "TRAIT-MAP-P1-PROGRESS-RECOMPOSITION-AUDIT.0.1",
  status: recompositionPassed
    ? scopeRemovalEntries.length > 0
      ? "P1_PROGRESS_RECOMPOSITION_PASSED_SCOPE_AMENDMENT_REQUIRED"
      : "P1_PROGRESS_RECOMPOSITION_PASSED"
    : "P1_PROGRESS_RECOMPOSITION_FAILED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  summary: {
    p1BatchesScreened: screens.length,
    p1Revisions: revisionEntries.length,
    p1ScopeRemovalClaimAxes: scopeRemovalClaimKeys.size,
    p1ScopeRemovalVariants: scopeRemovalEntries.length,
    profileClaimReferences:
      profileRebase.summary.profileClaimRefs,
    unresolvedReferences: unresolvedReferences.length,
    duplicateOutputsWithinClaim: duplicateOutputs.length,
    unsafeLanguageFlags: unsafeFlags.length,
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
    name: "NEXT_UNSCREENED_P1_IAS_BATCH",
    actions: [
      "남은 추론 축 묶음을 순서대로 판독한다.",
      "새 screen이 생길 때마다 이 누적 원장과 80개 이웃 감사를 다시 생성한다.",
      "범위 제거 후보는 문장 교정으로 숨기지 않고 최종 축 수정안에 반영한다.",
      "17개 배치가 끝날 때까지 내부 진행 상태로 유지한다.",
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
    console.error("v2.2 P1 progress ledger is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, ledgerOutput);
  fs.writeFileSync(auditPath, auditOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P1 progress ledger v2.2: ${ledger.summary.p1BatchesScreened} batches, ${ledger.summary.p1RevisedEntries} revisions, ${audit.summary.neighborEdgesPassed}/${audit.summary.neighborEdges} neighbor edges, duplicates ${audit.summary.duplicateOutputsWithinClaim}, unsafe ${audit.summary.unsafeLanguageFlags}.`,
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
  return `# v2.2 P1 누적 원장·재조합 감사

- 원장 상태: \`${ledgerResult.status}\`
- 감사 상태: \`${auditResult.status}\`

## 진행

- 완료 배치: ${ledgerResult.summary.p1BatchesScreened}/17
- 판독 claim-axis: ${ledgerResult.summary.p1ClaimAxisReviewsScreened}
- 판독 문장: ${ledgerResult.summary.p1VariantsScreened}
- 교정 문장: ${ledgerResult.summary.p1RevisedEntries}
- 축 제거 후보: ${ledgerResult.summary.p1ScopeRemovalClaimAxes} claim-axis / ${ledgerResult.summary.p1ScopeRemovalVariants} 문장
- 한 글자 이웃: ${auditResult.summary.neighborEdgesPassed}/${auditResult.summary.neighborEdges}
- 동일 출력: ${auditResult.summary.duplicateOutputsWithinClaim}
- 위험 표현: ${auditResult.summary.unsafeLanguageFlags}

P1은 진행 중이며 모든 문장은 research_only다. 축 제거 후보는 현재 v2.2
구조에 아직 적용하지 않았으므로 구조 감사 통과와 의미 승인 완료를 혼동하지
않는다.

## 다음 작업

${auditResult.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
