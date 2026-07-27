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
  "TRAIT_MAP_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.json",
);
const queuePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_ALL_CANONICAL_NO_EXACT_CONTEXT_REVIEW_QUEUE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "142_ALL_CANONICAL_CONTEXT_APPLICABILITY_AUDIT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const evidenceFiles = [
  "src/features/nuang-code/trait-map-change-context-evidence-v2.ts",
  "src/features/nuang-code/trait-map-foundation-evidence-v2.ts",
  "src/features/nuang-code/trait-map-friendship-evidence-v2.ts",
  "src/features/nuang-code/trait-map-relationship-evidence-v2.ts",
  "src/features/nuang-code/trait-map-process-evidence-v2.ts",
  "src/features/nuang-code/trait-map-work-evidence-v2.ts",
];
const evidenceTrace = readGenerated(
  "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json",
);
const ledger = readGenerated(
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const ledgerById = new Map(
  ledger.entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const findingRegistry = new Map();
for (const relativePath of evidenceFiles) {
  const source = fs.readFileSync(
    path.join(projectRoot, relativePath),
    "utf8",
  );
  for (const finding of parseFindings(source, relativePath)) {
    if (findingRegistry.has(finding.findingId)) {
      throw new Error(`Duplicate finding: ${finding.findingId}`);
    }
    findingRegistry.set(finding.findingId, finding);
  }
}

const entries = evidenceTrace.entries.map((traceEntry) => {
  const targetContext = contextFromScenarioRef(traceEntry.scenarioRef);
  const canonical = ledgerById.get(traceEntry.canonicalVariantId);
  if (!canonical) {
    throw new Error(
      `Canonical ledger entry missing: ${traceEntry.canonicalVariantId}`,
    );
  }
  const findingLinks = traceEntry.evidenceFindingRefs.map(
    (findingId) => {
      const finding = findingRegistry.get(findingId);
      if (!finding) {
        throw new Error(`Finding not registered: ${findingId}`);
      }
      const state = finding.contexts.includes(targetContext)
        ? "EXACT_REGISTERED_CONTEXT_MATCH"
        : finding.contexts.includes("general")
          ? "GENERAL_TO_SPECIFIC_TRANSFER_NOT_ESTABLISHED"
          : "DIFFERENT_CONTEXT_TRANSFER_NOT_ESTABLISHED";
      return {
        findingId,
        sourceId: finding.sourceId,
        direction: finding.direction,
        registeredContexts: finding.contexts,
        targetContext,
        contextApplicabilityState: state,
        directNuangAxisOrCanonicalValidation: false,
      };
    },
  );
  const exactContextFindingRefs = findingLinks
    .filter(
      (link) =>
        link.contextApplicabilityState ===
        "EXACT_REGISTERED_CONTEXT_MATCH",
    )
    .map((link) => link.findingId);
  const transferredFindingRefs = findingLinks
    .filter(
      (link) =>
        link.contextApplicabilityState !==
        "EXACT_REGISTERED_CONTEXT_MATCH",
    )
    .map((link) => link.findingId);
  const noExactContextFinding =
    exactContextFindingRefs.length === 0;
  return {
    canonicalVariantId: traceEntry.canonicalVariantId,
    claimKey: traceEntry.claimKey,
    claimKind: canonical.claimKind,
    scenarioRef: traceEntry.scenarioRef,
    targetContext,
    semanticAxes: traceEntry.semanticAxes,
    axisSignature: traceEntry.axisSignature,
    riskDomains: traceEntry.riskDomains,
    highRisk: traceEntry.highRisk,
    canonicalWording: {
      summaryText: canonical.content.summaryText,
      detailParagraphs: canonical.content.detailParagraphs,
    },
    findingLinks,
    exactContextFindingRefs,
    transferredFindingRefs,
    noExactContextFinding,
    reviewPriority: noExactContextFinding
      ? "P0_NO_EXACT_REGISTERED_CONTEXT_FINDING"
      : transferredFindingRefs.length > 0
        ? "P1_CONTEXT_TRANSFER_PRESENT"
        : "P2_EXACT_REGISTERED_CONTEXT_ONLY",
    semanticScopeApprovalState: "not_started",
    publicationState: "research_only",
  };
});

const allLinks = entries.flatMap((entry) => entry.findingLinks);
const exactLinks = allLinks.filter(
  (link) =>
    link.contextApplicabilityState ===
    "EXACT_REGISTERED_CONTEXT_MATCH",
);
const generalTransfers = allLinks.filter(
  (link) =>
    link.contextApplicabilityState ===
    "GENERAL_TO_SPECIFIC_TRANSFER_NOT_ESTABLISHED",
);
const differentContextTransfers = allLinks.filter(
  (link) =>
    link.contextApplicabilityState ===
    "DIFFERENT_CONTEXT_TRANSFER_NOT_ESTABLISHED",
);
const noExactEntries = entries.filter(
  (entry) => entry.noExactContextFinding,
);

const report = {
  contractVersion:
    "nuang-trait-map-all-canonical-context-applicability-audit.v2.3",
  reportId:
    "TRAIT-MAP-ALL-CANONICAL-CONTEXT-APPLICABILITY-AUDIT.2.3",
  status: "FULL_CONTEXT_SCREEN_COMPLETE_HIGH_RISK_GAPS_IDENTIFIED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceEvidenceTraceReportId: evidenceTrace.reportId,
  sourceCanonicalLedgerReportId: ledger.reportId,
  reviewerIdentity: {
    type: "internal_automated_registered_context_audit",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  summary: {
    canonicalEntriesAudited: entries.length,
    evidenceFindingsInRegistry: findingRegistry.size,
    findingLinksAudited: allLinks.length,
    exactRegisteredContextLinks: exactLinks.length,
    generalToSpecificTransfersNotEstablished:
      generalTransfers.length,
    differentContextTransfersNotEstablished:
      differentContextTransfers.length,
    totalContextTransfersNotEstablished:
      generalTransfers.length + differentContextTransfers.length,
    entriesWithNoExactContextFinding: noExactEntries.length,
    highRiskEntriesWithNoExactContextFinding: noExactEntries.filter(
      (entry) => entry.highRisk,
    ).length,
    personOfInterestEntriesWithNoExactContextFinding:
      noExactEntries.filter(
        (entry) => entry.targetContext === "person_of_interest",
      ).length,
    familyEntriesWithNoExactContextFinding: noExactEntries.filter(
      (entry) => entry.targetContext === "family",
    ).length,
    directNuangAxisOrCanonicalValidations: allLinks.filter(
      (link) => link.directNuangAxisOrCanonicalValidation,
    ).length,
    semanticScopeApprovalsGranted: 0,
    publicationApprovalsGranted: 0,
  },
  auditRules: [
    "각 finding의 코드 원장에 등록된 contexts와 canonical scenario context를 정확히 대조한다.",
    "general은 특정 가족·친구·연인·관심 상대·업무 상황과 같은 것으로 세지 않는다.",
    "partner는 관계 시작 전 person_of_interest와 같은 것으로 세지 않는다.",
    "상황 일치는 문장 전체 직접 검증 또는 뉴앙 축 타당화를 뜻하지 않는다.",
    "이 자동 감사는 근거 전이 문제를 찾지만 의미 승인이나 문장 폐기를 결정하지 않는다.",
  ],
  findingRegistry: [...findingRegistry.values()].sort((a, b) =>
    a.findingId.localeCompare(b.findingId, "en"),
  ),
  entries,
  nextGate: {
    name: "P0_101_ENTRY_CONTEXT_GAP_GROUPING_AND_RESEARCH_CONTRACT",
    action:
      "동일 상황 근거가 하나도 없는 101개 고위험 문장을 장면·축·주장 종류별로 묶고, 문헌 배경 보강과 뉴앙 직접 검증을 분리한 연구 계약을 만든다.",
  },
};

const queue = {
  contractVersion:
    "nuang-trait-map-all-canonical-no-exact-context-review-queue.v2.3",
  queueId:
    "TRAIT-MAP-ALL-CANONICAL-NO-EXACT-CONTEXT-REVIEW-QUEUE.2.3",
  status: "P0_101_CONTEXT_SCOPE_REVIEW_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReportId: report.reportId,
  entries: noExactEntries.map((entry) => ({
    canonicalVariantId: entry.canonicalVariantId,
    scenarioRef: entry.scenarioRef,
    targetContext: entry.targetContext,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    riskDomains: entry.riskDomains,
    canonicalWording: entry.canonicalWording,
    transferredFindingRefs: entry.transferredFindingRefs,
    issueCode: "NO_EXACT_REGISTERED_CONTEXT_FINDING",
    requestedDecision:
      "GROUP_GAP_THEN_MAP_BACKGROUND_DIRECT_AND_UNSUPPORTED_CLAUSES",
    reviewerDecision: null,
    publicationState: "research_only",
  })),
};

if (
  report.summary.canonicalEntriesAudited !== 605 ||
  report.summary.evidenceFindingsInRegistry !== 40 ||
  report.summary.findingLinksAudited !== 2939 ||
  report.summary.exactRegisteredContextLinks !== 1618 ||
  report.summary.generalToSpecificTransfersNotEstablished !== 1119 ||
  report.summary.differentContextTransfersNotEstablished !== 202 ||
  report.summary.totalContextTransfersNotEstablished !== 1321 ||
  report.summary.entriesWithNoExactContextFinding !== 101 ||
  report.summary.highRiskEntriesWithNoExactContextFinding !== 101 ||
  report.summary.personOfInterestEntriesWithNoExactContextFinding !==
    79 ||
  report.summary.familyEntriesWithNoExactContextFinding !== 22 ||
  report.summary.directNuangAxisOrCanonicalValidations !== 0 ||
  report.summary.semanticScopeApprovalsGranted !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error(
    "All-canonical context applicability invariants failed.",
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
      "v2.3 all-canonical context applicability audit is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(queuePath, queueOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `All-canonical context audit v2.3: ${entries.length} entries, ${allLinks.length} links, ${exactLinks.length} exact, ${generalTransfers.length + differentContextTransfers.length} transfer-unestablished, ${noExactEntries.length} no-exact-context entries.`,
);

function parseFindings(source, sourceFile) {
  const findingSection =
    source.split(/export const .*EvidenceFindingsV2\s*=/)[1] ?? "";
  return [
    ...findingSection.matchAll(
      /findingId:\s*"(FND-[A-Z0-9-]+)"[\s\S]*?sourceId:\s*"(SRC-[A-Z0-9-]+)"[\s\S]*?contexts:\s*\[([^\]]*)\][\s\S]*?direction:\s*"([^"]+)"/g,
    ),
  ].map((match) => ({
    findingId: match[1],
    sourceId: match[2],
    contexts: [
      ...match[3].matchAll(/"([^"]+)"/g),
    ].map((contextMatch) => contextMatch[1]),
    direction: match[4],
    sourceFile,
  }));
}

function contextFromScenarioRef(scenarioRef) {
  const contextByToken = {
    GENERAL: "general",
    FAMILY: "family",
    FRIEND: "friend",
    PARTNER: "partner",
    PERSON: "person_of_interest",
    WORK: "work",
  };
  const context = contextByToken[scenarioRef.split("-")[1]];
  if (!context) {
    throw new Error(`Unknown scenario context: ${scenarioRef}`);
  }
  return context;
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 전체 canonical 상황 적용 범위 감사

## 결과

- canonical: **${result.summary.canonicalEntriesAudited}개**
- finding 연결: **${result.summary.findingLinksAudited}개**
- 등록 상황 정확히 일치: **${result.summary.exactRegisteredContextLinks}개**
- general → 특정 상황 전이 미확인: **${result.summary.generalToSpecificTransfersNotEstablished}개**
- 다른 관계 상황 전이 미확인: **${result.summary.differentContextTransfersNotEstablished}개**
- 같은 상황 finding이 전혀 없음: **${result.summary.entriesWithNoExactContextFinding}개**
  - 관심 상대: **${result.summary.personOfInterestEntriesWithNoExactContextFinding}개**
  - 가족: **${result.summary.familyEntriesWithNoExactContextFinding}개**
- 위 101개 중 고위험: **${result.summary.highRiskEntriesWithNoExactContextFinding}개**

구조적으로 출처 ID가 연결됐다는 사실만으로 원 연구의 상황 범위를 통과한 것은 아니다. 특히 관계 시작 전 관심 상대를 교제 중 연인 연구로 설명하거나, 일반 성향 연구를 구체적 가족 행동의 직접 근거로 세는 전이를 별도 검토해야 한다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
