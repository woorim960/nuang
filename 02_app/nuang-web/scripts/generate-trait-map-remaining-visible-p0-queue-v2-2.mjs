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
  "TRAIT_MAP_REMAINING_VISIBLE_P0_REVIEW_QUEUE_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "68_REMAINING_VISIBLE_P0_REVIEW_QUEUE_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const initialQueue = readJson(
  generatedDirectory,
  "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2_2.json",
);
const revisedLedger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_REVISED_V2_2.json",
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
const priorRevisionIds = new Set(
  revisedLedger.revisionLineage.migratedV21Revisions.map(
    (revision) => revision.canonicalVariantId,
  ),
);
const p0Ids = new Set([...initialP0Ids, ...priorRevisionIds]);
const flaggedReviewedIds = new Set(
  flaggedScreen.entries.map((entry) => entry.canonicalVariantId),
);
const internallyRevisedIds = new Set(
  revisedLedger.entries
    .filter((entry) => entry.provenance.p0Revision)
    .map((entry) => entry.canonicalVariantId),
);
const entryById = new Map(
  revisedLedger.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const p0Entries = [...p0Ids].map((canonicalVariantId) => {
  const entry = entryById.get(canonicalVariantId);
  if (!entry) {
    throw new Error(`Missing revised ledger entry: ${canonicalVariantId}`);
  }
  return entry;
});
const commonEntries = p0Entries.filter(
  (entry) =>
    entry.surfacePolicy.mode === "context_scaffolding_only",
);
const completedPersonalizedEntries = p0Entries.filter(
  (entry) =>
    entry.surfacePolicy.mode !== "context_scaffolding_only" &&
    (flaggedReviewedIds.has(entry.canonicalVariantId) ||
      internallyRevisedIds.has(entry.canonicalVariantId)),
);
const remainingEntries = p0Entries
  .filter(
    (entry) =>
      entry.surfacePolicy.mode !== "context_scaffolding_only" &&
      !flaggedReviewedIds.has(entry.canonicalVariantId) &&
      !internallyRevisedIds.has(entry.canonicalVariantId),
  )
  .map((entry) => ({
    canonicalVariantId: entry.canonicalVariantId,
    contentKey: entry.contentKey,
    version: entry.version,
    batchId: entry.batchId,
    scenarioRef: entry.scenarioRef,
    claimKey: entry.claimKey,
    claimKind: entry.claimKind,
    privacyScope: entry.privacyScope,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    content: entry.content,
    provenance: entry.provenance,
    requiredChecks: [
      "같은 claim의 모든 축 서명과 대조",
      "현재 축 한 글자 차이가 문장에 직접 드러나는지 확인",
      "제거·보류 축 의미가 결론에 남지 않았는지 확인",
      "같은 정보 반복·번역체·모호한 지시어 확인",
      "진단·낙인·능력·도덕성·관계 결과 단정 확인",
    ],
    internalSentenceDecision: "pending",
    independentRoleReviewState: "pending",
    customerPublicationApproved: false,
    publicationState: "research_only",
  }))
  .sort(
    (left, right) =>
      left.batchId.localeCompare(right.batchId, "en") ||
      left.claimKey.localeCompare(right.claimKey, "en") ||
      left.axisSignature.localeCompare(right.axisSignature, "en"),
  );
const claimPackets = [
  ...Map.groupBy(remainingEntries, (entry) => entry.claimKey).entries(),
].map(([claimKey, entries]) => {
  const allClaimEntries = revisedLedger.entries
    .filter((entry) => entry.claimKey === claimKey)
    .map((entry) => ({
      canonicalVariantId: entry.canonicalVariantId,
      semanticAxes: entry.semanticAxes,
      axisSignature: entry.axisSignature,
      content: entry.content,
      isPendingP0: entries.some(
        (candidate) =>
          candidate.canonicalVariantId === entry.canonicalVariantId,
      ),
    }));
  return {
    claimKey,
    batchId: entries[0].batchId,
    claimKind: entries[0].claimKind,
    pendingVariantCount: entries.length,
    allClaimVariants: allClaimEntries,
    internalComparisonDecision: "pending",
  };
});
const report = {
  contractVersion:
    "nuang-trait-map-remaining-visible-p0-review-queue.v2.2",
  queueId: "TRAIT-MAP-REMAINING-VISIBLE-P0-REVIEW-QUEUE.0.1",
  status: "REMAINING_VISIBLE_P0_QUEUE_READY_INTERNAL_READTHROUGH_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceInitialQueueId: initialQueue.queueId,
  sourceRevisedLedgerReportId: revisedLedger.reportId,
  sourceFlaggedScreenReportId: flaggedScreen.reportId,
  summary: {
    initialP0Entries: initialP0Ids.size,
    priorRevisionEntriesAddedToP0:
      [...priorRevisionIds].filter(
        (canonicalVariantId) => !initialP0Ids.has(canonicalVariantId),
      ).length,
    effectiveP0Entries: p0Entries.length,
    commonEntriesExcludedFromPersonalizedReview:
      commonEntries.length,
    completedPersonalizedEntries:
      completedPersonalizedEntries.length,
    remainingVisibleP0Entries: remainingEntries.length,
    remainingClaimPackets: claimPackets.length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  accountingRule:
    "effective P0 = COMMON 비노출 + 내부 판독·교정 완료 개인화 후보 + 아직 판독할 개인화 후보",
  entries: remainingEntries,
  claimPackets,
  nextGate: {
    name: "REMAINING_VISIBLE_P0_INTERNAL_READTHROUGH",
    actions: [
      "claim 묶음마다 전체 축 서명을 나란히 읽고 pending 변형을 판독한다.",
      "수정이 필요하면 원문과 현재 version을 보존한 새 revision 후보를 만든다.",
      "내부 판독이 끝나면 P0 독립 7개 역할 증거 패킷을 고정한다.",
      "P0 구조와 문장이 안정되면 P1 검토로 이동한다.",
    ],
  },
};

if (
  report.summary.effectiveP0Entries !==
  report.summary.commonEntriesExcludedFromPersonalizedReview +
    report.summary.completedPersonalizedEntries +
    report.summary.remainingVisibleP0Entries
) {
  throw new Error("P0 accounting mismatch.");
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
    console.error("v2.2 remaining visible P0 queue is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `Remaining visible P0 queue v2.2: effective ${report.summary.effectiveP0Entries}, COMMON ${report.summary.commonEntriesExcludedFromPersonalizedReview}, completed ${report.summary.completedPersonalizedEntries}, remaining ${report.summary.remainingVisibleP0Entries} in ${report.summary.remainingClaimPackets} claims.`,
);

function buildMarkdown(result) {
  return `# v2.2 남은 개인화 P0 문장 검토 큐

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## P0 작업량 정산

- 최초 P0: ${result.summary.initialP0Entries}
- 과거 교정 계보로 추가한 P0: ${result.summary.priorRevisionEntriesAddedToP0}
- 실제 P0: ${result.summary.effectiveP0Entries}
- COMMON 비노출로 분리: ${result.summary.commonEntriesExcludedFromPersonalizedReview}
- 내부 판독·교정 완료 개인화 후보: ${result.summary.completedPersonalizedEntries}
- 남은 개인화 P0: ${result.summary.remainingVisibleP0Entries}
- 남은 claim 비교 묶음: ${result.summary.remainingClaimPackets}

남은 문장은 자동 flag가 없었다는 이유로 승인하지 않는다. 같은 claim의 모든
축 서명과 나란히 읽고, 현재 축 차이·제거 축 잔여·중복·쉬운 한국어·안전을
직접 판독한다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
