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
  "TRAIT_MAP_P0_BACKGROUND_SOURCE_EXTRACTION_V2_3.json",
);
const registryPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_BACKGROUND_SOURCE_REVIEW_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "140_P0_BACKGROUND_SOURCE_EXTRACTION_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const gapProtocol = readGenerated(
  "TRAIT_MAP_P0_CONTEXT_EVIDENCE_GAP_PROTOCOL_V2_3.json",
);

const extractions = [
  {
    candidateSourceId: "SRC-CANDIDATE-FAMILY-ADL-SUPPORT-2023",
    extractionState: "primary_full_text_key_sections_extracted",
    design: {
      study: "Family Exchanges Study Wave 1 (2008) and Wave 2 (2013)",
      designType: "two-wave longitudinal report",
      reportingParticipants: 366,
      parentRelationshipsReported: 468,
      adultChildMeanAge: 55.3,
      parentMeanAge: 81.1,
      country: "United States",
      relationshipContext: "middle-aged adult child and parent",
    },
    measures: [
      "tangible support",
      "emotional support",
      "informational support",
      "parent activities-of-daily-living needs",
    ],
    resultScope:
      "부모의 일상생활 도움 필요가 증가한 경우 성인 자녀가 제공했다고 보고한 세 지원 유형도 증가했다. 지원 제공·수령·차이를 별도로 다뤘다.",
    usableEvidenceRole:
      "가족 지원의 필요와 정서적·실질적·정보적 지원을 분리하는 배경",
    prohibitedInference:
      "G/A 방향, 처음 드는 생각, 구체적인 말투 또는 모든 가족 관계의 지원 행동을 직접 입증하지 않는다.",
    directNuangAxisValidation: false,
    directCanonicalWordingValidation: false,
    primaryUrl:
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10783371/",
  },
  {
    candidateSourceId:
      "SRC-CANDIDATE-EMOTIONAL-INSTRUMENTAL-SUPPORT-2015",
    extractionState: "primary_full_text_key_sections_extracted",
    design: {
      designType: "two-week dyadic daily diary",
      dyads: 49,
      participants: 98,
      dyadComposition:
        "same-gender close-friend pairs; 25 male pairs and 24 female pairs",
      relationshipContext: "close friend",
    },
    measures: [
      "daily emotional support provision",
      "daily instrumental support provision",
      "support receipt",
      "daily well-being",
    ],
    resultScope:
      "정서적 지원과 도구적 지원을 한 요인으로 합친 모형보다 두 요인 모형이 개인 내·개인 간 수준에서 더 적합했다. 두 지원은 하루 단위에서는 함께 오르내렸지만 사람 간 평균 경향의 관련은 작고 유의하지 않았다.",
    selectedStatistics: {
      withinPersonFactorCorrelation: 0.51,
      betweenPersonFactorCorrelation: 0.13,
      betweenPersonFactorCorrelationSignificance: "not_significant",
    },
    usableEvidenceRole:
      "정서적 관여와 실질 도움을 서로 다른 지원 차원으로 구분하는 배경",
    prohibitedInference:
      "G/A 방향이나 가족·관심 상대 장면의 행동을 직접 검증하지 않는다.",
    directNuangAxisValidation: false,
    directCanonicalWordingValidation: false,
    primaryUrl:
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC4516598/",
  },
  {
    candidateSourceId:
      "SRC-CANDIDATE-ZERO-ACQUAINTANCE-DISCLOSURE-2022",
    extractionState: "publisher_abstract_extracted_full_text_pending",
    design: {
      designType: "experiment",
      participants: 253,
      relationshipContext: "zero-acquaintance",
      manipulation:
        "high versus low self-disclosure intensity while actual partner responsiveness was held constant",
      channels: ["face_to_face", "computer_mediated"],
    },
    measures: [
      "self-disclosure intensity",
      "perceived partner responsiveness",
      "relational intimacy",
    ],
    resultScope:
      "높은 자기개방 조건은 더 높은 지각된 상대 반응성과 연결됐고, 지각된 반응성은 친밀감 증가와 이어졌다. 대면 조건은 컴퓨터 매개 조건보다 지각된 반응성이 높았다.",
    usableEvidenceRole:
      "처음 만난 관계에서 자기개방과 지각된 반응성을 분리하는 배경",
    prohibitedInference:
      "연애 관심 상대임을 보장하지 않으며, 필요 표현 방식이나 E/I·R/N 방향을 직접 검증하지 않는다.",
    directNuangAxisValidation: false,
    directCanonicalWordingValidation: false,
    primaryUrl:
      "https://doi.org/10.1080/10510974.2022.2084429",
  },
  {
    candidateSourceId:
      "SRC-CANDIDATE-ROMANTIC-NEEDS-DIARY-2021",
    extractionState: "primary_full_text_key_sections_extracted",
    design: {
      designType: "dyadic daily diary",
      couples: 99,
      participants: 198,
      days: 7,
      measurementsPerDay: 2,
      relationshipContext: "ongoing romantic couples",
    },
    measures: [
      "self-disclosure",
      "perceived partner self-disclosure",
      "perceived partner responsiveness",
      "relational entitlement",
      "couple satisfaction",
    ],
    resultScope:
      "지각된 상대 반응성은 남녀 모두에서 일일·개인 수준의 더 높은 관계 만족과 관련됐다. 자기개방 결과는 성별과 분석 수준에 따라 달라 일관된 단일 효과로 요약할 수 없었다.",
    usableEvidenceRole:
      "교제 관계에서 필요 표현·자기개방·상대 반응성을 별도 과정으로 보는 배경",
    prohibitedInference:
      "관계가 시작되기 전 관심 상대에게 일반화하지 않으며, E/I나 R/N 방향을 직접 검증하지 않는다.",
    directNuangAxisValidation: false,
    directCanonicalWordingValidation: false,
    primaryUrl:
      "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.609232/full",
  },
];

const reviewDecisions = extractions.map((extraction) => ({
  candidateSourceId: extraction.candidateSourceId,
  extractionState: extraction.extractionState,
  backgroundEvidenceDecision:
    "ACCEPT_FOR_CONTEXT_BACKGROUND_ONLY",
  directNuangAxisEvidenceDecision: "REJECT_AS_DIRECT_EVIDENCE",
  directCanonicalWordingEvidenceDecision:
    "REJECT_AS_DIRECT_EVIDENCE",
  requiresIndependentMethodReview: true,
  reviewerDecision: null,
  publicationState: "research_only",
}));

const report = {
  contractVersion:
    "nuang-trait-map-p0-background-source-extraction.v2.3",
  reportId: "TRAIT-MAP-P0-BACKGROUND-SOURCE-EXTRACTION.2.3",
  status: "BACKGROUND_SCOPE_EXTRACTED_DIRECT_AXIS_GAP_REMAINS",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceGapProtocolId: gapProtocol.protocolId,
  reviewerIdentity: {
    type: "internal_primary_source_extraction",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  summary: {
    candidateSources: extractions.length,
    primaryFullTextKeySectionsExtracted: extractions.filter(
      (entry) =>
        entry.extractionState ===
        "primary_full_text_key_sections_extracted",
    ).length,
    publisherAbstractOnly: extractions.filter(
      (entry) =>
        entry.extractionState ===
        "publisher_abstract_extracted_full_text_pending",
    ).length,
    acceptedForBackgroundOnly: reviewDecisions.filter(
      (entry) =>
        entry.backgroundEvidenceDecision ===
        "ACCEPT_FOR_CONTEXT_BACKGROUND_ONLY",
    ).length,
    directNuangAxisValidationSources: extractions.filter(
      (entry) => entry.directNuangAxisValidation,
    ).length,
    directCanonicalWordingValidationSources: extractions.filter(
      (entry) => entry.directCanonicalWordingValidation,
    ).length,
    p0CanonicalEntriesReleased: 0,
    publicationApprovalsGranted: 0,
  },
  extractionRules: [
    "표본, 관계 맥락, 측정, 결과와 한계를 분리해 기록한다.",
    "가까운 친구 연구를 가족이나 관심 상대 연구로 바꾸어 부르지 않는다.",
    "교제 중 연인 연구를 관계 시작 전 관심 상대에게 자동 일반화하지 않는다.",
    "정서적·도구적 지원의 구분을 G/A 이분법의 직접 타당화로 사용하지 않는다.",
    "초록만 확인한 원문은 full-text 확인 완료로 세지 않는다.",
  ],
  extractions,
  reviewDecisions,
  nextGate: {
    name: "P0_CLAUSE_LEVEL_BACKGROUND_INTEGRATION_WITH_DIRECT_GAP_HOLD",
    action:
      "24개 문장에 배경 근거가 설명하는 구절과 설명하지 못하는 뉴앙 축 방향 구절을 분리하고, 후자는 정량 검증 전까지 direct-gap hold를 유지한다.",
  },
};

const registry = {
  contractVersion:
    "nuang-trait-map-p0-background-source-review.v2.3",
  registryId: "TRAIT-MAP-P0-BACKGROUND-SOURCE-REVIEW.2.3",
  status: "BACKGROUND_ONLY_REVIEW_DECISIONS_RECORDED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReportId: report.reportId,
  decisions: reviewDecisions,
};

if (
  report.summary.candidateSources !== 4 ||
  report.summary.primaryFullTextKeySectionsExtracted !== 3 ||
  report.summary.publisherAbstractOnly !== 1 ||
  report.summary.acceptedForBackgroundOnly !== 4 ||
  report.summary.directNuangAxisValidationSources !== 0 ||
  report.summary.directCanonicalWordingValidationSources !== 0 ||
  report.summary.p0CanonicalEntriesReleased !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error("P0 background source extraction invariants failed.");
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const registryOutput = await prettier.format(JSON.stringify(registry), {
  parser: "json",
});
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
    console.error("v2.3 P0 background source extraction is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(registryPath, registryOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 background extraction v2.3: ${extractions.length} sources, ${report.summary.primaryFullTextKeySectionsExtracted} full-text key-section extractions, ${report.summary.publisherAbstractOnly} abstract-only, 0 direct Nuang validations.`,
);

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 P0 배경 근거 원문 추출

## 결과

- 후보: **${result.summary.candidateSources}편**
- 원문 핵심 절 추출: **${result.summary.primaryFullTextKeySectionsExtracted}편**
- 출판사 초록까지만 확인: **${result.summary.publisherAbstractOnly}편**
- 상황 배경으로만 채택: **${result.summary.acceptedForBackgroundOnly}편**
- 뉴앙 축 직접 검증: **${result.summary.directNuangAxisValidationSources}편**
- P0 공개 해제: **${result.summary.p0CanonicalEntriesReleased}개**

가족 지원, 정서적·실질적 지원의 구분, 처음 만난 관계의 자기개방, 교제 관계의 필요 표현에 관한 배경은 보강됐다. 그러나 이 결과는 뉴앙 G/A·E/I·R/N 또는 현재 문장 전체를 직접 검증하지 않는다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
