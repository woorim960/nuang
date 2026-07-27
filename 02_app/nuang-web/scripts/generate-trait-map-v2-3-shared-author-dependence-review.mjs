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
  "TRAIT_MAP_SHARED_AUTHOR_DEPENDENCE_REVIEW_V2_3.json",
);
const registryPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_EVIDENCE_DEPENDENCE_REVIEWED_SHARED_AUTHOR_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "134_SHARED_AUTHOR_EVIDENCE_DEPENDENCE_REVIEW_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const dependenceAudit = readGenerated(
  "TRAIT_MAP_EVIDENCE_DEPENDENCE_AUDIT_V2_3.json",
);

const sources = [
  {
    sourceId: "SRC-BFAS-2007",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-BFAS-2007-ESCS",
        datasetId: "DATASET-BFAS-2007-ESCS",
        sampleId: "SAMPLE-BFAS-2007-STUDY-1-ESCS",
        sampleSize: 481,
        design:
          "Eugene-Springfield community sample의 75개 facet scale 분석",
      },
      {
        studyFamilyId: "FAMILY-BFAS-2007-VALIDATION",
        datasetId: "DATASET-BFAS-2007-VALIDATION",
        sampleId: "SAMPLE-BFAS-2007-STUDY-2",
        sampleSize: 480,
        design: "100문항 BFAS의 두 번째 검증 표본",
      },
    ],
    sourceLevelFinding:
      "두 표본을 이용해 Big Five의 10개 aspect 구조와 BFAS를 개발·검증했다.",
    primaryEvidenceLocators: [
      {
        url: "https://pubmed.ncbi.nlm.nih.gov/17983306/",
        locator: "abstract",
        supports:
          "Study 1 ESCS N=481, Study 2 N=480 및 BFAS 개발·검증",
      },
    ],
  },
  {
    sourceId: "SRC-IPC-2013",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-BFAS-2007-VALIDATION",
        datasetId: "DATASET-BFAS-2007-VALIDATION",
        sampleId: "SAMPLE-IPC-2013-1-BFAS-SUBSET",
        parentSampleId: "SAMPLE-BFAS-2007-STUDY-2",
        sampleSize: 469,
        design:
          "DeYoung et al. (2007) Study 2 중 필요한 측정을 완료한 참여자 하위표본",
      },
      {
        studyFamilyId: "FAMILY-IPC-2013-MTURK",
        datasetId: "DATASET-IPC-2013-MTURK",
        sampleId: "SAMPLE-IPC-2013-2-MTURK",
        sampleSize: 294,
        design: "미국 Mechanical Turk 온라인 표본",
      },
      {
        studyFamilyId: "FAMILY-BFAS-2007-ESCS",
        datasetId: "DATASET-BFAS-2007-ESCS",
        sampleId: "SAMPLE-IPC-2013-3-ESCS-SUBSET",
        parentSampleId: "SAMPLE-BFAS-2007-STUDY-1-ESCS",
        sampleSize: 409,
        design: "Eugene-Springfield community sample 하위표본",
      },
    ],
    secondaryAnalysisOfSourceIds: ["SRC-BFAS-2007"],
    sourceLevelFinding:
      "세 표본에서 Extraversion·Agreeableness aspect와 대인관계 원형 구조를 연결했다.",
    primaryEvidenceLocators: [
      {
        url: "https://onlinelibrary.wiley.com/doi/abs/10.1111/jopy.12020",
        locator: "abstract and method",
        supports: "세 표본 N=469, 294, 409",
      },
      {
        url: "https://www.researchgate.net/publication/232926949_Unifying_the_Aspects_of_the_Big_Five_the_Interpersonal_Circumplex_and_Trait_Affiliation",
        locator: "Method, Participants, Sample 1-3",
        supports:
          "Sample 1이 BFAS 2007 Study 2의 하위표본이고 Sample 3이 ESCS임",
      },
    ],
  },
  {
    sourceId: "SRC-STATE-DISTRIBUTION-2001",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-FLEESON-2001-STUDY-1",
        datasetId: "DATASET-FLEESON-2001-STUDY-1",
        sampleId: "SAMPLE-FLEESON-2001-STUDY-1",
        sampleSize: 46,
        design: "13일 동안 하루 5회 성격 상태 경험표집",
      },
      {
        studyFamilyId: "FAMILY-FLEESON-2001-STUDY-2",
        datasetId: "DATASET-FLEESON-2001-STUDY-2",
        sampleId: "SAMPLE-FLEESON-2001-STUDY-2",
        sampleSize: 29,
        design: "20일 또는 22일 동안 하루 5회 성격 상태 경험표집",
      },
      {
        studyFamilyId: "FAMILY-FLEESON-2001-STUDY-3",
        datasetId: "DATASET-FLEESON-2001-STUDY-3",
        sampleId: "SAMPLE-FLEESON-2001-STUDY-3",
        sampleSize: 30,
        design: "21일 동안 하루 5회 양극형 성격 상태 경험표집",
      },
    ],
    sourceLevelFinding:
      "세 경험표집 연구에서 개인 안의 성격 상태 변동과 개인별 분포의 안정성을 검토했다.",
    primaryEvidenceLocators: [
      {
        url: "https://simine.com/407/readings/Fleeson_2001.pdf",
        locator: "Study 1-3, Method, Participants and Procedure",
        supports: "각 연구 표본 수와 수집 일정",
      },
    ],
  },
  {
    sourceId: "SRC-SITUATION-CONTINGENCY-2007",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-FLEESON-2007-STUDY-1",
        datasetId: "DATASET-FLEESON-2007-STUDY-1",
        sampleId: "SAMPLE-FLEESON-2007-STUDY-1",
        sampleSize: 29,
        analyticSampleSize: 26,
        design:
          "14일 동안 하루 4회, 직전 30분의 성격 상태와 상황을 경험표집",
      },
      {
        studyFamilyId: "FAMILY-FLEESON-2007-STUDY-2",
        datasetId: "DATASET-FLEESON-2007-STUDY-2",
        sampleId: "SAMPLE-FLEESON-2007-STUDY-2",
        sampleSize: 47,
        design:
          "5주 동안 하루 5회, 직전 30분의 성격 상태와 상황을 경험표집",
      },
    ],
    sourceLevelFinding:
      "두 경험표집 연구에서 상황 특성과 순간 성격 상태의 개인별 연결을 검토했다.",
    primaryEvidenceLocators: [
      {
        url: "https://ubc-emotionlab.ca/wp-content/uploads/2012/05/Fleeson-2007-Situation-Based-Contingencies.pdf",
        locator: "Study 1-2, Method, Participants and Procedure",
        supports: "각 연구 표본 수·수집 기간·하루 보고 횟수",
      },
    ],
  },
  {
    sourceId: "SRC-TRAIT-ENACTMENT-2015",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-IPSP-2015",
        datasetId: "DATASET-IPSP-2015",
        sampleId: "SAMPLE-IPSP-2015-TARGETS-OBSERVERS",
        sampleSize: 280,
        subgroupSizes: {
          targets: 97,
          primaryObservers: 97,
          secondaryObservers: 86,
        },
        design:
          "10~20주 동안 20회의 표준화된 실험실 상황에서 대상자 행동을 관찰자가 평가",
      },
    ],
    sourceLevelFinding:
      "통제된 공통 상황에서도 사람별 평균 행동 차이와 개인 안의 큰 행동 변동이 함께 나타나는지 검토했다.",
    primaryEvidenceLocators: [
      {
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC4673017/",
        locator: "Method, Participants",
        supports:
          "IPSP 연구, 대상자 97명·관찰자 183명, 20회 실험실 세션",
      },
    ],
  },
  {
    sourceId: "SRC-EXTRAVERSION-PA-2015",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-EXTRAVERSION-PA-2015-AU",
        datasetId: "DATASET-EXTRAVERSION-PA-2015-AU",
        sampleId: "SAMPLE-EXTRAVERSION-PA-2015-AU",
        sampleSize: 437,
        design: "호주 두 대학의 학생 표본",
      },
      {
        studyFamilyId: "FAMILY-EXTRAVERSION-PA-2015-US",
        datasetId: "DATASET-EXTRAVERSION-PA-2015-US",
        sampleId: "SAMPLE-EXTRAVERSION-PA-2015-US-MTURK",
        sampleSize: 262,
        design: "미국 Mechanical Turk 성인 표본",
      },
    ],
    sourceLevelFinding:
      "두 표본에서 외향성과 여러 형태의 긍정 정서 사이의 관계를 비교했다.",
    primaryEvidenceLocators: [
      {
        url: "https://library.scottbarrykaufman.com/uploads/2015/07/Smillie_et_al-2014-Journal_of_Personality.pdf",
        locator: "Study 1-2, Method, Participants",
        supports: "호주 N=437, 미국 N=262 및 모집 방식",
      },
    ],
  },
  {
    sourceId: "SRC-OPENNESS-INTELLECT-2009",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-OPENNESS-INTELLECT-FMRI-2009",
        datasetId: "DATASET-OPENNESS-INTELLECT-FMRI-2009",
        sampleId: "SAMPLE-OPENNESS-INTELLECT-FMRI-2009",
        sampleSize: 104,
        design:
          "건강한 성인이 작업기억 과제를 수행하는 동안 fMRI와 성격·인지 수행을 함께 측정",
      },
    ],
    sourceLevelFinding:
      "Openness와 Intellect를 구분하고 Intellect와 작업기억 수행·뇌 활동의 관계를 검토했다.",
    primaryEvidenceLocators: [
      {
        url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC2805551/",
        locator: "abstract and method",
        supports: "건강한 성인 fMRI 표본 N=104",
      },
    ],
  },
  {
    sourceId: "SRC-SOKA-2010",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-SOKA-2010",
        datasetId: "DATASET-SOKA-2010",
        sampleId: "SAMPLE-SOKA-2010",
        sampleSize: 165,
        design:
          "참여자 자기평가, 친구 4명, 최대 4명의 낯선 사람 평가와 행동 준거를 결합한 round-robin 연구",
      },
    ],
    sourceLevelFinding:
      "성향의 관찰 가능성과 평가 민감도에 따라 자기와 타인의 판단 정확도가 어떻게 달라지는지 검토했다.",
    primaryEvidenceLocators: [
      {
        url: "https://simine.com/docs/Vazire_JPSP_2010.pdf",
        locator: "abstract and Method, Participants",
        supports: "N=165, 친구·낯선 사람 평가와 행동 과제",
      },
    ],
  },
  {
    sourceId: "SRC-FRIEND-DAILY-2015",
    studyFamilies: [
      {
        studyFamilyId: "FAMILY-PAIRS-INITIAL-WAVE",
        datasetId: "DATASET-PAIRS-INITIAL-WAVE",
        sampleId: "SAMPLE-PAIRS-INITIAL-WAVE",
        sampleSize: 434,
        analyticSampleSize: 378,
        design:
          "PAIRS 초기 파동의 실험실 평가, 친구 평가, 14일간 하루 4회 경험표집",
      },
    ],
    sourceLevelFinding:
      "성격, 친구 관계 만족, 일상 친구 상호작용의 양과 질 사이의 관계를 검토했다.",
    primaryEvidenceLocators: [
      {
        url: "https://journals.sagepub.com/doi/10.1002/per.1996",
        locator: "abstract and Method",
        supports: "PAIRS 초기 파동 N=434",
      },
      {
        url: "https://scispace.com/pdf/personality-and-friendship-satisfaction-in-daily-life-do-3qkn47qks7.pdf",
        locator: "Method, Participants and Procedure",
        supports:
          "PAIRS 최초 발표 논문, 분석 표본 N=378, 14일 경험표집",
      },
    ],
  },
];

const pairDecisions = [
  pair(
    "SRC-SITUATION-CONTINGENCY-2007",
    "SRC-TRAIT-ENACTMENT-2015",
    "서로 다른 일상 경험표집과 IPSP 표준화 실험실 자료다.",
  ),
  pair(
    "SRC-EXTRAVERSION-PA-2015",
    "SRC-IPC-2013",
    "호주·미국 긍정 정서 표본과 캐나다·MTurk·ESCS 대인관계 표본으로 자료가 다르다.",
  ),
  pair(
    "SRC-SITUATION-CONTINGENCY-2007",
    "SRC-STATE-DISTRIBUTION-2001",
    "표본 수, 수집 기간, 하루 보고 횟수와 측정 구성이 모두 다른 별도 경험표집이다.",
  ),
  pair(
    "SRC-EXTRAVERSION-PA-2015",
    "SRC-OPENNESS-INTELLECT-2009",
    "설문 기반 긍정 정서 두 표본과 N=104 fMRI 작업기억 표본으로 자료가 다르다.",
  ),
  pair(
    "SRC-IPC-2013",
    "SRC-OPENNESS-INTELLECT-2009",
    "대인관계 구조 세 표본과 fMRI 작업기억 표본으로 자료가 다르다.",
  ),
  pair(
    "SRC-FRIEND-DAILY-2015",
    "SRC-SOKA-2010",
    "PAIRS 초기 파동과 SOKA round-robin 연구는 서로 다른 명명된 연구·표본·수집 절차다.",
  ),
];

const discoveredDependencies = [
  {
    pairId: pairId("SRC-BFAS-2007", "SRC-IPC-2013"),
    sourceIds: ["SRC-BFAS-2007", "SRC-IPC-2013"].sort(),
    state: "confirmed_partial_dataset_reuse",
    sharedDatasetIds: [
      "DATASET-BFAS-2007-ESCS",
      "DATASET-BFAS-2007-VALIDATION",
    ],
    detail:
      "IPC 2013 Sample 1은 BFAS 2007 Study 2의 하위표본이고, Sample 3은 BFAS 2007 Study 1과 같은 ESCS 자료의 하위표본이다.",
    countingRule:
      "두 출처가 함께 인용돼도 공유 표본에 관한 결과를 독립된 두 데이터 근거로 세지 않는다.",
    highRiskCoCitationPairInCurrentAudit: false,
  },
];

const auditedPairById = new Map(
  dependenceAudit.highRiskPairRows.map((entry) => [
    entry.pairId,
    entry,
  ]),
);
for (const decision of pairDecisions) {
  const audited = auditedPairById.get(decision.pairId);
  if (!audited || audited.sharedAuthors.length === 0) {
    throw new Error(
      `Shared-author high-risk pair missing: ${decision.pairId}`,
    );
  }
  decision.currentHighRiskVariantCount =
    audited.highRiskVariantCount;
  decision.sharedAuthors = audited.sharedAuthors;
}

const registry = {
  contractVersion:
    "nuang-trait-map-evidence-dependence-reviewed-registry.v2.3",
  registryId:
    "TRAIT-MAP-EVIDENCE-DEPENDENCE-REVIEWED-SHARED-AUTHOR.2.3",
  status: "PARTIAL_BIBLIOGRAPHIC_REVIEW_SHARED_AUTHOR_SCOPE",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  reviewerIdentity: {
    type: "internal_bibliographic_audit",
    id: "CODEX-INTERNAL-RESEARCH-AUDIT",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  unitRules: {
    source:
      "한 출판물 단위. sourceId가 다르다는 사실만으로 표본 독립성을 뜻하지 않는다.",
    studyFamily:
      "같은 연구 프로젝트·코호트·재분석 계보를 공유하는 자료 묶음",
    dataset: "실제로 분석된 자료 묶음",
    sample:
      "dataset 안에서 특정 모집·파동·하위표본을 식별하는 단위",
    independentDatasetEvidence:
      "비교한 두 출처의 dataset이 겹치지 않을 때만 인정",
    independentTeamReplication:
      "dataset 비중복에 더해 핵심 연구팀도 독립적으로 수행한 반복 검증",
  },
  sources,
  sharedAuthorHighRiskPairDecisions: pairDecisions,
  discoveredDependencies,
};

const report = {
  contractVersion:
    "nuang-trait-map-shared-author-dependence-review.v2.3",
  reportId: "TRAIT-MAP-SHARED-AUTHOR-DEPENDENCE-REVIEW.2.3",
  status: "SHARED_AUTHOR_PAIRS_REVIEWED_TEAM_INDEPENDENCE_UNMET",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceAuditReportId: dependenceAudit.reportId,
  reviewedRegistryId: registry.registryId,
  summary: {
    sourcesNormalized: sources.length,
    sharedAuthorHighRiskPairsReviewed: pairDecisions.length,
    currentHighRiskVariantsTouched: new Set(
      pairDecisions.flatMap((decision) => {
        const audited = auditedPairById.get(decision.pairId);
        return audited.highRiskVariantIds;
      }),
    ).size,
    confirmedNonOverlappingDatasetPairs: pairDecisions.filter(
      (decision) =>
        decision.datasetIndependenceState ===
        "confirmed_non_overlapping_datasets",
    ).length,
    confirmedIndependentTeamReplications: pairDecisions.filter(
      (decision) =>
        decision.independentTeamReplicationState === "confirmed",
    ).length,
    partialDatasetReuseRelationshipsDiscovered:
      discoveredDependencies.length,
    highRiskPairsRemainingUnreviewed:
      dependenceAudit.summary.uniqueHighRiskSourcePairs -
      pairDecisions.length,
  },
  interpretation: [
    "저자가 겹친 6개 조합은 원문 방법을 기준으로 서로 다른 dataset임을 확인했다.",
    "그러나 핵심 저자가 겹치므로 독립 연구팀의 반복 검증으로 세지 않는다.",
    "IPC 2013은 BFAS 2007의 두 표본을 부분 재사용했다. 두 출처를 별개의 sourceId로 갖더라도 공유 자료 결과를 두 번 세면 안 된다.",
    "이 내부 서지 감사는 외부 심리측정 전문가의 독립 검토나 실제 타당화 연구를 대신하지 않는다.",
  ],
  nextGate: {
    name: "REMAINING_HIGH_RISK_PAIR_BIBLIOGRAPHIC_REVIEW",
    remainingPairs:
      dependenceAudit.summary.uniqueHighRiskSourcePairs -
      pairDecisions.length,
    priorityRule:
      "고위험 문장 사용량, 방법론 문서 제외 후 실질 출처 수, 저자·표본·코호트 겹침 신호 순으로 검토",
  },
};

if (
  report.summary.sourcesNormalized !== 9 ||
  report.summary.sharedAuthorHighRiskPairsReviewed !== 6 ||
  report.summary.confirmedNonOverlappingDatasetPairs !== 6 ||
  report.summary.confirmedIndependentTeamReplications !== 0 ||
  report.summary.partialDatasetReuseRelationshipsDiscovered !== 1 ||
  report.summary.highRiskPairsRemainingUnreviewed !== 174
) {
  throw new Error(
    "Shared-author evidence dependence review invariants failed.",
  );
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
    console.error(
      "v2.3 shared-author dependence review is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(registryPath, registryOutput);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Shared-author dependence review v2.3: ${report.summary.sharedAuthorHighRiskPairsReviewed} pairs reviewed, ${report.summary.confirmedNonOverlappingDatasetPairs} dataset-distinct, ${report.summary.confirmedIndependentTeamReplications} independent-team replications, ${report.summary.partialDatasetReuseRelationshipsDiscovered} reuse relationship discovered.`,
);

function pair(left, right, rationale) {
  return {
    pairId: pairId(left, right),
    sourceIds: [left, right].sort(),
    datasetIndependenceState:
      "confirmed_non_overlapping_datasets",
    independentTeamReplicationState: "not_confirmed_shared_author",
    publicationCountingState:
      "MAY_COUNT_AS_DISTINCT_DATASET_NOT_AS_INDEPENDENT_TEAM_REPLICATION",
    rationale,
    currentHighRiskVariantCount: 0,
    sharedAuthors: [],
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
  return `# v2.3 공유 저자 출처 의존성 원문 감사

## 결과

- 정규화한 출처: ${result.summary.sourcesNormalized}
- 검토한 공유 저자 고위험 조합: ${result.summary.sharedAuthorHighRiskPairsReviewed}
- 서로 다른 dataset으로 확인: ${result.summary.confirmedNonOverlappingDatasetPairs}
- 독립 연구팀 반복 검증으로 확인: ${result.summary.confirmedIndependentTeamReplications}
- 새로 찾은 부분 재사용 관계: ${result.summary.partialDatasetReuseRelationshipsDiscovered}
- 남은 고위험 출처 조합: ${result.summary.highRiskPairsRemainingUnreviewed}

저자가 겹친 6개 조합은 표본 수, 모집 경로, 수집 기간, 과제와 연구
설계를 원문 방법에서 대조했다. 여섯 조합 모두 서로 다른 dataset이지만
핵심 저자가 겹치므로 “독립 연구팀의 반복 검증”으로 부르지 않는다.

가장 중요한 추가 발견은 \`SRC-IPC-2013\`의 Sample 1과 Sample 3이
\`SRC-BFAS-2007\`의 두 표본을 각각 부분 재사용한다는 점이다. 논문이
두 편이어도 같은 표본 결과를 독립 근거 두 개로 계산하지 않는다.

정규화 원장:
\`review/TRAIT_MAP_EVIDENCE_DEPENDENCE_REVIEWED_SHARED_AUTHOR_V2_3.json\`

이 감사는 내부 서지 감사다. 외부 심리측정 전문가 검토, 실제 참여자
자료, 독립 반복 연구를 대신하지 않으며 발행 상태는 계속
\`research_only\`다.
`;
}
