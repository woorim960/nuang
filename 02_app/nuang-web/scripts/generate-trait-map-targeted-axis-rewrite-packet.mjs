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
const requestedAxisVersion =
  process.argv
    .find((argument) => argument.startsWith("--axis-version="))
    ?.split("=")[1] ?? "v2";
const versionConfig = {
  v2: {
    label: "v2",
    suffix: "V2",
    reportPrefix: "19",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    reportPrefix: "36",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    reportPrefix: "57",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    reportPrefix: "100",
    artifactVersion: "0.4",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
}[requestedAxisVersion];
if (!versionConfig) {
  throw new Error(`Unsupported axis version: ${requestedAxisVersion}`);
}
const artifactSuffix = versionConfig.suffix;
const requestedBatchId =
  process.argv
    .find((argument) => argument.startsWith("--batch="))
    ?.split("=")[1]
    ?.toUpperCase() ?? "CAB-01";
const safeBatchId = requestedBatchId.replace(/[^A-Z0-9-]/g, "");
const fileBatchId = safeBatchId.replaceAll("-", "_");
const draft = readGenerated(
  `TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_${fileBatchId}_${artifactSuffix}.json`,
);
const preflight = readGenerated(
  `TRAIT_MAP_CANONICAL_PREFLIGHT_${fileBatchId}_${artifactSuffix}.json`,
);
const outputPath = path.join(
  reviewDirectory,
  `TRAIT_MAP_TARGETED_AXIS_REWRITE_${fileBatchId}_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  `${versionConfig.reportPrefix}_TARGETED_AXIS_REWRITE_PACKET_${fileBatchId}_${artifactSuffix}.md`,
);
const checkOnly = process.argv.includes("--check");
const axisLenses = {
  SE: {
    left: "E 외향형",
    right: "I 내향형",
    distinction:
      "사람과 상호작용하며 생각·에너지를 움직이는 방향과, 혼자 정리하며 생각·에너지를 회복하는 방향을 구분한다.",
  },
  OE: {
    left: "R 현실형",
    right: "N 가능성형",
    distinction:
      "이미 확인한 사실·경험·조건을 보는 방향과, 아직 열려 있는 가능성·연결·새 관점을 보는 방향을 구분한다.",
  },
  RO: {
    left: "G 해결형",
    right: "A 마음형",
    distinction:
      "문제의 원인·해결·다음 행동을 먼저 살피는 방향과, 사람의 마음·관계 영향·필요를 먼저 살피는 방향을 구분한다.",
  },
  SM: {
    left: "K 꾸준형",
    right: "M 상황형",
    distinction:
      "정한 흐름·약속·완료 기준을 이어가는 방향과, 현재 조건·반응·에너지에 맞춰 흐름을 바꾸는 방향을 구분한다.",
  },
  ER: {
    left: "C 차분반응형",
    right: "Q 빠른반응형",
    distinction:
      "불편한 상황에서 걱정과 감정이 비교적 천천히 커지는 방향과, 걱정과 감정이 비교적 빠르게 커지는 방향을 구분한다. 말하기·행동 시작 속도로 대신 설명하지 않는다.",
  },
};
const variants = draft.scenarios.flatMap((scenario) =>
  scenario.claimSlots.flatMap((claim) => claim.variants),
);
const variantById = new Map(
  variants.map((variant) => [variant.canonicalVariantId, variant]),
);
const variantsByClaim = Map.groupBy(variants, (variant) => variant.claimKey);

const pairs = preflight.editorialQueues.semanticDifferentiation.map(
  (overlap, index) => {
    const left = variantById.get(overlap.leftCanonicalVariantId);
    const right = variantById.get(overlap.rightCanonicalVariantId);
    const shared = new Set(overlap.sharedOutput);
    const leftUnique = left.researchDraftBlocks.filter(
      (block) => !shared.has(block.text),
    );
    const rightUnique = right.researchDraftBlocks.filter(
      (block) => !shared.has(block.text),
    );
    const axisLens = axisLenses[overlap.changedAxis];
    return {
      reviewId: `TAR-${safeBatchId}-${String(index + 1).padStart(2, "0")}`,
      claimKey: overlap.claimKey,
      claimKind: left.claimKind,
      privacyScope: left.privacyScope,
      changedAxis: overlap.changedAxis,
      axisLens,
      sharedBlocks: overlap.sharedOutput,
      left: makeDirectionPacket(
        left,
        leftUnique,
        overlap.changedAxis,
        variantsByClaim.get(overlap.claimKey),
      ),
      right: makeDirectionPacket(
        right,
        rightUnique,
        overlap.changedAxis,
        variantsByClaim.get(overlap.claimKey),
      ),
      automatedDiagnosis: {
        leftHasUniqueDirectionBlock: leftUnique.length > 0,
        rightHasUniqueDirectionBlock: rightUnique.length > 0,
        missingDirection:
          leftUnique.length === 0
            ? readAxisDirection(left.axisSignature, overlap.changedAxis)
            : rightUnique.length === 0
              ? readAxisDirection(right.axisSignature, overlap.changedAxis)
              : null,
        oneSidedDifferentiation:
          (leftUnique.length === 0) !== (rightUnique.length === 0),
      },
      rewriteContract: {
        preserve:
          "공유 문장이 담은 다른 축과 상황 의미, 모든 원문·근거 계보",
        add:
          "현재 빠진 방향이 실제로 무엇을 먼저 살피고 생각하며 행동하는지 보여 주는 고유 문단",
        doNotAdd:
          "진단, 능력, 도덕성, 관계 성공·실패, 원문 근거를 넘어서는 인과 설명",
        plainLanguage:
          "한 문장에 핵심 행동 하나를 두고, 초등 고학년도 맥락을 다시 읽지 않고 이해할 수 있는 말 사용",
      },
      reviewQuestions: [
        `두 방향을 가린 채 읽어도 ${axisLens.left}과 ${axisLens.right} 중 어느 쪽인지 맞힐 수 있는가?`,
        "주의·처음 생각·실제 반응·말하기 중 현재 claimKind에 맞는 정보만 설명하는가?",
        "한 방향을 더 좋거나 성숙하거나 유능하게 묘사하지 않는가?",
        "다른 축의 의미를 현재 축 차이로 잘못 설명하지 않는가?",
        "새 문단의 모든 핵심 표현을 sourceCandidates의 근거 계보로 추적할 수 있는가?",
      ],
      proposedRewrite: {
        leftUniqueParagraph: null,
        rightUniqueParagraph: null,
        state: "pending_evidence_bounded_authoring",
      },
      reviewDecisions: {
        personalityPsychology: "pending",
        psychometrics: "pending",
        plainKorean: "pending",
        safetyPrivacy: "pending",
        dataQuality: "pending",
      },
      publicationState: "research_only",
    };
  },
);

const report = {
  contractVersion: `nuang-trait-map-targeted-axis-rewrite-packet.${versionConfig.label}`,
  reportId: `TRAIT-MAP-TARGETED-AXIS-REWRITE-${safeBatchId}.${versionConfig.artifactVersion}`,
  batchId: safeBatchId,
  status: "EVIDENCE_BOUNDED_TARGETED_REWRITE_PACKET_READY",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  officialSymbolLanguageContract:
    "src/features/nuang-code/candidate-profile-names.ts#candidateSymbolLanguageReleaseId",
  summary: {
    neighborPairs: pairs.length,
    affectedVariants: new Set(
      pairs.flatMap((pair) => [
        pair.left.canonicalVariantId,
        pair.right.canonicalVariantId,
      ]),
    ).size,
    oneSidedDifferentiationPairs: pairs.filter(
      (pair) => pair.automatedDiagnosis.oneSidedDifferentiation,
    ).length,
    pairsMissingBothDirections: pairs.filter(
      (pair) =>
        !pair.automatedDiagnosis.leftHasUniqueDirectionBlock &&
        !pair.automatedDiagnosis.rightHasUniqueDirectionBlock,
    ).length,
    pairsWithTraceableAlternativeCandidatesOnMissingSide: pairs.filter(
      (pair) => {
        const missing =
          pair.automatedDiagnosis.missingDirection ===
          pair.left.axisDirection
            ? pair.left
            : pair.right;
        return missing.sourceCandidates.length > 0;
      },
    ).length,
    completedRewrites: 0,
    customerApprovedPairs: 0,
  },
  rules: [
    "같은 claimKey 안에서 현재 축 방향이 같은 기존 문장만 보강 후보로 사용한다.",
    "다른 상황의 문장을 가져와 새 사실처럼 붙이지 않는다.",
    "현재 조합과 다른 축이 적게 다른 후보를 먼저 검토한다.",
    "보강 후보는 바로 복사하지 않고 현재 조합의 다른 축 의미와 충돌하지 않는지 확인한다.",
    "양쪽 방향에 고유 문단이 생기고 5개 검토가 끝나기 전에는 승인하지 않는다.",
  ],
  axisLenses,
  pairs,
  nextGate: {
    name: "EVIDENCE_BOUNDED_REWRITE_AUTHORING",
    completion:
      `${pairs.length}개 쌍의 양쪽 고유 문단을 작성하고 원문·근거 계보와 축 구분을 검수한다.`,
  },
};

const output = await prettier.format(JSON.stringify(report), {
  parser: "json",
});
const markdown = await prettier.format(buildMarkdownReport(report), {
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
      `Targeted axis rewrite packet ${safeBatchId} is stale. Run npm run research:trait-map:v2:targeted-axis-rewrite-batch1.`,
    );
    process.exit(1);
  }
} else {
  fs.mkdirSync(reviewDirectory, { recursive: true });
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `${safeBatchId} targeted axis rewrite packet: ${report.summary.neighborPairs} pairs, ${report.summary.affectedVariants} variants, ${report.summary.pairsWithTraceableAlternativeCandidatesOnMissingSide} pairs have traceable same-claim candidates.`,
);

function makeDirectionPacket(
  variant,
  uniqueBlocks,
  changedAxis,
  claimVariants,
) {
  const direction = readAxisDirection(variant.axisSignature, changedAxis);
  const currentSignature = parseAxisSignature(variant.axisSignature);
  const sourceCandidates = claimVariants
    .filter(
      (candidate) =>
        candidate.canonicalVariantId !== variant.canonicalVariantId &&
        readAxisDirection(candidate.axisSignature, changedAxis) === direction,
    )
    .flatMap((candidate) =>
      candidate.researchDraftBlocks.map((block) => ({
        canonicalVariantId: candidate.canonicalVariantId,
        axisSignature: candidate.axisSignature,
        sourceUnitId: block.sourceUnitId,
        text: block.text,
        otherAxisDistance: countOtherAxisDistance(
          currentSignature,
          parseAxisSignature(candidate.axisSignature),
          changedAxis,
        ),
        evidenceFindingRefs:
          candidate.sourceUnits.find(
            (unit) => unit.unitId === block.sourceUnitId,
          )?.evidenceFindingRefs ?? [],
        independentSourceRefs:
          candidate.sourceUnits.find(
            (unit) => unit.unitId === block.sourceUnitId,
          )?.independentSourceRefs ?? [],
      })),
    )
    .sort(
      (left, right) =>
        left.otherAxisDistance - right.otherAxisDistance ||
        left.canonicalVariantId.localeCompare(
          right.canonicalVariantId,
          "en",
        ),
    )
    .filter(
      (candidate, index, candidates) =>
        candidates.findIndex(
          (item) =>
            item.sourceUnitId === candidate.sourceUnitId &&
            item.text === candidate.text,
        ) === index,
    )
    .slice(0, 4);
  return {
    canonicalVariantId: variant.canonicalVariantId,
    axisSignature: variant.axisSignature,
    axisDirection: direction,
    currentBlocks: variant.researchDraftBlocks.map((block) => ({
      sourceUnitId: block.sourceUnitId,
      text: block.text,
    })),
    uniqueDirectionBlocks: uniqueBlocks.map((block) => ({
      sourceUnitId: block.sourceUnitId,
      text: block.text,
    })),
    sourceCandidates,
  };
}

function countOtherAxisDistance(left, right, changedAxis) {
  const axes = new Set([...left.keys(), ...right.keys()]);
  return [...axes].filter(
    (axis) => axis !== changedAxis && left.get(axis) !== right.get(axis),
  ).length;
}

function readAxisDirection(signature, axis) {
  return parseAxisSignature(signature).get(axis) ?? null;
}

function parseAxisSignature(signature) {
  if (signature === "COMMON") return new Map();
  return new Map(
    signature.split("|").map((part) => {
      const [axis, direction] = part.split("=");
      return [axis, direction];
    }),
  );
}

function buildMarkdownReport(result) {
  const rows = result.pairs
    .map(
      (pair) =>
        `| ${pair.reviewId} | ${pair.claimKey} | ${pair.changedAxis} | ${pair.automatedDiagnosis.missingDirection} | ${pair.left.sourceCandidates.length}/${pair.right.sourceCandidates.length} |`,
    )
    .join("\n");
  return `# ${result.batchId} 표적 축 교정 패킷 ${versionConfig.label}

- 상태: \`${result.status}\`
- 고객 승인: 0쌍

## 현재 진단

${result.summary.neighborPairs}개 이웃 쌍 모두 양쪽 출력 전체가 같은 것은 아니었다. 문제는 한 방향에는
축을 보여 주는 고유 문단이 있고 반대 방향에는 공유 문단만 남은 비대칭이다.
따라서 공유 문장을 삭제하지 않고, 빠진 방향의 고유 문단을 같은 claim과 같은
축 방향의 기존 근거 계보에서만 보강한다.

## 교정 대상

| 검토 ID | claim | 축 | 빠진 방향 | 왼쪽/오른쪽 보강 후보 |
| --- | --- | --- | --- | --- |
${rows}

## 완료 기준

1. E/I·R/N·G/A·K/M·C/Q 양쪽 모두 고유 문단을 가진다.
2. 가린 상태로 읽어도 어느 방향인지 구분할 수 있다.
3. 어느 한쪽도 더 좋은 성향처럼 쓰지 않는다.
4. 모든 핵심 표현은 현재 패킷의 sourceCandidates로 추적된다.
5. 검토가 끝난 뒤 CAB-01 전체 재조합 감사를 다시 실행한다.
`;
}

function readGenerated(fileName) {
  return JSON.parse(
    fs.readFileSync(path.join(generatedDirectory, fileName), "utf8"),
  );
}
