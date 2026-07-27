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
  "TRAIT_MAP_INFERRED_AXIS_SCOPE_AUDIT_V2_1.json",
);
const reviewPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_INFERRED_AXIS_SCOPE_REVIEW_QUEUE_V2_1.json",
);
const reportPath = path.join(
  docsDirectory,
  "47_INFERRED_AXIS_SCOPE_AUDIT_V2_1.md",
);
const checkOnly = process.argv.includes("--check");
const axisManifest = readJson(
  generatedDirectory,
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_1.json",
);
const draftingQueue = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_V2_1.json",
);
const queueSlotByClaimKey = new Map(
  draftingQueue.slots.map((slot) => [slot.claimKey, slot]),
);

const axisContracts = {
  SE: {
    symbols: ["E", "I"],
    meaning:
      "사람과의 상호작용에서 에너지를 얻고 밖으로 풀어 가는 E와, 혼자 정리하고 에너지를 회복하는 I의 상대적 방향",
    exclusion:
      "말을 먼저 했는지, 사교성이 좋은지, 행동을 빨리 시작했는지만으로 분류하지 않는다.",
  },
  OE: {
    symbols: ["R", "N"],
    meaning:
      "확인된 사실·경험·현재 조건을 먼저 보는 R과, 연결·의미·새 가능성을 먼저 넓혀 보는 N의 상대적 방향",
    exclusion:
      "지능·창의성·현실 감각의 우열이나 단순한 단어 사용만으로 분류하지 않는다.",
  },
  RO: {
    symbols: ["G", "A"],
    meaning:
      "관계 문제에서 원인과 해결을 먼저 살피는 G와, 상대 마음과 관계 변화를 먼저 살피는 A의 상대적 방향",
    exclusion:
      "일반 업무 해결, 목표 달성, 취향 선택, 사람 언급만으로 G/A를 붙이지 않는다.",
  },
  SM: {
    symbols: ["K", "M"],
    meaning:
      "정한 기준과 흐름을 꾸준히 이어 가는 K와, 현재 조건에 맞춰 방법과 순서를 조정하는 M의 상대적 방향",
    exclusion:
      "능력·성실성의 우열이나 단 한 번의 계획 변경만으로 분류하지 않는다.",
  },
  ER: {
    symbols: ["C", "Q"],
    meaning:
      "불편한 상황에서 걱정과 감정이 비교적 천천히 선명해지는 C와, 비교적 빠르게 선명해지는 Q의 상대적 방향",
    exclusion:
      "말하기·참여·행동 시작 속도, 겉으로 차분해 보이는 태도만으로 분류하지 않는다.",
  },
};
const relationshipProblemScenes = new Set([
  "aftermath",
  "boundary",
  "disagreement",
  "need_expression",
  "setback",
  "support_requested",
  "uncertainty",
]);
const discomfortCompatibleScenes = new Set([
  "aftermath",
  "boundary",
  "disagreement",
  "need_expression",
  "plan_change",
  "setback",
  "support_requested",
  "uncertainty",
]);

const entries = axisManifest.slots.flatMap((slot) => {
  const addedAxes = slot.finalSemanticAxes.filter(
    (axisRef) => !slot.currentControlledAxes.includes(axisRef),
  );
  if (addedAxes.length === 0) return [];
  const queueSlot = queueSlotByClaimKey.get(slot.claimKey);
  if (!queueSlot) {
    throw new Error(`Missing drafting queue slot: ${slot.claimKey}`);
  }
  const scene = extractScene(slot.claimKey);
  return addedAxes.map((axisRef) =>
    buildAuditEntry(slot, queueSlot, scene, axisRef),
  );
});

const report = {
  contractVersion: "nuang-trait-map-inferred-axis-scope-audit.v2.1",
  reportId: "TRAIT-MAP-INFERRED-AXIS-SCOPE-AUDIT.0.1",
  status:
    "ALL_INFERRED_AXES_QUEUED_FINAL_SEMANTIC_BASELINE_BLOCKED_PENDING_REVIEW",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceAxisManifestId: axisManifest.manifestId,
  sourceDraftingQueueId: draftingQueue.queueId,
  axisContracts,
  summary: {
    inferredAxisDecisions: entries.length,
    affectedClaimSlots: new Set(
      entries.map((entry) => entry.claimKey),
    ).size,
    countsByAxis: countBy(entries, "axisRef", Object.keys(axisContracts)),
    countsByPriority: countBy(entries, "priority", [
      "P0",
      "P1",
      "P2",
    ]),
    scopeFlaggedEntries: entries.filter(
      (entry) => entry.scopeFlags.length > 0,
    ).length,
    lowPurityEntries: entries.filter(
      (entry) => entry.evidenceAudit.minimumSourcePurity < 0.5,
    ).length,
    exactCrossDirectionOverlapEntries: entries.filter(
      (entry) =>
        entry.evidenceAudit.exactCrossDirectionOverlaps.length > 0,
    ).length,
    retainedAfterIndependentReview: 0,
    removedAfterIndependentReview: 0,
    unresolvedEntries: entries.length,
    customerApprovedEntries: 0,
  },
  decisionRules: [
    "원래 통제되지 않은 축은 문장에 관련 단어가 있다는 이유만으로 유지하지 않는다.",
    "추가 축의 양쪽 방향이 같은 claim 안에서 각각 다른 행동·생각 흐름으로 직접 대비돼야 한다.",
    "RO는 관계 문제, ER은 불편한 상황의 정서 활성 속도라는 공식 범위를 반드시 지킨다.",
    "SE는 외현 행동 시작, ER은 행동 속도, OE는 능력, SM은 성실성의 우열로 대신 설명하지 않는다.",
    "자동 우선순위는 검토 순서를 정할 뿐 유지·제거 판정이나 전문가 승인을 대신하지 않는다.",
  ],
  entries,
  nextGate: {
    name: "INFERRED_AXIS_P0_CONSTRUCT_RESOLUTION",
    actions: [
      "P0부터 원문 양방향과 공식 축 범위를 나란히 검토한다.",
      "유지·제거·보류 판정마다 반대 근거와 필요한 검증을 기록한다.",
      "제거가 확정된 축은 새 axis manifest에서 canonical ID를 재생성한다.",
      "모든 추론 축 판정 뒤에만 최종 canonical 수와 32개 원장 기준선을 다시 잠근다.",
    ],
  },
};
const reviewQueue = {
  contractVersion: report.contractVersion,
  queueId: "TRAIT-MAP-INFERRED-AXIS-SCOPE-REVIEW-QUEUE.0.1",
  status: "QUEUED_NO_INDEPENDENT_REVIEW_ASSUMED",
  publicationState: "research_only",
  sourceAuditReportId: report.reportId,
  allowedDecisions: [
    "retain_with_direct_contrast",
    "remove_scope_mismatch",
    "hold_for_construct_evidence",
  ],
  entries: entries.map((entry) => ({
    ...entry,
    review: {
      state: "pending",
      decision: null,
      checkedAxisContract: false,
      checkedBothDirections: false,
      checkedContraryEvidence: false,
      issueCodes: [],
      rationale: null,
      requiredAction: null,
      reviewerRef: null,
      reviewerType: null,
      reviewedAt: null,
    },
  })),
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const reviewOutput = await prettier.format(JSON.stringify(reviewQueue), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reviewPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reviewPath, "utf8") !== reviewOutput ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error(
      "Inferred-axis scope audit is stale. Run npm run research:trait-map:v2:inferred-axis-scope-audit-v2-1.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reviewPath, reviewOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Inferred-axis scope audit: ${report.summary.inferredAxisDecisions} decisions across ${report.summary.affectedClaimSlots} slots; P0 ${report.summary.countsByPriority.P0}, scope flags ${report.summary.scopeFlaggedEntries}, approved 0.`,
);

function buildAuditEntry(slot, queueSlot, scene, axisRef) {
  const contract = axisContracts[axisRef];
  const byDirection = Object.fromEntries(
    contract.symbols.map((symbol) => {
      const candidates = queueSlot.canonicalCandidates.filter(
        (candidate) =>
          candidate.axisValues.some(
            (axisValue) =>
              axisValue.axisRef === axisRef &&
              axisValue.symbol === symbol,
          ),
      );
      return [
        symbol,
        {
          canonicalCandidates: candidates.length,
          selectedAssertions: [
            ...new Set(
              candidates.map(
                (candidate) => candidate.selectedAssertion,
              ),
            ),
          ],
          sourceCandidates: candidates.flatMap((candidate) =>
            candidate.sourceCandidates.map((source) => ({
              canonicalVariantId: candidate.canonicalVariantId,
              variantId: source.variantId,
              assertion: source.assertion,
              sourcePurity: source.sourcePurity,
              signatureCoverage: source.signatureCoverage,
              evidenceFindingRefs: source.evidenceFindingRefs,
              independentSourceRefs: source.independentSourceRefs,
            })),
          ),
        },
      ];
    }),
  );
  const leftTexts = new Set(
    byDirection[contract.symbols[0]].selectedAssertions,
  );
  const rightTexts = new Set(
    byDirection[contract.symbols[1]].selectedAssertions,
  );
  const exactCrossDirectionOverlaps = [...leftTexts].filter((text) =>
    rightTexts.has(text),
  );
  const allSources = Object.values(byDirection).flatMap(
    (direction) => direction.sourceCandidates,
  );
  const scopeFlags = scopeFlagsFor(slot, scene, axisRef);
  const evidenceFlags = [
    ...(exactCrossDirectionOverlaps.length > 0
      ? ["EXACT_CROSS_DIRECTION_OUTPUT_OVERLAP"]
      : []),
    ...(allSources.some((source) => source.sourcePurity < 0.5)
      ? ["LOW_SOURCE_PURITY_PRESENT"]
      : []),
    ...(contract.symbols.some(
      (symbol) => byDirection[symbol].canonicalCandidates === 0,
    )
      ? ["MISSING_DIRECTION"]
      : []),
  ];
  const priority =
    scopeFlags.length > 0 ||
    evidenceFlags.includes("EXACT_CROSS_DIRECTION_OUTPUT_OVERLAP") ||
    evidenceFlags.includes("MISSING_DIRECTION")
      ? "P0"
      : slot.decisionSource.includes("REVIEW-A")
        ? "P1"
        : "P2";
  return {
    reviewId: `IAS-${slot.scenarioRef}-${slot.claimKind}-${axisRef}`,
    priority,
    claimKey: slot.claimKey,
    scenarioRef: slot.scenarioRef,
    context: slot.context,
    scene,
    claimKind: slot.claimKind,
    axisRef,
    axisContract: contract,
    currentControlledAxes: slot.currentControlledAxes,
    proposedFinalAxes: slot.finalSemanticAxes,
    decisionSource: slot.decisionSource,
    originalRationale: slot.rationale,
    scopeFlags,
    evidenceFlags,
    evidenceAudit: {
      directionSymbols: contract.symbols,
      byDirection,
      minimumSourcePurity:
        allSources.length > 0
          ? Math.min(
              ...allSources.map((source) => source.sourcePurity),
            )
          : 0,
      exactCrossDirectionOverlaps,
    },
    internalTriageState:
      "pending_construct_review_not_an_expert_decision",
    publicationState: "research_only",
  };
}

function scopeFlagsFor(slot, scene, axisRef) {
  const flags = [];
  if (axisRef === "RO") {
    if (!relationshipProblemScenes.has(scene)) {
      flags.push("RO_SCENARIO_NOT_CLEARLY_A_RELATIONSHIP_PROBLEM");
    }
    if (slot.context === "general") {
      flags.push("RO_GENERAL_CONTEXT_REQUIRES_EXPLICIT_RELATION_BOUNDARY");
    }
  }
  if (axisRef === "ER" && !discomfortCompatibleScenes.has(scene)) {
    flags.push("ER_DISCOMFORT_CONTEXT_NOT_EXPLICIT");
  }
  if (
    axisRef === "SE" &&
    ["communication", "actual_response"].includes(slot.claimKind)
  ) {
    flags.push("SE_OUTWARD_BEHAVIOR_CONFLATION_RISK");
  }
  if (
    axisRef === "SM" &&
    ["attention", "first_thought"].includes(slot.claimKind)
  ) {
    flags.push("SM_ATTENTION_BEHAVIOR_CONFLATION_RISK");
  }
  return flags;
}

function extractScene(claimKey) {
  const parts = claimKey.split(".");
  return parts.at(-2);
}

function countBy(items, key, orderedValues) {
  return Object.fromEntries(
    orderedValues.map((value) => [
      value,
      items.filter((item) => item[key] === value).length,
    ]),
  );
}

function buildMarkdown(result) {
  return `# 추론으로 추가된 축 전수 범위 감사 v2.1

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 왜 이 감사가 필요한가

현재 288개 claim 중 ${result.summary.affectedClaimSlots}개에는 원래 통제되지
않았던 축이 문장 비교를 통해 새로 추가됐다. CAB-01에서 잘못 추가된 G/A와
C/Q를 발견했고, CAB-02에서도 일반 계획 변경에 G/A가 추가된 문제를 찾았다.
따라서 문장을 교정하기 전에 추론 축 ${result.summary.inferredAxisDecisions}개
전체의 구성개념 범위를 다시 확인한다.

## 범위

| 축 | 추론 추가 |
| --- | ---: |
| E/I | ${result.summary.countsByAxis.SE} |
| R/N | ${result.summary.countsByAxis.OE} |
| G/A | ${result.summary.countsByAxis.RO} |
| K/M | ${result.summary.countsByAxis.SM} |
| C/Q | ${result.summary.countsByAxis.ER} |

- P0: ${result.summary.countsByPriority.P0}
- P1: ${result.summary.countsByPriority.P1}
- P2: ${result.summary.countsByPriority.P2}
- 공식 범위 경고: ${result.summary.scopeFlaggedEntries}
- 낮은 source purity 포함: ${result.summary.lowPurityEntries}
- 양방향 완전 동일 출력: ${result.summary.exactCrossDirectionOverlapEntries}

## 게이트

이 감사가 끝나기 전까지 705개 canonical 기준선은 구조 통과 상태일 뿐
최종 의미 기준선이 아니다. 각 추론 축은 양쪽 방향 원문, 공식 축 범위,
반대 근거를 확인해 유지·제거·보류로 판정해야 한다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
