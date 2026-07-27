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
const requestedAxisVersion =
  process.argv
    .find((argument) => argument.startsWith("--axis-version="))
    ?.split("=")[1] ?? "v2";
const versionConfig = {
  v2: {
    label: "v2",
    suffix: "V2",
    report: "10_LINEAGE_MERGE_SEMANTIC_AUDIT_V2.md",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    report: "31_LINEAGE_MERGE_SEMANTIC_AUDIT_V2_1.md",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    report: "52_LINEAGE_MERGE_SEMANTIC_AUDIT_V2_2.md",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    report: "95_LINEAGE_MERGE_SEMANTIC_AUDIT_V2_3.md",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const artifactSuffix = versionConfig.suffix;
const outputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_LINEAGE_MERGE_SEMANTIC_AUDIT_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  versionConfig.report,
);
const checkOnly = process.argv.includes("--check");
const queue = readJson(
  `TRAIT_MAP_CANONICAL_DRAFTING_QUEUE_${artifactSuffix}.json`,
);

const groups = queue.slots.flatMap((slot) => {
  const signaturesBySourceSet = new Map();
  for (const candidate of slot.canonicalCandidates) {
    const sourceSetKey = sourceSetKeyFor(candidate);
    const signatures = signaturesBySourceSet.get(sourceSetKey) ?? [];
    signatures.push(candidate.axisSignature);
    signaturesBySourceSet.set(sourceSetKey, signatures);
  }

  return slot.canonicalCandidates
    .filter((candidate) => candidate.status === "lineage_merge_required")
    .map((candidate) =>
      buildMergeGroup(slot, candidate, signaturesBySourceSet),
    );
});

const classificationCounts = countBy(groups, "classification");
const priorityCounts = countBy(groups, "priority");
const audit = {
  contractVersion: `nuang-trait-map-lineage-merge-semantic-audit.${versionConfig.label}`,
  auditId: `TRAIT-MAP-LINEAGE-MERGE-SEMANTIC-AUDIT.${versionConfig.artifactVersion}`,
  sourceQueueId: queue.queueId,
  status: "SEMANTIC_REWRITE_QUEUE_CLASSIFIED_EXPERT_REVIEW_REQUIRED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    mergeGroups: groups.length,
    sourceAssertionsCompared: groups.reduce(
      (total, group) => total + group.sourceCandidates.length,
      0,
    ),
    classifications: classificationCounts,
    priorities: priorityCounts,
    reusedSourceSetGroups: groups.filter(
      (group) => group.siblingSignaturesUsingSameSourceSet.length > 0,
    ).length,
    exactTextDuplicates: groups.filter(
      (group) => group.textSignals.normalizedExactMatch,
    ).length,
    automaticallyCustomerApproved: 0,
    expertReviewRequired: groups.length,
  },
  classificationRules: [
    {
      id: "DIRECTIONAL_MEANING_REWRITE_REQUIRED",
      meaning:
        "같은 두 원문이 둘 이상의 축 서명에 함께 연결돼 있어 단순 병합하면 축 방향 차이가 사라진다. 각 서명의 관찰 초점을 명시해 별도 문장으로 다시 써야 한다.",
    },
    {
      id: "INFORMATION_PRESERVING_SYNTHESIS_REQUIRED",
      meaning:
        "같은 축 서명에 서로 다른 정보가 들어 있는 두 계보가 모였다. 어느 한 문장을 버리지 말고 공통점과 고유 의미를 확인해 하나의 문장으로 합쳐야 한다.",
    },
    {
      id: "NEAR_PARAPHRASE_EXPERT_CONFIRMATION",
      meaning:
        "표현이 상당히 비슷하지만 같은 의미인지 자동으로 확정하지 않는다. 전문가가 고유 의미가 없는지 확인한 뒤 더 분명한 한 문장만 남긴다.",
    },
    {
      id: "TEXTUAL_DUPLICATE_MERGE_CANDIDATE",
      meaning:
        "정규화한 문장이 같다. 그래도 원문 계보와 근거가 동일한 의미를 가리키는지 확인하기 전에는 고객 문장으로 승인하지 않는다.",
    },
  ],
  reviewProtocol: [
    "두 원문이 관찰하는 행동·주의·생각·말하기의 의미 단위를 각각 표시한다.",
    "공통 의미, 첫 원문만 가진 의미, 둘째 원문만 가진 의미를 분리한다.",
    "같은 원문 집합을 쓰는 형제 축 서명이 있으면 서로 다른 축 방향이 문장에 실제로 드러나는지 확인한다.",
    "위험 영역 문구는 능력·진단·도덕성·관계 결과를 단정하지 않는지 별도 검토한다.",
    "합성 문장은 쉬운 한국어 한 가지 관찰 주장만 담고, 근거·계보·비공개 범위를 유지한다.",
    "7개 전문 검토가 모두 끝나기 전에는 customer_approved로 바꾸지 않는다.",
  ],
  groups,
};

const output = await prettier.format(JSON.stringify(audit), {
  parser: "json",
});
const report = await prettier.format(buildMarkdownReport(audit), {
  parser: "markdown",
});

if (checkOnly) {
  const stale =
    !fs.existsSync(outputPath) ||
    !fs.existsSync(reportPath) ||
    fs.readFileSync(outputPath, "utf8") !== output ||
    fs.readFileSync(reportPath, "utf8") !== report;
  if (stale) {
    console.error(
      "Trait-map lineage merge semantic audit is stale. Run npm run research:trait-map:v2:lineage-merge-audit.",
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, report);
}

console.log(
  `Lineage merge semantic audit: ${groups.length} groups, ${classificationCounts.DIRECTIONAL_MEANING_REWRITE_REQUIRED ?? 0} directional rewrites, ${classificationCounts.INFORMATION_PRESERVING_SYNTHESIS_REQUIRED ?? 0} information-preserving syntheses, ${classificationCounts.NEAR_PARAPHRASE_EXPERT_CONFIRMATION ?? 0} near-paraphrase reviews, 0 customer-approved.`,
);

function buildMergeGroup(slot, candidate, signaturesBySourceSet) {
  const [left, right] = candidate.sourceCandidates;
  const leftTokens = meaningfulTokens(left.assertion);
  const rightTokens = meaningfulTokens(right.assertion);
  const sharedTokens = intersection(leftTokens, rightTokens);
  const leftOnlyTokens = difference(leftTokens, rightTokens);
  const rightOnlyTokens = difference(rightTokens, leftTokens);
  const tokenJaccard = jaccard(leftTokens, rightTokens);
  const characterBigramDice = diceCoefficient(
    characterBigrams(normalizeCompact(left.assertion)),
    characterBigrams(normalizeCompact(right.assertion)),
  );
  const normalizedExactMatch =
    normalizeCompact(left.assertion) === normalizeCompact(right.assertion);
  const siblingSignaturesUsingSameSourceSet = (
    signaturesBySourceSet.get(sourceSetKeyFor(candidate)) ?? []
  ).filter((signature) => signature !== candidate.axisSignature);
  const classification = classifyGroup({
    normalizedExactMatch,
    tokenJaccard,
    characterBigramDice,
    leftOnlyTokens,
    rightOnlyTokens,
    siblingSignaturesUsingSameSourceSet,
  });
  const priority = classifyPriority({
    classification,
    riskDomains: slot.riskDomains,
    tokenJaccard,
  });

  return {
    reviewId: `LMR-${slot.claimKey
      .replace(/^\.scenario\./, "SCN-")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toUpperCase()}-${candidate.axisSignature
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .toUpperCase()}`,
    claimKey: slot.claimKey,
    scenarioRef: slot.scenarioRef,
    context: slot.context,
    claimKind: slot.claimKind,
    privacyScope: slot.privacyScope,
    riskDomains: slot.riskDomains,
    semanticAxes: slot.semanticAxes,
    axisSignature: candidate.axisSignature,
    canonicalVariantId: candidate.canonicalVariantId,
    selectedVariantId: candidate.selectedVariantId,
    classification,
    priority,
    siblingSignaturesUsingSameSourceSet,
    textSignals: {
      normalizedExactMatch,
      tokenJaccard: round(tokenJaccard),
      characterBigramDice: round(characterBigramDice),
      sharedTokens,
      leftOnlyTokens,
      rightOnlyTokens,
    },
    sourceCandidates: candidate.sourceCandidates.map((source) => ({
      variantId: source.variantId,
      assertion: source.assertion,
      matchingCodes: source.matchingCodes,
      signatureCoverage: source.signatureCoverage,
      sourcePurity: source.sourcePurity,
      evidenceFindingRefs: source.evidenceFindingRefs,
      independentSourceRefs: source.independentSourceRefs,
    })),
    requiredReview: {
      commonMeaning: null,
      leftUniqueMeaning: null,
      rightUniqueMeaning: null,
      axisDirectionalDifference: null,
      canonicalDraft: null,
      evidenceBoundaryDecision: null,
      plainKoreanReview: null,
      contradictionReview: null,
    },
    reviewState: "expert_semantic_review_required",
    publicationState: "research_only",
  };
}

function classifyGroup({
  normalizedExactMatch,
  tokenJaccard,
  characterBigramDice,
  leftOnlyTokens,
  rightOnlyTokens,
  siblingSignaturesUsingSameSourceSet,
}) {
  if (normalizedExactMatch) return "TEXTUAL_DUPLICATE_MERGE_CANDIDATE";
  if (siblingSignaturesUsingSameSourceSet.length > 0) {
    return "DIRECTIONAL_MEANING_REWRITE_REQUIRED";
  }
  if (
    tokenJaccard >= 0.4 &&
    characterBigramDice >= 0.5 &&
    leftOnlyTokens.length <= 5 &&
    rightOnlyTokens.length <= 5
  ) {
    return "NEAR_PARAPHRASE_EXPERT_CONFIRMATION";
  }
  return "INFORMATION_PRESERVING_SYNTHESIS_REQUIRED";
}

function classifyPriority({ classification, riskDomains, tokenJaccard }) {
  const highRisk = riskDomains.length > 0;
  if (classification === "DIRECTIONAL_MEANING_REWRITE_REQUIRED" && highRisk) {
    return "P0";
  }
  if (highRisk || tokenJaccard < 0.08) return "P1";
  return "P2";
}

function meaningfulTokens(value) {
  const stopTokens = new Set([
    "경향이",
    "있다",
    "편이다",
    "쉽다",
    "있어요",
    "합니다",
    "한다",
    "자연스럽다",
    "잘",
    "수",
    "때",
    "뒤",
    "먼저",
    "바로",
    "다시",
    "대한",
    "통해",
  ]);
  return [
    ...new Set(
      value
        .normalize("NFKC")
        .replace(/[“”"'‘’.,?!:;()[\]{}·]/g, " ")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !stopTokens.has(token)),
    ),
  ].sort((left, right) => left.localeCompare(right, "ko"));
}

function normalizeCompact(value) {
  return value
    .normalize("NFKC")
    .replace(/[“”"'‘’.,?!:;()[\]{}·\s]/g, "")
    .replace(/(경향이있다|편이다|자연스럽다|쉽다)$/g, "");
}

function characterBigrams(value) {
  const result = [];
  for (let index = 0; index < value.length - 1; index += 1) {
    result.push(value.slice(index, index + 2));
  }
  return result;
}

function sourceSetKeyFor(candidate) {
  return candidate.sourceCandidates
    .map((source) => source.variantId)
    .sort((left, right) => left.localeCompare(right, "en"))
    .join("|");
}

function intersection(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value));
}

function difference(left, right) {
  const rightSet = new Set(right);
  return left.filter((value) => !rightSet.has(value));
}

function jaccard(left, right) {
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 1;
  return intersection(left, right).length / union.size;
}

function diceCoefficient(left, right) {
  if (left.length === 0 && right.length === 0) return 1;
  const rightCounts = new Map();
  for (const value of right) {
    rightCounts.set(value, (rightCounts.get(value) ?? 0) + 1);
  }
  let matches = 0;
  for (const value of left) {
    const count = rightCounts.get(value) ?? 0;
    if (count === 0) continue;
    matches += 1;
    rightCounts.set(value, count - 1);
  }
  return (2 * matches) / (left.length + right.length);
}

function countBy(items, key) {
  return Object.fromEntries(
    [...new Set(items.map((item) => item[key]))]
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((value) => [
        value,
        items.filter((item) => item[key] === value).length,
      ]),
  );
}

function round(value) {
  return Number(value.toFixed(4));
}

function buildMarkdownReport(result) {
  const classificationRows = Object.entries(result.summary.classifications)
    .map(([classification, count]) => `| ${classification} | ${count} |`)
    .join("\n");
  const priorityRows = Object.entries(result.summary.priorities)
    .map(([priority, count]) => `| ${priority} | ${count} |`)
    .join("\n");
  return `# ${result.summary.mergeGroups}개 계보 병합 의미 감사 ${versionConfig.label}

- 상태: \`${result.status}\`
- 고객 승인: 0개

## 결론

같은 축 서명에 두 원문이 모인 ${result.summary.mergeGroups}개 조합을 모두
비교했다. 자동으로 한 문장을 버리거나 고객 문장으로 승인하지 않았다.
각 조합에는 공통 의미·양쪽 고유 의미·형제 축 서명 중복·위험 영역을
검토할 수 있는 연구 패킷을 만들었다.

## 분류

| 분류 | 개수 |
| --- | ---: |
${classificationRows}

같은 원문 집합을 다른 축 서명에서도 함께 쓰는 조합은
${result.summary.reusedSourceSetGroups}개다. 이 항목은 단순히 두 문장을
이어 붙이면 축 방향이 흐려지므로 방향별 관찰 초점을 다시 써야 한다.

## 우선순위

| 우선순위 | 개수 |
| --- | ---: |
${priorityRows}

- P0: 위험 영역이면서 축 방향 재작성이 필요한 항목
- P1: 위험 영역이거나 두 원문의 의미 차이가 큰 항목
- P2: 나머지 정보 보존 합성·유사 표현 확인 항목

## 자동화가 하지 않은 일

- 단어가 비슷하다는 이유로 두 문장을 같은 의미라고 확정하지 않았다.
- 한 원문을 임의로 삭제하지 않았다.
- 합성 문장을 고객에게 공개 가능한 상태로 바꾸지 않았다.
- 성향 코드만으로 진단·능력·도덕성·관계 결과를 단정하지 않았다.

## 다음 단계

1. P0부터 공통 의미와 양쪽 고유 의미를 사람이 판독한다.
2. 형제 축 서명은 서로 다른 관찰 초점이 드러나는 짝 문장으로 작성한다.
3. 각 문장을 쉬운 한국어·근거 경계·모순·축 구분 기준으로 검수한다.
4. 80개 한 글자 이웃 검사를 다시 통과한 문장만 표준 원장에 연결한다.
`;
}

function readJson(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
