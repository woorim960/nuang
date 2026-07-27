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
  "TRAIT_MAP_REVISION_IMPACT_DRY_RUN_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "131_REVISION_IMPACT_DRY_RUN_ENGINE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const inputArgument = process.argv.find((argument) =>
  argument.startsWith("--input="),
);
const customInputPath = inputArgument
  ? path.resolve(process.cwd(), inputArgument.slice("--input=".length))
  : null;
const ledger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const profiles = readJson(
  generatedDirectory,
  "TRAIT_MAP_32_PROFILE_CANONICAL_REBASE_V2_3.json",
);
const recomposition = readJson(
  generatedDirectory,
  "TRAIT_MAP_P2_SCREENED_RECOMPOSITION_AUDIT_V2_3.json",
);
const defaultInputPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_REVIEW_IMPORT_EMPTY_V2_3.json",
);
const importBatch = readJsonPath(customInputPath ?? defaultInputPath);
const entryById = new Map(
  ledger.entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const claimEntries = Map.groupBy(ledger.entries, (entry) => entry.claimKey);
const profileRefsByCanonical = new Map();
for (const profile of profiles.profiles) {
  for (const claimRef of profile.claimRefs) {
    const profileCodes =
      profileRefsByCanonical.get(claimRef.canonicalVariantId) ?? [];
    profileCodes.push(profile.code);
    profileRefsByCanonical.set(
      claimRef.canonicalVariantId,
      profileCodes,
    );
  }
}

const proposalImpacts = [];
const blockingErrors = [];
for (const proposal of importBatch.revisionProposals) {
  const entry = entryById.get(proposal.canonicalVariantId);
  if (!entry) {
    blockingErrors.push({
      proposalId: proposal.proposalId,
      code: "UNKNOWN_CANONICAL_VARIANT",
      canonicalVariantId: proposal.canonicalVariantId,
    });
    continue;
  }
  if (
    proposal.contentVersion !== entry.version ||
    proposal.proposedContentVersion !== entry.version + 1
  ) {
    blockingErrors.push({
      proposalId: proposal.proposalId,
      code: "VERSION_SEQUENCE_MISMATCH",
      expectedCurrentVersion: entry.version,
      expectedProposedVersion: entry.version + 1,
    });
    continue;
  }
  proposalImpacts.push(analyzeProposal(proposal, entry));
}

const selfTestEntry = ledger.entries.find(
  (entry) =>
    entry.axisSignature !== "COMMON" &&
    (profileRefsByCanonical.get(entry.canonicalVariantId)?.length ?? 0) >
      0,
);
const selfTestProposal = {
  proposalId: "SYNTHETIC-ENGINE-SELF-TEST-NOT-IMPORTABLE",
  canonicalVariantId: selfTestEntry.canonicalVariantId,
  contentVersion: selfTestEntry.version,
  proposedContentVersion: selfTestEntry.version + 1,
  changeKinds: ["WORDING"],
  replacementText: "합성 영향 계산용 문구이며 원장에 반영하지 않는다.",
  basisEventIds: ["SYNTHETIC-SELF-TEST"],
};
const selfTestImpact = analyzeProposal(
  selfTestProposal,
  selfTestEntry,
);
const dryRun = {
  contractVersion: "nuang-trait-map-revision-impact-dry-run.v2.3",
  reportId: "TRAIT-MAP-REVISION-IMPACT-DRY-RUN.2.3",
  status:
    blockingErrors.length === 0
      ? "DRY_RUN_COMPLETE_NO_COMMIT"
      : "DRY_RUN_BLOCKED_NO_COMMIT",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceProfileReportId: profiles.reportId,
  sourceRecompositionReportId: recomposition.reportId,
  sourceBatchId: importBatch.batchId,
  customInput: Boolean(customInputPath),
  summary: {
    proposalsReceived: importBatch.revisionProposals.length,
    proposalsAnalyzed: proposalImpacts.length,
    blockingErrors: blockingErrors.length,
    commitPerformed: false,
    canonicalVariantsChanged: 0,
    profileReferencesChanged: 0,
    publicationApprovalsChanged: 0,
  },
  blockingErrors,
  proposalImpacts,
  impactRules: [
    {
      changeKind: "WORDING",
      scope:
        "해당 canonical variant를 참조하는 profile과 surface를 다시 렌더링하고 승인·인지 상태를 새 version에서 초기화한다.",
    },
    {
      changeKind: "AXIS_OR_DIRECTION",
      scope:
        "같은 claim의 모든 variant, 32개 profile 매핑, 다섯 축 중 해당 이웃 edge를 전수 재조합한다.",
    },
    {
      changeKind: "EVIDENCE_SCOPE",
      scope:
        "같은 canonical 문구·근거 패킷·독립 연구방법 판정을 다시 검토한다.",
    },
    {
      changeKind: "SURFACE_OR_PRIVACY_SCOPE",
      scope:
        "결과·지도·비교·프로필·공유 allowlist를 전부 재계산한다.",
    },
    {
      changeKind: "RETIRE",
      scope:
        "모든 profile 참조를 차단하고 승인된 fallback이 없으면 해당 claim surface를 숨긴다.",
    },
  ],
  selfTest: {
    syntheticOnly: true,
    imported: false,
    proposal: selfTestProposal,
    impact: selfTestImpact,
    passed:
      selfTestImpact.affectedCanonicalVariantIds.length === 1 &&
      selfTestImpact.affectedProfileCodes.length > 0 &&
      selfTestImpact.requiredJobs.includes(
        "RESET_NEW_VERSION_APPROVALS",
      ),
  },
  currentState: {
    realRevisionProposalsImported:
      importBatch.revisionProposals.length,
    dryRunOnly: true,
    ledgerMutationPerformed: false,
  },
  nextGate: {
    name: "IMPORT_VALIDATOR_AND_ATOMIC_APPLY_PIPELINE",
    actions: [
      "review import JSON schema와 canonical registry를 런타임에서 검증한다.",
      "dry-run의 blocking error가 0일 때만 새 ledger 후보를 만든다.",
      "재조합·이웃·중복·안전 검사를 모두 통과해야 commit 후보가 된다.",
      "실제 commit은 독립 판정·인지 결과가 들어오기 전에는 실행하지 않는다.",
    ],
  },
};

if (
  !dryRun.selfTest.passed ||
  dryRun.summary.commitPerformed ||
  dryRun.summary.canonicalVariantsChanged !== 0
) {
  throw new Error("Revision impact dry-run invariants failed.");
}

if (customInputPath) {
  process.stdout.write(
    await prettier.format(JSON.stringify(dryRun), { parser: "json" }),
  );
  process.exit(blockingErrors.length === 0 ? 0 : 1);
}

const output = await prettier.format(JSON.stringify(dryRun), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(dryRun), {
  parser: "markdown",
});
if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.3 revision impact dry-run is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Revision impact dry-run v2.3: ${dryRun.summary.proposalsReceived} real proposals, synthetic self-test affected ${dryRun.selfTest.impact.affectedProfileCodes.length} profiles, commit false.`,
);

function analyzeProposal(proposal, entry) {
  const claimWideChange = proposal.changeKinds.some((kind) =>
    ["AXIS", "DIRECTION", "RETIRE"].includes(kind),
  );
  const affectedEntries = claimWideChange
    ? claimEntries.get(entry.claimKey)
    : [entry];
  const affectedCanonicalVariantIds = affectedEntries
    .map((affectedEntry) => affectedEntry.canonicalVariantId)
    .sort();
  const affectedProfileCodes = [
    ...new Set(
      affectedCanonicalVariantIds.flatMap(
        (canonicalVariantId) =>
          profileRefsByCanonical.get(canonicalVariantId) ?? [],
      ),
    ),
  ].sort();
  const impactedNeighborEdges = recomposition.neighborEdges
    .filter(
      (edge) =>
        affectedProfileCodes.includes(edge.leftCode) ||
        affectedProfileCodes.includes(edge.rightCode),
    )
    .map((edge) => ({
      leftCode: edge.leftCode,
      rightCode: edge.rightCode,
      axisRef: edge.axisRef,
    }));
  const affectedSurfaces = [
    ...new Set(
      affectedEntries.flatMap((affectedEntry) => [
        ...affectedEntry.release.eligibleSurfaces,
        ...affectedEntry.release.prohibitedSurfaces,
      ]),
    ),
  ].sort();
  const invalidatedRoleApprovals = affectedEntries.reduce(
    (sum, affectedEntry) =>
      sum +
      Object.values(affectedEntry.reviewLedger).filter(
        (review) => review.decision === "approve",
      ).length,
    0,
  );
  return {
    proposalId: proposal.proposalId,
    changeKinds: proposal.changeKinds,
    sourceCanonicalVariantId: entry.canonicalVariantId,
    sourceClaimKey: entry.claimKey,
    sourceBatchId: entry.batchId,
    claimWideRecompositionRequired: claimWideChange,
    affectedCanonicalVariantIds,
    affectedProfileCodes,
    affectedProfileReferenceCount: affectedCanonicalVariantIds.reduce(
      (sum, canonicalVariantId) =>
        sum +
        (profileRefsByCanonical.get(canonicalVariantId)?.length ?? 0),
      0,
    ),
    impactedNeighborEdges,
    affectedSurfaces,
    invalidatedRoleApprovals,
    requiredJobs: [
      "CREATE_NEW_CONTENT_VERSION",
      "RESET_NEW_VERSION_APPROVALS",
      "RECOMPOSE_32_PROFILES",
      "RERUN_NEIGHBOR_DUPLICATE_SAFETY_GATES",
      "CREATE_COGNITIVE_RETEST_TASK",
      "CREATE_ROLE_REREVIEW_TASK",
      "REBUILD_PUBLICATION_GATE",
    ],
  };
}

function readJson(directory, fileName) {
  return readJsonPath(path.join(directory, fileName));
}

function readJsonPath(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildMarkdown(result) {
  return `# v2.3 revision 영향 dry-run 엔진

## 현재 실행

- 실제 revision proposal: ${result.summary.proposalsReceived}
- blocking error: ${result.summary.blockingErrors}
- commit: ${result.summary.commitPerformed}
- 원장 변경: ${result.summary.canonicalVariantsChanged}

실제 판정이 아직 없으므로 빈 import template로 실행했고 원장을 바꾸지
않았다. 대신 합성 self-test 한 건으로 영향 계산 코드가 profile
${result.selfTest.impact.affectedProfileCodes.length}개와 이웃 edge
${result.selfTest.impact.impactedNeighborEdges.length}개를 찾고 새 version의
승인 초기화 작업을 생성하는지 확인했다. 이 self-test는 import되지 않는다.

## 실제 proposal이 들어오면

1. 문구 수정은 해당 canonical을 참조하는 profile·surface를 갱신한다.
2. 축·방향·퇴역은 같은 claim 전체와 32개 profile을 재조합한다.
3. privacy·surface 변경은 모든 발행 allowlist를 다시 계산한다.
4. 새 version은 과거 승인을 이어받지 않고 인지 재시험·역할 재검토로 간다.
5. dry-run error가 하나라도 있으면 commit 후보를 만들지 않는다.

사용 예:

\`\`\`bash
node scripts/generate-trait-map-v2-3-revision-impact-dry-run.mjs \\
  --input=/absolute/path/to/review-import.json
\`\`\`
`;
}
