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
  "TRAIT_MAP_P0_SENTENCE_PREFLIGHT_V2_2.json",
);
const reportPath = path.join(
  docsDirectory,
  "64_P0_SENTENCE_PREFLIGHT_V2_2.md",
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  generatedDirectory,
  "TRAIT_MAP_SEVEN_ROLE_REVIEW_QUEUE_V2_2.json",
);
const p0Entries = queue.entries.filter(
  (entry) => entry.priority === "P0",
);
const axisLexicons = {
  SE: {
    left: {
      symbol: "E",
      terms: ["사람들과", "함께", "대화하며", "말로", "반응을 보며"],
    },
    right: {
      symbol: "I",
      terms: ["혼자", "기록하며", "혼자만의", "스스로 정리"],
    },
  },
  OE: {
    left: {
      symbol: "R",
      terms: ["확인된", "사실", "경험", "구체", "조건", "실제로"],
    },
    right: {
      symbol: "N",
      terms: ["가능성", "새로운", "연결", "다른 관점", "상상"],
    },
  },
  RO: {
    left: {
      symbol: "G",
      terms: ["원인", "해결", "고칠", "문제", "대응", "다음 행동"],
    },
    right: {
      symbol: "A",
      terms: ["마음", "감정", "관계", "서운", "필요", "영향"],
    },
  },
  SM: {
    left: {
      symbol: "K",
      terms: ["정한", "계획", "순서", "완료", "약속", "꾸준"],
    },
    right: {
      symbol: "M",
      terms: ["상황에 맞", "유연", "바꾸", "조정", "현재 조건"],
    },
  },
  ER: {
    left: {
      symbol: "C",
      terms: ["차분", "천천히", "나중에", "시간이 지나", "늦게"],
    },
    right: {
      symbol: "Q",
      terms: ["빠르게", "바로 걱정", "불안", "긴장", "감정이 올라"],
    },
  },
};
const unsafePattern =
  /무조건|절대로|틀림없이|사이코패스|소시오패스|정신질환|성격장애|지능이 낮|도덕성이 낮|나쁜 사람|관계가 실패|헤어지게|성공이 보장/;
const vaguePattern =
  /알 수 없|단정할 수 없|그럴 수도 있고|이럴 수도 있고|사람마다 다르|경우에 따라 다르기만/;
const translationTonePattern =
  /에 기반하여|에 기초하여|의 맥락에서|을 통해 나타나|관찰되어질|되어지는/;

const entries = p0Entries.map((entry) => {
  const paragraphs = entry.content.detailParagraphs;
  const flags = [];
  for (const [index, paragraph] of paragraphs.entries()) {
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
  if (paragraphs.length > 2) {
    flags.push({
      code: "PRODUCT_TOO_MANY_DETAIL_PARAGRAPHS",
      paragraphCount: paragraphs.length,
    });
  }
  for (let left = 0; left < paragraphs.length; left += 1) {
    for (let right = left + 1; right < paragraphs.length; right += 1) {
      const similarity = tokenJaccard(paragraphs[left], paragraphs[right]);
      if (similarity >= 0.58) {
        flags.push({
          code: "PRODUCT_POSSIBLE_REDUNDANT_PARAGRAPHS",
          leftParagraphIndex: left,
          rightParagraphIndex: right,
          tokenJaccard: similarity,
        });
      }
    }
  }
  for (const axisRef of [
    ...entry.axisDecisionContext.removedInferredAxes,
    ...entry.axisDecisionContext.heldInferredAxes,
  ]) {
    const residual = findBidirectionalResidual(paragraphs, axisRef);
    if (residual) {
      flags.push({
        code: "PSY_REMOVED_AXIS_BIDIRECTIONAL_RESIDUAL",
        axisRef,
        decision:
          entry.axisDecisionContext.heldInferredAxes.includes(axisRef)
            ? "held"
            : "removed",
        ...residual,
      });
    }
  }
  if (
    entry.priorityReasons.includes(
      "targeted_axis_differentiation",
    )
  ) {
    flags.push({
      code: "PSY_TARGETED_AXIS_PAIR_MANUAL_CONFIRMATION_REQUIRED",
      semanticAxes: entry.semanticAxes,
      axisSignature: entry.axisSignature,
    });
  }
  return {
    reviewEntryId: entry.reviewEntryId,
    canonicalVariantId: entry.canonicalVariantId,
    batchId: entry.batchId,
    claimKey: entry.claimKey,
    claimKind: entry.claimKind,
    semanticAxes: entry.semanticAxes,
    axisSignature: entry.axisSignature,
    priorityReasons: entry.priorityReasons,
    removedInferredAxes:
      entry.axisDecisionContext.removedInferredAxes,
    heldInferredAxes: entry.axisDecisionContext.heldInferredAxes,
    content: entry.content,
    automatedPreflight: {
      state:
        flags.length === 0
          ? "no_automated_flags_manual_readthrough_required"
          : "flagged_for_manual_semantic_readthrough",
      flags,
      safetyFlags: flags.filter((item) =>
        item.code.startsWith("SAFETY_"),
      ).length,
      copyFlags: flags.filter((item) =>
        item.code.startsWith("COPY_"),
      ).length,
      productFlags: flags.filter((item) =>
        item.code.startsWith("PRODUCT_"),
      ).length,
      constructFlags: flags.filter((item) =>
        item.code.startsWith("PSY_"),
      ).length,
    },
    internalSentenceDecision: "pending",
    independentReviewState: "pending",
    customerPublicationApproved: false,
    publicationState: "research_only",
  };
});
const claimPackets = [
  ...Map.groupBy(entries, (entry) => entry.claimKey).entries(),
]
  .map(([claimKey, claimEntries]) => ({
    claimKey,
    batchId: claimEntries[0].batchId,
    claimKind: claimEntries[0].claimKind,
    removedInferredAxes: [
      ...new Set(
        claimEntries.flatMap((entry) => entry.removedInferredAxes),
      ),
    ],
    heldInferredAxes: [
      ...new Set(
        claimEntries.flatMap((entry) => entry.heldInferredAxes),
      ),
    ],
    canonicalVariants: claimEntries.map((entry) => ({
      canonicalVariantId: entry.canonicalVariantId,
      semanticAxes: entry.semanticAxes,
      axisSignature: entry.axisSignature,
      summaryText: entry.content.summaryText,
      detailParagraphs: entry.content.detailParagraphs,
      automatedFlags: entry.automatedPreflight.flags,
    })),
    internalComparisonDecision: "pending",
  }))
  .sort(
    (left, right) =>
      left.batchId.localeCompare(right.batchId, "en") ||
      left.claimKey.localeCompare(right.claimKey, "en"),
  );
const allFlags = entries.flatMap(
  (entry) => entry.automatedPreflight.flags,
);
const report = {
  contractVersion:
    "nuang-trait-map-p0-sentence-preflight.v2.2",
  reportId: "TRAIT-MAP-P0-SENTENCE-PREFLIGHT.0.1",
  status: "P0_AUTOMATED_PREFLIGHT_COMPLETE_MANUAL_SEMANTIC_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceQueueId: queue.queueId,
  summary: {
    entries: entries.length,
    claimPackets: claimPackets.length,
    entriesWithoutAutomatedFlags: entries.filter(
      (entry) => entry.automatedPreflight.flags.length === 0,
    ).length,
    entriesWithAutomatedFlags: entries.filter(
      (entry) => entry.automatedPreflight.flags.length > 0,
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
    removedAxisResidualFlags: allFlags.filter(
      (item) =>
        item.code === "PSY_REMOVED_AXIS_BIDIRECTIONAL_RESIDUAL",
    ).length,
    targetedPairManualChecks: allFlags.filter(
      (item) =>
        item.code ===
        "PSY_TARGETED_AXIS_PAIR_MANUAL_CONFIRMATION_REQUIRED",
    ).length,
    independentlyApproved: 0,
    customerApproved: 0,
  },
  interpretation: [
    "자동 flag는 오류 확정이 아니라 사람이 우선 읽을 위치를 찾는 신호다.",
    "제거 축 양방향 단어가 함께 나타나도 상황의 공통 정보일 수 있으므로 문맥을 읽고 채택·수정한다.",
    "flag가 없어도 P0 문장은 같은 claim의 모든 축 서명과 나란히 읽어야 한다.",
    "내부 판독은 독립 7개 역할 검토나 고객 이해도 검증을 대신하지 않는다.",
  ],
  entries,
  claimPackets,
  nextGate: {
    name: "P0_CLAIM_BY_CLAIM_INTERNAL_READTHROUGH",
    actions: [
      "자동 flag가 있는 claim을 먼저 읽고 제거 축 의미가 실제 결론으로 남았는지 확인한다.",
      "같은 claim의 축 서명을 나란히 읽어 반대 방향 중복·누락·다른 축 오염을 확인한다.",
      "수정 문장은 기존 문장을 덮어쓰지 않고 version 2 후보와 수정 근거를 만든다.",
      "내부 통과와 수정 후보를 분리해 독립 7개 역할 검토 큐로 보낸다.",
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
    console.error("v2.2 P0 sentence preflight is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 sentence preflight v2.2: ${report.summary.entries} entries in ${report.summary.claimPackets} claims, ${report.summary.entriesWithAutomatedFlags} flagged, safety ${report.summary.safetyFlags}, vague ${report.summary.vagueHedgeFlags}, residual ${report.summary.removedAxisResidualFlags}.`,
);

function findBidirectionalResidual(paragraphs, axisRef) {
  const lexicon = axisLexicons[axisRef];
  const text = paragraphs.join("\n");
  const leftTerms = lexicon.left.terms.filter((term) =>
    text.includes(term),
  );
  const rightTerms = lexicon.right.terms.filter((term) =>
    text.includes(term),
  );
  return leftTerms.length > 0 && rightTerms.length > 0
    ? {
        leftSymbol: lexicon.left.symbol,
        leftTerms,
        rightSymbol: lexicon.right.symbol,
        rightTerms,
      }
    : null;
}

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
  return `# v2.2 P0 문장 자동 사전검수

- 상태: \`${result.status}\`
- 고객 발행: \`${result.publicationState}\`

## 결과

- P0 entry: ${result.summary.entries}
- claim 비교 묶음: ${result.summary.claimPackets}
- 자동 flag 있음: ${result.summary.entriesWithAutomatedFlags}
- 자동 flag 없음: ${result.summary.entriesWithoutAutomatedFlags}
- 안전·낙인 flag: ${result.summary.safetyFlags}
- 회피성 문구 flag: ${result.summary.vagueHedgeFlags}
- 번역체 flag: ${result.summary.translationToneFlags}
- 140자 초과: ${result.summary.longParagraphFlags}
- 중복 가능 문단: ${result.summary.redundancyFlags}
- 제거·보류 축 양방향 흔적: ${result.summary.removedAxisResidualFlags}
- 표적 축 수동 확인: ${result.summary.targetedPairManualChecks}

자동 검사는 승인 도구가 아니다. flag가 있는 문장은 우선순위가 높은 판독
대상이며, flag가 없는 문장도 같은 claim의 모든 축 서명과 함께 읽어야 한다.

## 다음 작업

${result.nextGate.actions.map((action, index) => `${index + 1}. ${action}`).join("\n")}
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
