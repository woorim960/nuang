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
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_REVISED_V2_2.json",
);
const auditPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_P0_REVISED_RECOMPOSITION_AUDIT_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "66_P0_REVISED_LEDGER_RECOMPOSITION_AUDIT_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const baseLedger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2_2.json",
);
const profileRebase = readJson(
  generatedDirectory,
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_2.json",
);
const oldRevisedDraft = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_P0_REVISED_DRAFT_CAB_01_V2_1.json",
);
const flaggedScreen = readJson(
  reviewDirectory,
  "TRAIT_MAP_P0_FLAGGED_INTERNAL_SCREEN_V2_2.json",
);
const baseEntryById = new Map(
  baseLedger.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const oldRevisedVariants = oldRevisedDraft.variants.filter(
  (variant) => variant.provenance.internalRevision,
);
const migratedV21Revisions = [];
const retiredV21Revisions = [];
for (const oldVariant of oldRevisedVariants) {
  const baseEntry = baseEntryById.get(oldVariant.canonicalVariantId);
  if (!baseEntry) {
    retiredV21Revisions.push({
      canonicalVariantId: oldVariant.canonicalVariantId,
      reason:
        "v2.2 축 범위 정리로 canonical ID가 사라져 교정 문장을 새 기준선에 적용하지 않는다.",
      preservedInAuditTrail: true,
    });
    continue;
  }
  const previousContent =
    oldVariant.provenance.internalRevision.previousContent;
  if (!sameContent(previousContent, baseEntry.content)) {
    throw new Error(
      `Unsafe v2.1 revision migration: ID matches but previous content differs for ${oldVariant.canonicalVariantId}`,
    );
  }
  migratedV21Revisions.push({
    canonicalVariantId: oldVariant.canonicalVariantId,
    previousContent,
    revisedContent: oldVariant.canonicalDisplayDraft,
    internalRevision: oldVariant.provenance.internalRevision,
    migrationBasis:
      "canonical ID와 v2.1 교정 전 summary·detail 문단이 v2.2 기준 콘텐츠와 정확히 일치한다.",
  });
}
const newRevisions = flaggedScreen.entries
  .filter((entry) => entry.proposedRevision)
  .map((entry) => ({
    canonicalVariantId: entry.canonicalVariantId,
    previousContent: entry.originalContent,
    revisedContent: entry.proposedRevision,
    internalRevision: {
      issueCodes: entry.automatedFlags.map((flag) => flag.code),
      rationale: entry.internalScreening.rationale,
      revisionType: entry.proposedRevision.revisionType,
      reviewerType: "model_internal_content_screen",
      state:
        "internal_editorial_candidate_independent_review_required",
    },
    migrationBasis: null,
  }));
const revisions = [...migratedV21Revisions, ...newRevisions];
if (
  new Set(
    revisions.map((revision) => revision.canonicalVariantId),
  ).size !== revisions.length
) {
  throw new Error("Duplicate P0 revision canonical ID.");
}
const revisionById = new Map(
  revisions.map((revision) => [
    revision.canonicalVariantId,
    revision,
  ]),
);

const entries = baseLedger.entries.map((entry) => {
  const revision = revisionById.get(entry.canonicalVariantId);
  const common = entry.semanticAxes.length === 0;
  const revisedContent = revision
    ? {
        summaryText: revision.revisedContent.summaryText,
        detailParagraphs: revision.revisedContent.detailParagraphs,
        contentShape: revision.revisedContent.contentShape,
      }
    : entry.content;
  return {
    ...entry,
    version: revision ? entry.version + 1 : entry.version,
    content: revisedContent,
    provenance: {
      ...entry.provenance,
      p0Revision: revision
        ? {
            previousContent: revision.previousContent,
            internalRevision: revision.internalRevision,
            migratedFromV21: Boolean(revision.migrationBasis),
            migrationBasis: revision.migrationBasis,
            appliedAt: "2026-07-24T00:00:00.000Z",
          }
        : null,
    },
    surfacePolicy: common
      ? {
          mode: "context_scaffolding_only",
          reason:
            "32개 코드 모두에 같은 문장으로 연결되어 개인 성향 차이를 설명하지 않으므로 연구 계보와 상황 안내에만 사용한다.",
          allowedSurfaces: ["internal_research"],
          prohibitedSurfaces: [
            "result_summary",
            "trait_map_detail",
            "comparison_report",
            "public_profile",
            "share_card",
          ],
        }
      : {
          mode: "personalized_trait_content_candidate",
          reason:
            "하나 이상의 의미 축을 사용하지만 독립 검토와 사용자 검증 전까지 연구용이다.",
          allowedSurfaces: ["internal_research"],
          prohibitedSurfaces: [],
        },
    release: {
      ...entry.release,
      publicationState: "research_only",
      eligibleSurfaces: common
        ? []
        : entry.release.eligibleSurfaces,
      prohibitedSurfaces: [
        ...new Set([
          ...entry.release.prohibitedSurfaces,
          ...(common
            ? [
                "result_summary",
                "trait_map_detail",
                "comparison_report",
                "public_profile",
                "share_card",
              ]
            : []),
        ]),
      ],
    },
  };
});

const entryById = new Map(
  entries.map((entry) => [entry.canonicalVariantId, entry]),
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
const profileByCode = new Map(
  profileRebase.profiles.map((profile) => [profile.code, profile]),
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
    "nuang-trait-map-canonical-content-ledger.p0-revised.v2.2",
  reportId: "TRAIT-MAP-CANONICAL-CONTENT-LEDGER-P0-REVISED.0.1",
  status: recompositionPassed
    ? "P0_REVISED_CONTENT_LEDGER_STRUCTURALLY_READY_INDEPENDENT_REVIEW_PENDING"
    : "P0_REVISED_CONTENT_LEDGER_REPAIR_REQUIRED",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: baseLedger.reportId,
  summary: {
    ...baseLedger.summary,
    entries: entries.length,
    revisedEntries: revisions.length,
    migratedV21Revisions: migratedV21Revisions.length,
    newV22Revisions: newRevisions.length,
    retiredV21Revisions: retiredV21Revisions.length,
    axisFreeCommonEntries: entries.filter(
      (entry) => entry.semanticAxes.length === 0,
    ).length,
    personalizedSurfaceEligibleEntries: entries.filter(
      (entry) =>
        entry.surfacePolicy.mode ===
        "personalized_trait_content_candidate",
    ).length,
    independentlyApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  revisionLineage: {
    migratedV21Revisions,
    newV22Revisions: newRevisions.map((revision) => ({
      canonicalVariantId: revision.canonicalVariantId,
      previousContent: revision.previousContent,
      revisedContent: revision.revisedContent,
      internalRevision: revision.internalRevision,
    })),
    retiredV21Revisions,
  },
  entries,
};
const audit = {
  contractVersion:
    "nuang-trait-map-p0-revised-recomposition-audit.v2.2",
  reportId: "TRAIT-MAP-P0-REVISED-RECOMPOSITION-AUDIT.0.1",
  status: recompositionPassed
    ? "P0_REVISED_RECOMPOSITION_PASSED_INDEPENDENT_REVIEW_PENDING"
    : "P0_REVISED_RECOMPOSITION_FAILED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  summary: {
    entries: entries.length,
    revisions: revisions.length,
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
    independentlyApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  unresolvedReferences,
  duplicateOutputs,
  unsafeFlags,
  neighborEdges,
  nextGate: {
    name: "COMMON_SURFACE_CONTRACT_AND_REMAINING_P0_READTHROUGH",
    actions: [
      "25개 COMMON entry의 상황 안내 용도와 개인화 화면 금지 규칙을 별도 계약으로 고정한다.",
      "자동 flag가 없던 P0 claim을 같은 claim 축 서명끼리 나란히 판독한다.",
      "23개 revision을 독립 7개 역할 검토 큐의 새 content version으로 보낸다.",
      "P0가 안정되면 P1·P2의 중복·축 오염·쉬운 한국어 검토를 이어간다.",
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
    console.error("v2.2 P0 revised ledger is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, ledgerOutput);
  fs.writeFileSync(auditPath, auditOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 revised ledger v2.2: ${ledger.summary.revisedEntries} revisions (${ledger.summary.migratedV21Revisions} migrated, ${ledger.summary.newV22Revisions} new), ${audit.summary.neighborEdgesPassed}/${audit.summary.neighborEdges} neighbor edges, duplicates ${audit.summary.duplicateOutputsWithinClaim}, unsafe ${audit.summary.unsafeLanguageFlags}.`,
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
          leftUniqueParagraphs: leftUnique,
          rightUniqueParagraphs: rightUnique,
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

function sameContent(previousContent, currentContent) {
  return (
    previousContent.summaryText === currentContent.summaryText &&
    JSON.stringify(previousContent.detailParagraphs) ===
      JSON.stringify(currentContent.detailParagraphs) &&
    previousContent.contentShape === currentContent.contentShape
  );
}

function unsafePattern() {
  return /무조건|절대로|틀림없이|사이코패스|소시오패스|정신질환|성격장애|지능이 낮|도덕성이 낮|나쁜 사람|관계가 실패|헤어지게|성공이 보장|알 수 없다|단정할 수 없다/;
}

function buildMarkdown(ledgerResult, auditResult) {
  return `# v2.2 P0 교정 원장과 32개 재조합 감사

- 원장 상태: \`${ledgerResult.status}\`
- 감사 상태: \`${auditResult.status}\`
- 고객 발행: \`${auditResult.publicationState}\`

## 교정 계보

- 전체 entry: ${ledgerResult.summary.entries}
- 교정 entry: ${ledgerResult.summary.revisedEntries}
- v2.1에서 안전 이관: ${ledgerResult.summary.migratedV21Revisions}
- v2.2 신규 교정: ${ledgerResult.summary.newV22Revisions}
- 축 변경으로 폐기한 v2.1 교정: ${ledgerResult.summary.retiredV21Revisions}
- 개인화 화면에서 제외한 COMMON: ${ledgerResult.summary.axisFreeCommonEntries}

## 재조합

- 32개 코드 참조: ${auditResult.summary.profileClaimReferences}
- 해결되지 않은 참조: ${auditResult.summary.unresolvedReferences}
- 한 글자 이웃: ${auditResult.summary.neighborEdgesPassed}/${auditResult.summary.neighborEdges}
- 예상 밖 변화: ${auditResult.summary.unexpectedChanges}
- 예상 변화 누락: ${auditResult.summary.missingExpectedChanges}
- 구분 불가능한 변화: ${auditResult.summary.indistinguishableExpectedChanges}
- 같은 claim의 완전 동일 출력: ${auditResult.summary.duplicateOutputsWithinClaim}
- 위험·회피 표현: ${auditResult.summary.unsafeLanguageFlags}

교정 이관은 canonical ID와 교정 전 문단이 모두 정확히 일치할 때만 허용했다.
현재 문장은 구조 감사를 통과한 내부 후보이며 독립 7개 역할과 고객 이해도
검증 전에는 발행하지 않는다.

## 다음 작업

${auditResult.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
