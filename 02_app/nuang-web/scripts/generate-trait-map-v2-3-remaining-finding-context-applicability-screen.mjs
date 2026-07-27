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
  "TRAIT_MAP_REMAINING_FINDING_CONTEXT_APPLICABILITY_SCREEN_V2_3.json",
);
const queuePath = path.join(
  reviewDirectory,
  "TRAIT_MAP_CONTEXT_TRANSFER_SCOPE_REVIEW_QUEUE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "138_REMAINING_FINDING_CONTEXT_APPLICABILITY_SCREEN_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const scopeTriage = readGenerated(
  "TRAIT_MAP_CANONICAL_CLAIM_FINDING_SCOPE_TRIAGE_V2_3.json",
);

const findingScopeRegistry = [
  finding(
    "FND-INTENTION-BEHAVIOR-SEPARATION",
    ["general"],
    "qualifier",
    "의도와 실제 행동을 구분해야 한다는 일반 방법론적 경계",
  ),
  finding(
    "FND-SUPPORT-MATCHING-CONTEXT",
    ["partner"],
    "partial_contextual_finding",
    "부부 자기공개 과제에서 지원 유형과 요청 맥락의 부분적 일치",
  ),
  finding(
    "FND-EXTRAVERSION-NOT-SIMPLE-HAPPINESS",
    ["general"],
    "qualifier",
    "외향성을 단순 행복감으로 해석하지 않게 하는 경계",
  ),
  finding(
    "FND-STATE-DISTRIBUTION-STABILITY-VARIABILITY",
    ["general", "family", "friend", "partner", "work"],
    "background_trait_state_finding",
    "개인 내 상태 변동과 개인 간 중심 경향의 공존",
  ),
  finding(
    "FND-SITUATION-CONTINGENCY-MEANINGFUL-VARIABILITY",
    ["general", "family", "friend", "partner", "work"],
    "background_person_situation_finding",
    "상황 특성과 성향 상태의 연동 및 개인차",
  ),
  finding(
    "FND-INITIAL-ATTRACTION-SIMILARITY-NULL",
    ["person_of_interest"],
    "boundary_null_finding",
    "짧은 첫 만남에서 Big Five 유사성과 초기 호감의 무관련",
  ),
  finding(
    "FND-FRIEND-DAILY-INTERACTION-QUALITY",
    ["friend"],
    "partial_contextual_finding",
    "친구 상호작용의 시간·질과 우정 만족의 관련",
  ),
  finding(
    "FND-PARTNER-RESPONSIVENESS-LONGITUDINAL",
    ["partner"],
    "partial_contextual_finding",
    "혼인 관계에서 지각된 상대 반응성과 장기 웰빙의 관련",
  ),
  finding(
    "FND-RELATIONAL-UNCERTAINTY-TALK-DYNAMICS",
    ["partner"],
    "partial_contextual_finding",
    "교제 중 관계 불확실성과 관계 대화의 주간 연결",
  ),
  finding(
    "FND-EMOTION-EXPERIENCE-EXPRESSION-DISTINCTION",
    ["general", "family", "friend", "partner", "work"],
    "qualifier",
    "감정 경험·표현·생리 반응을 구분해야 한다는 경계",
  ),
  finding(
    "FND-FRIEND-DYAD-SIMILARITY-NOT-SATISFACTION",
    ["friend"],
    "boundary_null_finding",
    "Big Five 유사성이 우정 만족을 예측하지 않은 결과",
  ),
  finding(
    "FND-OPENNESS-INTELLECT-DISTINCTION",
    ["general", "work"],
    "background_construct_finding",
    "Openness와 Intellect의 관련성과 구분",
  ),
  finding(
    "FND-STATE-MEASUREMENT-DESIGN",
    ["general"],
    "method_only",
    "성격 상태 문항의 시간·상황·행동 표현 설계 원칙",
  ),
  finding(
    "FND-WORK-TRAIT-ACTIVATION-CONTEXT",
    ["work"],
    "method_only",
    "업무 단서·성향 행동·성과 평가를 분리하는 이론 모형",
  ),
  finding(
    "FND-PERSON-SITUATION-INDEPENDENT-REALTIME",
    ["general"],
    "background_person_situation_finding",
    "성격과 상황이 실시간 행동·정서에 각각 보인 관련",
  ),
  finding(
    "FND-WORK-SITUATION-STRENGTH-ACTIVATION",
    ["work"],
    "background_person_situation_finding",
    "업무 상황 강도·단서에 따른 성격–행동·성과 관련 차이",
  ),
];
const findingById = new Map(
  findingScopeRegistry.map((entry) => [entry.findingId, entry]),
);

const entries = scopeTriage.entries.map((entry) => {
  const targetContext = contextFromScenarioRef(entry.scenarioRef);
  const findingLinks = entry.remainingEvidenceFindingRefs.map(
    (findingId) => {
      const registered = findingById.get(findingId);
      if (!registered) {
        throw new Error(`Finding scope missing: ${findingId}`);
      }
      const exactContextMatch =
        registered.sourceContexts.includes(targetContext);
      return {
        findingId,
        targetContext,
        registeredSourceContexts: registered.sourceContexts,
        evidenceFunction: registered.evidenceFunction,
        scopeSummary: registered.scopeSummary,
        contextApplicabilityState: exactContextMatch
          ? "EXACT_REGISTERED_CONTEXT_MATCH"
          : registered.sourceContexts.includes("general")
            ? "GENERAL_TO_SPECIFIC_TRANSFER_NOT_ESTABLISHED"
            : "DIFFERENT_CONTEXT_TRANSFER_NOT_ESTABLISHED",
        directlyValidatesNuangAxisOrCanonicalWording: false,
        requiredDecision: exactContextMatch
          ? "구절 수준에서 부분·배경·경계 근거 역할을 판정한다."
          : "상황 전이를 정당화할 별도 근거를 추가하거나 이 finding을 직접 근거 계산에서 제외한다.",
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
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    claimKind: entry.claimKind,
    scenarioRef: entry.scenarioRef,
    targetContext,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    riskDomains: entry.riskDomains,
    canonicalWording: entry.canonicalWording,
    findingLinks,
    exactContextFindingRefs,
    transferredFindingRefs,
    noExactContextFinding,
    priority: noExactContextFinding
      ? "P0_NO_EXACT_CONTEXT_FINDING"
      : transferredFindingRefs.length > 0
        ? "P1_CONTEXT_TRANSFER_PRESENT"
        : "P2_EXACT_CONTEXT_ONLY",
    copyRevisionDecision: "NOT_DETERMINED_BY_THIS_SCREEN",
    publicationState: "research_only",
  };
});

const allLinks = entries.flatMap((entry) => entry.findingLinks);
const noExactEntries = entries.filter(
  (entry) => entry.noExactContextFinding,
);
const transferredLinks = allLinks.filter(
  (link) =>
    link.contextApplicabilityState !==
    "EXACT_REGISTERED_CONTEXT_MATCH",
);
const exactLinks = allLinks.filter(
  (link) =>
    link.contextApplicabilityState ===
    "EXACT_REGISTERED_CONTEXT_MATCH",
);

const report = {
  contractVersion:
    "nuang-trait-map-remaining-finding-context-applicability-screen.v2.3",
  reportId:
    "TRAIT-MAP-REMAINING-FINDING-CONTEXT-APPLICABILITY-SCREEN.2.3",
  status: "CONTEXT_APPLICABILITY_SCREEN_COMPLETE_SCOPE_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceScopeTriageReportId: scopeTriage.reportId,
  sourceRegistryFiles: [
    "src/features/nuang-code/trait-map-foundation-evidence-v2.ts",
    "src/features/nuang-code/trait-map-friendship-evidence-v2.ts",
    "src/features/nuang-code/trait-map-process-evidence-v2.ts",
    "src/features/nuang-code/trait-map-relationship-evidence-v2.ts",
    "src/features/nuang-code/trait-map-work-evidence-v2.ts",
  ],
  reviewerIdentity: {
    type: "internal_conservative_context_screen",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  summary: {
    canonicalEntriesScreened: entries.length,
    remainingFindingLinksScreened: allLinks.length,
    exactRegisteredContextLinks: exactLinks.length,
    contextTransferLinksNotEstablished: transferredLinks.length,
    entriesWithNoExactContextFinding: noExactEntries.length,
    findingsInScopeRegistry: findingScopeRegistry.length,
    directNuangAxisOrCanonicalValidations: allLinks.filter(
      (link) =>
        link.directlyValidatesNuangAxisOrCanonicalWording,
    ).length,
    copyRevisionsAuthorized: 0,
    publicationApprovalsGranted: 0,
  },
  countingRules: [
    "finding에 등록된 contexts와 canonical 상황을 정확히 일치시켜 센다.",
    "general 연구를 가족·친구·연인·관심 상대·업무 문장에 자동 확장하지 않는다.",
    "partner 연구를 가족·친구·관심 상대의 직접 근거로 자동 확장하지 않는다.",
    "상황이 일치해도 뉴앙 축이나 문장 전체를 직접 검증한 것으로 세지 않는다.",
    "null finding은 특정 효과의 부재 경계이며 반대 방향의 행동을 입증하지 않는다.",
  ],
  findingScopeRegistry,
  entries,
  nextGate: {
    name: "P0_CONTEXT_TRANSFER_CLAUSE_REVIEW",
    entries: noExactEntries.length,
    action:
      "동일 상황의 남은 finding이 없는 24개 문장을 먼저 구절 단위로 검토하고, 필요한 상황별 근거를 추가하기 전까지 직접 근거 충족으로 세지 않는다.",
  },
};

const queue = {
  contractVersion:
    "nuang-trait-map-context-transfer-scope-review-queue.v2.3",
  queueId: "TRAIT-MAP-CONTEXT-TRANSFER-SCOPE-REVIEW-QUEUE.2.3",
  status: "P0_CONTEXT_TRANSFER_REVIEW_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceReportId: report.reportId,
  entries: noExactEntries.map((entry) => ({
    canonicalVariantId: entry.canonicalVariantId,
    scenarioRef: entry.scenarioRef,
    targetContext: entry.targetContext,
    semanticAxes: entry.semanticAxes,
    canonicalWording: entry.canonicalWording,
    transferredFindingRefs: entry.transferredFindingRefs,
    issueCode: "EVIDENCE_CONTEXT_TRANSFER_NOT_ESTABLISHED",
    requiredAction:
      "동일 맥락 직접 근거를 연결하거나, 현재 finding의 역할을 일반 방법론·경계 근거로 낮추고 문구 범위를 재판정한다.",
    reviewerDecision: null,
    reviewerRef: null,
    reviewedAt: null,
    publicationState: "research_only",
  })),
};

if (
  report.summary.canonicalEntriesScreened !== 120 ||
  report.summary.remainingFindingLinksScreened !== 477 ||
  report.summary.exactRegisteredContextLinks !== 199 ||
  report.summary.contextTransferLinksNotEstablished !== 278 ||
  report.summary.entriesWithNoExactContextFinding !== 24 ||
  report.summary.findingsInScopeRegistry !== 16 ||
  report.summary.directNuangAxisOrCanonicalValidations !== 0 ||
  report.summary.copyRevisionsAuthorized !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error(
    "Remaining finding context applicability invariants failed.",
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
      "v2.3 remaining finding context applicability screen is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(queuePath, queueOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Remaining finding context screen v2.3: ${allLinks.length} links; ${exactLinks.length} exact-context, ${transferredLinks.length} transfer-unestablished, ${noExactEntries.length} entries with no exact-context remaining finding.`,
);

function finding(
  findingId,
  sourceContexts,
  evidenceFunction,
  scopeSummary,
) {
  return {
    findingId,
    sourceContexts,
    evidenceFunction,
    scopeSummary,
    directlyValidatesNuangAxisOrCanonicalWording: false,
  };
}

function contextFromScenarioRef(scenarioRef) {
  const contextToken = scenarioRef.split("-")[1];
  const contextByToken = {
    GENERAL: "general",
    FAMILY: "family",
    FRIEND: "friend",
    PARTNER: "partner",
    PERSON: "person_of_interest",
    WORK: "work",
  };
  const context = contextByToken[contextToken];
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
  return `# v2.3 남은 finding 상황 적용 범위 점검

## 결과

- 고위험 canonical: **${result.summary.canonicalEntriesScreened}개**
- 남은 finding 연결: **${result.summary.remainingFindingLinksScreened}개**
- 원 연구에 등록된 상황과 정확히 일치: **${result.summary.exactRegisteredContextLinks}개**
- 상황 전이가 아직 입증되지 않음: **${result.summary.contextTransferLinksNotEstablished}개**
- 같은 상황의 남은 finding이 하나도 없음: **${result.summary.entriesWithNoExactContextFinding}개**
- 뉴앙 축 또는 문장 전체의 직접 검증: **${result.summary.directNuangAxisOrCanonicalValidations}개**

## 핵심 해석

일반 성향 연구가 가족·친구·관심 상대·업무의 구체적 말과 행동을 자동으로 입증하지는 않는다. 연인·부부 연구도 가족이나 친구에게 그대로 옮길 수 없다. 반대로 상황이 정확히 일치하더라도 해당 finding은 부분 관계, 방법론 또는 해석 경계를 제공할 뿐 뉴앙 코드를 직접 검증한 자료는 아니다.

## P0 검토 대상

동일 상황의 남은 finding이 없는 **${result.summary.entriesWithNoExactContextFinding}개**는 가족의 도움 요청, 관심 상대의 도움 요청·욕구 표현 문장에 집중된다. 이 문장들은 즉시 삭제하지 않지만, 같은 상황의 근거를 추가하거나 표현 범위를 다시 정하기 전까지 직접 근거 충족으로 세지 않는다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
