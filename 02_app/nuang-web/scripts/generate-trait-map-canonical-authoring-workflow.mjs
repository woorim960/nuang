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
const requestedAxisVersion =
  process.argv
    .find((argument) => argument.startsWith("--axis-version="))
    ?.split("=")[1] ?? "v2";
const versionConfig = {
  v2: {
    label: "v2",
    suffix: "V2",
    report: "11_CANONICAL_AUTHORING_AND_REVIEW_WORKFLOW_V2.md",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    report: "32_CANONICAL_AUTHORING_AND_REVIEW_WORKFLOW_V2_1.md",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    report: "53_CANONICAL_AUTHORING_AND_REVIEW_WORKFLOW_V2_2.md",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    report: "96_CANONICAL_AUTHORING_AND_REVIEW_WORKFLOW_V2_3.md",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const artifactSuffix = versionConfig.suffix;
const outputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_AUTHORING_WORKFLOW_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  versionConfig.report,
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  `TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_${artifactSuffix}.json`,
);
const semanticAudit = readJson(
  `TRAIT_MAP_LINEAGE_MERGE_SEMANTIC_AUDIT_${artifactSuffix}.json`,
);
const mergeGroupByCanonicalId = new Map(
  semanticAudit.groups.map((group) => [group.canonicalVariantId, group]),
);
const contextOrder = [
  "general",
  "family",
  "friend",
  "partner",
  "person_of_interest",
  "work",
];
const reviewerRoles = [
  {
    role: "personality_psychologist",
    label: "성격심리 전문가",
    requiredDecision:
      "관찰 가능한 경향과 해석을 구분하고 과잉 일반화가 없는지 확인",
  },
  {
    role: "psychometrician",
    label: "심리측정 전문가",
    requiredDecision: "해당 축 방향과 문장 차이가 측정 구조에 맞는지 확인",
  },
  {
    role: "research_methodologist",
    label: "연구방법 전문가",
    requiredDecision:
      "근거 계보·독립 출처·반증 가능성·적용 범위가 유지됐는지 확인",
  },
  {
    role: "korean_plain_language_editor",
    label: "쉬운 한국어 문장 전문가",
    requiredDecision:
      "번역체·중복·모호한 지시어 없이 남녀노소 이해할 수 있는지 확인",
  },
  {
    role: "safety_privacy_reviewer",
    label: "안전·개인정보 전문가",
    requiredDecision:
      "진단·도덕성·능력·관계 결과 단정과 비공개 사고 과정 노출을 차단",
  },
  {
    role: "product_content_designer",
    label: "제품 콘텐츠 디자이너",
    requiredDecision:
      "리포트·성향지도·비교 화면에서 중복 없이 이해와 흥미를 만드는지 확인",
  },
  {
    role: "data_quality_engineer",
    label: "데이터 품질 엔지니어",
    requiredDecision:
      "ID·축 서명·원문·근거·검토 결정과 32개 재조합 결과를 검증",
  },
];

const scenarioPackets = buildScenarioPackets();
const batches = buildBatches(scenarioPackets);
const workflow = {
  contractVersion: `nuang-trait-map-canonical-authoring-workflow.${versionConfig.label}`,
  workflowId: `TRAIT-MAP-CANONICAL-AUTHORING-WORKFLOW.${versionConfig.artifactVersion}`,
  sourceQueueId: queue.queueId,
  sourceSemanticAuditId: semanticAudit.auditId,
  status: "AUTHORING_QUEUE_READY_EXPERT_WORK_PENDING",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    batches: batches.length,
    contexts: contextOrder.length,
    scenarios: scenarioPackets.length,
    claimSlots: scenarioPackets.reduce(
      (total, scenario) => total + scenario.claims.length,
      0,
    ),
    canonicalVariants: scenarioPackets.reduce(
      (total, scenario) =>
        total +
        scenario.claims.reduce(
          (claimTotal, claim) => claimTotal + claim.variants.length,
          0,
        ),
      0,
    ),
    mergeVariants: semanticAudit.summary.mergeGroups,
    singleLineageVariants: queue.summary.singleLineageCandidates,
    pendingDrafts: queue.summary.canonicalVariantCount,
    customerApprovedDrafts: 0,
  },
  batchingRule:
    "같은 상황의 주의·처음 생각·실제 반응·말하기와 모든 축 서명을 한 묶음에 둔다. 맥락별 12개 상황을 6개씩 나눠 총 12개 묶음으로 검토한다.",
  stateMachine: [
    "pending_semantic_decomposition",
    "canonical_draft_written",
    "paired_axis_contrast_checked",
    "seven_role_review_complete",
    "recomposition_audit_passed",
    "research_approved",
    "customer_approved",
  ],
  stateRules: [
    "앞 상태를 건너뛸 수 없다.",
    "7개 역할 중 하나라도 revise 또는 reject이면 canonical_draft_written으로 되돌린다.",
    "research_approved는 내부 연구 원장 연결만 허용한다.",
    "customer_approved는 별도 발행 승인과 실제 화면 QA까지 끝난 뒤에만 허용한다.",
  ],
  reviewerRoles,
  completionGates: [
    {
      gate: "G1_SEMANTIC_PRESERVATION",
      pass: "두 계보의 공통 의미와 고유 의미를 판독하고 채택·제외 이유를 기록",
    },
    {
      gate: "G2_AXIS_DIRECTION",
      pass: "같은 슬롯의 형제 축 서명끼리 문장이 다르고 그 차이가 해당 축 한 개로 설명됨",
    },
    {
      gate: "G3_EVIDENCE_BOUNDARY",
      pass: "독립 근거와 적용 범위를 유지하고 진단·인과·우열·결과를 과장하지 않음",
    },
    {
      gate: "G4_PLAIN_KOREAN",
      pass: "한 문장에 한 관찰 주장, 쉬운 어휘, 명확한 주어·상황·행동을 사용",
    },
    {
      gate: "G5_PRIVACY_AND_SAFETY",
      pass: "처음 생각과 실제 반응의 비공개 범위, 민감 영역, 낙인 방지 기준 통과",
    },
    {
      gate: "G6_RECOMPOSITION",
      pass: "32×288 참조 완전성, 80개 이웃 축 변화, 예상 외 변화 0건 통과",
    },
    {
      gate: "G7_PRODUCT_QA",
      pass: "성향지도·결과·비교 화면에서 같은 정보 중복 없이 문맥에 맞게 표시",
    },
  ],
  forbiddenShortcuts: [
    "두 원문을 조사만 바꿔 기계적으로 이어 붙이지 않는다.",
    "단어 겹침 점수만으로 의미가 같다고 확정하지 않는다.",
    "코드명이나 별칭을 근거로 행동·능력·도덕성을 새로 추론하지 않는다.",
    "한 축 서명의 문장을 반대 축 서명에 그대로 복사하지 않는다.",
    "검토 상태가 비어 있는 문장을 고객 화면이나 운영 DB에 발행하지 않는다.",
  ],
  batches,
};

const output = await prettier.format(JSON.stringify(workflow), {
  parser: "json",
});
const report = await prettier.format(buildMarkdownReport(workflow), {
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
      "Trait-map canonical authoring workflow is stale. Run npm run research:trait-map:v2:canonical-authoring-workflow.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, report);
}

console.log(
  `Canonical authoring workflow: ${batches.length} batches, ${scenarioPackets.length} scenarios, ${workflow.summary.claimSlots} claim slots, ${workflow.summary.canonicalVariants} canonical variants, 0 customer-approved.`,
);

function buildScenarioPackets() {
  const slotGroups = new Map();
  for (const slot of queue.slots) {
    const slots = slotGroups.get(slot.scenarioRef) ?? [];
    slots.push(slot);
    slotGroups.set(slot.scenarioRef, slots);
  }

  return [...slotGroups.entries()]
    .map(([scenarioRef, slots]) => {
      const orderedSlots = [...slots].sort(
        (left, right) =>
          claimKindOrder(left.claimKind) - claimKindOrder(right.claimKind),
      );
      return {
        scenarioRef,
        context: orderedSlots[0].context,
        riskDomains: [
          ...new Set(orderedSlots.flatMap((slot) => slot.riskDomains)),
        ].sort((left, right) => left.localeCompare(right, "en")),
        claims: orderedSlots.map((slot) => ({
          claimKey: slot.claimKey,
          claimKind: slot.claimKind,
          privacyScope: slot.privacyScope,
          semanticAxes: slot.semanticAxes,
          variants: slot.canonicalCandidates.map((candidate) => {
            const mergeGroup = mergeGroupByCanonicalId.get(
              candidate.canonicalVariantId,
            );
            return {
              canonicalVariantId: candidate.canonicalVariantId,
              axisSignature: candidate.axisSignature,
              sourceMode: mergeGroup
                ? "two_lineage_semantic_synthesis"
                : "single_lineage_language_review",
              mergeReviewId: mergeGroup?.reviewId ?? null,
              classification:
                mergeGroup?.classification ?? "SINGLE_LINEAGE_REVIEW",
              priority: mergeGroup?.priority ?? "P2",
              sourceAssertions: candidate.sourceCandidates.map((source) => ({
                variantId: source.variantId,
                assertion: source.assertion,
                evidenceFindingRefs: source.evidenceFindingRefs,
                independentSourceRefs: source.independentSourceRefs,
              })),
              requiredSemanticDecisions: mergeGroup
                ? {
                    commonMeaning: mergeGroup.requiredReview.commonMeaning,
                    leftUniqueMeaning:
                      mergeGroup.requiredReview.leftUniqueMeaning,
                    rightUniqueMeaning:
                      mergeGroup.requiredReview.rightUniqueMeaning,
                    axisDirectionalDifference:
                      mergeGroup.requiredReview.axisDirectionalDifference,
                    evidenceBoundaryDecision:
                      mergeGroup.requiredReview.evidenceBoundaryDecision,
                  }
                : null,
              canonicalDraft: null,
              draftState: "pending_semantic_decomposition",
              reviewDecisions: Object.fromEntries(
                reviewerRoles.map((reviewer) => [
                  reviewer.role,
                  {
                    decision: "pending",
                    note: null,
                    reviewedAt: null,
                  },
                ]),
              ),
              recompositionCheck: {
                canonicalIdResolved: false,
                pairedAxisContrastPassed: false,
                unexpectedNeighborChangeCount: null,
              },
              publicationState: "research_only",
            };
          }),
        })),
      };
    })
    .sort(
      (left, right) =>
        contextOrder.indexOf(left.context) -
          contextOrder.indexOf(right.context) ||
        left.scenarioRef.localeCompare(right.scenarioRef, "en"),
    );
}

function buildBatches(scenarios) {
  const batches = [];
  for (const context of contextOrder) {
    const contextScenarios = scenarios.filter(
      (scenario) => scenario.context === context,
    );
    for (let offset = 0; offset < contextScenarios.length; offset += 6) {
      const chunk = contextScenarios.slice(offset, offset + 6);
      const canonicalVariants = chunk.reduce(
        (total, scenario) =>
          total +
          scenario.claims.reduce(
            (claimTotal, claim) => claimTotal + claim.variants.length,
            0,
          ),
        0,
      );
      const priorities = countBy(
        chunk.flatMap((scenario) =>
          scenario.claims.flatMap((claim) => claim.variants),
        ),
        "priority",
      );
      batches.push({
        batchId: `CAB-${String(batches.length + 1).padStart(2, "0")}`,
        order: batches.length + 1,
        context,
        scenarioRefs: chunk.map((scenario) => scenario.scenarioRef),
        scenarioCount: chunk.length,
        claimSlotCount: chunk.reduce(
          (total, scenario) => total + scenario.claims.length,
          0,
        ),
        canonicalVariantCount: canonicalVariants,
        priorities,
        status: "not_started",
        completion: {
          draftedVariants: 0,
          sevenRoleReviewedVariants: 0,
          recompositionPassedVariants: 0,
          customerApprovedVariants: 0,
        },
        scenarios: chunk,
      });
    }
  }
  return batches;
}

function claimKindOrder(claimKind) {
  return (
    ["attention", "first_thought", "actual_response", "communication"].indexOf(
      claimKind,
    ) + 1
  );
}

function countBy(items, key) {
  return Object.fromEntries(
    [...new Set(items.map((item) => item[key]))]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((value) => [
        value,
        items.filter((item) => item[key] === value).length,
      ]),
  );
}

function buildMarkdownReport(result) {
  const batchRows = result.batches
    .map(
      (batch) =>
        `| ${batch.batchId} | ${batch.context} | ${batch.scenarioCount} | ${batch.claimSlotCount} | ${batch.canonicalVariantCount} | ${batch.priorities.P0 ?? 0} | ${batch.priorities.P1 ?? 0} | ${batch.priorities.P2 ?? 0} |`,
    )
    .join("\n");
  const reviewerRows = result.reviewerRoles
    .map(
      (reviewer, index) =>
        `| ${index + 1} | ${reviewer.label} | ${reviewer.requiredDecision} |`,
    )
    .join("\n");
  return `# canonical 문장 작성·검수 작업 흐름 ${versionConfig.label}

- 상태: \`${result.status}\`
- 고객 승인 문장: 0개

## 작업 단위

같은 상황의 네 채널과 모든 축 서명을 반드시 함께 작성한다. 그래야 한 문장만
좋게 보이도록 고치다가 반대 축과 같은 문장이 되거나, 처음 생각과 실제 반응을
섞는 오류를 막을 수 있다.

| 묶음 | 맥락 | 상황 | claim 슬롯 | canonical 문장 | P0 | P1 | P2 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
${batchRows}

## 7개 필수 검토

| 순서 | 역할 | 반드시 결정할 내용 |
| ---: | --- | --- |
${reviewerRows}

## 한 묶음의 완료 순서

1. 두 원문의 공통 의미와 각각의 고유 의미를 나눈다.
2. 같은 상황의 축 서명 전체를 나란히 놓고 canonical 초안을 쓴다.
3. 반대 축과 구별되는 관찰 행동이 실제 문장에 드러나는지 확인한다.
4. 심리·측정·연구·쉬운 한국어·안전·제품·데이터 7개 검토를 완료한다.
5. 32개 코드와 80개 한 글자 이웃을 다시 생성해 예상 외 변화 0건을 확인한다.
6. 연구 승인 뒤에도 별도 고객 발행 승인 전까지 앱과 운영 DB에는 넣지 않는다.

## 완료 기준

- ${result.summary.canonicalVariants}개 canonical 문장마다 원문·근거·채택/제외 결정이 남아 있다.
- 288개 슬롯에서 형제 축 서명의 문장이 서로 구별된다.
- 처음 생각과 실제 반응의 공개 범위가 분리된다.
- 쉬운 한국어로 한 문장에 한 관찰 주장만 담는다.
- 32개 코드 × 288개 참조와 80개 이웃 검사를 모두 통과한다.
- 고객 화면의 중복 정보와 서로 모순되는 설명이 0건이다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
