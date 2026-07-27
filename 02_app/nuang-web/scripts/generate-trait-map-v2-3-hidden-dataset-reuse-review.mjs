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
  "TRAIT_MAP_HIDDEN_DATASET_REUSE_REVIEW_V2_3.json",
);
const registryPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_EVIDENCE_DEPENDENCE_HIDDEN_REUSE_SUPPLEMENT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "135_HIDDEN_DATASET_REUSE_REVIEW_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const dependenceAudit = readGenerated(
  "TRAIT_MAP_EVIDENCE_DEPENDENCE_AUDIT_V2_3.json",
);
const sharedAuthorReview = readGenerated(
  "TRAIT_MAP_SHARED_AUTHOR_DEPENDENCE_REVIEW_V2_3.json",
);
const reviewedRegistry = JSON.parse(
  fs.readFileSync(
    path.join(
      reviewDirectory,
      "TRAIT_MAP_EVIDENCE_DEPENDENCE_REVIEWED_SHARED_AUTHOR_V2_3.json",
    ),
    "utf8",
  ),
);

const bfi2Source = {
  sourceId: "SRC-BFI2-2017",
  studyFamilies: [
    {
      studyFamilyId: "FAMILY-ESCS",
      datasetId: "DATASET-ESCS",
      sampleId: "SAMPLE-BFI2-2017-STUDY-1-ESCS",
      sampleSize: 1137,
      nestedSampleSizes: {
        completedAtLeastOneIpipList: 995,
        completedAllTwelveIpipLists: 401,
      },
      design:
        "Eugene-Springfield Community Sample의 형용사·IPIP·기존 BFI 자료를 이용한 BFI-2 facet 및 예비 문항 구성",
    },
    {
      studyFamilyId: "FAMILY-BFI2-2017-DEVELOPMENT",
      datasetId: "DATASET-BFI2-2017-DEVELOPMENT",
      sampleId: "SAMPLE-BFI2-2017-STUDY-2-PERSONALITYLAB",
      sampleSize: 1000,
      design:
        "personalitylab.org에서 모집한 영어권 성인 BFI-2 문항 개발 표본",
    },
    {
      studyFamilyId: "FAMILY-BFI2-2017-INTERNET-VALIDATION",
      datasetId: "DATASET-BFI2-2017-INTERNET-VALIDATION",
      sampleId: "SAMPLE-BFI2-2017-STUDY-3-INTERNET",
      sampleSize: 1000,
      design:
        "personalitylab.org의 별도 인터넷 검증 표본; 논문이 Study 2와 비중복이라고 명시",
    },
    {
      studyFamilyId: "FAMILY-BFI2-2017-STUDENT-VALIDATION",
      datasetId: "DATASET-BFI2-2017-STUDENT-VALIDATION",
      sampleId: "SAMPLE-BFI2-2017-STUDY-3-STUDENT",
      sampleSize: 470,
      design:
        "대형 공립대 심리학 수강생 검증 표본; 일부가 추가 측정과 재검사에 참여",
    },
  ],
  sourceLevelFinding:
    "세 연구의 community·Internet·student 자료로 15개 facet의 위계적 BFI-2를 개발하고 평가했다.",
  primaryEvidenceLocators: [
    {
      url: "https://www.colby.edu/wp-content/uploads/2013/08/Soto_John_2017.pdf",
      locator:
        "Study 1-3, Participants and procedure; Study 1 Phase 2",
      supports:
        "ESCS 사용, Study 2 N=1000, Study 3 Internet N=1000·student N=470, Internet 표본 비중복",
    },
    {
      url: "https://www.colby.edu/academics/departments-and-programs/psychology/research-opportunities/personality-lab/the-bfi-2/",
      locator: "official BFI-2 page",
      supports: "공식 논문·도구·채점 자료 연결",
    },
  ],
};

const normalizedPriorSources = reviewedRegistry.sources.map((source) =>
  normalizeSharedFamilyIds(source),
);
const sourceById = new Map(
  [...normalizedPriorSources, bfi2Source].map((source) => [
    source.sourceId,
    source,
  ]),
);
for (const requiredSourceId of [
  "SRC-BFAS-2007",
  "SRC-IPC-2013",
]) {
  if (!sourceById.has(requiredSourceId)) {
    throw new Error(`Reviewed source missing: ${requiredSourceId}`);
  }
}

const highRiskPair = dependenceAudit.highRiskPairRows.find(
  (entry) =>
    entry.pairId === pairId("SRC-BFI2-2017", "SRC-IPC-2013"),
);
if (!highRiskPair || highRiskPair.highRiskVariantCount !== 120) {
  throw new Error("BFI2-IPC high-risk pair invariant failed.");
}

const decisions = [
  {
    pairId: pairId("SRC-BFI2-2017", "SRC-IPC-2013"),
    sourceIds: ["SRC-BFI2-2017", "SRC-IPC-2013"].sort(),
    highRiskVariantCount: highRiskPair.highRiskVariantCount,
    sharedAuthors: [],
    state: "confirmed_partial_dataset_reuse",
    sharedStudyFamilyIds: ["FAMILY-ESCS"],
    sharedDatasetIds: ["DATASET-ESCS"],
    detail:
      "BFI-2 2017 Study 1과 IPC 2013 Sample 3은 모두 Eugene-Springfield Community Sample 자료를 사용했다.",
    claimLevelIndependenceState:
      "unresolved_until_finding_is_mapped_to_specific_nonoverlapping_samples",
    publicationCountingState:
      "DO_NOT_COUNT_AS_TWO_INDEPENDENT_SOURCES_WITHOUT_SAMPLE_LEVEL_FINDING_TRACE",
  },
  {
    pairId: pairId("SRC-BFI2-2017", "SRC-BFAS-2007"),
    sourceIds: ["SRC-BFI2-2017", "SRC-BFAS-2007"].sort(),
    highRiskVariantCount:
      dependenceAudit.highRiskPairRows.find(
        (entry) =>
          entry.pairId ===
          pairId("SRC-BFI2-2017", "SRC-BFAS-2007"),
      )?.highRiskVariantCount ?? 0,
    sharedAuthors: [],
    state: "confirmed_partial_dataset_reuse",
    sharedStudyFamilyIds: ["FAMILY-ESCS"],
    sharedDatasetIds: ["DATASET-ESCS"],
    detail:
      "두 논문 모두 ESCS를 사용했다. BFI-2 연구는 더 넓은 ESCS 문항 자료를 다시 분석했고 BFAS 연구는 ESCS facet 자료로 aspect 구조를 도출했다.",
    claimLevelIndependenceState:
      "unresolved_until_finding_is_mapped_to_specific_nonoverlapping_samples",
    publicationCountingState:
      "DO_NOT_COUNT_SHARED_ESCS_RESULTS_TWICE",
  },
];

const supplement = {
  contractVersion:
    "nuang-trait-map-hidden-dataset-reuse-supplement.v2.3",
  registryId:
    "TRAIT-MAP-EVIDENCE-DEPENDENCE-HIDDEN-REUSE-SUPPLEMENT.2.3",
  status: "PARTIAL_BIBLIOGRAPHIC_REVIEW_HIDDEN_REUSE_CONFIRMED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  reviewerIdentity: {
    type: "internal_bibliographic_audit",
    id: "CODEX-INTERNAL-RESEARCH-AUDIT",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  normalizedSource: bfi2Source,
  correctionsToPriorRegistry: [
    {
      affectedSourceIds: ["SRC-BFAS-2007", "SRC-IPC-2013"],
      correction:
        "ESCS는 논문별 dataset ID가 아니라 같은 FAMILY-ESCS·DATASET-ESCS로 통합해야 한다.",
      appliedInThisSupplement: true,
    },
  ],
  decisions,
};

const report = {
  contractVersion:
    "nuang-trait-map-hidden-dataset-reuse-review.v2.3",
  reportId: "TRAIT-MAP-HIDDEN-DATASET-REUSE-REVIEW.2.3",
  status: "HIGH_IMPACT_HIDDEN_REUSE_CONFIRMED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceAuditReportId: dependenceAudit.reportId,
  sourceSharedAuthorReviewReportId:
    sharedAuthorReview.reportId,
  supplementRegistryId: supplement.registryId,
  summary: {
    newlyNormalizedSources: 1,
    hiddenReuseRelationshipsConfirmed: decisions.length,
    highRiskPairsWithHiddenReuseConfirmed: decisions.filter(
      (decision) => decision.highRiskVariantCount > 0,
    ).length,
    highRiskVariantsAffected: new Set(
      highRiskPair.highRiskVariantIds,
    ).size,
    sharedAuthorSignalWouldHaveDetected: 0,
    publicationApprovalsGranted: 0,
  },
  impact: {
    affectedCanonicalVariantIds:
      highRiskPair.highRiskVariantIds,
    requiredAction:
      "각 finding이 BFI-2와 IPC의 어느 표본 결과에서 나왔는지 sample-level로 연결하기 전까지 두 출처를 완전 독립 근거로 세지 않는다.",
    existingCopyRevisionRequiredImmediately: false,
    reason:
      "현재는 research_only이며 문장 자체보다 근거 개수·독립성 표현을 보수적으로 차단하는 감사 단계다.",
  },
  nextGate: {
    name: "SAMPLE_LEVEL_FINDING_TRACE",
    actions: [
      "BFI-2와 IPC finding을 논문 내 Study·Sample 단위로 분리한다.",
      "ESCS에만 의존하는 finding과 별도 표본에서 반복된 finding을 구분한다.",
      "고위험 120개 canonical 문장의 실제 finding 조합을 다시 센다.",
      "공유 표본을 제외하고도 독립 결과 근거가 남는지 판정한다.",
    ],
  },
};

if (
  report.summary.newlyNormalizedSources !== 1 ||
  report.summary.hiddenReuseRelationshipsConfirmed !== 2 ||
  report.summary.highRiskPairsWithHiddenReuseConfirmed !== 1 ||
  report.summary.highRiskVariantsAffected !== 120 ||
  report.summary.sharedAuthorSignalWouldHaveDetected !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error(
    "Hidden dataset reuse review invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const registryOutput = await prettier.format(
  JSON.stringify(supplement),
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
    console.error("v2.3 hidden dataset reuse review is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(registryPath, registryOutput);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Hidden dataset reuse review v2.3: ${report.summary.hiddenReuseRelationshipsConfirmed} relationships confirmed, ${report.summary.highRiskVariantsAffected} high-risk variants affected, publication approvals 0.`,
);

function normalizeSharedFamilyIds(source) {
  if (
    !["SRC-BFAS-2007", "SRC-IPC-2013"].includes(source.sourceId)
  ) {
    return source;
  }
  return {
    ...source,
    studyFamilies: source.studyFamilies.map((family) => {
      if (
        family.datasetId === "DATASET-BFAS-2007-ESCS" ||
        family.datasetId === "DATASET-BFAS-2007-VALIDATION"
      ) {
        return {
          ...family,
          studyFamilyId:
            family.datasetId === "DATASET-BFAS-2007-ESCS"
              ? "FAMILY-ESCS"
              : family.studyFamilyId,
          datasetId:
            family.datasetId === "DATASET-BFAS-2007-ESCS"
              ? "DATASET-ESCS"
              : family.datasetId,
        };
      }
      return family;
    }),
  };
}

function pairId(left, right) {
  return [left, right].sort().join("::");
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 비저자 표본 재사용 감사

## 핵심 결과

- 새로 정규화한 출처: ${result.summary.newlyNormalizedSources}
- 확인한 숨은 재사용 관계: ${result.summary.hiddenReuseRelationshipsConfirmed}
- 고위험 출처 조합: ${result.summary.highRiskPairsWithHiddenReuseConfirmed}
- 영향받는 고위험 canonical: ${result.summary.highRiskVariantsAffected}
- 저자 겹침 신호로 찾을 수 있었던 관계: ${result.summary.sharedAuthorSignalWouldHaveDetected}
- 발행 승인: ${result.summary.publicationApprovalsGranted}

\`SRC-BFI2-2017\`과 \`SRC-IPC-2013\`은 저자가 겹치지 않지만 둘 다
Eugene-Springfield Community Sample을 사용한다. 현재 고위험 문장
120개가 두 출처를 함께 참조하므로, 각 finding이 어느 Study·Sample의
결과인지 연결하기 전에는 독립 근거 두 개로 세지 않는다.

\`SRC-BFI2-2017\`과 \`SRC-BFAS-2007\`도 ESCS를 공유한다. 출판물,
DOI, 저자가 달라도 dataset이 같을 수 있으므로 앞으로의 감사는
저자·DOI뿐 아니라 cohort 이름과 원문 Method를 함께 확인한다.

보충 원장:
\`review/TRAIT_MAP_EVIDENCE_DEPENDENCE_HIDDEN_REUSE_SUPPLEMENT_V2_3.json\`

현재 문장과 서비스 발행 상태는 계속 \`research_only\`다.
`;
}
