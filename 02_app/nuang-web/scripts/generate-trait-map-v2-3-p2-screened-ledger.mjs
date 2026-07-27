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
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const auditPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "112_P2_SCREENED_LEDGER_RECOMPOSITION_AUDIT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const ledger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_REVIEWED_V2_3.json",
);
const profileRebase = readGenerated(
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const screen = readReview(
  "TRAIT_MAP_P2_FLAGGED_INTERNAL_SCREEN_V2_3.json",
);
const revisions = new Map(
  screen.decisions
    .filter((decision) => decision.decision === "revise_for_axis_clarity")
    .map((decision) => [decision.canonicalVariantId, decision]),
);
const appliedRevisionIds = [];
const entries = ledger.entries.map((entry) => {
  const revision = revisions.get(entry.canonicalVariantId);
  if (!revision) return entry;
  if (!sameContent(entry.content, revision.previousContent)) {
    throw new Error(
      `Unsafe P2 revision application: ${entry.canonicalVariantId}`,
    );
  }
  appliedRevisionIds.push(entry.canonicalVariantId);
  return {
    ...entry,
    version: entry.version + 1,
    content: revision.revisedContent,
    provenance: {
      ...entry.provenance,
      p2Revision: {
        sourceScreenReportId: screen.reportId,
        decision: revision.decision,
        rationale: revision.rationale,
        previousContent: revision.previousContent,
        revisedContent: revision.revisedContent,
        internalReviewState: "completed",
        independentRoleReviewState: "pending",
        customerApprovalState: "pending",
        revisedAt: "2026-07-24T00:00:00.000Z",
      },
    },
    release: {
      ...entry.release,
      publicationState: "research_only",
    },
  };
});
const missingRevisions = [...revisions.keys()].filter(
  (id) => !appliedRevisionIds.includes(id),
);
if (missingRevisions.length > 0) {
  throw new Error(`P2 revisions not applied: ${missingRevisions.join(", ")}`);
}

const entryById = new Map(
  entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const profileByCode = new Map(
  profileRebase.profiles.map((profile) => [profile.code, profile]),
);
const unresolvedReferences = profileRebase.profiles.flatMap((profile) =>
  profile.claimRefs
    .filter((claim) => !entryById.has(claim.canonicalVariantId))
    .map((claim) => ({
      code: profile.code,
      canonicalVariantId: claim.canonicalVariantId,
    })),
);
const duplicateOutputs = findDuplicateOutputs(entries);
const unsafeFlags = entries.flatMap((entry) =>
  entry.content.detailParagraphs
    .filter((paragraph) => unsafePattern().test(paragraph))
    .map((paragraph) => ({
      canonicalVariantId: entry.canonicalVariantId,
      paragraph,
    })),
);
const commonSurfaceViolations = entries
  .filter((entry) => entry.semanticAxes.length === 0)
  .filter(
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
  appliedRevisionIds.length === screen.summary.revisionCandidates &&
  unresolvedReferences.length === 0 &&
  duplicateOutputs.length === 0 &&
  unsafeFlags.length === 0 &&
  commonSurfaceViolations.length === 0 &&
  neighborEdges.every((edge) => edge.passed);
const resultLedger = {
  ...ledger,
  contractVersion:
    "nuang-trait-map-canonical-content-ledger.p2-screened.v2.3",
  reportId: "TRAIT-MAP-CANONICAL-CONTENT-LEDGER-P2-SCREENED.2.3",
  status: recompositionPassed
    ? "P2_SCREENED_LEDGER_STRUCTURALLY_VALID_INDEPENDENT_REVIEW_PENDING"
    : "P2_SCREENED_LEDGER_REPAIR_REQUIRED",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceP2ScreenReportId: screen.reportId,
  summary: {
    ...ledger.summary,
    p2FlaggedEntriesReviewed: screen.summary.flaggedEntries,
    p2LexicalFalsePositivesRetained:
      screen.summary.retainLexicalFalsePositives,
    p2RevisionsApplied: appliedRevisionIds.length,
    p2UnresolvedInternalDecisions:
      screen.summary.unresolvedInternalDecisions,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  p2RevisionRecords: appliedRevisionIds.map((canonicalVariantId) => ({
    canonicalVariantId,
    sourceScreenReportId: screen.reportId,
    exactPreviousContentMatch: true,
    independentRoleReviewState: "pending",
    publicationState: "research_only",
  })),
  entries,
};
const audit = {
  contractVersion:
    "nuang-trait-map-p2-screened-recomposition-audit.v2.3",
  reportId: "TRAIT-MAP-P2-SCREENED-RECOMPOSITION-AUDIT.2.3",
  status: recompositionPassed
    ? "P2_SCREENED_RECOMPOSITION_PASSED"
    : "P2_SCREENED_RECOMPOSITION_FAILED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: resultLedger.reportId,
  sourceP2ScreenReportId: screen.reportId,
  summary: {
    canonicalVariants: entries.length,
    p2RevisionsExpected: screen.summary.revisionCandidates,
    p2RevisionsApplied: appliedRevisionIds.length,
    profileClaimReferences: profileRebase.summary.profileClaimRefs,
    unresolvedReferences: unresolvedReferences.length,
    duplicateOutputsWithinClaim: duplicateOutputs.length,
    unsafeLanguageFlags: unsafeFlags.length,
    commonSurfaceViolations: commonSurfaceViolations.length,
    neighborEdges: neighborEdges.length,
    neighborEdgesPassed: neighborEdges.filter((edge) => edge.passed)
      .length,
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
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  appliedRevisionIds,
  unresolvedReferences,
  duplicateOutputs,
  unsafeFlags,
  commonSurfaceViolations: commonSurfaceViolations.map(
    (entry) => entry.canonicalVariantId,
  ),
  neighborEdges,
  nextGate: {
    name: "REFRESH_INDEPENDENT_REVIEW_QUEUE_AFTER_P2_SCREEN",
    actions: [
      "교정된 P2 14개를 P0 독립 검토 대상으로 승격한다.",
      "유지된 P2와 무표시 P2는 축·맥락별 층화 표본 검토 대상으로 묶는다.",
      "독립 검토와 사용자 인지 면담 전까지 모든 문장을 research_only로 유지한다.",
    ],
  },
};

const ledgerOutput = await prettier.format(JSON.stringify(resultLedger), {
  parser: "json",
});
const auditOutput = await prettier.format(JSON.stringify(audit), {
  parser: "json",
});
const markdown = await prettier.format(
  buildMarkdown(resultLedger, audit),
  { parser: "markdown" },
);
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(auditPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== ledgerOutput ||
    fs.readFileSync(auditPath, "utf8") !== auditOutput ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 P2-screened ledger is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, ledgerOutput);
  fs.writeFileSync(auditPath, auditOutput);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P2-screened ledger v2.3: ${entries.length} variants, ${appliedRevisionIds.length} revisions, ${audit.summary.neighborEdgesPassed}/${audit.summary.neighborEdges} neighbors, duplicates ${duplicateOutputs.length}, unsafe ${unsafeFlags.length}.`,
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
  return `# v2.3 P2 판독 원장·재조합 감사

- canonical: ${auditResult.summary.canonicalVariants}
- P2 표시 문장 판독: ${ledgerResult.summary.p2FlaggedEntriesReviewed}
- 어휘 사전 오탐 유지: ${ledgerResult.summary.p2LexicalFalsePositivesRetained}
- 교정 적용: ${auditResult.summary.p2RevisionsApplied}/${auditResult.summary.p2RevisionsExpected}
- 참조: ${auditResult.summary.profileClaimReferences}
- 한 글자 이웃: ${auditResult.summary.neighborEdgesPassed}/${auditResult.summary.neighborEdges}
- 예상 밖 변화: ${auditResult.summary.unexpectedChanges}
- 빠진 변화: ${auditResult.summary.missingExpectedChanges}
- 구별되지 않는 변화: ${auditResult.summary.indistinguishableExpectedChanges}
- 동일 출력: ${auditResult.summary.duplicateOutputsWithinClaim}
- 위험 표현: ${auditResult.summary.unsafeLanguageFlags}
- COMMON 노출 위반: ${auditResult.summary.commonSurfaceViolations}
- 독립 승인: 0

P2 자동 검사에서 표시된 43개 중 의미가 흐린 14개를 정확한 교정 전
문장과 일치할 때만 적용했다. 교정 후 32개 성향의 한 글자 이웃 80쌍과
전체 원장의 중복·위험 표현·COMMON 노출을 다시 검사했다.

구조 검사를 통과했더라도 독립 심리측정 검토와 사용자 인지 면담은
완료되지 않았다. 교정된 14개는 P0 독립 검토 대상으로 승격하며 전체
원장은 계속 research_only로 유지한다.
`;
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function readReview(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}
