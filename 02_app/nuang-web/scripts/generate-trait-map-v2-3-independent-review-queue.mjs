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
const postP2 = process.argv.includes("--post-p2");
const outputPath = path.join(
  generatedDirectory,
  postP2
    ? "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.json"
    : "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  postP2
    ? "113_INDEPENDENT_REVIEW_QUEUE_POST_P2_V2_3.md"
    : "108_INDEPENDENT_REVIEW_QUEUE_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const ledger = readJson(
  postP2
    ? "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P2_SCREENED_V2_3.json"
    : "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_REVIEWED_V2_3.json",
);
const roles = [
  "personality_psychologist",
  "psychometrician",
  "research_methodologist",
  "korean_plain_language_editor",
  "safety_privacy_reviewer",
  "product_content_designer",
  "data_quality_engineer",
];
const entries = ledger.entries
  .map((entry) => {
    const priority = reviewPriority(entry);
    return {
      reviewQueueId: `IRQ-${entry.canonicalVariantId}`,
      priority,
      canonicalVariantId: entry.canonicalVariantId,
      contentKey: entry.contentKey,
      claimKey: entry.claimKey,
      scenarioRef: entry.scenarioRef,
      claimKind: entry.claimKind,
      semanticAxes: entry.semanticAxes,
      axisSignature: entry.axisSignature,
      content: entry.content,
      sourceBlockCount: entry.provenance.sourceBlockCount,
      hasAuthoredDirectionalParagraph:
        Boolean(entry.provenance.authoredParagraph),
      hasInternalRevision: entry.version > 1,
      revisionType: entry.provenance.p1Revision
        ? "p1"
        : entry.provenance.p0Revision
          ? "p0"
          : entry.provenance.p2Revision
            ? "p2_screen_revision"
            : null,
      commonPersonalizationPolicy:
        entry.commonPersonalizationPolicy,
      requiredIndependentRoles:
        priority === "COMMON_ARCHIVE" ? [] : roles,
      roleDecisions: Object.fromEntries(
        roles.map((role) => [
          role,
          {
            state:
              priority === "COMMON_ARCHIVE"
                ? "not_applicable_personalization_blocked"
                : "pending",
            decision: null,
            issueCodes: [],
            reviewerRef: null,
            reviewedAt: null,
          },
        ]),
      ),
      publicationState: "research_only",
      customerPublicationApproved: false,
    };
  })
  .sort(
    (left, right) =>
      priorityRank(left.priority) - priorityRank(right.priority) ||
      left.claimKey.localeCompare(right.claimKey, "en") ||
      left.axisSignature.localeCompare(right.axisSignature, "en"),
  );
const counts = Object.fromEntries(
  ["P0", "P1", "P2", "COMMON_ARCHIVE"].map((priority) => [
    priority,
    entries.filter((entry) => entry.priority === priority).length,
  ]),
);
const report = {
  contractVersion:
    postP2
      ? "nuang-trait-map-independent-review-queue.post-p2.v2.3"
      : "nuang-trait-map-independent-review-queue.v2.3",
  reportId: postP2
    ? "TRAIT-MAP-INDEPENDENT-REVIEW-QUEUE-POST-P2.2.3"
    : "TRAIT-MAP-INDEPENDENT-REVIEW-QUEUE.2.3",
  status: "V2_3_INDEPENDENT_REVIEW_QUEUE_READY",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  summary: {
    totalEntries: entries.length,
    personalizedEntries:
      entries.length - counts.COMMON_ARCHIVE,
    p0Entries: counts.P0,
    p1Entries: counts.P1,
    p2Entries: counts.P2,
    commonArchiveEntries: counts.COMMON_ARCHIVE,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
    accountingBalanced:
      counts.P0 +
        counts.P1 +
        counts.P2 +
        counts.COMMON_ARCHIVE ===
      entries.length,
  },
  priorityRules: {
    P0: "내부 교정 문장 또는 새 방향 문단. 독립 검토 전 발행 금지.",
    P1: "개인화 문장 중 서로 다른 원문 계보가 둘 이상 합쳐진 문장.",
    P2: "개인화 문장 중 단일 원문 계보이며 자동 구조 검사를 통과한 문장.",
    COMMON_ARCHIVE:
      "축 방향을 개인화하지 않는 연구 계보 전용. 고객 화면 검토 대상이 아님.",
  },
  requiredIndependentRoles: roles,
  entries,
  nextGate: {
    name: "P0_INDEPENDENT_REVIEW_PACKET_AND_P2_AUTOMATED_PREFLIGHT",
    actions: [
      postP2
        ? "P2 판독 교정 14개를 포함한 P0 162개 외부 검토 패킷을 만든다."
        : "P0 148개에 교정 전후·축 계약·출처를 묶은 외부 검토 패킷을 만든다.",
      "P1 298개는 양방향·계보 합성 검토 묶음으로 나눈다.",
      "P2 98개는 쉬운 한국어·중복·축 선명도 자동 사전검수를 실행한다.",
      "모델 내부 판독을 독립 역할 승인으로 기록하지 않는다.",
    ],
  },
};
if (!report.summary.accountingBalanced) {
  throw new Error("v2.3 review queue accounting is unbalanced.");
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
    console.error(
      postP2
        ? "v2.3 post-P2 independent review queue is stale."
        : "v2.3 independent review queue is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `Independent review queue ${postP2 ? "post-P2 " : ""}v2.3: ${entries.length} entries = P0 ${counts.P0} + P1 ${counts.P1} + P2 ${counts.P2} + COMMON ${counts.COMMON_ARCHIVE}; independent approvals 0.`,
);

function reviewPriority(entry) {
  if (entry.semanticAxes.length === 0) return "COMMON_ARCHIVE";
  if (entry.version > 1 || entry.provenance.authoredParagraph) {
    return "P0";
  }
  if (entry.provenance.sourceBlockCount > 1) return "P1";
  return "P2";
}

function priorityRank(priority) {
  return {
    P0: 0,
    P1: 1,
    P2: 2,
    COMMON_ARCHIVE: 3,
  }[priority];
}

function buildMarkdown(result) {
  return `# v2.3 ${postP2 ? "P2 판독 후 " : ""}독립 검토 우선순위 큐

- 전체: ${result.summary.totalEntries}
- 개인화: ${result.summary.personalizedEntries}
- P0 교정·새 문단: ${result.summary.p0Entries}
- P1 다중 원문 합성: ${result.summary.p1Entries}
- P2 단일 원문: ${result.summary.p2Entries}
- COMMON 연구 보관: ${result.summary.commonArchiveEntries}
- 독립 역할 승인: 0
- 계산 일치: ${result.summary.accountingBalanced ? "예" : "아니오"}

P0는 내부 교정 또는 새 방향 문단이므로 가장 먼저 독립 검토한다. P1은
서로 다른 원문 계보를 합친 의미 보존 여부를 확인하고, P2는 자동
사전검수 뒤 표본 독립 검토로 보낸다. COMMON은 개인화 문장이 아니므로
별도 연구 보관 큐에 둔다.

이 우선순위는 검토 순서이며 승인 상태가 아니다. 모든 개인화 문장은
독립 역할 판정과 사용자 검증 전까지 research_only다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
