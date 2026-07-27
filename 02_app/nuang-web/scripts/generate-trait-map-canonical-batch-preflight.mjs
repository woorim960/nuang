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
    reportPrefix: "17",
    artifactVersion: "0.1",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-1": {
    label: "v2.1",
    suffix: "V2_1",
    reportPrefix: "34",
    artifactVersion: "0.2",
    generatedAt: "2026-07-23T00:00:00.000Z",
  },
  "v2-2": {
    label: "v2.2",
    suffix: "V2_2",
    reportPrefix: "55",
    artifactVersion: "0.3",
    generatedAt: "2026-07-24T00:00:00.000Z",
  },
  "v2-3": {
    label: "v2.3",
    suffix: "V2_3",
    reportPrefix: "98",
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
const sourcePath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_RESEARCH_DRAFT_${fileBatchId}_${artifactSuffix}.json`,
);
const outputPath = path.join(
  generatedDirectory,
  `TRAIT_MAP_CANONICAL_PREFLIGHT_${fileBatchId}_${artifactSuffix}.json`,
);
const reportPath = path.join(
  docsDirectory,
  `${versionConfig.reportPrefix}_CANONICAL_PREFLIGHT_${fileBatchId}_${artifactSuffix}.md`,
);
const checkOnly = process.argv.includes("--check");

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Missing canonical research draft: ${sourcePath}`);
}

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const variants = source.scenarios.flatMap((scenario) =>
  scenario.claimSlots.flatMap((claim) => claim.variants),
);
const duplicateNeighborOutputs = findDuplicateNeighborOutputs(variants);
const duplicateNeighborIds = new Set(
  duplicateNeighborOutputs.flatMap((item) => [
    item.leftCanonicalVariantId,
    item.rightCanonicalVariantId,
  ]),
);

const variantAudits = variants.map((variant) => auditVariant(variant));
const hardFailures = variantAudits.flatMap((audit) =>
  audit.hardFailures.map((failure) => ({
    canonicalVariantId: audit.canonicalVariantId,
    failure,
  })),
);
const lengthFlags = variantAudits.flatMap((audit) =>
  audit.languageFlags
    .filter((flag) => flag.code === "BLOCK_OVER_RECOMMENDED_LENGTH")
    .map((flag) => ({
      canonicalVariantId: audit.canonicalVariantId,
      ...flag,
    })),
);
const overclaimFlags = variantAudits.flatMap((audit) =>
  audit.languageFlags
    .filter((flag) => flag.code === "FORBIDDEN_OVERCLAIM_LANGUAGE")
    .map((flag) => ({
      canonicalVariantId: audit.canonicalVariantId,
      ...flag,
    })),
);
const vagueHedgeFlags = variantAudits.flatMap((audit) =>
  audit.languageFlags
    .filter((flag) => flag.code === "VAGUE_NON_EXPLANATORY_HEDGE")
    .map((flag) => ({
      canonicalVariantId: audit.canonicalVariantId,
      ...flag,
    })),
);
const diagnosticFlags = variantAudits.flatMap((audit) =>
  audit.languageFlags
    .filter((flag) => flag.code === "DIAGNOSTIC_OR_STIGMATIZING_LANGUAGE")
    .map((flag) => ({
      canonicalVariantId: audit.canonicalVariantId,
      ...flag,
    })),
);
const informationSynthesisVariants = variantAudits.filter(
  (audit) => audit.requiresInformationPreservingRewrite,
);
const fullyIdenticalNeighborOutputs = duplicateNeighborOutputs.filter(
  (item) => item.outputsFullyIdentical,
);
const semanticDifferentiationVariantCount = new Set(
  duplicateNeighborOutputs.flatMap((item) => [
    item.leftCanonicalVariantId,
    item.rightCanonicalVariantId,
  ]),
).size;
const automatedPreflightPassed = hardFailures.length === 0;

const report = {
  contractVersion: `nuang-trait-map-canonical-batch-preflight.${versionConfig.label}`,
  reportId: `TRAIT-MAP-CANONICAL-PREFLIGHT-${safeBatchId}.${versionConfig.artifactVersion}`,
  sourceReportId: source.reportId,
  batchId: safeBatchId,
  status: automatedPreflightPassed
    ? "AUTOMATED_INTEGRITY_AND_SAFETY_PASSED_SEMANTIC_REWRITE_REQUIRED"
    : "AUTOMATED_PREFLIGHT_FAILED",
  publicationState: "research_only",
  generatedAt: versionConfig.generatedAt,
  summary: {
    canonicalVariants: variants.length,
    automatedPreflightPassed,
    automatedHardFailures: hardFailures.length,
    sourceTraceabilityFailures: variantAudits.filter(
      (audit) => !audit.checks.sourceTraceability,
    ).length,
    sourceAccountingFailures: variantAudits.filter(
      (audit) => !audit.checks.sourceAccounting,
    ).length,
    selectedPrimaryFailures: variantAudits.filter(
      (audit) => !audit.checks.selectedPrimary,
    ).length,
    privacyScopeFailures: variantAudits.filter(
      (audit) => !audit.checks.privacyScope,
    ).length,
    overclaimFlags: overclaimFlags.length,
    diagnosticOrStigmaFlags: diagnosticFlags.length,
    vagueHedgeFlags: vagueHedgeFlags.length,
    blocksOverRecommendedLength: lengthFlags.length,
    informationPreservingRewriteVariants:
      informationSynthesisVariants.length,
    fullyIdenticalNeighborOutputPairs: fullyIdenticalNeighborOutputs.length,
    neighborPairsSharingExactBlock: duplicateNeighborOutputs.length,
    semanticDifferentiationVariants: semanticDifferentiationVariantCount,
    variantsReadyForSevenRoleReview: variantAudits.filter(
      (audit) => audit.preflightState === "ready_for_seven_role_review",
    ).length,
    variantsRequiringSemanticRewrite: variantAudits.filter(
      (audit) => audit.preflightState === "semantic_rewrite_required",
    ).length,
    pendingSevenRoleReviews: variants.length,
    customerApprovedVariants: 0,
  },
  interpretation: {
    automatedPass:
      "출처 추적, 원문 포함·제외 계산, 선택 방향, 비공개 범위, 금지 표현 자동 검사를 통과했다는 뜻이다.",
    notExpertApproval:
      "자동 통과는 심리학·심리측정·연구방법·쉬운 한국어·안전·제품·데이터 품질의 7개 역할 승인을 대신하지 않는다.",
    semanticRewrite:
      "두 계보 문장을 보존한 조합과 한 글자만 다른데 같은 문장 블록을 공유하는 조합은 의미 손실 없이 다시 써야 한다.",
    publication:
      "전문 검토와 32개 코드·80개 한 글자 이웃 재조합 전에는 앱 고객 콘텐츠나 운영 DB에 발행하지 않는다.",
  },
  automatedRules: {
    maxRecommendedBlockLength: 140,
    allowedPrivacyScopes: ["self_only"],
    forbiddenOverclaimPatterns: [
      "무조건",
      "반드시 …한다/된다/이다",
      "절대로",
      "틀림없이",
      "관계가 실패",
      "헤어지게",
      "성공이 보장",
    ],
    diagnosticOrStigmaPatterns: [
      "사이코패스",
      "소시오패스",
      "정신질환",
      "성격장애",
      "지능이 낮",
      "도덕성이 낮",
      "나쁜 사람",
    ],
    vagueNonExplanatoryHedgePatterns: [
      "이럴 수도 있고 아닐 수도",
      "알 수 없다",
      "단정할 수 없다",
      "상황에 따라 다르다",
    ],
  },
  hardFailures,
  editorialQueues: {
    informationPreservingRewrite: informationSynthesisVariants.map((audit) => ({
      canonicalVariantId: audit.canonicalVariantId,
      claimKey: audit.claimKey,
      axisSignature: audit.axisSignature,
      blockCount: audit.blockCount,
      task:
        "두 원문이 가진 서로 다른 정보를 유지하면서 중복 없는 한 개의 쉬운 설명으로 다시 쓴다.",
    })),
    semanticDifferentiation: duplicateNeighborOutputs,
    length: lengthFlags,
    overclaim: overclaimFlags,
    diagnosticOrStigma: diagnosticFlags,
    vagueHedge: vagueHedgeFlags,
  },
  variantAudits,
  nextGate: {
    name: "SEVEN_ROLE_SEMANTIC_REVIEW_AND_REWRITE",
    requiredRoles: [
      "personality_psychologist",
      "psychometrician",
      "research_methodologist",
      "korean_plain_language_editor",
      "safety_privacy_reviewer",
      "product_content_designer",
      "data_quality_engineer",
    ],
    completion:
      `${variants.length}개 변형의 의미·문장 검토, ${informationSynthesisVariants.length}개 정보 보존 합성, ${duplicateNeighborOutputs.length}개 이웃 문장 블록 중복 교정 뒤 ${safeBatchId} 재조합 감사를 실행한다.`,
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
      `Canonical preflight ${safeBatchId} is stale. Run npm run research:trait-map:v2:canonical-preflight-batch1.`,
    );
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, output);
  fs.writeFileSync(reportPath, markdown);
}

console.log(
  `${safeBatchId} canonical preflight: hard failures ${report.summary.automatedHardFailures}, information-preserving rewrites ${report.summary.informationPreservingRewriteVariants}, neighbor pairs sharing an exact block ${report.summary.neighborPairsSharingExactBlock}, customer-approved 0.`,
);

function auditVariant(variant) {
  const sourceIds = variant.sourceUnits.map((unit) => unit.unitId);
  const includedIds = variant.includedUnits.map((unit) => unit.unitId);
  const excludedIds = variant.excludedUnits.map((unit) => unit.unitId);
  const accountedIds = [...includedIds, ...excludedIds];
  const sourceTraceability = variant.sourceUnits.every(
    (unit) =>
      unit.unitId &&
      unit.variantId &&
      unit.assertion &&
      unit.evidenceFindingRefs.length > 0 &&
      unit.independentSourceRefs.length > 0,
  );
  const sourceAccounting =
    new Set(sourceIds).size === sourceIds.length &&
    new Set(accountedIds).size === accountedIds.length &&
    sourceIds.length === accountedIds.length &&
    sourceIds.every((unitId) => accountedIds.includes(unitId));
  const selectedPrimary =
    variant.recompositionCheck.selectedPrimaryMatchesCollisionResolvedQueue ===
      true &&
    variant.includedUnits[0]?.selectedForDirection === true;
  const privacyScope = ["self_only"].includes(variant.privacyScope);
  const blockTraceability =
    variant.researchDraftBlocks.length === variant.includedUnits.length &&
    variant.researchDraftBlocks.every((block, index) => {
      const sourceUnit = variant.includedUnits[index];
      return (
        block.order === index + 1 &&
        block.sourceUnitId === sourceUnit.unitId &&
        block.text === sourceUnit.assertion
      );
    });
  const languageFlags = variant.researchDraftBlocks.flatMap((block) =>
    auditLanguageBlock(block),
  );
  const hardFailures = [];
  if (!sourceTraceability) hardFailures.push("SOURCE_TRACEABILITY_FAILED");
  if (!sourceAccounting) hardFailures.push("SOURCE_ACCOUNTING_FAILED");
  if (!selectedPrimary) hardFailures.push("SELECTED_PRIMARY_FAILED");
  if (!privacyScope) hardFailures.push("PRIVACY_SCOPE_FAILED");
  if (!blockTraceability) hardFailures.push("BLOCK_TRACEABILITY_FAILED");
  if (
    languageFlags.some(
      (flag) =>
        flag.code === "FORBIDDEN_OVERCLAIM_LANGUAGE" ||
        flag.code === "DIAGNOSTIC_OR_STIGMATIZING_LANGUAGE",
    )
  ) {
    hardFailures.push("UNSAFE_LANGUAGE_FAILED");
  }
  const requiresInformationPreservingRewrite =
    variant.semanticDecision === "PRESERVE_BOTH_DISTINCT_SOURCE_UNITS";
  const requiresSemanticDifferentiation =
    duplicateNeighborIds.has(variant.canonicalVariantId);

  return {
    canonicalVariantId: variant.canonicalVariantId,
    claimKey: variant.claimKey,
    claimKind: variant.claimKind,
    privacyScope: variant.privacyScope,
    axisSignature: variant.axisSignature,
    semanticDecision: variant.semanticDecision,
    blockCount: variant.researchDraftBlocks.length,
    checks: {
      sourceTraceability,
      sourceAccounting,
      selectedPrimary,
      privacyScope,
      blockTraceability,
      forbiddenLanguage: !languageFlags.some(
        (flag) =>
          flag.code === "FORBIDDEN_OVERCLAIM_LANGUAGE" ||
          flag.code === "DIAGNOSTIC_OR_STIGMATIZING_LANGUAGE",
      ),
    },
    hardFailures,
    languageFlags,
    requiresInformationPreservingRewrite,
    requiresSemanticDifferentiation,
    preflightState:
      hardFailures.length > 0
        ? "automated_preflight_failed"
        : requiresInformationPreservingRewrite ||
            requiresSemanticDifferentiation
          ? "semantic_rewrite_required"
          : "ready_for_seven_role_review",
    expertApprovalState: "pending",
    publicationState: "research_only",
  };
}

function auditLanguageBlock(block) {
  const flags = [];
  const checks = [
    {
      code: "FORBIDDEN_OVERCLAIM_LANGUAGE",
      pattern:
        /무조건|반드시[^,.!?]{0,30}(?:한다|된다|이다)|절대로|틀림없이|관계가 실패|헤어지게|성공이 보장/,
    },
    {
      code: "DIAGNOSTIC_OR_STIGMATIZING_LANGUAGE",
      pattern:
        /사이코패스|소시오패스|정신질환|성격장애|지능이 낮|도덕성이 낮|나쁜 사람/,
    },
    {
      code: "VAGUE_NON_EXPLANATORY_HEDGE",
      pattern:
        /이럴 수도 있고 아닐 수도|알 수 없다|단정할 수 없다|상황에 따라 다르다/,
    },
  ];
  for (const check of checks) {
    const match = block.text.match(check.pattern);
    if (match) {
      flags.push({
        code: check.code,
        sourceUnitId: block.sourceUnitId,
        match: match[0],
      });
    }
  }
  if ([...block.text].length > 140) {
    flags.push({
      code: "BLOCK_OVER_RECOMMENDED_LENGTH",
      sourceUnitId: block.sourceUnitId,
      length: [...block.text].length,
    });
  }
  return flags;
}

function findDuplicateNeighborOutputs(items) {
  const byClaim = Map.groupBy(items, (variant) => variant.claimKey);
  const pairs = [];
  for (const claimVariants of byClaim.values()) {
    for (let leftIndex = 0; leftIndex < claimVariants.length; leftIndex += 1) {
      for (
        let rightIndex = leftIndex + 1;
        rightIndex < claimVariants.length;
        rightIndex += 1
      ) {
        const left = claimVariants[leftIndex];
        const right = claimVariants[rightIndex];
        const changedAxis = findSingleChangedAxis(
          left.axisSignature,
          right.axisSignature,
        );
        if (!changedAxis) continue;
        const leftBlocks = normalizeBlocks(left);
        const rightBlocks = normalizeBlocks(right);
        const sharedBlocks = leftBlocks.filter((block) =>
          rightBlocks.includes(block),
        );
        if (sharedBlocks.length === 0) continue;
        pairs.push({
          claimKey: left.claimKey,
          changedAxis,
          leftCanonicalVariantId: left.canonicalVariantId,
          leftAxisSignature: left.axisSignature,
          rightCanonicalVariantId: right.canonicalVariantId,
          rightAxisSignature: right.axisSignature,
          outputsFullyIdentical:
            leftBlocks.length === rightBlocks.length &&
            leftBlocks.every((block, index) => block === rightBlocks[index]),
          sharedOutput: sharedBlocks,
          task:
            "한 글자 차이가 실제 설명에 드러나도록 두 방향의 주의·생각·반응·말하기 차이를 근거 범위 안에서 다시 쓴다.",
        });
      }
    }
  }
  return pairs;
}

function findSingleChangedAxis(leftSignature, rightSignature) {
  if (leftSignature === "COMMON" || rightSignature === "COMMON") return null;
  const left = parseAxisSignature(leftSignature);
  const right = parseAxisSignature(rightSignature);
  const allAxes = new Set([...left.keys(), ...right.keys()]);
  if (allAxes.size !== left.size || allAxes.size !== right.size) return null;
  const changedAxes = [...allAxes].filter(
    (axis) => left.get(axis) !== right.get(axis),
  );
  return changedAxes.length === 1 ? changedAxes[0] : null;
}

function parseAxisSignature(signature) {
  return new Map(
    signature.split("|").map((part) => {
      const [axis, direction] = part.split("=");
      return [axis, direction];
    }),
  );
}

function normalizeBlocks(variant) {
  return variant.researchDraftBlocks.map((block) =>
    block.text.replace(/\s+/g, " ").trim(),
  );
}

function buildMarkdownReport(result) {
  const issueRows = [
    [
      "자동 hard failure",
      result.summary.automatedHardFailures,
      "0",
      result.summary.automatedHardFailures === 0 ? "통과" : "차단",
    ],
    [
      "정보 보존 합성",
      result.summary.informationPreservingRewriteVariants,
      "전문 편집",
      "교정 대기",
    ],
    [
      "한 글자 이웃의 동일 문장 블록",
      result.summary.neighborPairsSharingExactBlock,
      "0",
      "교정 대기",
    ],
    [
      "과장·단정 표현",
      result.summary.overclaimFlags,
      "0",
      result.summary.overclaimFlags === 0 ? "통과" : "차단",
    ],
    [
      "진단·낙인 표현",
      result.summary.diagnosticOrStigmaFlags,
      "0",
      result.summary.diagnosticOrStigmaFlags === 0 ? "통과" : "차단",
    ],
    [
      "설명 없는 회피 표현",
      result.summary.vagueHedgeFlags,
      "0",
      result.summary.vagueHedgeFlags === 0 ? "통과" : "교정 대기",
    ],
  ]
    .map(
      ([name, current, target, state]) =>
        `| ${name} | ${current} | ${target} | ${state} |`,
    )
    .join("\n");
  const differentiationRows = result.editorialQueues.semanticDifferentiation
    .map(
      (item) =>
        `| ${item.claimKey} | ${item.changedAxis} | ${item.leftAxisSignature} | ${item.rightAxisSignature} |`,
    )
    .join("\n");
  return `# ${result.batchId} canonical 자동 사전검수 ${versionConfig.label}

- 상태: \`${result.status}\`
- 자동 hard failure: ${result.summary.automatedHardFailures}
- 고객 승인: 0개

## 판정

첫 묶음은 출처 추적, 원문 포함·제외 계산, 선택 방향, 비공개 범위와
금지 표현 자동 검사를 통과했다. 이 통과는 전문 검토 승인이 아니다.

두 원문을 따로 보존한 ${result.summary.informationPreservingRewriteVariants}개
조합은 의미를 잃지 않는 한 문장으로 편집해야 한다. 또한 한 글자만 다른데
같은 문장 블록을 일부 공유하는
${result.summary.neighborPairsSharingExactBlock}개 쌍은 해당 축의 실제
차이가 드러나도록 다시 써야 한다. 전체 출력이 완전히 같은 쌍은
${result.summary.fullyIdenticalNeighborOutputPairs}개다.

## 자동 검사

| 항목 | 현재 | 완료 기준 | 상태 |
| --- | ---: | --- | --- |
${issueRows}

## 한 글자 이웃의 동일 문장 블록

| claim | 바뀐 축 | 왼쪽 | 오른쪽 |
| --- | --- | --- | --- |
${differentiationRows || "| 없음 | - | - | - |"}

## 다음 단계

1. ${result.summary.informationPreservingRewriteVariants}개 정보 보존 합성 문장을 의미 손실 없이 하나의 쉬운 설명으로 다듬는다.
2. ${result.summary.neighborPairsSharingExactBlock}개 한 글자 이웃의 동일 문장 블록에서 실제 축 차이를 분명하게 만든다.
3. 7개 역할 검토를 완료하고 승인 상태와 수정 이유를 문장 단위로 기록한다.
4. CAB-01로 32개 코드와 80개 한 글자 이웃을 다시 조합해 모순과 중복을 검사한다.

전문 검토와 재조합 전까지 이 묶음은 연구용이며 앱 고객 콘텐츠로 발행하지
않는다.
`;
}
