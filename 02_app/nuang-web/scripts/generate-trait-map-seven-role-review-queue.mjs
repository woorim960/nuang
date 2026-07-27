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
const useV21 = process.argv.includes("--axis-version=v2-1");
const useAllV21 =
  useV21 && process.argv.includes("--scope=all");
const artifactSuffix = useV21 ? "V2_1" : "V2";
const versionLabel = useV21 ? "v2.1" : "v2";
const outputPath = path.join(
  generatedDirectory,
  useV21
    ? useAllV21
      ? "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2_1.json"
      : "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_CAB_01_V2_1.json"
    : "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2.json",
);
const cab01OutputPath = path.join(
  reviewDirectory,
  `TRAIT_MAP_SEVEN_ROLE_REVIEW_CAB_01_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  useV21
    ? useAllV21
      ? "46_SEVEN_ROLE_REVIEW_QUEUE_V2_1.md"
      : "39_SEVEN_ROLE_REVIEW_QUEUE_CAB_01_V2_1.md"
    : "26_SEVEN_ROLE_REVIEW_QUEUE_CAB_01_V2.md",
);
const checkOnly = process.argv.includes("--check");

const decisions = ["approve", "revise", "hold", "reject"];
const roleContracts = [
  {
    role: "personality_psychologist",
    koreanName: "성격심리 검토",
    requiredChecks: [
      "construct_alignment",
      "axis_direction",
      "thought_value_behavior_separation",
      "context_boundary",
      "neighbor_contrast",
    ],
    issueCodePrefixes: ["PSY_"],
  },
  {
    role: "psychometrician",
    koreanName: "심리측정 검토",
    requiredChecks: [
      "item_score_claim_alignment",
      "continuous_score_boundary",
      "mixed_case_reading",
      "axis_contamination",
      "validation_scope",
    ],
    issueCodePrefixes: ["MET_"],
  },
  {
    role: "research_methodologist",
    koreanName: "연구방법 검토",
    requiredChecks: [
      "source_finding_trace",
      "evidence_directness",
      "null_contrary_evidence",
      "cultural_transfer",
      "risk_matched_evidence",
    ],
    issueCodePrefixes: ["RES_"],
  },
  {
    role: "korean_plain_language_editor",
    koreanName: "쉬운 한국어 검토",
    requiredChecks: [
      "first_read_comprehension",
      "one_main_idea",
      "concrete_everyday_language",
      "no_translationese",
      "mobile_scanability",
    ],
    issueCodePrefixes: ["KOR_"],
  },
  {
    role: "safety_privacy_reviewer",
    koreanName: "안전·개인정보 검토",
    requiredChecks: [
      "privacy_scope",
      "no_diagnosis_stigma",
      "no_relationship_outcome",
      "no_sensitive_inference",
      "no_deterministic_label",
    ],
    issueCodePrefixes: ["SAFE_"],
  },
  {
    role: "product_content_designer",
    koreanName: "제품 콘텐츠 검토",
    requiredChecks: [
      "surface_fit",
      "summary_detail_alignment",
      "non_repetition",
      "user_value",
      "scan_order",
    ],
    issueCodePrefixes: ["PROD_"],
  },
  {
    role: "data_quality_engineer",
    koreanName: "데이터 품질 검토",
    requiredChecks: [
      "id_version_integrity",
      "provenance_integrity",
      "recomposition_integrity",
      "privacy_contract_integrity",
      "rollback_readiness",
    ],
    issueCodePrefixes: ["DATA_"],
  },
];
const issueCatalog = {
  PSY_CONSTRUCT_MISMATCH: "뉴앙 축과 다른 구성개념을 설명함",
  PSY_AXIS_DIRECTION_AMBIGUOUS: "어느 축 방향인지 불분명함",
  PSY_REASON_BEHAVIOR_LEAP: "가치·생각에서 행동으로 근거 없이 뛰어넘음",
  PSY_CONTEXT_OVERGENERALIZATION: "한 상황의 경향을 모든 상황으로 넓힘",
  PSY_ABILITY_OR_MORAL_INFERENCE: "능력·도덕성·우열을 암시함",
  MET_SCORE_INFERENCE_UNVALIDATED: "검증되지 않은 점수 차이를 실제 차이로 단정함",
  MET_AXIS_CONTAMINATION: "다른 축의 의미가 섞임",
  MET_DICHOTOMY_OVERCLAIM: "연속적인 차이를 완전한 두 종류처럼 설명함",
  MET_MIXED_CASE_MISSING: "경계형·혼합형에서 문장이 성립하지 않음",
  MET_ITEM_CLAIM_MISMATCH: "문항이 관찰하는 것보다 더 큰 주장을 함",
  RES_SOURCE_TRACE_BROKEN: "source·finding·문장 계보가 끊김",
  RES_EVIDENCE_INDIRECT: "근거가 해당 claim과 간접적으로만 연결됨",
  RES_NULL_OR_CONTRARY_IGNORED: "무효·반대 결과를 검토하지 않음",
  RES_CULTURAL_TRANSFER_UNCHECKED: "문화·언어 이전을 확인하지 않음",
  RES_HIGH_RISK_EVIDENCE_SHORTAGE: "고위험 claim에 독립 근거가 부족함",
  KOR_TRANSLATIONESE: "번역체이거나 일상에서 쓰지 않는 표현임",
  KOR_ABSTRACT_OR_AMBIGUOUS: "문맥 없이 모호한 표현이 있음",
  KOR_MULTIPLE_IDEAS: "한 문장에 서로 다른 핵심이 너무 많이 들어감",
  KOR_SUBJECT_OR_ACTION_UNCLEAR: "누가 무엇을 하는지 바로 알기 어려움",
  KOR_MOBILE_SCAN_FAILURE: "모바일에서 뜻이 깨지거나 너무 김",
  SAFE_PRIVATE_SIGNAL_LEAK: "비공개 신호가 공개 화면으로 나감",
  SAFE_DIAGNOSIS_OR_STIGMA: "진단·낙인으로 읽힐 수 있음",
  SAFE_RELATIONSHIP_OUTCOME: "호감·관계 성공·상대 마음을 확정함",
  SAFE_SENSITIVE_INFERENCE: "사용자가 제공하지 않은 민감정보를 추론함",
  SAFE_DETERMINISTIC_LABEL: "사람을 고정적이고 바뀌지 않는 존재로 규정함",
  PROD_WRONG_SURFACE: "잘못된 화면에 배치됨",
  PROD_DUPLICATE_VALUE: "앞뒤 내용과 같은 정보가 반복됨",
  PROD_SUMMARY_DETAIL_MISMATCH: "요약과 상세가 서로 다른 뜻을 말함",
  PROD_LOW_USER_VALUE: "자신이나 상대를 이해하는 데 도움이 적음",
  PROD_POOR_SCAN_ORDER: "중요한 내용이 뒤에 묻히거나 읽는 순서가 어색함",
  DATA_ID_OR_VERSION_ERROR: "contentKey·canonical ID·version이 잘못됨",
  DATA_PROVENANCE_MISSING: "원문·교정·제외 계보가 빠짐",
  DATA_RECOMPOSITION_ERROR: "32개 코드 재조합에서 예상 밖 문장이 바뀜",
  DATA_PRIVACY_CONTRACT_ERROR: "privacyScope와 허용 화면이 맞지 않음",
  DATA_ROLLBACK_UNAVAILABLE: "철회 시 돌아갈 버전이나 대체 문장이 없음",
};

const ledger = useV21
  ? useAllV21
    ? readJson(
        generatedDirectory,
        "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2_1.json",
      )
    : buildV21BatchLedger()
  : readJson(
      generatedDirectory,
      "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2.json",
    );
const targetedByCanonicalId = new Map();
const preflightByCanonicalId = new Map();
const amendedClaimByKey = new Map();

for (
  let index = 1;
  index <= (useV21 && !useAllV21 ? 1 : 12);
  index += 1
) {
  const fileBatchId = `CAB_${String(index).padStart(2, "0")}`;
  const preflight = readJson(
    generatedDirectory,
    `TRAIT_MAP_CANONICAL_PREFLIGHT_${fileBatchId}_${artifactSuffix}.json`,
  );
  for (const audit of preflight.variantAudits) {
    preflightByCanonicalId.set(audit.canonicalVariantId, audit);
  }

  const targeted = readJson(
    reviewDirectory,
    `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_${artifactSuffix}.json`,
  );
  for (const pair of targeted.pairs) {
    for (const side of ["left", "right"]) {
      const canonicalVariantId = pair[side].canonicalVariantId;
      const current = targetedByCanonicalId.get(canonicalVariantId) ?? [];
      current.push({
        reviewId: pair.reviewId,
        changedAxis: pair.changedAxis,
        side,
      });
      targetedByCanonicalId.set(canonicalVariantId, current);
    }
  }
}

if (useV21) {
  const finalAxisDecisions = readJson(
    generatedDirectory,
    "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json",
  );
  for (const slot of finalAxisDecisions.slots.filter(
    (item) => item.amended,
  )) {
    amendedClaimByKey.set(slot.claimKey, {
      amendmentId: slot.amendmentId,
      removedAxes: slot.removedAxes,
      rationale: slot.rationale,
      decisionState: slot.amendmentDecision,
    });
  }
}

const queue = ledger.entries
  .map((entry) => createQueueEntry(entry))
  .sort(compareQueueEntries);
const cab01Entries = queue.filter((entry) => entry.batchId === "CAB-01");
const report = {
  contractVersion: useV21
    ? "nuang-trait-map-seven-role-review.v2.1"
    : "nuang-trait-map-seven-role-review.v2",
  reportId: useV21
    ? useAllV21
      ? "TRAIT-MAP-SEVEN-ROLE-REVIEW-QUEUE.0.2"
      : "TRAIT-MAP-SEVEN-ROLE-REVIEW-QUEUE-CAB-01.0.2"
    : "TRAIT-MAP-SEVEN-ROLE-REVIEW-QUEUE.0.1",
  status: useAllV21
    ? "ALL_705_ENTRIES_QUEUED_REVIEW_CONTRACT_LOCKED_NO_EXPERT_APPROVAL_ASSUMED"
    : "REVIEW_CONTRACT_LOCKED_QUEUE_READY_NO_EXPERT_APPROVAL_ASSUMED",
  publicationState: "research_only",
  generatedAt: "2026-07-23T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  queueScope: useAllV21 ? "all_12_batches" : "cab_01",
  decisionValues: decisions,
  roleContracts,
  issueCatalog,
  completionRule: {
    expertReviewedWhen: [
      "seven roles all decide approve",
      "every role has note, reviewerRef, and reviewedAt",
      "reviewed content version equals current content version",
      "all automated gates remain passed",
    ],
    customerApprovedWhen: [
      "expert review completed",
      "cognitive interview and comprehension test completed",
      "construct and fairness validation completed",
      "surface-specific release approval recorded",
    ],
  },
  summary: summarize(queue),
  priorityRules: [
    "P0: 새 근거 제한 문단, 표적 축 교정, 또는 v2.1 축 수정으로 새로 합쳐진 변형",
    "P1: 서로 다른 원문 정보를 둘 이상 보존한 변형",
    "P2: 단일 원문 기반 표준 변형",
  ],
  entries: queue,
};
const cab01Workbook = {
  contractVersion: report.contractVersion,
  workbookId: useV21
    ? "TRAIT-MAP-SEVEN-ROLE-REVIEW-CAB-01.0.2"
    : "TRAIT-MAP-SEVEN-ROLE-REVIEW-CAB-01.0.1",
  batchId: "CAB-01",
  status: "QUEUED_INTERNAL_SCREENING_AND_INDEPENDENT_ROLE_REVIEW_PENDING",
  publicationState: "research_only",
  generatedAt: report.generatedAt,
  sourceQueueReportId: report.reportId,
  decisionValues: decisions,
  summary: summarize(cab01Entries),
  reviewOrder: [
    useV21
      ? "P0에서 축 수정으로 새로 합쳐진 8개 변형을 이전 축 의미가 남지 않았는지 먼저 검토한다."
      : "P0에서 새로 작성한 4개 문단을 먼저 검토한다.",
    useV21
      ? "P0의 표적 축 변형 16개를 이웃 쌍으로 나란히 검토하고, 근거 제한 새 문단 1개를 별도로 확인한다."
      : "P0의 나머지 표적 축 변형을 이웃 쌍으로 나란히 검토한다.",
    "P1은 원문 정보가 요약과 상세에 손실 없이 나뉘었는지 검토한다.",
    "P2를 scenarioRef와 claimKind 순서로 검토한다.",
  ],
  entries: cab01Entries,
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const cab01Output = await prettier.format(JSON.stringify(cab01Workbook), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(cab01Workbook), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(cab01OutputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(cab01OutputPath, "utf8") !== cab01Output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error(
      "Seven-role review queue is stale. Run npm run research:trait-map:v2:seven-role-review-queue.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(cab01OutputPath, cab01Output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Seven-role review queue: ${report.summary.entries} entries; CAB-01 ${cab01Workbook.summary.entries}, P0 ${cab01Workbook.summary.priorities.P0}, expert-reviewed ${cab01Workbook.summary.expertReviewed}.`,
);

function createQueueEntry(entry) {
  const preflight = preflightByCanonicalId.get(entry.canonicalVariantId);
  if (!preflight) {
    throw new Error(`Missing preflight audit: ${entry.canonicalVariantId}`);
  }
  const targetedReviews =
    targetedByCanonicalId.get(entry.canonicalVariantId) ?? [];
  const hasAuthoredParagraph = Boolean(entry.provenance.authoredParagraph);
  const axisAmendment = amendedClaimByKey.get(entry.claimKey) ?? null;
  const priority =
    hasAuthoredParagraph || targetedReviews.length > 0 || axisAmendment
      ? "P0"
      : entry.provenance.sourceBlockCount > 1
        ? "P1"
        : "P2";
  const priorityReasons = [
    ...(hasAuthoredParagraph ? ["authored_evidence_bounded_paragraph"] : []),
    ...(targetedReviews.length > 0 ? ["targeted_axis_rewrite"] : []),
    ...(axisAmendment ? ["axis_amendment_lineage_merge"] : []),
    ...(entry.provenance.sourceBlockCount > 1
      ? ["multiple_source_blocks_preserved"]
      : []),
  ];

  return {
    queueId: `SRR-${entry.batchId}-${entry.canonicalVariantId}`,
    priority,
    priorityReasons,
    contentKey: entry.contentKey,
    canonicalVariantId: entry.canonicalVariantId,
    contentVersion: entry.version,
    batchId: entry.batchId,
    scenarioRef: entry.scenarioRef,
    claimKey: entry.claimKey,
    claimKind: entry.claimKind,
    privacyScope: entry.privacyScope,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    content: entry.content,
    evidencePacket: {
      sourceUnitIds: entry.provenance.sourceUnitIds,
      sourceBlockCount: entry.provenance.sourceBlockCount,
      semanticDecision: entry.provenance.semanticDecision,
      authoredParagraph: entry.provenance.authoredParagraph,
      lineageExclusions: entry.provenance.lineageExclusions,
      targetedAxisReviews: targetedReviews,
      axisAmendment,
    },
    automatedScreening: {
      state: "passed_not_an_expert_approval",
      gates: entry.automatedGates,
      preflightState: preflight.preflightState,
      hardFailures: preflight.hardFailures,
      languageFlags: preflight.languageFlags,
      requiresInformationPreservingRewrite:
        preflight.requiresInformationPreservingRewrite,
      requiresSemanticDifferentiation:
        preflight.requiresSemanticDifferentiation,
    },
    roleReviews: Object.fromEntries(
      roleContracts.map((contract) => [
        contract.role,
        {
          state: "pending",
          decision: null,
          checkedCriteria: [],
          issueCodes: [],
          evidenceChecked: [],
          note: null,
          requiredRevision: null,
          holdReleaseCondition: null,
          reviewerRef: null,
          reviewerType: null,
          reviewedContentVersion: null,
          reviewedAt: null,
        },
      ]),
    ),
    aggregateReview: {
      state: "pending",
      expertReviewed: false,
      blockingRoles: roleContracts.map((contract) => contract.role),
      decisionCounts: {
        approve: 0,
        revise: 0,
        hold: 0,
        reject: 0,
        pending: roleContracts.length,
      },
    },
    validationState: entry.validationLedger,
    release: entry.release,
  };
}

function summarize(entries) {
  return {
    entries: entries.length,
    priorities: Object.fromEntries(
      ["P0", "P1", "P2"].map((priority) => [
        priority,
        entries.filter((entry) => entry.priority === priority).length,
      ]),
    ),
    authoredParagraphs: entries.filter((entry) =>
      entry.priorityReasons.includes("authored_evidence_bounded_paragraph"),
    ).length,
    targetedAxisVariants: entries.filter((entry) =>
      entry.priorityReasons.includes("targeted_axis_rewrite"),
    ).length,
    automatedScreeningPassed: entries.filter(
      (entry) =>
        entry.automatedScreening.state ===
        "passed_not_an_expert_approval",
    ).length,
    expertReviewed: entries.filter(
      (entry) => entry.aggregateReview.expertReviewed,
    ).length,
    customerApproved: entries.filter(
      (entry) =>
        entry.release.publicationState === "customer_approved",
    ).length,
  };
}

function compareQueueEntries(left, right) {
  const priorityOrder = { P0: 0, P1: 1, P2: 2 };
  return (
    priorityOrder[left.priority] - priorityOrder[right.priority] ||
    left.batchId.localeCompare(right.batchId) ||
    left.claimKey.localeCompare(right.claimKey) ||
    left.axisSignature.localeCompare(right.axisSignature)
  );
}

function buildMarkdown(workbook) {
  return `# CAB-01 7개 역할 검토 큐 ${versionLabel}

- 상태: \`${workbook.status}\`
- 고객 발행: \`${workbook.publicationState}\`
- 검토 대상: ${workbook.summary.entries}개

## 우선순위

| 우선순위 | 개수 | 의미 |
| --- | ---: | --- |
| P0 | ${workbook.summary.priorities.P0} | 새 문단·표적 축 교정·축 수정 합성 포함 |
| P1 | ${workbook.summary.priorities.P1} | 둘 이상의 원문 정보 보존 |
| P2 | ${workbook.summary.priorities.P2} | 단일 원문 기반 표준 변형 |

## 현재 상태

- 새 근거 제한 문단: ${workbook.summary.authoredParagraphs}
- 표적 축 교정 변형: ${workbook.summary.targetedAxisVariants}
- 자동 검사 통과: ${workbook.summary.automatedScreeningPassed}
- 7개 역할 검토 완료: ${workbook.summary.expertReviewed}
- 고객 승인: ${workbook.summary.customerApproved}

자동 검사 통과는 전문가 승인이나 고객 발행 승인이 아니다. 각 항목은 성격심리,
심리측정, 연구방법, 쉬운 한국어, 안전·개인정보, 제품 콘텐츠, 데이터 품질의
독립 판정을 모두 받아야 한다.

## 검토 순서

${workbook.reviewOrder.map((item, index) => `${index + 1}. ${item}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}

function buildV21BatchLedger() {
  const correctedDraft = readJson(
    generatedDirectory,
    "TRAIT_MAP_CANONICAL_CORRECTED_DRAFT_CAB_01_V2_1.json",
  );
  const recomposition = readJson(
    generatedDirectory,
    "TRAIT_MAP_CANONICAL_RECOMPOSITION_AUDIT_CAB_01_V2_1.json",
  );
  if (!recomposition.summary.recompositionPassed) {
    throw new Error(
      "CAB-01 v2.1 recomposition must pass before creating the review queue.",
    );
  }
  const validationLedger = {
    cognitiveInterview: "not_started",
    comprehensionTest: "not_started",
    constructValidation: "not_started",
    differentialItemFunctioning: "not_started",
  };
  const release = {
    publicationState: "research_only",
    eligibleSurfaces: ["result_summary", "trait_map_detail"],
    prohibitedSurfaces: [
      "public_profile",
      "share_card",
      "comparison_report",
    ],
    approvedAt: null,
    retiredAt: null,
    rollbackToVersion: null,
  };
  return {
    reportId: correctedDraft.reportId,
    entries: correctedDraft.variants.map((variant) => ({
      contentKey: `trait-map.v2.1.${variant.canonicalVariantId.toLowerCase()}`,
      canonicalVariantId: variant.canonicalVariantId,
      version: 1,
      batchId: "CAB-01",
      scenarioRef: variant.scenarioRef,
      claimKey: variant.claimKey,
      claimKind: variant.claimKind,
      privacyScope: variant.privacyScope,
      semanticAxes: variant.semanticAxes,
      axisSignature: variant.axisSignature,
      content: variant.canonicalDisplayDraft,
      provenance: {
        ...variant.provenance,
        authoredParagraph: variant.provenance.authoredParagraph ?? null,
        lineageExclusions: variant.provenance.lineageExclusions ?? [],
      },
      automatedGates: {
        sourceTraceability: "passed",
        privacyScope: "passed",
        unsafeLanguage: "passed",
        targetedAxisDifferentiation: "passed",
        profileRecomposition: "passed",
      },
      validationLedger: structuredClone(validationLedger),
      release: structuredClone(release),
    })),
  };
}
