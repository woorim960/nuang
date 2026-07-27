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
const queuePath = path.join(
  generatedDirectory,
  "TRAIT_MAP_LATTICE_RECONCILIATION_QUEUE_V2.json",
);
const candidatePath = path.join(
  generatedDirectory,
  "TRAIT_MAP_AXIS_CONTRIBUTION_CANDIDATES_V2.json",
);
const outputPath = path.join(
  generatedDirectory,
  "TRAIT_MAP_AXIS_CLASSIFICATION_AUDIT_V2.json",
);
const reportPath = path.join(
  docsDirectory,
  "06_288_SLOT_AXIS_CLASSIFICATION_AUDIT_V2.md",
);
const checkOnly = process.argv.includes("--check");
const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const candidates = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
const queueByClaimKey = new Map(
  queue.queue.map((item) => [item.claimKey, item]),
);
const candidateByClaimKey = new Map(
  candidates.slots.map((item) => [item.claimKey, item]),
);
const axisPositionToRef = {
  1: "SE",
  2: "OE",
  3: "RO",
  4: "SM",
  5: "ER",
};
const structuralIssues = [];

if (candidates.slots.length !== 288) {
  structuralIssues.push({
    code: "SLOT_COUNT_MISMATCH",
    expected: 288,
    actual: candidates.slots.length,
  });
}
if (candidateByClaimKey.size !== candidates.slots.length) {
  structuralIssues.push({
    code: "DUPLICATE_CLAIM_KEY",
    expected: candidates.slots.length,
    actual: candidateByClaimKey.size,
  });
}
if (queueByClaimKey.size !== candidateByClaimKey.size) {
  structuralIssues.push({
    code: "QUEUE_CANDIDATE_COVERAGE_MISMATCH",
    queueSlots: queueByClaimKey.size,
    candidateSlots: candidateByClaimKey.size,
  });
}

for (const [claimKey, queueItem] of queueByClaimKey) {
  const slot = candidateByClaimKey.get(claimKey);
  if (!slot) {
    structuralIssues.push({
      code: "MISSING_CANDIDATE_SLOT",
      claimKey,
    });
    continue;
  }
  checkExactMetadata(queueItem, slot);
  checkVariantLineage(queueItem, slot);
  checkAxisRetention(queueItem, slot);
  checkCandidateIntegrity(slot);
}

const unaccountedSlots = candidates.slots.filter(
  (slot) => slot.currentControlledAxes.length === 0,
);
const unresolvedUnaccounted = unaccountedSlots.filter(
  (slot) => slot.candidateSemanticAxes.length === 0,
);
const suggestedUnaccounted = unaccountedSlots.filter(
  (slot) => slot.candidateSemanticAxes.length > 0,
);
const controlledSlots = candidates.slots.filter(
  (slot) => slot.currentControlledAxes.length > 0,
);
const controlledWithAdditionalAxes = controlledSlots.filter((slot) =>
  slot.candidateSemanticAxes.some(
    (candidate) => !slot.currentControlledAxes.includes(candidate.axisRef),
  ),
);
const controlledWithoutAdditionalAxes = controlledSlots.filter(
  (slot) =>
    !slot.candidateSemanticAxes.some(
      (candidate) => !slot.currentControlledAxes.includes(candidate.axisRef),
    ),
);
const complexSlots = candidates.slots.filter(
  (slot) => slot.candidateSemanticAxes.length >= 3,
);
const highRiskSlots = candidates.slots.filter((slot) =>
  slot.riskDomains.some((risk) => risk !== "none"),
);
const independentSourceCounts = candidates.slots.map(
  (slot) =>
    new Set(
      slot.anchorVariants.flatMap((variant) => variant.independentSourceRefs),
    ).size,
);
const reviewBatches = [
  buildReviewBatch(
    "A_UNRESOLVED_UNACCOUNTED",
    1,
    unresolvedUnaccounted,
    "현재 축 신호도 양쪽 의미 단서도 없어 원문 대비를 직접 읽고 축 없음·단일축·복합축을 결정한다.",
  ),
  buildReviewBatch(
    "B_SUGGESTED_UNACCOUNTED",
    2,
    suggestedUnaccounted,
    "기존에는 축 설명이 없었지만 양쪽 문장 단서로 새 후보가 생겼다. 맥락 단어 오탐을 먼저 제거한다.",
  ),
  buildReviewBatch(
    "C_CONTROLLED_WITH_EXTRA_AXIS",
    3,
    controlledWithAdditionalAxes,
    "기존 직접 비교 축 외의 새 의미 축이 제안됐다. 실제 상호작용인지 문장 장식인지 구분한다.",
  ),
  buildReviewBatch(
    "D_CONTROLLED_LINEAGE_MERGE",
    4,
    controlledWithoutAdditionalAxes,
    "기존 축은 유지하되 같은 축 조합에서 갈라진 부모 계보 문장을 정보 손실 없이 하나로 합칠 준비를 한다.",
  ),
];
const axisCandidateSummary = Object.fromEntries(
  ["SE", "OE", "RO", "SM", "ER"].map((axisRef) => [
    axisRef,
    {
      totalCandidateSlots: candidates.slots.filter((slot) =>
        slot.candidateSemanticAxes.some(
          (candidate) => candidate.axisRef === axisRef,
        ),
      ).length,
      existingControlledSlots: candidates.slots.filter((slot) =>
        slot.currentControlledAxes.includes(axisRef),
      ).length,
      newlySuggestedSlots: candidates.slots.filter(
        (slot) =>
          !slot.currentControlledAxes.includes(axisRef) &&
          slot.candidateSemanticAxes.some(
            (candidate) => candidate.axisRef === axisRef,
          ),
      ).length,
    },
  ]),
);
const audit = {
  contractVersion: "nuang-trait-map-scenario-axis-classification-audit.v2",
  auditId: "TRAIT-MAP-AXIS-CLASSIFICATION-AUDIT.0.1",
  sourceManifestId: candidates.manifestId,
  status:
    structuralIssues.length === 0
      ? "AUTOMATED_STRUCTURE_PASSED_EXPERT_CLASSIFICATION_REQUIRED"
      : "STRUCTURAL_REPAIR_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-23T00:00:00.000Z",
  summary: {
    totalSlots: candidates.slots.length,
    structurallyValid: structuralIssues.length === 0,
    structuralIssueCount: structuralIssues.length,
    unaccountedSlots: unaccountedSlots.length,
    unresolvedUnaccountedSlots: unresolvedUnaccounted.length,
    suggestedUnaccountedSlots: suggestedUnaccounted.length,
    controlledSlots: controlledSlots.length,
    controlledWithAdditionalAxes: controlledWithAdditionalAxes.length,
    controlledWithoutAdditionalAxes: controlledWithoutAdditionalAxes.length,
    interactionCandidateSlots: candidates.slots.filter(
      (slot) => slot.candidateInteractions.length > 0,
    ).length,
    complexThreeOrMoreAxisSlots: complexSlots.length,
    highRiskSlots: highRiskSlots.length,
    minimumIndependentSourcesAcrossSlots: Math.min(...independentSourceCounts),
    approvedSlots: candidates.slots.filter(
      (slot) => slot.decision.status === "approved_for_recomposition",
    ).length,
  },
  axisCandidateSummary,
  structuralIssues,
  reviewBatches,
  complexSlotQueue: complexSlots.map(summarizeSlot),
  requiredNextGate: [
    "A 작업군 103개는 축 없음도 정답 후보로 허용하며 의미를 억지로 다섯 축에 끼워 맞추지 않는다.",
    "B 작업군 13개와 C 작업군 50개는 문장 단서가 상황 자체의 단어인지 실제 성향 차이인지 검토한다.",
    "세 축 이상 후보 15개는 자동 상호작용 문장을 만들지 않고 우선 분리·축소 가능성을 검토한다.",
    "관계 결과·정신건강·능력·업무 위험이 있는 240개는 관계심리·임상안전 검토를 포함한다.",
    "288개 전부의 축 결정과 canonical 조합 문장이 승인되기 전에는 32개 원장을 재생성하거나 고객 화면에 발행하지 않는다.",
  ],
};
const output = await prettier.format(JSON.stringify(audit), {
  parser: "json",
});
const report = await prettier.format(buildMarkdownReport(audit), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== report;
  if (stale) {
    console.error(
      "Trait-map axis classification audit is stale. Run npm run research:trait-map:v2:axis-classification-audit.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, report);
}

console.log(
  `Axis classification audit: ${audit.status}, ${audit.summary.unresolvedUnaccountedSlots} unresolved, ${audit.summary.controlledWithAdditionalAxes} controlled slots with extra candidates, ${audit.summary.complexThreeOrMoreAxisSlots} complex slots.`,
);

function checkExactMetadata(queueItem, slot) {
  for (const key of ["scenarioRef", "context", "claimKind", "privacyScope"]) {
    if (queueItem[key] !== slot[key]) {
      structuralIssues.push({
        code: "METADATA_MISMATCH",
        claimKey: queueItem.claimKey,
        field: key,
        queueValue: queueItem[key],
        candidateValue: slot[key],
      });
    }
  }
  if (!sameArray(queueItem.riskDomains, slot.riskDomains)) {
    structuralIssues.push({
      code: "RISK_DOMAIN_MISMATCH",
      claimKey: queueItem.claimKey,
    });
  }
}

function checkVariantLineage(queueItem, slot) {
  const queueVariants = new Map(
    queueItem.variants.map((variant) => [variant.variantId, variant]),
  );
  const slotVariants = new Map(
    slot.anchorVariants.map((variant) => [variant.variantId, variant]),
  );
  if (queueVariants.size !== slotVariants.size) {
    structuralIssues.push({
      code: "VARIANT_COUNT_MISMATCH",
      claimKey: queueItem.claimKey,
      queueCount: queueVariants.size,
      candidateCount: slotVariants.size,
    });
    return;
  }
  for (const [variantId, queueVariant] of queueVariants) {
    const slotVariant = slotVariants.get(variantId);
    if (
      !slotVariant ||
      queueVariant.assertion !== slotVariant.assertion ||
      !sameArray(queueVariant.codes, slotVariant.codes) ||
      !sameArray(
        queueVariant.evidenceFindingRefs,
        slotVariant.evidenceFindingRefs,
      ) ||
      !sameArray(
        queueVariant.independentSourceRefs,
        slotVariant.independentSourceRefs,
      )
    ) {
      structuralIssues.push({
        code: "VARIANT_LINEAGE_MISMATCH",
        claimKey: queueItem.claimKey,
        variantId,
      });
    }
  }
}

function checkAxisRetention(queueItem, slot) {
  const expectedAxes = queueItem.controlledAxes.map(
    (axis) => axisPositionToRef[axis.position],
  );
  if (!sameArray(expectedAxes, slot.currentControlledAxes)) {
    structuralIssues.push({
      code: "CONTROLLED_AXIS_MISMATCH",
      claimKey: queueItem.claimKey,
      expectedAxes,
      actualAxes: slot.currentControlledAxes,
    });
  }
  const candidateAxes = slot.candidateSemanticAxes.map(
    (candidate) => candidate.axisRef,
  );
  for (const axisRef of expectedAxes) {
    if (!candidateAxes.includes(axisRef)) {
      structuralIssues.push({
        code: "CONTROLLED_AXIS_DROPPED",
        claimKey: queueItem.claimKey,
        axisRef,
      });
    }
  }
}

function checkCandidateIntegrity(slot) {
  const candidateAxes = slot.candidateSemanticAxes.map(
    (candidate) => candidate.axisRef,
  );
  if (new Set(candidateAxes).size !== candidateAxes.length) {
    structuralIssues.push({
      code: "DUPLICATE_CANDIDATE_AXIS",
      claimKey: slot.claimKey,
    });
  }
  if (
    slot.decision.status !== "expert_review_required" ||
    slot.publicationState !== "research_only" ||
    slot.decision.canonicalVariants.length !== 0
  ) {
    structuralIssues.push({
      code: "PREMATURE_APPROVAL_OR_COMPOSITION",
      claimKey: slot.claimKey,
    });
  }
  if (
    (slot.claimKind === "first_thought" ||
      slot.claimKind === "actual_response") &&
    slot.privacyScope !== "self_only"
  ) {
    structuralIssues.push({
      code: "PRIVATE_PROCESS_SCOPE_VIOLATION",
      claimKey: slot.claimKey,
    });
  }
  for (const candidate of slot.candidateSemanticAxes) {
    if (slot.currentControlledAxes.includes(candidate.axisRef)) continue;
    const cueSymbols = new Set(
      candidate.cueEvidence.map((entry) => entry.split(":")[0]),
    );
    if (cueSymbols.size < 2) {
      structuralIssues.push({
        code: "NEW_AXIS_WITHOUT_TWO_SIDED_CUES",
        claimKey: slot.claimKey,
        axisRef: candidate.axisRef,
      });
    }
  }
  for (const interaction of slot.candidateInteractions) {
    if (
      interaction.axisRefs.length < 2 ||
      interaction.axisRefs.some((axisRef) => !candidateAxes.includes(axisRef))
    ) {
      structuralIssues.push({
        code: "INVALID_INTERACTION_CANDIDATE",
        claimKey: slot.claimKey,
        interactionId: interaction.interactionId,
      });
    }
  }
  if (
    slot.currentControlledAxes.length === 0 &&
    slot.candidateSemanticAxes.length === 0 &&
    slot.decision.lineageResolution !== "pending"
  ) {
    structuralIssues.push({
      code: "UNRESOLVED_SLOT_NOT_MARKED_PENDING",
      claimKey: slot.claimKey,
    });
  }
}

function buildReviewBatch(batchId, priority, slots, objective) {
  const byContext = Object.fromEntries(
    [
      "general",
      "family",
      "friend",
      "partner",
      "person_of_interest",
      "work",
    ].map((context) => [
      context,
      slots.filter((slot) => slot.context === context).length,
    ]),
  );
  const byClaimKind = Object.fromEntries(
    ["attention", "first_thought", "actual_response", "communication"].map(
      (claimKind) => [
        claimKind,
        slots.filter((slot) => slot.claimKind === claimKind).length,
      ],
    ),
  );
  return {
    batchId,
    priority,
    objective,
    slotCount: slots.length,
    byContext,
    byClaimKind,
    claimKeys: slots.map((slot) => slot.claimKey),
  };
}

function summarizeSlot(slot) {
  return {
    claimKey: slot.claimKey,
    scenarioRef: slot.scenarioRef,
    context: slot.context,
    claimKind: slot.claimKind,
    currentControlledAxes: slot.currentControlledAxes,
    candidateSemanticAxes: slot.candidateSemanticAxes.map((candidate) => ({
      axisRef: candidate.axisRef,
      confidence: candidate.confidence,
      contribution: candidate.contribution,
    })),
    variantCount: slot.anchorVariants.length,
    riskDomains: slot.riskDomains,
  };
}

function buildMarkdownReport(auditResult) {
  const rows = auditResult.reviewBatches
    .map(
      (batch) =>
        `| ${batch.priority} | ${batch.batchId} | ${batch.slotCount} | ${batch.objective} |`,
    )
    .join("\n");
  const axisRows = Object.entries(auditResult.axisCandidateSummary)
    .map(
      ([axisRef, value]) =>
        `| ${axisRef} | ${value.existingControlledSlots} | ${value.newlySuggestedSlots} | ${value.totalCandidateSlots} |`,
    )
    .join("\n");
  const complexExamples = auditResult.complexSlotQueue
    .slice(0, 15)
    .map(
      (slot) =>
        `- \`${slot.claimKey}\`: 기존 ${slot.currentControlledAxes.join(", ") || "없음"} → 후보 ${slot.candidateSemanticAxes.map((axis) => axis.axisRef).join(", ")}`,
    )
    .join("\n");

  return `# 288개 상황 슬롯 축 분류 자동 감사 v2

- 상태: \`${auditResult.status}\`
- 발행 상태: \`research_only\`
- 대상: 72개 상황 × 주의·처음 드는 생각·실제 나타나는 반응·말하기 4채널

## 결론

288개 슬롯의 원문, 코드 목록, 근거 ID, 기존 통제축은 후보 명세로 빠짐없이
옮겨졌다. 자동 구조 감사에서 발견된 계보 누락이나 기존 축 유실은
${auditResult.summary.structuralIssueCount}건이다.

하지만 이는 **내용 승인이 끝났다는 뜻이 아니다.** 기존 축으로 설명되지 않았던
116개 중 자동 단서가 양쪽 방향을 모두 찾아낸 슬롯은
${auditResult.summary.suggestedUnaccountedSlots}개이고,
${auditResult.summary.unresolvedUnaccountedSlots}개는 아직 축을 정할 수 없다.
자동으로 억지 분류하지 않고 전문가 검토 대상으로 보존했다.

## 핵심 수치

- 전체 슬롯: ${auditResult.summary.totalSlots}
- 기존 통제축이 있는 슬롯: ${auditResult.summary.controlledSlots}
- 기존 축 외 후보가 추가된 슬롯: ${auditResult.summary.controlledWithAdditionalAxes}
- 복합축 후보 슬롯: ${auditResult.summary.interactionCandidateSlots}
- 세 축 이상 복잡 후보: ${auditResult.summary.complexThreeOrMoreAxisSlots}
- 고위험 검토 슬롯: ${auditResult.summary.highRiskSlots}
- 재합성 승인 슬롯: ${auditResult.summary.approvedSlots}

## 축별 후보 분포

| 축 | 기존 직접 비교 | 새 의미 후보 | 전체 후보 |
| --- | ---: | ---: | ---: |
${axisRows}

새 의미 후보 수는 정확도 점수가 아니다. 문장 속 양쪽 방향 단서가 발견돼 직접
검토할 가치가 있다는 뜻이다.

## 순차 검토 작업군

| 순서 | 작업군 | 슬롯 | 완료 목표 |
| ---: | --- | ---: | --- |
${rows}

## 세 축 이상 후보

${complexExamples || "- 없음"}

이 목록은 풍부한 설명으로 바로 합성하지 않는다. 상황 문구 자체가 여러 축의
단어를 우연히 포함했는지, 실제로 두 축 상호작용이 필요한지를 먼저 분리한다.

## 다음 게이트

${auditResult.requiredNextGate.map((item, index) => `${index + 1}. ${item}`).join("\n")}
`;
}

function sameArray(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}
