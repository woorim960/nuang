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
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_COMPLETE_V2_2.json",
);
const auditPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_P0_COMPLETE_RECOMPOSITION_AUDIT_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "70_P0_COMPLETE_LEDGER_RECOMPOSITION_AUDIT_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const baseLedger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_REVISED_V2_2.json",
);
const profileRebase = readJson(
  generatedDirectory,
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_2.json",
);
const revisionReport = readJson(
  reviewDirectory,
  "TRAIT_MAP_REMAINING_P0_INTERNAL_REVISIONS_V2_2.json",
);
const revisionById = new Map(
  revisionReport.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const entries = baseLedger.entries.map((entry) => {
  const revision = revisionById.get(entry.canonicalVariantId);
  if (!revision) return entry;
  if (
    !sameContent(entry.content, revision.originalContent) ||
    entry.provenance.p0Revision
  ) {
    throw new Error(
      `Unsafe or overlapping remaining P0 revision: ${entry.canonicalVariantId}`,
    );
  }
  return {
    ...entry,
    version: entry.version + 1,
    content: {
      summaryText: revision.proposedRevision.summaryText,
      detailParagraphs:
        revision.proposedRevision.detailParagraphs,
      contentShape: revision.proposedRevision.contentShape,
    },
    provenance: {
      ...entry.provenance,
      p0Revision: {
        previousContent: revision.originalContent,
        internalRevision: {
          decision: revision.internalScreening.decision,
          rationale: revision.internalScreening.rationale,
          revisionType: revision.proposedRevision.revisionType,
          reviewerType:
            revision.internalScreening.reviewerType,
          state:
            "internal_editorial_candidate_independent_review_required",
        },
        migratedFromV21: false,
        migrationBasis: null,
        appliedAt: "2026-07-24T00:00:00.000Z",
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
    profile.claimRefs
      .filter((claim) => !entryById.has(claim.canonicalVariantId))
      .map((claim) => ({
        code: profile.code,
        claimKey: claim.claimKey,
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
const neighborEdges = buildNeighborEdges().map(auditNeighborEdge);
const recompositionPassed =
  unresolvedReferences.length === 0 &&
  duplicateOutputs.length === 0 &&
  unsafeFlags.length === 0 &&
  neighborEdges.every((edge) => edge.passed);
const allP0RevisionIds = entries
  .filter((entry) => entry.provenance.p0Revision)
  .map((entry) => entry.canonicalVariantId);
const ledger = {
  ...baseLedger,
  contractVersion:
    "nuang-trait-map-canonical-content-ledger.p0-complete.v2.2",
  reportId: "TRAIT-MAP-CANONICAL-CONTENT-LEDGER-P0-COMPLETE.0.1",
  status: recompositionPassed
    ? "P0_INTERNAL_CONTENT_BASELINE_COMPLETE_INDEPENDENT_REVIEW_PENDING"
    : "P0_INTERNAL_CONTENT_BASELINE_REPAIR_REQUIRED",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: baseLedger.reportId,
  sourceRemainingP0RevisionReportId: revisionReport.reportId,
  summary: {
    ...baseLedger.summary,
    entries: entries.length,
    priorP0RevisedEntries:
      baseLedger.summary.revisedEntries,
    remainingP0RevisedEntries: revisionReport.summary.reviewedEntries,
    totalP0RevisedEntries: allP0RevisionIds.length,
    axisFreeCommonEntries: entries.filter(
      (entry) => entry.semanticAxes.length === 0,
    ).length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  revisionLineage: {
    ...baseLedger.revisionLineage,
    remainingP0Revisions: revisionReport.entries.map((entry) => ({
      canonicalVariantId: entry.canonicalVariantId,
      previousContent: entry.originalContent,
      revisedContent: entry.proposedRevision,
      internalScreening: entry.internalScreening,
    })),
  },
  entries,
};
const audit = {
  contractVersion:
    "nuang-trait-map-p0-complete-recomposition-audit.v2.2",
  reportId: "TRAIT-MAP-P0-COMPLETE-RECOMPOSITION-AUDIT.0.1",
  status: recompositionPassed
    ? "P0_COMPLETE_RECOMPOSITION_PASSED_INDEPENDENT_REVIEW_PENDING"
    : "P0_COMPLETE_RECOMPOSITION_FAILED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  summary: {
    entries: entries.length,
    totalP0Revisions: allP0RevisionIds.length,
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
      (total, edge) => total + edge.unexpectedChanges.length,
      0,
    ),
    missingExpectedChanges: neighborEdges.reduce(
      (total, edge) => total + edge.missingExpectedChanges.length,
      0,
    ),
    indistinguishableExpectedChanges: neighborEdges.reduce(
      (total, edge) =>
        total + edge.indistinguishableExpectedChanges.length,
      0,
    ),
    recompositionPassed,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  unresolvedReferences,
  duplicateOutputs,
  unsafeFlags,
  neighborEdges,
  nextGate: {
    name: "P0_EVIDENCE_PACKET_FREEZE_AND_P1_SCREEN",
    actions: [
      "P0 110개를 비노출 COMMON, 교정 후보, 유지 후보로 정산한 증거 패킷을 고정한다.",
      "P0 문장을 7개 독립 역할과 고객 이해도 검증에 전달할 수 있는 형식으로 묶는다.",
      "동시에 P1의 자동 중복·축 오염·쉬운 한국어 사전검수를 시작한다.",
      "검토 전까지 모든 콘텐츠를 research_only로 유지한다.",
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
    console.error("v2.2 P0 complete ledger is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, ledgerOutput);
  fs.writeFileSync(auditPath, auditOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 complete ledger v2.2: ${ledger.summary.totalP0RevisedEntries} total revisions, ${audit.summary.neighborEdgesPassed}/${audit.summary.neighborEdges} neighbor edges, duplicates ${audit.summary.duplicateOutputsWithinClaim}, unsafe ${audit.summary.unsafeLanguageFlags}.`,
);

function auditNeighborEdge(edge) {
  const leftProfile = profileByCode.get(edge.leftCode);
  const rightProfile = profileByCode.get(edge.rightCode);
  const unexpectedChanges = [];
  const missingExpectedChanges = [];
  const indistinguishableExpectedChanges = [];
  for (let index = 0; index < leftProfile.claimRefs.length; index += 1) {
    const leftRef = leftProfile.claimRefs[index];
    const rightRef = rightProfile.claimRefs[index];
    const leftEntry = entryById.get(leftRef.canonicalVariantId);
    const rightEntry = entryById.get(rightRef.canonicalVariantId);
    const shouldChange = leftEntry.semanticAxes.includes(edge.axisRef);
    const canonicalChanged =
      leftRef.canonicalVariantId !== rightRef.canonicalVariantId;
    if (shouldChange && !canonicalChanged) {
      missingExpectedChanges.push({
        claimKey: leftRef.claimKey,
        canonicalVariantId: leftRef.canonicalVariantId,
      });
    } else if (!shouldChange && canonicalChanged) {
      unexpectedChanges.push({
        claimKey: leftRef.claimKey,
        leftCanonicalVariantId: leftRef.canonicalVariantId,
        rightCanonicalVariantId: rightRef.canonicalVariantId,
      });
    } else if (shouldChange) {
      const leftParagraphs = leftEntry.content.detailParagraphs;
      const rightParagraphs = rightEntry.content.detailParagraphs;
      const leftUnique = leftParagraphs.filter(
        (paragraph) => !rightParagraphs.includes(paragraph),
      );
      const rightUnique = rightParagraphs.filter(
        (paragraph) => !leftParagraphs.includes(paragraph),
      );
      if (leftUnique.length === 0 || rightUnique.length === 0) {
        indistinguishableExpectedChanges.push({
          claimKey: leftRef.claimKey,
          leftCanonicalVariantId: leftRef.canonicalVariantId,
          rightCanonicalVariantId: rightRef.canonicalVariantId,
        });
      }
    }
  }
  return {
    ...edge,
    unexpectedChanges,
    missingExpectedChanges,
    indistinguishableExpectedChanges,
    passed:
      unexpectedChanges.length === 0 &&
      missingExpectedChanges.length === 0 &&
      indistinguishableExpectedChanges.length === 0,
  };
}

function buildNeighborEdges() {
  const axes = [
    { axisRef: "SE", index: 0, left: "E", right: "I" },
    { axisRef: "OE", index: 1, left: "R", right: "N" },
    { axisRef: "RO", index: 2, left: "G", right: "A" },
    { axisRef: "SM", index: 3, left: "K", right: "M" },
    { axisRef: "ER", index: 4, left: "C", right: "Q" },
  ];
  return profileRebase.profiles.flatMap((profile) =>
    axes
      .filter((axis) => profile.code[axis.index] === axis.left)
      .map((axis) => ({
        leftCode: profile.code,
        rightCode:
          profile.code.slice(0, axis.index) +
          axis.right +
          profile.code.slice(axis.index + 1),
        axisRef: axis.axisRef,
      })),
  );
}

function findDuplicateOutputs(items) {
  return [
    ...Map.groupBy(items, (entry) => entry.claimKey).entries(),
  ].flatMap(([claimKey, claimEntries]) => {
    const byOutput = Map.groupBy(
      claimEntries,
      (entry) =>
        `${entry.content.summaryText}\n${entry.content.detailParagraphs.join("\n")}`,
    );
    return [...byOutput.entries()]
      .filter(([, outputEntries]) => outputEntries.length > 1)
      .map(([output, outputEntries]) => ({
        claimKey,
        canonicalVariantIds: outputEntries.map(
          (entry) => entry.canonicalVariantId,
        ),
        output,
      }));
  });
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
  return `# v2.2 P0 내부 기준선 완결 원장·재조합 감사

- 원장 상태: \`${ledgerResult.status}\`
- 감사 상태: \`${auditResult.status}\`
- 고객 발행: \`${auditResult.publicationState}\`

## P0 교정

- 앞 단계 교정: ${ledgerResult.summary.priorP0RevisedEntries}
- 남은 P0 교정: ${ledgerResult.summary.remainingP0RevisedEntries}
- 전체 P0 교정 entry: ${ledgerResult.summary.totalP0RevisedEntries}
- 비노출 COMMON: ${ledgerResult.summary.axisFreeCommonEntries}

## 재조합

- 32개 코드 참조: ${auditResult.summary.profileClaimReferences}
- 한 글자 이웃: ${auditResult.summary.neighborEdgesPassed}/${auditResult.summary.neighborEdges}
- 예상 밖 변화: ${auditResult.summary.unexpectedChanges}
- 예상 변화 누락: ${auditResult.summary.missingExpectedChanges}
- 구분 불가능한 변화: ${auditResult.summary.indistinguishableExpectedChanges}
- 같은 claim의 동일 출력: ${auditResult.summary.duplicateOutputsWithinClaim}
- 위험·회피 표현: ${auditResult.summary.unsafeLanguageFlags}

P0 내부 문장 기준선은 구조적으로 완결됐다. 이는 독립 전문가 승인이나
심리측정 타당화가 아니며, 7개 역할과 고객 이해도 검증 전에는 발행하지 않는다.

## 다음 작업

${auditResult.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
