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
  "TRAIT_MAP_P0_INDEPENDENT_REVIEW_EVIDENCE_PACKET_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "71_P0_INDEPENDENT_REVIEW_EVIDENCE_PACKET_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const remainingQueue = readJson(
  reviewDirectory,
  "TRAIT_MAP_REMAINING_VISIBLE_P0_REVIEW_QUEUE_V2_2.json",
);
const ledger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_COMPLETE_V2_2.json",
);
const initialQueue = readJson(
  generatedDirectory,
  "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2_2.json",
);
const flaggedScreen = readJson(
  reviewDirectory,
  "TRAIT_MAP_P0_FLAGGED_INTERNAL_SCREEN_V2_2.json",
);
const initialP0Ids = new Set(
  initialQueue.entries
    .filter((entry) => entry.priority === "P0")
    .map((entry) => entry.canonicalVariantId),
);
const migratedPriorIds = new Set(
  ledger.revisionLineage.migratedV21Revisions.map(
    (revision) => revision.canonicalVariantId,
  ),
);
const effectiveP0Ids = new Set([...initialP0Ids, ...migratedPriorIds]);
const flaggedById = new Map(
  flaggedScreen.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const entryById = new Map(
  ledger.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const entries = [...effectiveP0Ids]
  .map((canonicalVariantId) => {
    const entry = entryById.get(canonicalVariantId);
    if (!entry) {
      throw new Error(`Missing final P0 entry: ${canonicalVariantId}`);
    }
    const common =
      entry.surfacePolicy.mode === "context_scaffolding_only";
    const revised = Boolean(entry.provenance.p0Revision);
    const flagged = flaggedById.get(canonicalVariantId);
    const disposition = common
      ? "research_lineage_only_personalized_surfaces_blocked"
      : revised
        ? "internally_revised_candidate"
        : "internally_retained_candidate";
    return {
      canonicalVariantId,
      contentKey: entry.contentKey,
      version: entry.version,
      batchId: entry.batchId,
      scenarioRef: entry.scenarioRef,
      claimKey: entry.claimKey,
      claimKind: entry.claimKind,
      privacyScope: entry.privacyScope,
      semanticAxes: entry.semanticAxes,
      axisSignature: entry.axisSignature,
      disposition,
      finalInternalContent: entry.content,
      surfacePolicy: entry.surfacePolicy,
      provenance: entry.provenance,
      flaggedInternalScreen: flagged
        ? flagged.internalScreening
        : null,
      automatedGates: entry.automatedGates,
      independentReview: Object.fromEntries(
        [
          "personality_psychologist",
          "psychometrician",
          "research_methodologist",
          "korean_plain_language_editor",
          "safety_privacy_reviewer",
          "product_content_designer",
          "data_quality_engineer",
        ].map((role) => [
          role,
          {
            state: "pending",
            decision: null,
            note: null,
            reviewerRef: null,
            reviewedAt: null,
          },
        ]),
      ),
      customerComprehensionState: "not_started",
      customerPublicationApproved: false,
      publicationState: "research_only",
    };
  })
  .sort(
    (left, right) =>
      left.batchId.localeCompare(right.batchId, "en") ||
      left.claimKey.localeCompare(right.claimKey, "en") ||
      left.axisSignature.localeCompare(right.axisSignature, "en"),
  );
const counts = Object.fromEntries(
  [
    "research_lineage_only_personalized_surfaces_blocked",
    "internally_revised_candidate",
    "internally_retained_candidate",
  ].map((disposition) => [
    disposition,
    entries.filter((entry) => entry.disposition === disposition)
      .length,
  ]),
);
const report = {
  contractVersion:
    "nuang-trait-map-p0-independent-review-evidence-packet.v2.2",
  packetId: "TRAIT-MAP-P0-INDEPENDENT-REVIEW-EVIDENCE-PACKET.0.1",
  status: "P0_INTERNAL_BASELINE_FROZEN_INDEPENDENT_REVIEW_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceLedgerReportId: ledger.reportId,
  sourceP0AccountingQueueId: remainingQueue.queueId,
  summary: {
    p0Entries: entries.length,
    commonPersonalizedSurfaceBlocks:
      counts.research_lineage_only_personalized_surfaces_blocked,
    internallyRevisedCandidates:
      counts.internally_revised_candidate,
    internallyRetainedCandidates:
      counts.internally_retained_candidate,
    automatedGatePassedEntries: entries.filter((entry) =>
      Object.values(entry.automatedGates).every(
        (state) => state === "passed",
      ),
    ).length,
    independentRoleApprovedEntries: 0,
    customerComprehensionPassedEntries: 0,
    customerApprovedEntries: 0,
  },
  reviewInstructions: [
    "내부 결정에 동의하는지만 묻지 말고 원문 계보·현재 축 계약·반대 서명 문장을 독립적으로 판독한다.",
    "수정 요청은 문제 표현, 영향을 받는 축, 제안 문장, 근거 범위를 함께 기록한다.",
    "한 역할이라도 revise 또는 reject이면 새 content version으로 분기한다.",
    "7개 역할 통과 뒤에도 고객 이해도 검사와 구성개념 검증 전에는 발행하지 않는다.",
  ],
  entries,
  nextGate: {
    name: "P1_AUTOMATED_PREFLIGHT_AND_BATCHING",
    actions: [
      "P1에서 비노출 COMMON을 먼저 분리한다.",
      "남은 개인화 P1의 중복·축 오염·번역체·위험 표현을 자동 사전검수한다.",
      "flag 유형과 claim 묶음 기준으로 내부 판독 배치를 만든다.",
      "P0 독립 검토 결과가 들어오면 별도 version으로 반영한다.",
    ],
  },
};

if (
  entries.length !==
  report.summary.commonPersonalizedSurfaceBlocks +
    report.summary.internallyRevisedCandidates +
    report.summary.internallyRetainedCandidates
) {
  throw new Error("P0 evidence packet accounting mismatch.");
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
    console.error("v2.2 P0 evidence packet is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 evidence packet v2.2: ${report.summary.p0Entries} entries, COMMON ${report.summary.commonPersonalizedSurfaceBlocks}, revised ${report.summary.internallyRevisedCandidates}, retained ${report.summary.internallyRetainedCandidates}, independent approvals 0.`,
);

function buildMarkdown(result) {
  return `# v2.2 P0 독립 검토 증거 패킷

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## P0 정산

- 전체: ${result.summary.p0Entries}
- COMMON 개인화 차단: ${result.summary.commonPersonalizedSurfaceBlocks}
- 내부 교정 후보: ${result.summary.internallyRevisedCandidates}
- 내부 유지 후보: ${result.summary.internallyRetainedCandidates}
- 자동 게이트 통과: ${result.summary.automatedGatePassedEntries}
- 독립 역할 승인: ${result.summary.independentRoleApprovedEntries}
- 고객 이해도 통과: ${result.summary.customerComprehensionPassedEntries}
- 고객 승인: ${result.summary.customerApprovedEntries}

이 패킷은 내부 P0 기준선을 고정하지만 전문가 검토 완료를 뜻하지 않는다.
독립 검토자는 내부 결론을 그대로 승인하지 않고 원문·축 계약·반대 서명을
다시 판독한다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
