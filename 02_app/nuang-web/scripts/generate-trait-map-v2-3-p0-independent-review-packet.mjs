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
const postP2 = process.argv.includes("--post-p2");
const outputPath = path.join(
  reviewDirectory,
  postP2
    ? "TRAIT_MAP_P0_INDEPENDENT_REVIEW_PACKET_POST_P2_V2_3.json"
    : "TRAIT_MAP_P0_INDEPENDENT_REVIEW_PACKET_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  postP2
    ? "114_P0_INDEPENDENT_REVIEW_PACKET_POST_P2_V2_3.md"
    : "109_P0_INDEPENDENT_REVIEW_PACKET_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  generatedDirectory,
  postP2
    ? "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.json"
    : "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_V2_3.json",
);
const ledger = readJson(
  generatedDirectory,
  postP2
    ? "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json"
    : "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_REVIEWED_V2_3.json",
);
const ledgerById = new Map(
  ledger.entries.map((entry) => [entry.canonicalVariantId, entry]),
);
const p0Entries = queue.entries.filter(
  (entry) => entry.priority === "P0",
);
const reviewItems = p0Entries.map((queueEntry) => {
  const entry = ledgerById.get(queueEntry.canonicalVariantId);
  const revision =
    entry.provenance.p2Revision ??
    entry.provenance.p1Revision ??
    entry.provenance.p0Revision ??
    null;
  return {
    reviewItemId: `P0-IR-${entry.canonicalVariantId}`,
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    scenarioRef: entry.scenarioRef,
    claimKind: entry.claimKind,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    privacyScope: entry.privacyScope,
    currentContent: entry.content,
    previousContent: revision?.previousContent ?? null,
    changeType: revision
      ? entry.provenance.p2Revision
        ? "p2_screen_internal_revision"
        : entry.provenance.p1Revision
          ? "p1_internal_revision"
          : "p0_internal_revision"
      : "authored_directional_paragraph",
    internalRationale:
      revision?.rationale ??
      revision?.internalScreening?.rationale ??
      revision?.internalRevision?.rationale ??
      entry.provenance.authoredParagraph?.rationale ??
      null,
    sourceUnitIds: entry.provenance.sourceUnitIds,
    sourceBlockCount: entry.provenance.sourceBlockCount,
    authoredParagraph: entry.provenance.authoredParagraph,
    automatedGates: entry.automatedGates,
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
      "공식 축 뜻이 문장에서 직접 드러나는가?",
      "다른 축·능력·도덕성·임상 개념이 섞이지 않았는가?",
      "반대 방향 문장과 비교할 때 한쪽을 더 좋게 평가하지 않는가?",
      "어린이와 고령 사용자도 한 번에 이해할 쉬운 한국어인가?",
      "근거 범위를 넘어 행동을 단정하거나 관계 결과를 예측하지 않는가?",
      "현재 화면에 필요한 정보이며 같은 뜻을 반복하지 않는가?",
      "canonical ID·출처·교정 계보가 되돌릴 수 있게 연결되는가?",
    ],
    publicationState: "research_only",
    customerPublicationApproved: false,
  };
});
const packetGroups = [];
for (let index = 0; index < reviewItems.length; index += 15) {
  const items = reviewItems.slice(index, index + 15);
  packetGroups.push({
    packetId: `P0-IRP-${String(packetGroups.length + 1).padStart(2, "0")}`,
    itemCount: items.length,
    reviewItemIds: items.map((item) => item.reviewItemId),
    state: "pending_independent_seven_role_review",
  });
}
const report = {
  contractVersion:
    postP2
      ? "nuang-trait-map-p0-independent-review-packet.post-p2.v2.3"
      : "nuang-trait-map-p0-independent-review-packet.v2.3",
  reportId: postP2
    ? "TRAIT-MAP-P0-INDEPENDENT-REVIEW-PACKET-POST-P2.2.3"
    : "TRAIT-MAP-P0-INDEPENDENT-REVIEW-PACKET.2.3",
  status: "P0_INDEPENDENT_REVIEW_PACKET_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceQueueReportId: queue.reportId,
  sourceLedgerReportId: ledger.reportId,
  summary: {
    p0Entries: reviewItems.length,
    internalRevisions: reviewItems.filter(
      (item) => item.previousContent,
    ).length,
    authoredDirectionalEntries: reviewItems.filter(
      (item) => item.changeType === "authored_directional_paragraph",
    ).length,
    packets: packetGroups.length,
    requiredIndependentRoles:
      queue.requiredIndependentRoles.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  roleDecisionContract: {
    decisions: ["approve", "revise", "hold", "reject"],
    approvalRule:
      "7개 역할이 모두 approve하고 필수 근거·인지 검증 게이트가 통과해야 고객 발행 후보가 된다.",
    noSelfApprovalRule:
      "이 패킷을 생성하거나 내부 교정한 모델의 판독은 독립 역할 승인으로 기록하지 않는다.",
  },
  packetGroups,
  reviewItems,
  nextGate: {
    name: "INDEPENDENT_SEVEN_ROLE_REVIEW",
    actions: [
      "패킷별로 7개 역할이 서로의 결정을 보지 않고 먼저 판정한다.",
      "수정·보류·반려 이유를 issue code와 함께 기록한다.",
      "교정 뒤에는 32개 재조합과 80개 이웃 검사를 다시 실행한다.",
      "독립 검토자를 확보하기 전에는 승인 수치를 0으로 유지한다.",
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
    console.error(
      postP2
        ? "v2.3 post-P2 P0 independent review packet is stale."
        : "v2.3 P0 independent review packet is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P0 independent packet ${postP2 ? "post-P2 " : ""}v2.3: ${report.summary.p0Entries} entries, ${report.summary.internalRevisions} revisions, ${report.summary.authoredDirectionalEntries} authored, ${report.summary.packets} packets, approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.3 ${postP2 ? "P2 판독 후 " : ""}P0 독립 검토 패킷

- P0: ${result.summary.p0Entries}
- 내부 교정: ${result.summary.internalRevisions}
- 새 방향 문단: ${result.summary.authoredDirectionalEntries}
- 검토 묶음: ${result.summary.packets}
- 필수 역할: ${result.summary.requiredIndependentRoles}
- 독립 승인: 0
- 고객 발행 승인: 0

각 항목에는 교정 전후 문장, 축 서명, 출처 계보, 내부 수정 이유와 7개
역할별 독립 판정란을 함께 넣었다. 7개 역할이 모두 승인하고 필요한
근거·인지 검증을 통과하기 전에는 고객 발행 후보가 아니다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
