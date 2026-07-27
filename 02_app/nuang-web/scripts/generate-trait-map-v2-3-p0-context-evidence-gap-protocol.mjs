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
  "TRAIT_MAP_P0_CONTEXT_EVIDENCE_GAP_PROTOCOL_V2_3.json",
);
const registerPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_CONTEXT_EVIDENCE_GAP_REGISTER_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "139_P0_CONTEXT_EVIDENCE_GAP_PROTOCOL_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const applicability = readGenerated(
  "TRAIT_MAP_REMAINING_FINDING_CONTEXT_APPLICABILITY_SCREEN_V2_3.json",
);
const p0Entries = applicability.entries.filter(
  (entry) => entry.noExactContextFinding,
);

const candidateBackgroundSources = [
  {
    candidateSourceId: "SRC-CANDIDATE-FAMILY-ADL-SUPPORT-2023",
    title:
      "Activities of Daily Living Needs and Support in Adult Child-Parent Dyads",
    primaryUrl:
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC10783371/",
    targetContext: "family",
    designScope:
      "성인 자녀–부모 관계에서 도구적·정서적·정보적 지원의 제공과 수령을 종단 자료로 구분",
    potentialRole:
      "가족 지원이 한 가지 형태가 아니라는 상황 배경 근거",
    directNuangAxisValidation: false,
    directCanonicalWordingValidation: false,
    disposition: "BACKGROUND_CANDIDATE_REQUIRES_FULL_TEXT_EXTRACTION",
  },
  {
    candidateSourceId:
      "SRC-CANDIDATE-EMOTIONAL-INSTRUMENTAL-SUPPORT-2015",
    title:
      "Emotional and Instrumental Support Provision Interact to Predict Well-Being",
    primaryUrl:
      "https://pmc.ncbi.nlm.nih.gov/articles/PMC4516598/",
    targetContext: "close_relationship_support",
    designScope:
      "정서적 지원과 도구적 지원을 구분 가능한 차원으로 모델링",
    potentialRole:
      "마음 살피기와 실질 지원을 동일한 행동으로 합치지 않는 구성개념 배경",
    directNuangAxisValidation: false,
    directCanonicalWordingValidation: false,
    disposition: "BACKGROUND_CANDIDATE_REQUIRES_FULL_TEXT_EXTRACTION",
  },
  {
    candidateSourceId:
      "SRC-CANDIDATE-ZERO-ACQUAINTANCE-DISCLOSURE-2022",
    title:
      "An Experiment on the Effects of Self-disclosure on Perceived Partner Responsiveness and Intimacy in Zero-Acquaintance Relationships",
    primaryUrl:
      "https://doi.org/10.1080/10510974.2022.2084429",
    targetContext: "person_of_interest",
    designScope:
      "처음 만난 관계의 자기개방 강도와 지각된 반응성·친밀감 연결을 본 N=253 실험",
    potentialRole:
      "아직 가까워지기 전 자기개방과 상대 반응을 다루는 상황 배경",
    directNuangAxisValidation: false,
    directCanonicalWordingValidation: false,
    disposition: "BACKGROUND_CANDIDATE_REQUIRES_FULL_TEXT_EXTRACTION",
  },
  {
    candidateSourceId:
      "SRC-CANDIDATE-ROMANTIC-NEEDS-DIARY-2021",
    title:
      "The Role of Relational Entitlement, Self-Disclosure and Perceived Partner Responsiveness in Predicting Couple Satisfaction: A Daily-Diary Study",
    primaryUrl:
      "https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2021.609232/full",
    targetContext: "partner",
    designScope:
      "99쌍·198명의 7일 일기에서 필요 표현, 자기개방, 지각된 상대 반응성과 관계 만족을 구분",
    potentialRole:
      "필요 표현과 상대 반응을 별도 과정으로 보는 관계 유지 단계의 배경",
    directNuangAxisValidation: false,
    directCanonicalWordingValidation: false,
    disposition:
      "BACKGROUND_ONLY_NOT_EARLY_RELATIONSHIP_DIRECT_SUPPORT",
  },
];

const gapGroups = [
  makeGapGroup({
    gapGroupId: "GAP-FAMILY-SUPPORT-REQUESTED-RO",
    scenarioRef: "SCN-FAMILY-7",
    targetContext: "family",
    targetAxes: ["RO"],
    candidateSourceIds: [
      "SRC-CANDIDATE-FAMILY-ADL-SUPPORT-2023",
      "SRC-CANDIDATE-EMOTIONAL-INSTRUMENTAL-SUPPORT-2015",
    ],
    researchQuestion:
      "가족이 도움을 요청한 장면에서 뉴앙 RO 연속점수와 처음 주목하는 정보, 실제 지원 행동, 말하는 방식이 어떤 관련을 보이는가?",
  }),
  makeGapGroup({
    gapGroupId: "GAP-PERSON-OF-INTEREST-SUPPORT-REQUESTED-RO",
    scenarioRef: "SCN-PERSON-OF-INTEREST-7",
    targetContext: "person_of_interest",
    targetAxes: ["RO"],
    candidateSourceIds: [
      "SRC-CANDIDATE-EMOTIONAL-INSTRUMENTAL-SUPPORT-2015",
      "SRC-CANDIDATE-ZERO-ACQUAINTANCE-DISCLOSURE-2022",
    ],
    researchQuestion:
      "아직 관계가 확정되지 않은 관심 상대가 도움을 요청할 때 뉴앙 RO 연속점수와 정보 확인, 정서 확인, 지원 선택, 표현 방식이 어떤 관련을 보이는가?",
  }),
  makeGapGroup({
    gapGroupId: "GAP-PERSON-OF-INTEREST-NEED-EXPRESSION-SE",
    scenarioRef: "SCN-PERSON-OF-INTEREST-8",
    targetContext: "person_of_interest",
    targetAxes: ["SE", "OE"],
    candidateSourceIds: [
      "SRC-CANDIDATE-ZERO-ACQUAINTANCE-DISCLOSURE-2022",
      "SRC-CANDIDATE-ROMANTIC-NEEDS-DIARY-2021",
    ],
    researchQuestion:
      "관심 상대에게 만남·연락 같은 필요를 표현할 때 뉴앙 SE·OE 연속점수와 준비 시간, 대화 개시, 구체성, 선택 여지 제공이 어떤 관련을 보이는가?",
  }),
];

const registerEntries = p0Entries.map((entry) => {
  const group = gapGroups.find(
    (candidate) => candidate.scenarioRef === entry.scenarioRef,
  );
  if (!group) {
    throw new Error(
      `Evidence gap group missing: ${entry.canonicalVariantId}`,
    );
  }
  return {
    canonicalVariantId: entry.canonicalVariantId,
    gapGroupId: group.gapGroupId,
    scenarioRef: entry.scenarioRef,
    targetContext: entry.targetContext,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    claimKind: entry.claimKind,
    canonicalWording: entry.canonicalWording,
    evidenceGapLayers: [
      {
        layer: "context_construct_background",
        state: "candidate_sources_identified_not_extracted",
      },
      {
        layer: "nuang_axis_direction_association",
        state: "no_direct_validation",
      },
      {
        layer: "specific_canonical_wording",
        state: "no_direct_validation",
      },
    ],
    currentDecision:
      "HOLD_DIRECT_EVIDENCE_CREDIT_PENDING_EMPIRICAL_VALIDATION",
    copyRevisionDecision: null,
    reviewerDecision: null,
    publicationState: "research_only",
  };
});

const protocol = {
  contractVersion:
    "nuang-trait-map-p0-context-evidence-gap-protocol.v2.3",
  protocolId: "TRAIT-MAP-P0-CONTEXT-EVIDENCE-GAP-PROTOCOL.2.3",
  status: "P0_GAPS_SPECIFIED_BACKGROUND_CANDIDATES_IDENTIFIED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceApplicabilityReportId: applicability.reportId,
  reviewerIdentity: {
    type: "internal_research_gap_design",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  summary: {
    p0CanonicalEntries: registerEntries.length,
    evidenceGapGroups: gapGroups.length,
    backgroundCandidateSources: candidateBackgroundSources.length,
    candidateSourcesFullyExtractedAndVerified: 0,
    directNuangAxisValidationSources: 0,
    directCanonicalWordingValidationSources: 0,
    empiricalValidationModulesSpecified: gapGroups.length,
    publicationApprovalsGranted: 0,
  },
  candidateBackgroundSources,
  gapGroups,
  empiricalValidationContract: {
    population:
      "한국어를 일상적으로 사용하는 성인. 가족 장면과 관심 상대 장면을 실제로 이해할 수 있는 참여자를 별도 모집한다.",
    predictor:
      "뉴앙 축은 알파벳 범주만 쓰지 않고 연속점수와 측정오차를 함께 사용한다.",
    elicitation: [
      "표준화된 장면을 제시한 뒤 처음 주목한 정보와 처음 드는 생각을 먼저 분리해 기록한다.",
      "실제 나타나는 반응은 선택지, 자유응답, 가능하면 후속 일상 경험표집으로 교차 확인한다.",
      "attention·process·response·communication을 서로 다른 결과로 분석한다.",
    ],
    coding:
      "두 명 이상의 독립 코더가 사전 정의된 행동 코드를 blind 판정하고 일치도를 보고한다.",
    analysis:
      "축 연속점수와 반응의 관련, 비선형성, 상황×축 상호작용을 사전 등록한다. 탐색 결과와 확인 결과를 분리한다.",
    minimumSafetyRules: [
      "단일 문항이나 한 번의 장면으로 대표 성향을 판정하지 않는다.",
      "상관 결과를 원인 또는 반드시 나타나는 행동으로 쓰지 않는다.",
      "성별·연령·관계 경험별 DIF와 이해도 차이를 확인한다.",
      "뉴앙 축과 기존 척도의 수렴·구별 타당도를 함께 평가한다.",
    ],
    publicationRule:
      "독립 검토, 인지 면담, 사전 등록된 정량 검증을 통과한 구절만 공개 allowlist 후보가 된다.",
  },
  nextGate: {
    name: "BACKGROUND_SOURCE_FULL_TEXT_EXTRACTION_AND_GAP_LEDGER_UPDATE",
    action:
      "후보 4편의 표본·설계·결과·한계를 원문 표 단위로 추출하되, 뉴앙 축 직접 검증 0이라는 상태를 유지한다.",
  },
};

const register = {
  contractVersion:
    "nuang-trait-map-p0-context-evidence-gap-register.v2.3",
  registerId: "TRAIT-MAP-P0-CONTEXT-EVIDENCE-GAP-REGISTER.2.3",
  status: "P0_GAPS_OPEN",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceProtocolId: protocol.protocolId,
  entries: registerEntries,
};

if (
  protocol.summary.p0CanonicalEntries !== 24 ||
  protocol.summary.evidenceGapGroups !== 3 ||
  protocol.summary.backgroundCandidateSources !== 4 ||
  protocol.summary.candidateSourcesFullyExtractedAndVerified !== 0 ||
  protocol.summary.directNuangAxisValidationSources !== 0 ||
  protocol.summary.directCanonicalWordingValidationSources !== 0 ||
  protocol.summary.empiricalValidationModulesSpecified !== 3 ||
  protocol.summary.publicationApprovalsGranted !== 0
) {
  throw new Error("P0 context evidence gap protocol invariants failed.");
}

const output = await prettier.format(JSON.stringify(protocol), {
  parser: "json",
});
const registerOutput = await prettier.format(JSON.stringify(register), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(protocol), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [registerPath, registerOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error("v2.3 P0 context evidence gap protocol is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(registerPath, registerOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 context evidence gap protocol v2.3: ${registerEntries.length} entries in ${gapGroups.length} groups, ${candidateBackgroundSources.length} background candidates, 0 direct Nuang axis validations.`,
);

function makeGapGroup({
  gapGroupId,
  scenarioRef,
  targetContext,
  targetAxes,
  candidateSourceIds,
  researchQuestion,
}) {
  const canonicalVariantIds = p0Entries
    .filter((entry) => entry.scenarioRef === scenarioRef)
    .map((entry) => entry.canonicalVariantId);
  return {
    gapGroupId,
    scenarioRef,
    targetContext,
    targetAxes,
    canonicalVariantIds,
    canonicalEntryCount: canonicalVariantIds.length,
    candidateSourceIds,
    researchQuestion,
    gapState:
      "BACKGROUND_CANDIDATES_ONLY_DIRECT_NUANG_VALIDATION_REQUIRED",
  };
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  return `# v2.3 P0 상황 근거 공백 연구 계약

## 결과

- P0 canonical: **${result.summary.p0CanonicalEntries}개**
- 근거 공백 묶음: **${result.summary.evidenceGapGroups}개**
- 원문 추출 전 배경 후보: **${result.summary.backgroundCandidateSources}편**
- 뉴앙 축 직접 검증: **${result.summary.directNuangAxisValidationSources}편**
- 문장 전체 직접 검증: **${result.summary.directCanonicalWordingValidationSources}편**

## 세 가지 공백

1. 가족이 도움을 요청했을 때 G/A 관련 주목·생각·반응·말투
2. 관심 상대가 도움을 요청했을 때 G/A 관련 지원 선택
3. 관심 상대에게 필요를 표현할 때 E/I와 R/N 관련 준비·대화 개시

후보 논문은 가족 지원의 종류, 정서적·도구적 지원의 구분, 처음 만난 관계의 자기개방, 교제 중 필요 표현의 배경을 제공할 수 있다. 그러나 어느 논문도 뉴앙 축이나 현재 한국어 문장 전체를 직접 검증하지 않는다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
