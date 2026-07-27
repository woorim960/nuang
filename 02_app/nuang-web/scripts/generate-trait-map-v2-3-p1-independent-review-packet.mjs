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
  reviewDirectory,
  "TRAIT_MAP_P1_INDEPENDENT_REVIEW_PACKET_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "116_P1_INDEPENDENT_REVIEW_PACKET_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  generatedDirectory,
  "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.json",
);
const ledger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json",
);
const ledgerById = new Map(
  ledger.entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const draftById = new Map();
for (let index = 1; index <= 12; index += 1) {
  const batchId = `CAB_${String(index).padStart(2, "0")}`;
  const draft = readJson(
    generatedDirectory,
    `TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_${batchId}_V2_3.json`,
  );
  for (const variant of draft.scenarios
    .flatMap((scenario) => scenario.claimSlots)
    .flatMap((slot) => slot.variants)) {
    draftById.set(variant.canonicalVariantId, variant);
  }
}
const allVariantsByClaim = Map.groupBy(
  ledger.entries.filter((entry) => entry.semanticAxes.length > 0),
  (entry) => entry.claimKey,
);
const p1Entries = queue.entries.filter(
  (entry) => entry.priority === "P1",
);
const reviewItems = p1Entries.map((queueEntry) => {
  const entry = ledgerById.get(queueEntry.canonicalVariantId);
  const draft = draftById.get(queueEntry.canonicalVariantId);
  if (!entry || !draft) {
    throw new Error(
      `Missing P1 ledger or research draft: ${queueEntry.canonicalVariantId}`,
    );
  }
  const sourceUnitIds = draft.includedUnits.map((unit) => unit.unitId);
  if (
    sourceUnitIds.length !== 2 ||
    JSON.stringify(sourceUnitIds) !==
      JSON.stringify(entry.provenance.sourceUnitIds)
  ) {
    throw new Error(
      `P1 source lineage mismatch: ${entry.canonicalVariantId}`,
    );
  }
  const comparisonVariants = (
    allVariantsByClaim.get(entry.claimKey) ?? []
  )
    .filter(
      (candidate) =>
        candidate.canonicalVariantId !== entry.canonicalVariantId,
    )
    .map((candidate) => ({
      canonicalVariantId: candidate.canonicalVariantId,
      axisSignature: candidate.axisSignature,
      content: candidate.content,
    }))
    .sort((left, right) =>
      left.axisSignature.localeCompare(right.axisSignature, "en"),
    );
  return {
    reviewItemId: `P1-IR-${entry.canonicalVariantId}`,
    canonicalVariantId: entry.canonicalVariantId,
    batchId: entry.batchId,
    claimKey: entry.claimKey,
    scenarioRef: entry.scenarioRef,
    claimKind: entry.claimKind,
    privacyScope: entry.privacyScope,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    currentContent: entry.content,
    semanticDecision: entry.provenance.semanticDecision,
    sourceUnits: draft.includedUnits.map((unit) => ({
      unitId: unit.unitId,
      assertion: unit.assertion,
      selectedForDirection: unit.selectedForDirection,
      evidenceFindingRefs: unit.evidenceFindingRefs,
      independentSourceRefs: unit.independentSourceRefs,
    })),
    comparisonVariants,
    independentReview: Object.fromEntries(
      queue.requiredIndependentRoles.map((role) => [
        role,
        {
          state: "pending",
          decision: null,
          issueCodes: [],
          rationale: null,
          reviewerRef: null,
          reviewedAt: null,
        },
      ]),
    ),
    requiredDecisionQuestions: [
      "두 원문이 서로 다른 유용한 의미를 실제로 담고 있는가?",
      "현재 두 문단이 각 원문의 의미를 빠짐없이 보존하는가?",
      "같은 뜻을 표현만 바꾸어 반복한 문단은 없는가?",
      "축의 공식 뜻이 반대 방향보다 우월하거나 열등하지 않게 드러나는가?",
      "같은 claim의 다른 축 서명과 비교할 때 예상한 글자만 달라지는가?",
      "근거 찾음표가 현재 문장의 구체적 행동 경향까지 지지하는가?",
      "어린이와 고령 사용자도 번역투 없이 이해할 수 있는가?",
    ],
    publicationState: "research_only",
    customerPublicationApproved: false,
  };
});
const claimGroups = [
  ...Map.groupBy(reviewItems, (item) => item.claimKey).entries(),
]
  .map(([claimKey, items]) => ({
    claimGroupId: `P1-CG-${String(0).padStart(3, "0")}`,
    claimKey,
    scenarioRefs: [...new Set(items.map((item) => item.scenarioRef))],
    itemCount: items.length,
    reviewItemIds: items
      .map((item) => item.reviewItemId)
      .sort((left, right) => left.localeCompare(right, "en")),
    axisSignatures: items
      .map((item) => item.axisSignature)
      .sort((left, right) => left.localeCompare(right, "en")),
    state: "pending_independent_review",
  }))
  .sort((left, right) =>
    left.claimKey.localeCompare(right.claimKey, "en"),
  )
  .map((group, index) => ({
    ...group,
    claimGroupId: `P1-CG-${String(index + 1).padStart(3, "0")}`,
  }));
const packetGroups = [];
for (let index = 0; index < claimGroups.length; index += 10) {
  const groups = claimGroups.slice(index, index + 10);
  packetGroups.push({
    packetId: `P1-IRP-${String(packetGroups.length + 1).padStart(2, "0")}`,
    claimGroupCount: groups.length,
    itemCount: groups.reduce(
      (total, group) => total + group.itemCount,
      0,
    ),
    claimGroupIds: groups.map((group) => group.claimGroupId),
    state: "pending_independent_seven_role_review",
  });
}
const report = {
  contractVersion:
    "nuang-trait-map-p1-independent-review-packet.v2.3",
  reportId: "TRAIT-MAP-P1-INDEPENDENT-REVIEW-PACKET.2.3",
  status: "P1_INDEPENDENT_REVIEW_PACKET_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceQueueReportId: queue.reportId,
  sourceLedgerReportId: ledger.reportId,
  summary: {
    p1Entries: reviewItems.length,
    sourceUnits: reviewItems.reduce(
      (total, item) => total + item.sourceUnits.length,
      0,
    ),
    entriesWithExactlyTwoSourceUnits: reviewItems.filter(
      (item) => item.sourceUnits.length === 2,
    ).length,
    claimGroups: claimGroups.length,
    packets: packetGroups.length,
    requiredIndependentRoles: queue.requiredIndependentRoles.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  groupingContract: {
    claimFirst:
      "같은 claim의 모든 P1 방향을 한 그룹에 두어 한 글자 대조를 먼저 확인한다.",
    sourceLineage:
      "각 문장에 두 원문의 문장·근거 finding·독립 출처 참조를 함께 둔다.",
    packetSize:
      "한 패킷에 claim 그룹을 최대 10개씩 넣어 문맥 전환과 검토 피로를 줄인다.",
  },
  roleDecisionContract: {
    decisions: ["approve", "revise", "hold", "reject"],
    noSelfApprovalRule:
      "내부 교정·패킷 생성 모델의 판독은 독립 역할 승인으로 기록하지 않는다.",
  },
  packetGroups,
  claimGroups,
  reviewItems,
  nextGate: {
    name: "INDEPENDENT_P1_SOURCE_PRESERVATION_REVIEW",
    actions: [
      "같은 claim 그룹을 유지한 채 7개 역할이 독립적으로 판정한다.",
      "중복으로 판정된 문단은 삭제 전 source unit 계보를 보관한다.",
      "교정 또는 병합 뒤에는 32개 재조합과 80개 이웃 검사를 다시 실행한다.",
    ],
  },
};
if (
  report.summary.p1Entries !== 298 ||
  report.summary.entriesWithExactlyTwoSourceUnits !==
    report.summary.p1Entries ||
  report.summary.sourceUnits !== 596
) {
  throw new Error("P1 review packet accounting is incomplete.");
}

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
    console.error("v2.3 P1 independent review packet is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P1 independent packet v2.3: ${report.summary.p1Entries} entries, ${report.summary.sourceUnits} source units, ${report.summary.claimGroups} claim groups, ${report.summary.packets} packets, approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.3 P1 독립 검토 패킷

- P1 문장: ${result.summary.p1Entries}
- 원문 단위: ${result.summary.sourceUnits}
- 원문 2개 일치: ${result.summary.entriesWithExactlyTwoSourceUnits}
- claim 그룹: ${result.summary.claimGroups}
- 검토 묶음: ${result.summary.packets}
- 필수 역할: ${result.summary.requiredIndependentRoles}
- 독립 승인: 0
- 고객 발행 승인: 0

P1은 서로 다른 원문 두 개가 합쳐진 문장이다. 각 항목에 두 원문의
문장·근거 finding·독립 출처 참조와 같은 claim의 비교 방향을 함께
넣었다. 검토자는 원문 의미 보존, 반복 제거, 축 대조, 쉬운 한국어를
한 번에 확인할 수 있다.

이 패킷은 독립 검토를 받을 준비를 한 것이며 승인 결과가 아니다. 모든
항목은 계속 research_only다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
