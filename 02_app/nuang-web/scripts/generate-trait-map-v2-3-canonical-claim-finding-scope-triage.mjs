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
  "TRAIT_MAP_CANONICAL_CLAIM_FINDING_SCOPE_TRIAGE_V2_3.json",
);
const queuePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_CANONICAL_CLAIM_FINDING_SCOPE_REVIEW_QUEUE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "137_CANONICAL_CLAIM_FINDING_SCOPE_TRIAGE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const evidenceTrace = readGenerated(
  "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json",
);
const sampleTrace = readGenerated(
  "TRAIT_MAP_SAMPLE_LEVEL_FINDING_TRACE_BFI2_IPC_V2_3.json",
);
const ledger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const ledgerById = new Map(
  ledger.entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const targetFindingIds = new Set([
  "FND-BFI2-HIERARCHICAL-FACETS",
  "FND-IPC-INTERPERSONAL-DISTINCTIONS",
]);

const targetEntries = evidenceTrace.entries.filter(
  (entry) =>
    entry.highRisk &&
    [...targetFindingIds].every((findingId) =>
      entry.evidenceFindingRefs.includes(findingId),
    ),
);

const entries = targetEntries.map((traceEntry) => {
  const canonical = ledgerById.get(traceEntry.canonicalVariantId);
  if (!canonical) {
    throw new Error(
      `Canonical ledger entry missing: ${traceEntry.canonicalVariantId}`,
    );
  }
  const ipcRole = traceEntry.semanticAxes.includes("SE")
    ? "partial_interpersonal_construct_support"
    : "background_only_axis_scope_mismatch";
  const pairScopeState = traceEntry.semanticAxes.includes("SE")
    ? "PARTIAL_CONSTRUCT_SUPPORT_NOT_FULL_WORDING_SUPPORT"
    : "BACKGROUND_ARCHITECTURE_ONLY_NOT_DIRECT_WORDING_SUPPORT";
  const remainingEvidenceFindingRefs =
    traceEntry.evidenceFindingRefs.filter(
      (findingId) => !targetFindingIds.has(findingId),
    );

  return {
    canonicalVariantId: traceEntry.canonicalVariantId,
    claimKey: traceEntry.claimKey,
    claimKind: canonical.claimKind,
    scenarioRef: traceEntry.scenarioRef,
    semanticAxes: traceEntry.semanticAxes,
    axisSignature: traceEntry.axisSignature,
    riskDomains: traceEntry.riskDomains,
    canonicalWording: {
      summaryText: canonical.content.summaryText,
      detailParagraphs: canonical.content.detailParagraphs,
    },
    auditedFindingRoles: [
      {
        findingId: "FND-BFI2-HIERARCHICAL-FACETS",
        role: "construct_architecture_background_only",
        directlySupportsSpecificScenarioBehavior: false,
        scopeBoundary:
          "Big Five domain 아래 facet을 두는 측정 구조의 배경 근거다. 뉴앙 코드 방향, 특정 상황의 생각·행동·말투 또는 관계 결과를 직접 입증하지 않는다.",
      },
      {
        findingId: "FND-IPC-INTERPERSONAL-DISTINCTIONS",
        role: ipcRole,
        directlySupportsSpecificScenarioBehavior: false,
        scopeBoundary: traceEntry.semanticAxes.includes("SE")
          ? "Assertiveness·Enthusiasm 등 대인 구성개념의 구분을 부분적으로 뒷받침하지만, 뉴앙 E/I 방향이나 이 문장의 구체적 상황 반응을 직접 입증하지 않는다."
          : "대인 원형 안의 Big Five aspect 위치에 관한 결과이므로 RO·OE·SM 중심 문장의 직접 근거로 세지 않는다.",
      },
    ],
    pairScopeState,
    auditedPairDirectlySupportsFullCanonicalWording: false,
    nonOverlappingSampleSupportRetained: true,
    independentReplicationOfSameClaim: false,
    remainingEvidenceFindingRefs,
    remainingFindingCount: remainingEvidenceFindingRefs.length,
    copyRevisionDecision: "NOT_DETERMINED_BY_THIS_TRIAGE",
    requiredNextReview:
      "남은 finding을 문장 구절별로 연결해 직접·부분·배경 근거를 구분하고, 직접 근거가 없는 구절만 삭제·완화·보류한다.",
    publicationState: "research_only",
  };
});

const counts = entries.reduce(
  (result, entry) => {
    if (
      entry.pairScopeState ===
      "PARTIAL_CONSTRUCT_SUPPORT_NOT_FULL_WORDING_SUPPORT"
    ) {
      result.partialConstructSupport += 1;
    } else {
      result.backgroundOnly += 1;
    }
    if (entry.remainingFindingCount === 0) {
      result.noRemainingFindings += 1;
    }
    return result;
  },
  {
    partialConstructSupport: 0,
    backgroundOnly: 0,
    noRemainingFindings: 0,
  },
);

const report = {
  contractVersion:
    "nuang-trait-map-canonical-claim-finding-scope-triage.v2.3",
  reportId: "TRAIT-MAP-CANONICAL-CLAIM-FINDING-SCOPE-TRIAGE.2.3",
  status: "INTERNAL_CONSERVATIVE_SCOPE_TRIAGE_COMPLETE_REVIEW_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceEvidenceTraceReportId: evidenceTrace.reportId,
  sourceSampleTraceReportId: sampleTrace.reportId,
  sourceCanonicalLedgerReportId: ledger.reportId,
  reviewerIdentity: {
    type: "internal_conservative_scope_triage",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  summary: {
    highRiskCanonicalEntriesTriaged: entries.length,
    entriesWithPartialInterpersonalConstructSupport:
      counts.partialConstructSupport,
    entriesWithBackgroundArchitectureSupportOnly:
      counts.backgroundOnly,
    entriesWhoseAuditedPairDirectlySupportsFullWording: entries.filter(
      (entry) =>
        entry.auditedPairDirectlySupportsFullCanonicalWording,
    ).length,
    entriesWithoutOtherFindingRefs: counts.noRemainingFindings,
    copyRevisionsAuthorized: 0,
    publicationApprovalsGranted: 0,
  },
  interpretationRules: [
    "논문이 성향 구조를 다뤘다는 사실과 특정 상황 문장을 직접 입증했다는 판단을 분리한다.",
    "BFI-2 위계 구조 finding은 뉴앙 문장의 직접 행동 근거로 세지 않는다.",
    "IPC 대인 구조 finding은 SE 문장에만 부분 구성개념 근거로 두고, 다른 축 문장에서는 배경 근거로만 둔다.",
    "비공유 표본 경로가 남는다는 사실은 근거 범위가 넓어진다는 뜻이 아니다.",
    "이 내부 분류는 문장 교정이나 공개 승인을 대신하지 않는다.",
  ],
  entries,
  nextGate: {
    name: "REMAINING_FINDING_TO_CLAUSE_ROLE_MAPPING",
    entries: entries.length,
    action:
      "각 문장의 남은 finding을 구절별로 연결한 뒤 직접 근거가 없는 구체 행동·관계 결과 표현을 독립 검토 대기열에 올린다.",
  },
};

const queue = {
  contractVersion:
    "nuang-trait-map-canonical-claim-finding-scope-review-queue.v2.3",
  queueId:
    "TRAIT-MAP-CANONICAL-CLAIM-FINDING-SCOPE-REVIEW-QUEUE.2.3",
  status: "READY_FOR_CLAUSE_LEVEL_EVIDENCE_ROLE_REVIEW",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReportId: report.reportId,
  reviewerRequirements: {
    requiredRoles: [
      "personality_psychologist",
      "psychometrician",
      "research_methodologist",
    ],
    independenceRequiredForPublication: true,
    internalTriageMayApprovePublication: false,
  },
  entries: entries.map((entry) => ({
    canonicalVariantId: entry.canonicalVariantId,
    priority: "P0_HIGH_RISK_SCOPE",
    canonicalWording: entry.canonicalWording,
    semanticAxes: entry.semanticAxes,
    riskDomains: entry.riskDomains,
    pairScopeState: entry.pairScopeState,
    remainingEvidenceFindingRefs:
      entry.remainingEvidenceFindingRefs,
    requestedDecision:
      "MAP_EACH_CLAUSE_TO_DIRECT_PARTIAL_BACKGROUND_OR_UNSUPPORTED",
    reviewerDecision: null,
    reviewerRef: null,
    reviewedAt: null,
    publicationState: "research_only",
  })),
};

if (
  report.summary.highRiskCanonicalEntriesTriaged !== 120 ||
  report.summary.entriesWithPartialInterpersonalConstructSupport !==
    56 ||
  report.summary.entriesWithBackgroundArchitectureSupportOnly !==
    64 ||
  report.summary.entriesWhoseAuditedPairDirectlySupportsFullWording !==
    0 ||
  report.summary.entriesWithoutOtherFindingRefs !== 0 ||
  report.summary.copyRevisionsAuthorized !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error(
    "Canonical claim-to-finding scope triage invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const queueOutput = await prettier.format(JSON.stringify(queue), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [queuePath, queueOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error(
      "v2.3 canonical claim-to-finding scope triage is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(queuePath, queueOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Canonical claim scope triage v2.3: ${entries.length} high-risk entries; ${counts.partialConstructSupport} partial construct, ${counts.backgroundOnly} background-only, 0 full-wording direct support from audited pair.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 canonical 주장–finding 범위 보수적 분류

## 목적

BFI-2와 IPC에 별도 표본 근거가 남는다는 사실만으로, 두 논문이 뉴앙의 구체적인 상황 문장 전체를 직접 지지한다고 확대 해석하지 않도록 한다.

## 결과

- 고위험 canonical 분류: **${result.summary.highRiskCanonicalEntriesTriaged}개**
- IPC가 대인 구성개념을 부분적으로 뒷받침하는 SE 문장: **${result.summary.entriesWithPartialInterpersonalConstructSupport}개**
- 두 finding이 구조적 배경 근거에 머무는 문장: **${result.summary.entriesWithBackgroundArchitectureSupportOnly}개**
- 두 finding만으로 문장 전체의 직접 근거가 되는 문장: **${result.summary.entriesWhoseAuditedPairDirectlySupportsFullWording}개**
- 다른 finding이 하나도 남지 않는 문장: **${result.summary.entriesWithoutOtherFindingRefs}개**
- 이 단계가 승인한 교정·공개: **0개**

## 해석

BFI-2는 성향 영역과 facet의 위계 구조를 설명하는 배경 근거다. IPC는 대인 구성개념의 구분을 보여 주지만, 특정 가족·친구·연인·업무 장면에서 사람이 실제로 어떤 말을 하고 행동할지를 직접 검증한 연구는 아니다.

따라서 120개 문장은 모두 남은 finding을 구절 단위로 다시 연결해야 한다. 이 분류는 문장을 곧바로 폐기한다는 뜻도, 공개해도 된다는 뜻도 아니다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
