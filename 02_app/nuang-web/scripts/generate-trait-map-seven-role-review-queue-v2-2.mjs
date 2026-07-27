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
  "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "63_SEVEN_ROLE_REVIEW_QUEUE_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const ledger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_V2_2.json",
);
const axisManifest = readJson(
  generatedDirectory,
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json",
);
const axisSlotByClaimKey = new Map(
  axisManifest.slots.map((slot) => [slot.claimKey, slot]),
);
const targetedVariantIds = new Set();
for (let index = 1; index <= 12; index += 1) {
  const batchId = `CAB_${String(index).padStart(2, "0")}`;
  const packet = readJson(
    reviewDirectory,
    `TRAIT_MAP_TARGETED_AXIS_REWRITE_${batchId}_V2_2.json`,
  );
  for (const pair of packet.pairs) {
    targetedVariantIds.add(pair.left.canonicalVariantId);
    targetedVariantIds.add(pair.right.canonicalVariantId);
  }
}

const roles = [
  {
    key: "personality_psychologist",
    label: "성격심리",
    rubric:
      "행동 경향이 해당 축과 상황에서 설명 가능한 범위인지, 성격 전체나 사람의 가치로 과장하지 않았는지 확인한다.",
  },
  {
    key: "psychometrician",
    label: "심리측정",
    rubric:
      "같은 claim의 반대 방향과 실제로 구분되며 다른 축 의미가 섞이지 않았는지 확인한다.",
  },
  {
    key: "research_methodologist",
    label: "연구방법",
    rubric:
      "문장의 핵심 의미를 원문·근거 계보로 추적할 수 있고 반증 가능한 경향 표현인지 확인한다.",
  },
  {
    key: "korean_plain_language_editor",
    label: "쉬운 한국어",
    rubric:
      "번역체·전문용어·모호한 지시어·불필요한 반복 없이 한 번에 이해되는지 확인한다.",
  },
  {
    key: "safety_privacy_reviewer",
    label: "안전·개인정보",
    rubric:
      "진단·낙인·도덕성·능력·관계 성공을 단정하지 않고 self_only 범위를 지키는지 확인한다.",
  },
  {
    key: "product_content_designer",
    label: "제품 콘텐츠",
    rubric:
      "결과 요약과 상세 지도에서 정보가 중복되지 않고 사용자가 자기 삶에 연결해 읽을 수 있는지 확인한다.",
  },
  {
    key: "data_quality_engineer",
    label: "데이터 품질",
    rubric:
      "ID·축 서명·문장·근거·제외 이력·32개 코드 참조가 일치하는지 확인한다.",
  },
];

const entries = ledger.entries.map((entry) => {
  const axisSlot = axisSlotByClaimKey.get(entry.claimKey);
  if (!axisSlot) {
    throw new Error(`Missing axis slot for ${entry.claimKey}`);
  }
  const targeted = targetedVariantIds.has(entry.canonicalVariantId);
  const axisScopeAmended = axisSlot.amended;
  const authored = Boolean(entry.provenance.authoredParagraph);
  const lineageMerged = entry.provenance.sourceBlockCount > 1;
  const priority =
    targeted || axisScopeAmended || authored
      ? "P0"
      : axisSlot.highRisk || lineageMerged
        ? "P1"
        : "P2";
  return {
    reviewEntryId: `SRR-V2-2-${entry.canonicalVariantId}`,
    priority,
    priorityReasons: [
      ...(targeted ? ["targeted_axis_differentiation"] : []),
      ...(axisScopeAmended ? ["v2_2_axis_scope_amendment"] : []),
      ...(authored ? ["authored_directional_paragraph"] : []),
      ...(axisSlot.highRisk ? ["high_risk_claim"] : []),
      ...(lineageMerged ? ["multiple_source_lineages"] : []),
      ...(!targeted &&
      !axisScopeAmended &&
      !authored &&
      !axisSlot.highRisk &&
      !lineageMerged
        ? ["single_lineage_standard_risk"] : []),
    ],
    contentKey: entry.contentKey,
    canonicalVariantId: entry.canonicalVariantId,
    version: entry.version,
    batchId: entry.batchId,
    scenarioRef: entry.scenarioRef,
    claimKey: entry.claimKey,
    claimKind: entry.claimKind,
    privacyScope: entry.privacyScope,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    axisDecisionContext: {
      currentControlledAxes: axisSlot.currentControlledAxes,
      v21FinalSemanticAxes: axisSlot.v21FinalSemanticAxes,
      v22FinalSemanticAxes: axisSlot.finalSemanticAxes,
      removedInferredAxes: axisSlot.removedInferredAxesV22,
      heldInferredAxes: axisSlot.heldInferredAxesV22,
      retainedInferredAxes: axisSlot.retainedInferredAxesV22,
    },
    content: entry.content,
    provenance: entry.provenance,
    review: Object.fromEntries(
      roles.map((role) => [
        role.key,
        {
          label: role.label,
          rubric: role.rubric,
          state: "pending",
          decision: null,
          note: null,
          reviewerRef: null,
          reviewedAt: null,
        },
      ]),
    ),
    internalPreScreenState: "not_started",
    independentReviewState: "pending",
    customerComprehensionState: "not_started",
    customerPublicationApproved: false,
    publicationState: "research_only",
  };
});

const report = {
  contractVersion: "nuang-trait-map-seven-role-review-queue.v2.2",
  queueId: "TRAIT-MAP-SEVEN-ROLE-REVIEW-QUEUE.0.3",
  status: "V2_2_REVIEW_QUEUE_READY_INDEPENDENT_REVIEW_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceAxisManifestId: axisManifest.manifestId,
  summary: {
    entries: entries.length,
    p0Entries: countPriority(entries, "P0"),
    p1Entries: countPriority(entries, "P1"),
    p2Entries: countPriority(entries, "P2"),
    axisScopeAmendedEntries: entries.filter((entry) =>
      entry.priorityReasons.includes("v2_2_axis_scope_amendment"),
    ).length,
    targetedAxisEntries: entries.filter((entry) =>
      entry.priorityReasons.includes(
        "targeted_axis_differentiation",
      ),
    ).length,
    authoredDirectionalEntries: entries.filter((entry) =>
      entry.priorityReasons.includes(
        "authored_directional_paragraph",
      ),
    ).length,
    independentRoleApprovedEntries: 0,
    customerComprehensionPassedEntries: 0,
    customerApprovedEntries: 0,
  },
  roles,
  priorityRules: [
    "P0: v2.2 축 범위가 바뀐 claim, 표적 축 구분 문장, 새로 작성한 방향 문단",
    "P1: 고위험 claim 또는 둘 이상의 원문 계보를 보존한 문장",
    "P2: 표준 위험의 단일 원문 계보 문장",
  ],
  reviewRules: [
    "내부 사전검토는 7개 독립 역할 승인으로 기록하지 않는다.",
    "한 역할이라도 revise 또는 reject이면 해당 entry를 새 version 초안으로 분기한다.",
    "검토자는 결론뿐 아니라 문제 표현과 수정 근거를 기록한다.",
    "7개 역할 통과 뒤에도 고객 이해도 검사와 구성개념 검증 전에는 customer_approved로 바꾸지 않는다.",
    "현재 큐의 모든 콘텐츠는 research_only이며 운영 DB 고객 노출 대상이 아니다.",
  ],
  entries,
  nextGate: {
    name: "P0_INTERNAL_SENTENCE_SCREEN",
    actions: [
      "P0 문장을 같은 claim의 모든 축 서명과 나란히 읽어 축 잔여·오염·중복을 찾는다.",
      "쉬운 한국어, 회피성 문구, 낙인·진단·우열 표현을 자동·수동으로 함께 검사한다.",
      "수정 필요 문장은 원문과 근거 계보를 보존한 새 version 초안으로 분기한다.",
      "내부 통과 문장도 독립 7개 역할과 사용자 이해도 검토 전에는 발행하지 않는다.",
    ],
  },
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== markdown;
  if (stale) {
    console.error("v2.2 seven-role review queue is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Seven-role review queue v2.2: ${report.summary.entries} entries, P0 ${report.summary.p0Entries}, P1 ${report.summary.p1Entries}, P2 ${report.summary.p2Entries}, 0 independently approved.`,
);

function countPriority(items, priority) {
  return items.filter((entry) => entry.priority === priority).length;
}

function buildMarkdown(result) {
  return `# v2.2 canonical 7개 역할 검토 큐

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`
- 독립 역할 승인: 0개

## 작업량

- 전체: ${result.summary.entries}
- P0: ${result.summary.p0Entries}
- P1: ${result.summary.p1Entries}
- P2: ${result.summary.p2Entries}
- v2.2 축 범위 변경 영향: ${result.summary.axisScopeAmendedEntries}
- 표적 축 구분: ${result.summary.targetedAxisEntries}
- 새 방향 문단: ${result.summary.authoredDirectionalEntries}

P0는 먼저 내부 문장 사전검토를 수행한다. 이 내부 검토는 독립 전문가 승인이나
심리측정 타당화가 아니며, 모든 콘텐츠는 7개 역할 검토와 고객 이해도 검증
전까지 연구용으로 유지한다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
