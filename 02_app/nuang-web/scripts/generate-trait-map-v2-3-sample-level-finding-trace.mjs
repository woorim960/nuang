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
  "TRAIT_MAP_SAMPLE_LEVEL_FINDING_TRACE_BFI2_IPC_V2_3.json",
);
const registryPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_SAMPLE_LEVEL_FINDING_REGISTRY_BFI2_IPC_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "136_SAMPLE_LEVEL_FINDING_TRACE_BFI2_IPC_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const evidenceTrace = readGenerated(
  "TRAIT_MAP_EVIDENCE_TRACE_AUDIT_V2_3.json",
);
const hiddenReuse = readGenerated(
  "TRAIT_MAP_HIDDEN_DATASET_REUSE_REVIEW_V2_3.json",
);

const findingRegistry = [
  {
    findingId: "FND-BFI2-HIERARCHICAL-FACETS",
    sourceId: "SRC-BFI2-2017",
    findingScope:
      "넓은 Big Five 영역 아래 15개 facet을 둔 BFI-2의 위계 구조와 측정 특성",
    supportingStudySampleLinks: [
      {
        study: "Study 3 Internet validation sample",
        datasetId: "DATASET-BFI2-2017-INTERNET-VALIDATION",
        sampleId: "SAMPLE-BFI2-2017-STUDY-3-INTERNET",
        sampleSize: 1000,
        sharedWithIpc2013: false,
        evidenceRole:
          "item·facet·domain 구조 및 측정 특성의 독립 검증",
      },
      {
        study: "Study 3 student validation sample",
        datasetId: "DATASET-BFI2-2017-STUDENT-VALIDATION",
        sampleId: "SAMPLE-BFI2-2017-STUDY-3-STUDENT",
        sampleSize: 470,
        sharedWithIpc2013: false,
        evidenceRole:
          "구조·수렴·재검사·자기-타인 일치의 별도 검증",
      },
    ],
    excludedSharedDatasetLinks: [
      {
        study: "Study 1 ESCS",
        datasetId: "DATASET-ESCS",
        reason:
          "IPC 2013 Sample 3과 같은 community sample 계보이므로 독립성 계산에서 제외",
      },
    ],
    resultLocator: {
      url: "https://www.colby.edu/wp-content/uploads/2013/08/Soto_John_2017.pdf",
      location:
        "Study 3 Method; Tables 2-8; Figure 1; abstract",
    },
    nonOverlappingSupportState: "confirmed",
  },
  {
    findingId: "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    sourceId: "SRC-IPC-2013",
    findingScope:
      "Assertiveness·Enthusiasm·Compassion·Politeness가 대인관계 원형의 서로 다른 위치와 연결되는 구조",
    supportingStudySampleLinks: [
      {
        study: "Sample 2 MTurk",
        datasetId: "DATASET-IPC-2013-MTURK",
        sampleId: "SAMPLE-IPC-2013-2-MTURK",
        sampleSize: 294,
        sharedWithBfi22017: false,
        evidenceRole:
          "별도 MTurk 표본에서 목표 구조와 관찰 구조의 높은 합치 확인",
        reportedOverallCongruence: 0.97,
      },
    ],
    excludedSharedDatasetLinks: [
      {
        study: "Sample 3 ESCS",
        datasetId: "DATASET-ESCS",
        reason:
          "BFI-2 2017 Study 1과 같은 community sample 계보이므로 독립성 계산에서 제외",
      },
    ],
    resultLocator: {
      url: "https://www.researchgate.net/publication/232926949_Unifying_the_Aspects_of_the_Big_Five_the_Interpersonal_Circumplex_and_Trait_Affiliation",
      location:
        "Method Sample 2; Results Tables 1-2 and 4; Discussion",
    },
    nonOverlappingSupportState: "confirmed",
  },
];

const affectedEntries = evidenceTrace.entries.filter(
  (entry) =>
    entry.evidenceFindingRefs.includes(
      "FND-BFI2-HIERARCHICAL-FACETS",
    ) &&
    entry.evidenceFindingRefs.includes(
      "FND-IPC-INTERPERSONAL-DISTINCTIONS",
    ),
);
const highRiskAffectedEntries = affectedEntries.filter(
  (entry) => entry.highRisk,
);
const perEntryDecisions = affectedEntries.map((entry) => ({
  canonicalVariantId: entry.canonicalVariantId,
  claimKey: entry.claimKey,
  riskDomains: entry.riskDomains,
  highRisk: entry.highRisk,
  findingRefs: [
    "FND-BFI2-HIERARCHICAL-FACETS",
    "FND-IPC-INTERPERSONAL-DISTINCTIONS",
  ],
  nonOverlappingDatasetSupportAvailable: true,
  independentReplicationOfSameClaim: false,
  evidenceRole:
    "complementary_construct_support_not_same_claim_replication",
  canonicalWordingScopeState:
    "pending_independent_claim_scope_review",
  publicationState: "research_only",
}));

const registry = {
  contractVersion:
    "nuang-trait-map-sample-level-finding-registry.v2.3",
  registryId:
    "TRAIT-MAP-SAMPLE-LEVEL-FINDING-REGISTRY-BFI2-IPC.2.3",
  status: "NON_OVERLAPPING_FINDING_SUPPORT_MAPPED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  reviewerIdentity: {
    type: "internal_bibliographic_audit",
    id: "CODEX-INTERNAL-RESEARCH-AUDIT",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  countingRules: [
    "공유 ESCS 결과는 두 번 세지 않는다.",
    "BFI-2 finding은 Study 3 Internet·student validation 표본으로 제한해 센다.",
    "IPC finding은 비공유 Sample 2 MTurk 결과로 제한해 센다.",
    "두 finding은 서로 다른 구성개념 부분을 보완하므로 같은 가설의 독립 반복 검증으로 부르지 않는다.",
    "canonical 문장 전체가 두 finding의 범위를 넘지 않는지는 별도 독립 claim 검토가 필요하다.",
  ],
  findings: findingRegistry,
  canonicalLinks: perEntryDecisions,
};

const report = {
  contractVersion:
    "nuang-trait-map-sample-level-finding-trace.v2.3",
  reportId: "TRAIT-MAP-SAMPLE-LEVEL-FINDING-TRACE-BFI2-IPC.2.3",
  status: "NON_OVERLAPPING_SUPPORT_CONFIRMED_SCOPE_REVIEW_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceHiddenReuseReportId: hiddenReuse.reportId,
  registryId: registry.registryId,
  summary: {
    findingsMapped: findingRegistry.length,
    canonicalEntriesWithBothFindings: affectedEntries.length,
    highRiskCanonicalEntriesWithBothFindings:
      highRiskAffectedEntries.length,
    highRiskEntriesWithNonOverlappingSupportAvailable:
      highRiskAffectedEntries.length,
    independentReplicationsOfSameClaim: 0,
    externalIndependentApprovals: 0,
  },
  interpretation: {
    sourcePairState:
      "NON_OVERLAPPING_SAMPLE_SUPPORT_AVAILABLE_FOR_COMPLEMENTARY_FINDINGS",
    mayCountAsTwoDistinctFindingSources: true,
    mayCallIndependentReplication: false,
    mayPublishCanonicalWithoutScopeReview: false,
    reason:
      "공유 ESCS를 제외해도 각 finding에 별도 표본 근거가 남지만, 두 finding은 동일한 가설의 반복 검증이 아니며 canonical 전체 문구의 직접성은 아직 검토되지 않았다.",
  },
  nextGate: {
    name: "CANONICAL_CLAIM_TO_FINDING_SCOPE_AUDIT",
    entries: highRiskAffectedEntries.length,
    action:
      "고위험 canonical 문장마다 BFI-2 위계 구조와 IPC 대인 구조가 실제 문구의 어느 부분을 지지하는지 구절 단위로 표시하고 과잉 해석을 hold한다.",
  },
};

if (
  report.summary.findingsMapped !== 2 ||
  report.summary.canonicalEntriesWithBothFindings !== 184 ||
  report.summary.highRiskCanonicalEntriesWithBothFindings !==
    120 ||
  report.summary.highRiskEntriesWithNonOverlappingSupportAvailable !==
    120 ||
  report.summary.independentReplicationsOfSameClaim !== 0 ||
  report.summary.externalIndependentApprovals !== 0
) {
  throw new Error(
    "Sample-level finding trace invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const registryOutput = await prettier.format(
  JSON.stringify(registry),
  { parser: "json" },
);
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});
if (checkOnly) {
  const expected = [
    [outputPath, output],
    [registryPath, registryOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 sample-level finding trace is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(registryPath, registryOutput);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Sample-level finding trace v2.3: ${report.summary.findingsMapped} findings, ${report.summary.highRiskEntriesWithNonOverlappingSupportAvailable}/${report.summary.highRiskCanonicalEntriesWithBothFindings} high-risk entries retain non-overlapping support, independent replications 0.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 BFI-2·IPC 표본 수준 finding 추적

## 결과

- 표본 수준으로 연결한 finding: ${result.summary.findingsMapped}
- 두 finding을 함께 쓰는 canonical: ${result.summary.canonicalEntriesWithBothFindings}
- 그중 고위험 canonical: ${result.summary.highRiskCanonicalEntriesWithBothFindings}
- 비공유 표본 근거가 남는 고위험 canonical: ${result.summary.highRiskEntriesWithNonOverlappingSupportAvailable}
- 같은 주장의 독립 반복 검증: ${result.summary.independentReplicationsOfSameClaim}
- 외부 독립 승인: ${result.summary.externalIndependentApprovals}

BFI-2 finding은 공유 ESCS가 아닌 Study 3 Internet·student validation
표본에 연결했고, IPC finding은 비공유 Sample 2 MTurk 결과에 연결했다.
따라서 공유 ESCS를 제외해도 두 finding의 근거는 남는다.

그러나 BFI-2는 성격 측정의 위계 구조, IPC는 대인관계 aspect의 위치를
각각 다룬다. 두 논문을 “같은 주장을 독립적으로 재현했다”고 표현하지
않고, 서로 다른 부분을 보완하는 자료로만 센다.

다음 게이트는 고위험 canonical 120개의 실제 문구가 이 두 finding의
범위를 넘어서는지 구절 단위로 확인하는 것이다. 발행 상태는 계속
\`research_only\`다.
`;
}
