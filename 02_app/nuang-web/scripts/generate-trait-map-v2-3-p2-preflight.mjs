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
  "TRAIT_MAP_P2_AUTOMATED_PREFLIGHT_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "110_P2_AUTOMATED_PREFLIGHT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  generatedDirectory,
  "TRAIT_MAP_INDEPENDENT_REVIEW_QUEUE_V2_3.json",
);
const axisCues = {
  SE: {
    E: ["함께", "대화", "주고받", "사람들과", "이야기하며"],
    I: ["혼자", "일대일", "생각을 정리", "잠시 쉬", "조용"],
  },
  OE: {
    R: ["확인", "실제", "구체", "경험", "조건", "사실"],
    N: ["가능성", "새로운", "연결", "여러", "앞으로", "아이디어"],
  },
  RO: {
    G: ["원인", "해결", "문제", "바꿀", "다음 행동", "대응"],
    A: ["마음", "감정", "관계", "필요", "서운", "영향"],
  },
  SM: {
    K: ["정한", "계획", "순서", "완료", "약속", "기준", "이어"],
    M: ["상황에 맞", "조정", "바꾸", "현재", "에너지", "반응"],
  },
  ER: {
    C: ["차분", "천천히", "시간이 지나", "감정이 커지기 전"],
    Q: ["빠르게", "바로 걱정", "불안", "긴장", "감정이 올라"],
  },
};
const unsafePattern =
  /무조건|절대로|틀림없이|사이코패스|소시오패스|정신질환|성격장애|지능이 낮|도덕성이 낮|나쁜 사람|관계가 실패|헤어지게|성공이 보장/;
const vaguePattern =
  /알 수 없|단정할 수 없|그럴 수도 있고|이럴 수도 있고|사람마다 다르|경우에 따라 다르기만/;
const translationPattern =
  /에 기반하여|에 기초하여|의 맥락에서|을 통해 나타나|관찰되어질|되어지는/;
const p2Entries = queue.entries.filter(
  (entry) => entry.priority === "P2",
);
const entries = p2Entries.map((entry) => {
  const text = entry.content.detailParagraphs.join(" ");
  const flags = [];
  if (unsafePattern.test(text)) flags.push("SAFETY_UNSAFE_OR_STIGMATIZING");
  if (vaguePattern.test(text)) flags.push("COPY_VAGUE_NON_EXPLANATORY_HEDGE");
  if (translationPattern.test(text)) flags.push("COPY_TRANSLATION_TONE");
  if (entry.content.detailParagraphs.some((paragraph) => paragraph.length > 150)) {
    flags.push("COPY_PARAGRAPH_OVER_150_CHARS");
  }
  if (new Set(entry.content.detailParagraphs).size !== entry.content.detailParagraphs.length) {
    flags.push("COPY_DUPLICATE_DETAIL_PARAGRAPH");
  }
  const axisCueChecks = Object.entries(
    parseAxisSignature(entry.axisSignature),
  ).map(([axisRef, symbol]) => {
    const cues = axisCues[axisRef]?.[symbol] ?? [];
    const matchedCues = cues.filter((cue) => text.includes(cue));
    if (matchedCues.length === 0) {
      flags.push(`AXIS_${axisRef}_${symbol}_LEXICAL_CUE_NOT_FOUND_MANUAL_REVIEW`);
    }
    return {
      axisRef,
      symbol,
      matchedCues,
      automatedLexicalCueFound: matchedCues.length > 0,
      note:
        "어휘 단서 검사는 구성개념 판정을 대신하지 않으며 누락 시 수동 판독으로 보낸다.",
    };
  });
  return {
    canonicalVariantId: entry.canonicalVariantId,
    claimKey: entry.claimKey,
    axisSignature: entry.axisSignature,
    content: entry.content,
    flags: [...new Set(flags)],
    axisCueChecks,
    automatedState:
      flags.length === 0
        ? "passed_automated_preflight_manual_sample_review_required"
        : "manual_review_required",
    independentRoleReviewState: "pending",
    publicationState: "research_only",
  };
});
const report = {
  contractVersion:
    "nuang-trait-map-p2-automated-preflight.v2.3",
  reportId: "TRAIT-MAP-P2-AUTOMATED-PREFLIGHT.2.3",
  status: "P2_AUTOMATED_PREFLIGHT_COMPLETE_MANUAL_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceQueueReportId: queue.reportId,
  summary: {
    p2Entries: entries.length,
    passedWithoutFlags: entries.filter(
      (entry) => entry.flags.length === 0,
    ).length,
    flaggedEntries: entries.filter((entry) => entry.flags.length > 0)
      .length,
    unsafeFlags: entries.reduce(
      (total, entry) =>
        total +
        entry.flags.filter((flag) => flag.startsWith("SAFETY_")).length,
      0,
    ),
    vagueFlags: entries.reduce(
      (total, entry) =>
        total +
        entry.flags.filter((flag) => flag.startsWith("COPY_VAGUE")).length,
      0,
    ),
    translationToneFlags: entries.reduce(
      (total, entry) =>
        total +
        entry.flags.filter((flag) => flag === "COPY_TRANSLATION_TONE").length,
      0,
    ),
    manualAxisCueChecks: entries.reduce(
      (total, entry) =>
        total +
        entry.flags.filter((flag) => flag.startsWith("AXIS_")).length,
      0,
    ),
    independentRoleApprovedEntries: 0,
    customerApprovedEntries: 0,
  },
  limitations: [
    "어휘 단서 일치는 축 타당성의 증거가 아니다.",
    "자동 검사는 문장의 의미·근거 적합성·사용자 이해도를 승인하지 않는다.",
    "무표시 통과 항목도 독립 표본 검토와 인지 면담 전에는 발행하지 않는다.",
  ],
  entries,
  nextGate: {
    name: "P2_FLAGGED_MANUAL_SCREEN_AND_SAMPLE_REVIEW",
    actions: [
      "표시된 항목을 양방향 문장과 함께 수동 판독한다.",
      "무표시 항목은 축·맥락별 층화 표본으로 독립 검토한다.",
      "사용자 인지 면담에서 이해도와 단정성 오해를 확인한다.",
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
    console.error("v2.3 P2 preflight is stale.");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}
console.log(
  `P2 preflight v2.3: ${report.summary.p2Entries} entries, ${report.summary.passedWithoutFlags} passed, ${report.summary.flaggedEntries} flagged, unsafe ${report.summary.unsafeFlags}, vague ${report.summary.vagueFlags}, axis cue checks ${report.summary.manualAxisCueChecks}.`,
);

function parseAxisSignature(signature) {
  return Object.fromEntries(
    signature.split("|").map((part) => part.split("=")),
  );
}

function buildMarkdown(result) {
  return `# v2.3 P2 자동 사전검수

- P2: ${result.summary.p2Entries}
- 무표시 통과: ${result.summary.passedWithoutFlags}
- 수동 확인 필요: ${result.summary.flaggedEntries}
- 위험 표현: ${result.summary.unsafeFlags}
- 회피 표현: ${result.summary.vagueFlags}
- 번역투: ${result.summary.translationToneFlags}
- 축 어휘 수동 확인: ${result.summary.manualAxisCueChecks}
- 독립 승인: 0

어휘 단서 검사는 축 타당성의 증거가 아니며, 문장에 축 뜻이 전혀
드러나지 않을 가능성을 빠르게 찾는 보조 검사다. 무표시 통과 항목도
독립 표본 검토와 사용자 인지 면담 전에는 발행하지 않는다.
`;
}

function readJson(directory, fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(directory, fileName), "utf8"),
  );
}
