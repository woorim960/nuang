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
  "TRAIT_MAP_P1_SENTENCE_PREFLIGHT_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "72_P1_SENTENCE_PREFLIGHT_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const initialQueue = readJson(
  generatedDirectory,
  "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2_2.json",
);
const ledger = readJson(
  generatedDirectory,
  "TRAIT_MAP_CANONICAL_CONTENT_LEDGER_P0_COMPLETE_V2_2.json",
);
const axisManifest = readJson(
  generatedDirectory,
  "TRAIT_MAP_FINAL_AXIS_DECISIONS_V2_2.json",
);
const entryById = new Map(
  ledger.entries.map((entry) => [
    entry.canonicalVariantId,
    entry,
  ]),
);
const axisSlotByClaimKey = new Map(
  axisManifest.slots.map((slot) => [slot.claimKey, slot]),
);
const p1Ids = initialQueue.entries
  .filter((entry) => entry.priority === "P1")
  .map((entry) => entry.canonicalVariantId);
const unsafePattern =
  /무조건|절대로|틀림없이|사이코패스|소시오패스|정신질환|성격장애|지능이 낮|도덕성이 낮|나쁜 사람|관계가 실패|헤어지게|성공이 보장/;
const vaguePattern =
  /알 수 없|단정할 수 없|그럴 수도 있고|이럴 수도 있고|사람마다 다르|경우에 따라 다르기만/;
const translationTonePattern =
  /에 기반하여|에 기초하여|의 맥락에서|을 통해 나타나|관찰되어질|되어지는/;

const entries = p1Ids.map((canonicalVariantId) => {
  const entry = entryById.get(canonicalVariantId);
  if (!entry) {
    throw new Error(`Missing P1 ledger entry: ${canonicalVariantId}`);
  }
  const axisSlot = axisSlotByClaimKey.get(entry.claimKey);
  const flags = [];
  for (const [index, paragraph] of entry.content.detailParagraphs.entries()) {
    if (unsafePattern.test(paragraph)) {
      flags.push(flag("SAFETY_UNSAFE_OR_STIGMATIZING", index, paragraph));
    }
    if (vaguePattern.test(paragraph)) {
      flags.push(flag("COPY_VAGUE_NON_EXPLANATORY_HEDGE", index, paragraph));
    }
    if (translationTonePattern.test(paragraph)) {
      flags.push(flag("COPY_TRANSLATION_TONE", index, paragraph));
    }
    if (paragraph.length > 140) {
      flags.push({
        ...flag("COPY_PARAGRAPH_OVER_140_CHARS", index, paragraph),
        characterCount: paragraph.length,
      });
    }
  }
  for (let left = 0; left < entry.content.detailParagraphs.length; left += 1) {
    for (
      let right = left + 1;
      right < entry.content.detailParagraphs.length;
      right += 1
    ) {
      const similarity = tokenJaccard(
        entry.content.detailParagraphs[left],
        entry.content.detailParagraphs[right],
      );
      if (similarity >= 0.5) {
        flags.push({
          code: "PRODUCT_POSSIBLE_REDUNDANT_PARAGRAPHS",
          leftParagraphIndex: left,
          rightParagraphIndex: right,
          tokenJaccard: similarity,
        });
      }
    }
  }
  if (axisSlot.retainedInferredAxesV22.length > 0) {
    flags.push({
      code: "PSY_RETAINED_INFERRED_AXIS_INDEPENDENT_CONFIRMATION_REQUIRED",
      retainedInferredAxes: axisSlot.retainedInferredAxesV22,
    });
  }
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
    content: entry.content,
    surfacePolicy: entry.surfacePolicy,
    retainedInferredAxes: axisSlot.retainedInferredAxesV22,
    automatedPreflight: {
      state:
        entry.surfacePolicy.mode === "context_scaffolding_only"
          ? "common_personalized_surfaces_blocked"
          : flags.length === 0
            ? "no_automated_flags_manual_readthrough_required"
            : "flagged_for_manual_semantic_readthrough",
      flags,
    },
    internalSentenceDecision:
      entry.surfacePolicy.mode === "context_scaffolding_only"
        ? "not_required_hidden_common"
        : "pending",
    independentRoleReviewState: "pending",
    customerPublicationApproved: false,
    publicationState: "research_only",
  };
});
const commonEntries = entries.filter(
  (entry) =>
    entry.surfacePolicy.mode === "context_scaffolding_only",
);
const personalizedEntries = entries.filter(
  (entry) =>
    entry.surfacePolicy.mode !== "context_scaffolding_only",
);
const claimPackets = [
  ...Map.groupBy(
    personalizedEntries,
    (entry) => entry.claimKey,
  ).entries(),
].map(([claimKey, claimEntries]) => ({
  claimKey,
  batchId: claimEntries[0].batchId,
  claimKind: claimEntries[0].claimKind,
  variants: claimEntries.map((entry) => ({
    canonicalVariantId: entry.canonicalVariantId,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    content: entry.content,
    automatedFlags: entry.automatedPreflight.flags,
  })),
  internalComparisonDecision: "pending",
}));
const allFlags = personalizedEntries.flatMap(
  (entry) => entry.automatedPreflight.flags,
);
const report = {
  contractVersion:
    "nuang-trait-map-p1-sentence-preflight.v2.2",
  reportId: "TRAIT-MAP-P1-SENTENCE-PREFLIGHT.0.1",
  status: "P1_AUTOMATED_PREFLIGHT_COMPLETE_INTERNAL_READTHROUGH_PENDING",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceInitialQueueId: initialQueue.queueId,
  sourceLedgerReportId: ledger.reportId,
  summary: {
    p1Entries: entries.length,
    commonEntriesExcludedFromPersonalizedReview:
      commonEntries.length,
    personalizedEntries: personalizedEntries.length,
    claimPackets: claimPackets.length,
    personalizedEntriesWithFlags: personalizedEntries.filter(
      (entry) => entry.automatedPreflight.flags.length > 0,
    ).length,
    personalizedEntriesWithoutFlags: personalizedEntries.filter(
      (entry) => entry.automatedPreflight.flags.length === 0,
    ).length,
    totalFlags: allFlags.length,
    safetyFlags: allFlags.filter((item) =>
      item.code.startsWith("SAFETY_"),
    ).length,
    vagueHedgeFlags: allFlags.filter(
      (item) => item.code === "COPY_VAGUE_NON_EXPLANATORY_HEDGE",
    ).length,
    translationToneFlags: allFlags.filter(
      (item) => item.code === "COPY_TRANSLATION_TONE",
    ).length,
    longParagraphFlags: allFlags.filter(
      (item) => item.code === "COPY_PARAGRAPH_OVER_140_CHARS",
    ).length,
    redundancyFlags: allFlags.filter(
      (item) =>
        item.code === "PRODUCT_POSSIBLE_REDUNDANT_PARAGRAPHS",
    ).length,
    retainedInferredAxisChecks: allFlags.filter(
      (item) =>
        item.code ===
        "PSY_RETAINED_INFERRED_AXIS_INDEPENDENT_CONFIRMATION_REQUIRED",
    ).length,
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  interpretation: [
    "자동 flag는 오류 확정이 아니라 내부 판독 우선순위다.",
    "추론 축 유지 flag는 축을 제거하라는 뜻이 아니라 양방향 대비를 독립적으로 다시 확인하라는 뜻이다.",
    "flag가 없는 문장도 같은 claim의 축 서명과 나란히 읽어야 한다.",
    "COMMON은 연구 계보로 보존하지만 개인화 결과 화면에는 노출하지 않는다.",
  ],
  entries,
  claimPackets,
  nextGate: {
    name: "P1_RETAINED_INFERRED_AXIS_AND_REDUNDANCY_BATCH_REVIEW",
    actions: [
      "추론 축 유지 flag가 있는 claim을 축별로 묶어 우선 판독한다.",
      "중복 가능 문단은 고유 정보가 있는지 확인해 선택·합성·유지로 분류한다.",
      "flag가 없는 P1도 claim 묶음 단위로 순차 판독한다.",
      "수정 뒤 전체 32개 재조합을 다시 검사한다.",
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
    console.error("v2.2 P1 preflight is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P1 preflight v2.2: ${report.summary.p1Entries} entries, COMMON ${report.summary.commonEntriesExcludedFromPersonalizedReview}, personalized ${report.summary.personalizedEntries}, flagged ${report.summary.personalizedEntriesWithFlags}, inferred-axis checks ${report.summary.retainedInferredAxisChecks}, redundancy ${report.summary.redundancyFlags}, unsafe ${report.summary.safetyFlags}.`,
);

function flag(code, paragraphIndex, paragraph) {
  return { code, paragraphIndex, paragraph };
}

function tokenJaccard(left, right) {
  const leftTokens = new Set(tokens(left));
  const rightTokens = new Set(tokens(right));
  const intersection = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function tokens(text) {
  return text
    .replace(/[“”"'.,!?·]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildMarkdown(result) {
  return `# v2.2 P1 문장 자동 사전검수

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 결과

- P1: ${result.summary.p1Entries}
- COMMON 비노출: ${result.summary.commonEntriesExcludedFromPersonalizedReview}
- 개인화 후보: ${result.summary.personalizedEntries}
- claim 묶음: ${result.summary.claimPackets}
- 자동 flag 있음: ${result.summary.personalizedEntriesWithFlags}
- 자동 flag 없음: ${result.summary.personalizedEntriesWithoutFlags}
- 추론 축 독립 확인: ${result.summary.retainedInferredAxisChecks}
- 중복 가능 문단: ${result.summary.redundancyFlags}
- 번역체: ${result.summary.translationToneFlags}
- 회피성 문구: ${result.summary.vagueHedgeFlags}
- 위험·낙인: ${result.summary.safetyFlags}

자동 검사는 승인 도구가 아니다. 추론 축과 중복 flag를 우선 판독하되,
flag가 없는 문장도 같은 claim의 전체 축 서명과 함께 읽는다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
