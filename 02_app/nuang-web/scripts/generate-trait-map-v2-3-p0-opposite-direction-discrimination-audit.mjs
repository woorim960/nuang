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
  "TRAIT_MAP_P0_OPPOSITE_DIRECTION_DISCRIMINATION_AUDIT_V2_3.json",
);
const proposalPath = path.join(
  reviewDirectory,
  "TRAIT_MAP_P0_OPPOSITE_DIRECTION_REWRITE_PROPOSALS_V2_3.json",
);
const reportPath = path.join(
  docsDirectory,
  "141_P0_OPPOSITE_DIRECTION_DISCRIMINATION_AUDIT_V2_3.md",
);
const checkOnly = process.argv.includes("--check");

const gapRegister = readReview(
  "TRAIT_MAP_P0_CONTEXT_EVIDENCE_GAP_REGISTER_V2_3.json",
);
const entries = gapRegister.entries;
const pairGroups = new Map();
for (const entry of entries) {
  const pairKey = `${entry.scenarioRef}|${entry.claimKind}`;
  const group = pairGroups.get(pairKey) ?? [];
  group.push(entry);
  pairGroups.set(pairKey, group);
}

const pairs = [...pairGroups.entries()]
  .map(([pairKey, group]) => {
    if (group.length !== 2) {
      throw new Error(
        `Expected two opposite entries for ${pairKey}; got ${group.length}.`,
      );
    }
    const [left, right] = group.sort((a, b) =>
      a.axisSignature.localeCompare(b.axisSignature, "en"),
    );
    const leftText = left.canonicalWording.summaryText;
    const rightText = right.canonicalWording.summaryText;
    const characterSimilarity = normalizedLevenshteinSimilarity(
      normalizeKoreanText(leftText),
      normalizeKoreanText(rightText),
    );
    const tokenJaccard = jaccardSimilarity(
      tokenize(leftText),
      tokenize(rightText),
    );
    const potentialNearDuplicate =
      characterSimilarity >= 0.75 || tokenJaccard >= 0.7;
    return {
      pairKey,
      scenarioRef: left.scenarioRef,
      claimKind: left.claimKind,
      semanticAxes: [
        ...new Set([...left.semanticAxes, ...right.semanticAxes]),
      ],
      variants: [
        {
          canonicalVariantId: left.canonicalVariantId,
          axisSignature: left.axisSignature,
          summaryText: leftText,
        },
        {
          canonicalVariantId: right.canonicalVariantId,
          axisSignature: right.axisSignature,
          summaryText: rightText,
        },
      ],
      metrics: {
        characterSimilarity: round(characterSimilarity),
        tokenJaccard: round(tokenJaccard),
      },
      screenState: potentialNearDuplicate
        ? "POTENTIAL_OPPOSITE_DIRECTION_NEAR_DUPLICATE"
        : "AUTOMATED_DIFFERENTIATION_SCREEN_PASSED",
      automatedScreenMayApproveSemantics: false,
      publicationState: "research_only",
    };
  })
  .sort((a, b) => a.pairKey.localeCompare(b.pairKey, "en"));

const flaggedPairs = pairs.filter(
  (pair) =>
    pair.screenState ===
    "POTENTIAL_OPPOSITE_DIRECTION_NEAR_DUPLICATE",
);
const flaggedPair = flaggedPairs[0];
if (
  flaggedPairs.length !== 1 ||
  flaggedPair.pairKey !==
    "SCN-PERSON-OF-INTEREST-7|communication"
) {
  throw new Error("Unexpected P0 opposite-direction similarity result.");
}

const proposals = {
  contractVersion:
    "nuang-trait-map-p0-opposite-direction-rewrite-proposals.v2.3",
  proposalSetId:
    "TRAIT-MAP-P0-OPPOSITE-DIRECTION-REWRITE-PROPOSALS.2.3",
  status: "INTERNAL_PROPOSAL_PENDING_INDEPENDENT_REVIEW",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceAuditReportId:
    "TRAIT-MAP-P0-OPPOSITE-DIRECTION-DISCRIMINATION-AUDIT.2.3",
  proposals: [
    {
      pairKey: flaggedPair.pairKey,
      issueCodes: [
        "OPPOSITE_DIRECTION_NEAR_DUPLICATE",
        "RO_DIRECTION_CUE_TOO_WEAK",
      ],
      rationale:
        "두 문장 모두 ‘들어줄까, 같이 방법을 찾아볼까’를 묻고 있어 G의 원인·해결 초점과 A의 마음·관계 초점이 거의 구분되지 않는다.",
      variantProposals: [
        {
          canonicalVariantId:
            "CAN-SCN-PERSON-OF-INTEREST-SUPPORT-REQUESTED-COMMUNICATION-RO-G",
          axisSignature: "RO=G",
          currentText:
            "“지금 내가 들어주면 좋을까, 같이 방법을 찾아볼까?”처럼 상대가 원하는 도움을 고를 수 있게 묻는 방식이 잘 맞는다.",
          proposedText:
            "“무슨 일이 있었는지부터 알려줘. 내가 바로 도울 수 있는 일을 같이 정해보자”처럼 원인과 실행 방법을 분명히 묻는 방식이 잘 맞는다.",
          intendedDirectionCue:
            "원인 확인과 실제 해결 방법을 앞세운다.",
        },
        {
          canonicalVariantId:
            "CAN-SCN-PERSON-OF-INTEREST-SUPPORT-REQUESTED-COMMUNICATION-RO-A",
          axisSignature: "RO=A",
          currentText:
            "“지금은 그냥 들어주는 게 좋을까, 같이 방법을 찾아볼까?”처럼 상대가 원하는 도움의 종류를 고를 수 있게 묻는 방식이 잘 맞는다.",
          proposedText:
            "“지금 어떤 도움이 가장 편할지 말해줘. 네가 원하는 방식에 맞출게”처럼 상대의 마음과 원하는 지원 방식을 먼저 묻는 표현이 자연스럽다.",
          intendedDirectionCue:
            "상대의 마음과 관계에서 편안한 지원 방식을 앞세운다.",
        },
      ],
      directEvidenceState: "pending_empirical_validation",
      independentRoleReviewState: "not_started",
      cognitiveInterviewState: "not_started",
      approvedForCanonicalLedger: false,
      approvedForPublication: false,
    },
  ],
};

const report = {
  contractVersion:
    "nuang-trait-map-p0-opposite-direction-discrimination-audit.v2.3",
  reportId:
    "TRAIT-MAP-P0-OPPOSITE-DIRECTION-DISCRIMINATION-AUDIT.2.3",
  status: "ONE_NEAR_DUPLICATE_PAIR_FLAGGED_REWRITE_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: "2026-07-24T00:00:00.000Z",
  sourceGapRegisterId: gapRegister.registerId,
  reviewerIdentity: {
    type: "internal_automated_similarity_screen",
    isIndependentExternalReviewer: false,
    mayApprovePublication: false,
  },
  thresholds: {
    characterSimilarityFlagAtOrAbove: 0.75,
    tokenJaccardFlagAtOrAbove: 0.7,
    interpretation:
      "수치가 높으면 반대 방향 문장이 거의 같은 표현일 가능성을 표시할 뿐 의미 타당성을 판정하지 않는다.",
  },
  summary: {
    p0CanonicalEntries: entries.length,
    oppositeDirectionPairs: pairs.length,
    automatedDifferentiationScreenPassedPairs: pairs.filter(
      (pair) =>
        pair.screenState ===
        "AUTOMATED_DIFFERENTIATION_SCREEN_PASSED",
    ).length,
    potentialNearDuplicatePairs: flaggedPairs.length,
    internalRewriteProposals: proposals.proposals.length,
    canonicalRevisionsApplied: 0,
    publicationApprovalsGranted: 0,
  },
  pairs,
  nextGate: {
    name: "INDEPENDENT_SEMANTIC_AND_COGNITIVE_REVIEW_OF_FLAGGED_PAIR",
    action:
      "제안된 G/A 문구가 실제로 서로 다른 방향을 이해시키는지 독립 역할 검토와 인지 면담으로 확인한 뒤에만 canonical 원장 반영을 결정한다.",
  },
};

if (
  report.summary.p0CanonicalEntries !== 24 ||
  report.summary.oppositeDirectionPairs !== 12 ||
  report.summary.automatedDifferentiationScreenPassedPairs !== 11 ||
  report.summary.potentialNearDuplicatePairs !== 1 ||
  report.summary.internalRewriteProposals !== 1 ||
  report.summary.canonicalRevisionsApplied !== 0 ||
  report.summary.publicationApprovalsGranted !== 0
) {
  throw new Error(
    "P0 opposite-direction discrimination audit invariants failed.",
  );
}

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const proposalOutput = await prettier.format(JSON.stringify(proposals), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdown(report), {
  parser: "markdown",
});

if (checkOnly) {
  const expected = [
    [outputPath, output],
    [proposalPath, proposalOutput],
    [reportPath, markdown],
  ];
  if (
    expected.some(
      ([filePath, content]) =>
        !fs.existsSync(filePath) ||
        fs.readFileSync(filePath, "utf8") !== content,
    )
  ) {
    console.error(
      "v2.3 P0 opposite-direction discrimination audit is stale.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(proposalPath, proposalOutput);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `P0 opposite-direction audit v2.3: ${pairs.length} pairs, ${flaggedPairs.length} near-duplicate, ${proposals.proposals.length} rewrite proposal, 0 canonical revisions.`,
);

function normalizeKoreanText(value) {
  return value
    .normalize("NFC")
    .replace(/[\s“”"'‘’,.?!·:;()[\]{}]/g, "")
    .toLowerCase();
}

function tokenize(value) {
  return new Set(
    value
      .normalize("NFC")
      .replace(/[“”"'‘’,.?!·:;()[\]{}]/g, " ")
      .split(/\s+/)
      .filter(Boolean),
  );
}

function normalizedLevenshteinSimilarity(left, right) {
  if (left === right) return 1;
  if (left.length === 0 || right.length === 0) return 0;
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0];
    previous[0] = leftIndex;
    for (
      let rightIndex = 1;
      rightIndex <= right.length;
      rightIndex += 1
    ) {
      const old = previous[rightIndex];
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal +
          (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
      diagonal = old;
    }
  }
  return (
    1 -
    previous[right.length] / Math.max(left.length, right.length)
  );
}

function jaccardSimilarity(left, right) {
  const intersection = [...left].filter((token) => right.has(token));
  const union = new Set([...left, ...right]);
  return union.size === 0 ? 0 : intersection.length / union.size;
}

function round(value) {
  return Number(value.toFixed(3));
}

function readReview(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(reviewDirectory, fileName), "utf8"),
  );
}

function buildMarkdown(result) {
  const flagged = result.pairs.find(
    (pair) =>
      pair.screenState ===
      "POTENTIAL_OPPOSITE_DIRECTION_NEAR_DUPLICATE",
  );
  return `# v2.3 P0 반대 방향 구분 감사

## 결과

- P0 문장: **${result.summary.p0CanonicalEntries}개**
- 반대 방향 쌍: **${result.summary.oppositeDirectionPairs}쌍**
- 자동 구분 화면 통과: **${result.summary.automatedDifferentiationScreenPassedPairs}쌍**
- 거의 같은 문장 후보: **${result.summary.potentialNearDuplicatePairs}쌍**
- canonical에 실제 반영한 교정: **${result.summary.canonicalRevisionsApplied}개**

## 발견

**${flagged.pairKey}**의 G/A 말하기 문장은 문자 유사도 **${flagged.metrics.characterSimilarity}**로 나타났다. 두 문장 모두 상대에게 ‘들어줄지, 방법을 찾을지’를 묻고 있어 G의 원인·해결 초점과 A의 마음·관계 초점이 약하다.

내부 대안은 G가 원인과 실행 방법을, A가 상대의 마음과 편안한 지원 방식을 앞세우도록 분리했다. 다만 자동 유사도와 내부 문안만으로 의미 타당성을 승인하지 않으며 원장에는 아직 반영하지 않았다.

## 다음 게이트

**${result.nextGate.name}** — ${result.nextGate.action}
`;
}
